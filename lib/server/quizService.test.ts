import { beforeEach, describe, expect, it } from 'vitest'
import { criarMemorySessionRepo } from './memorySessionRepo'
import {
  concluirSessao, EntradaInvalidaError, iniciarSessao, obterResultado, registrarCliqueWhatsapp,
  registrarSnapshot, SessaoConcluidaError, SessaoInvalidaError, statusEfetivo,
} from './quizService'

const HOJE = '2026-09-30'
const UTM = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }
// Formado que nunca fez a prova: caminho curto e válido (ver casos-de-teste.json, caso 0 como modelo).
const RESP = {
  situacao: 'formado', tentativa: 'nunca', nivel: 'b1', metodo: 'zero', trava: 'materiais', motivo: 'advocacia',
  compromisso: 'bastante', trabalho: 'estagio', rotina: 'nada', horas: 'h3', vde: 'insta', investir: 'parcela', parcela: 'p80',
}
const TESTE = ['C', 'B', 'A', 'X', 'A']
const CONTATO = { email: 'Maria@Exemplo.com', whatsapp: '(85) 99999-0000' }

let repo: ReturnType<typeof criarMemorySessionRepo>
beforeEach(() => { repo = criarMemorySessionRepo() })

async function nova(nome: string | null = 'Maria') {
  const s = (await iniciarSessao(repo, { utm: UTM, hoje: HOJE })).sessao
  if (nome) await repo.atualizar(s.id, { nome })
  return (await repo.buscarPorToken(s.sessionToken))!
}

describe('iniciarSessao', () => {
  it('cria linha em_andamento com hoje fixado e ref curta', async () => {
    const { sessao, retomada } = await iniciarSessao(repo, { utm: UTM, hoje: HOJE })
    expect(retomada).toBe(false)
    expect(sessao.hoje).toBe(HOJE)
    expect(sessao.refCurta).toHaveLength(4)
  })
  it('retoma sessão em andamento do mesmo dia', async () => {
    const a = await nova()
    const r = await iniciarSessao(repo, { sessionToken: a.sessionToken, utm: UTM, hoje: HOJE })
    expect(r.retomada).toBe(true)
    expect(r.sessao.id).toBe(a.id)
  })
  it('NÃO retoma sessão de outro dia: cria outra', async () => {
    const a = await nova()
    const r = await iniciarSessao(repo, { sessionToken: a.sessionToken, utm: UTM, hoje: '2026-10-01' })
    expect(r.retomada).toBe(false)
    expect(r.sessao.id).not.toBe(a.id)
  })
  it('NÃO retoma sessão concluída nem que saiu', async () => {
    const a = await nova()
    await registrarSnapshot(repo, { sessionToken: a.sessionToken, seq: 1, respostas: { situacao: 'formado', tentativa: 'f2' }, teste: [] })
    const r = await iniciarSessao(repo, { sessionToken: a.sessionToken, utm: UTM, hoje: HOJE })
    expect(r.retomada).toBe(false)
  })
  it('NÃO retoma sessão concluída', async () => {
    const a = await nova()
    await concluirSessao(repo, { sessionToken: a.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true })
    const r = await iniciarSessao(repo, { sessionToken: a.sessionToken, utm: UTM, hoje: HOJE })
    expect(r.retomada).toBe(false)
    expect(r.sessao.id).not.toBe(a.id)
  })
})

describe('registrarSnapshot', () => {
  it('422 para seq fora do intervalo int4', async () => {
    const s = await nova()
    for (const seq of [2 ** 31, 1e300]) {
      await expect(registrarSnapshot(repo, { sessionToken: s.sessionToken, seq, respostas: {}, teste: [] })).rejects.toBeInstanceOf(EntradaInvalidaError)
    }
  })
  it('perdeu a corrida para o finish: salvarSnapshot não grava e vira 409', async () => {
    const s = await nova()
    await concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true })
    // Simula a leitura feita antes do finish: buscarPorToken devolve a linha ainda em andamento na 1ª chamada.
    let n = 0
    const real = repo.buscarPorToken.bind(repo)
    const corrida = Object.assign(Object.create(repo), {
      buscarPorToken: async (t: string) => (n++ === 0 ? { ...(await real(t))!, status: 'em_andamento' as const } : real(t)),
    })
    await expect(registrarSnapshot(corrida, { sessionToken: s.sessionToken, seq: 99, respostas: { situacao: 'formado' }, teste: [] })).rejects.toBeInstanceOf(SessaoConcluidaError)
    expect((await repo.buscarPorToken(s.sessionToken))!.respostas.horas).toBe('h3')
  })
  it('grava e calcula a etapa atual', async () => {
    const s = await nova()
    const r = await registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 1, respostas: { situacao: 'formado' }, teste: [] })
    expect(r).toMatchObject({ aceito: true, status: 'em_andamento', etapa: 'tentativa' })
  })
  it('seq antigo não sobrescreve um mais novo', async () => {
    const s = await nova()
    await registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 2, respostas: { situacao: 'formado', tentativa: 'nunca' }, teste: [] })
    const velho = await registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 1, respostas: { situacao: 'formado' }, teste: [] })
    expect(velho.aceito).toBe(false)
    expect((await repo.buscarPorToken(s.sessionToken))!.respostas.tentativa).toBe('nunca')
  })
  it('saída antecipada marca saiu e voltar reabre como em_andamento', async () => {
    const s = await nova()
    const a = await registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 1, respostas: { situacao: 'formado', tentativa: 'f2' }, teste: [] })
    expect(a).toMatchObject({ status: 'saiu', etapa: 'f2' })
    expect((await repo.buscarPorToken(s.sessionToken))!.saidaTipo).toBe('f2')
    const b = await registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 2, respostas: { situacao: 'formado', tentativa: 'nunca' }, teste: [] })
    expect(b.status).toBe('em_andamento')
    expect((await repo.buscarPorToken(s.sessionToken))!.saidaTipo).toBeNull()
  })
  it('descarta trava=denovo depois de mudar a tentativa', async () => {
    const s = await nova()
    await registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 1, respostas: { situacao: 'formado', tentativa: 'nunca', nivel: 'b1', trava: 'denovo' }, teste: [] })
    expect((await repo.buscarPorToken(s.sessionToken))!.respostas.trava).toBeUndefined()
  })
  it('422 para valor que não existe e 404 para token desconhecido', async () => {
    const s = await nova()
    await expect(registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 1, respostas: { situacao: 'x' }, teste: [] })).rejects.toBeInstanceOf(EntradaInvalidaError)
    await expect(registrarSnapshot(repo, { sessionToken: '00000000-0000-4000-8000-000000000000', seq: 1, respostas: {}, teste: [] })).rejects.toBeInstanceOf(SessaoInvalidaError)
  })
  it('depois do finish: 409 e nada é sobrescrito', async () => {
    const s = await nova()
    await concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true })
    await expect(registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 99, respostas: { situacao: 'formado' }, teste: [] })).rejects.toBeInstanceOf(SessaoConcluidaError)
    const atual = await repo.buscarPorToken(s.sessionToken)
    expect(atual!.status).toBe('concluido')
    expect(atual!.respostas.horas).toBe('h3')
  })
})

describe('concluirSessao', () => {
  it('recalcula no servidor, monta o código, normaliza o contato e marca o diagnóstico pendente', async () => {
    const s = await nova()
    const { sessao, novo } = await concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true })
    expect(novo).toBe(true)
    expect(sessao.status).toBe('concluido')
    expect(sessao.codigo).toMatch(/^QO1\..*\.20260930$/)
    expect(sessao.emailNormalizado).toBe('maria@exemplo.com')
    expect(sessao.whatsappNormalizado).toBe('5585999990000')
    expect(sessao.nome).toBe('Maria')
    expect(sessao.nomeCompleto).toBeNull()
    expect(sessao.consentimentoEm).not.toBeNull()
    expect(sessao.consentimentoVersao).toBe('v1')
    expect(sessao.tipo).toBe(sessao.recomendacao!.tipo)
    expect(sessao.diagnosticoStatus).toBe(['ok', 'acima', 'sem_turma'].includes(sessao.tipo!) ? 'pendente' : 'nao_se_aplica')
  })
  it('duas chamadas em paralelo: só uma é "novo"', async () => {
    const s = await nova()
    const args = { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true }
    const [a, b] = await Promise.all([concluirSessao(repo, args), concluirSessao(repo, args)])
    expect([a.novo, b.novo].filter(Boolean)).toHaveLength(1)
    expect(a.sessao.id).toBe(b.sessao.id)
  })
  it('chamar de novo devolve o mesmo resultado sem regravar', async () => {
    const s = await nova()
    const args = { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true }
    const a = await concluirSessao(repo, args)
    const b = await concluirSessao(repo, { ...args, contato: { ...CONTATO, email: 'outro@exemplo.com' } })
    expect(b.novo).toBe(false)
    expect(b.sessao.email).toBe(a.sessao.email)
  })
  it.each([
    ['e-mail inválido', { ...CONTATO, email: 'maria@' }],
    ['WhatsApp sem o 9º dígito', { ...CONTATO, whatsapp: '(85) 9999-0000' }],
  ])('422 com %s', async (_n, contato) => {
    const s = await nova()
    await expect(concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato, consentimento: true })).rejects.toBeInstanceOf(EntradaInvalidaError)
  })
  it.each([['null', null], ['undefined', undefined], ['string', 'x']])('422 com contato %s e nada é concluído', async (_n, contato) => {
    const s = await nova()
    await expect(concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: contato as never, consentimento: true })).rejects.toBeInstanceOf(EntradaInvalidaError)
    expect((await repo.buscarPorToken(s.sessionToken))!.status).toBe('em_andamento')
  })
  it('422 sem consentimento, com teste incompleto ou respostas incompletas', async () => {
    const s = await nova()
    const base = { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true }
    await expect(concluirSessao(repo, { ...base, consentimento: false })).rejects.toBeInstanceOf(EntradaInvalidaError)
    await expect(concluirSessao(repo, { ...base, teste: ['A'] })).rejects.toBeInstanceOf(EntradaInvalidaError)
    await expect(concluirSessao(repo, { ...base, respostas: { situacao: 'formado' } })).rejects.toBeInstanceOf(EntradaInvalidaError)
  })
  it('422 quando as respostas levam a uma saída antecipada (f2/cedo não passam por contato)', async () => {
    const s = await nova()
    await expect(concluirSessao(repo, { sessionToken: s.sessionToken, respostas: { situacao: 'formado', tentativa: 'f2' }, teste: TESTE, contato: CONTATO, consentimento: true })).rejects.toBeInstanceOf(EntradaInvalidaError)
  })
  it('mesma pessoa refazendo: duas linhas ligadas pelo e-mail normalizado', async () => {
    const a = await nova()
    const b = await nova()
    const args = { respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true }
    await concluirSessao(repo, { ...args, sessionToken: a.sessionToken })
    await concluirSessao(repo, { ...args, sessionToken: b.sessionToken, contato: { ...CONTATO, email: ' MARIA@exemplo.com ' } })
    const s = (await repo.buscarPorToken(b.sessionToken))!
    expect((await repo.outrasTentativas(s)).map((x) => x.id)).toEqual([a.id])
  })
})

describe('obterResultado', () => {
  it('nunca devolve e-mail nem WhatsApp', async () => {
    const s = await nova()
    await concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true })
    const r = await obterResultado(repo, s.sessionToken)
    const json = JSON.stringify(r)
    expect(json).not.toContain('exemplo.com')
    expect(json).not.toContain('99999')
    expect(r.ref_curta).toHaveLength(4)
    expect(r.nome).toBe('Maria')
  })
  it('404 se a sessão não foi concluída', async () => {
    const s = await nova()
    await expect(obterResultado(repo, s.sessionToken)).rejects.toBeInstanceOf(SessaoInvalidaError)
  })
  it('expõe o link do PDF só quando pronto', async () => {
    const s = await nova()
    const { sessao } = await concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true })
    expect(sessao.diagnosticoStatus).toBe('pendente')
    expect((await obterResultado(repo, s.sessionToken)).diagnostico.url).toBeNull()
    await repo.atualizar(sessao.id, { diagnosticoStatus: 'pronto', diagnosticoPdfS3Key: 'k' })
    expect((await obterResultado(repo, s.sessionToken)).diagnostico.url).toBe(`/api/diagnostico/${sessao.diagnosticoToken}`)
  })
})

describe('statusEfetivo', () => {
  it('pendente há mais de 10 minutos vira erro', () => {
    const agora = new Date('2026-09-30T12:00:00Z')
    const base = { diagnosticoStatus: 'pendente' as const, diagnosticoSolicitadoEm: '2026-09-30T11:49:00Z' }
    expect(statusEfetivo(base as never, agora)).toBe('erro')
    expect(statusEfetivo({ ...base, diagnosticoSolicitadoEm: '2026-09-30T11:55:00Z' } as never, agora)).toBe('pendente')
  })
})

describe('registrarCliqueWhatsapp', () => {
  it('grava só o primeiro clique', async () => {
    const s = await nova()
    await registrarCliqueWhatsapp(repo, s.sessionToken)
    const t1 = (await repo.buscarPorToken(s.sessionToken))!.whatsappClicadoEm
    await registrarCliqueWhatsapp(repo, s.sessionToken)
    expect((await repo.buscarPorToken(s.sessionToken))!.whatsappClicadoEm).toBe(t1)
    expect(t1).not.toBeNull()
  })
})

describe('nome (v3)', () => {
  it('o snapshot grava o nome aparado; um snapshot sem nome não o apaga', async () => {
    const s = await nova(null)
    await registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 1, respostas: {}, teste: [], nome: '  Maria  ' })
    expect((await repo.buscarPorToken(s.sessionToken))!.nome).toBe('Maria')
    await registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 2, respostas: { situacao: 'formado' }, teste: [] })
    expect((await repo.buscarPorToken(s.sessionToken))!.nome).toBe('Maria')
  })
  it.each([[''], ['A'], ['12'], ['x'.repeat(81)], [42 as unknown as string]])('422 e nada gravado para nome inválido %p', async (nome) => {
    const s = await nova(null)
    await expect(registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 1, respostas: {}, teste: [], nome })).rejects.toBeInstanceOf(EntradaInvalidaError)
    expect((await repo.buscarPorToken(s.sessionToken))!.nome).toBeNull()
  })
  it('snapshot com nome em sessão concluída: 409 e o nome não muda', async () => {
    const s = await nova()
    await concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true })
    await expect(registrarSnapshot(repo, { sessionToken: s.sessionToken, seq: 9, respostas: {}, teste: [], nome: 'Outro' })).rejects.toBeInstanceOf(SessaoConcluidaError)
    expect((await repo.buscarPorToken(s.sessionToken))!.nome).toBe('Maria')
  })
  it('finish sem nome na sessão e sem nome no corpo: 422 com campos [nome]', async () => {
    const s = await nova(null)
    const e = await concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true }).catch((x) => x)
    expect(e).toBeInstanceOf(EntradaInvalidaError)
    expect((e as EntradaInvalidaError).campos).toEqual(['nome'])
    expect((await repo.buscarPorToken(s.sessionToken))!.status).toBe('em_andamento')
  })
  it('finish com nome no corpo (sessão nova depois de um 404) grava o nome', async () => {
    const s = await nova(null)
    const { sessao } = await concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true, nome: ' Ana ' })
    expect(sessao.nome).toBe('Ana')
  })
  it('nome válido no corpo do finish vale sobre o nome da sessão', async () => {
    const s = await nova('Maria')
    const { sessao } = await concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true, nome: ' Ana ' })
    expect(sessao.nome).toBe('Ana')
  })
  it('nome inválido no corpo do finish cai para o nome da sessão', async () => {
    const s = await nova('Maria')
    const { sessao } = await concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: CONTATO, consentimento: true, nome: '1' })
    expect(sessao.nome).toBe('Maria')
  })
  describe('compatibilidade: contato.nome_completo (cliente anterior à v3)', () => {
    const LEGADO = { ...CONTATO, nome_completo: 'Maria Souza' }
    const base = (token: string) => ({ sessionToken: token, respostas: RESP, teste: TESTE, consentimento: true })
    it('sem nome no corpo e na sessão: usa a primeira palavra', async () => {
      const s = await nova(null)
      const { sessao } = await concluirSessao(repo, { ...base(s.sessionToken), contato: LEGADO })
      expect(sessao.status).toBe('concluido')
      expect(sessao.nome).toBe('Maria')
    })
    it('nome do corpo e nome da sessão vencem o campo legado', async () => {
      const a = await nova(null)
      expect((await concluirSessao(repo, { ...base(a.sessionToken), contato: LEGADO, nome: 'Ana' })).sessao.nome).toBe('Ana')
      const b = await nova('Bia')
      expect((await concluirSessao(repo, { ...base(b.sessionToken), contato: LEGADO })).sessao.nome).toBe('Bia')
    })
    it('primeira palavra inválida e nada mais: 422 com campos [nome]', async () => {
      const s = await nova(null)
      const e = await concluirSessao(repo, { ...base(s.sessionToken), contato: { ...CONTATO, nome_completo: '1 Silva' } }).catch((x) => x)
      expect(e).toBeInstanceOf(EntradaInvalidaError)
      expect((e as EntradaInvalidaError).campos).toEqual(['nome'])
    })
  })
  it('contato só com e-mail e WhatsApp é válido; sem e-mail é 422', async () => {
    const s = await nova()
    await expect(concluirSessao(repo, { sessionToken: s.sessionToken, respostas: RESP, teste: TESTE, contato: { whatsapp: CONTATO.whatsapp } as never, consentimento: true })).rejects.toBeInstanceOf(EntradaInvalidaError)
  })
})
