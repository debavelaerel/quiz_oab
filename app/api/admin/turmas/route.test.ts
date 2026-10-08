import { describe, expect, it, vi } from 'vitest'
import { TURMAS_PADRAO } from '@/lib/oab/turmas'
import { assinarSessao, NOME_COOKIE_ADMIN } from '@/lib/server/adminAuth'
import { criarHandlerTurmas } from './route'

const SEGREDO = 'segredo-de-teste-com-tamanho-suficiente'
const turmas = () => ({ atuais: vi.fn(), salvar: vi.fn(async () => {}), restaurar: vi.fn(async () => {}) })
const req = (metodo: string, corpo?: unknown, logado = true) =>
  new Request('http://x/api/admin/turmas', {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(logado ? { cookie: `${NOME_COOKIE_ADMIN}=${assinarSessao(SEGREDO)}` } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
const padrao = () => TURMAS_PADRAO.map((t) => ({ ...t }))

describe('/api/admin/turmas', () => {
  it('exige login', async () => {
    const t = turmas()
    const h = criarHandlerTurmas({ turmas: t, segredo: SEGREDO })
    expect((await h.PUT(req('PUT', { turmas: padrao() }, false))).status).toBe(401)
    expect((await h.DELETE(req('DELETE', undefined, false))).status).toBe(401)
    expect(t.salvar).not.toHaveBeenCalled()
  })
  it('salva datas válidas', async () => {
    const t = turmas()
    const r = await criarHandlerTurmas({ turmas: t, segredo: SEGREDO }).PUT(req('PUT', { turmas: padrao() }))
    expect(r.status).toBe(200)
    expect(t.salvar).toHaveBeenCalledOnce()
  })
  it('recusa datas inválidas com a lista de erros', async () => {
    const t = turmas(); const lista = padrao(); lista[6].vendasFim = '2020-01-01'
    const r = await criarHandlerTurmas({ turmas: t, segredo: SEGREDO }).PUT(req('PUT', { turmas: lista }))
    expect(r.status).toBe(422)
    expect((await r.json()).erros[0]).toMatchObject({ exame: '49', dias: 120, campo: 'vendasFim' })
    expect(t.salvar).not.toHaveBeenCalled()
  })
  it('restaura o padrão', async () => {
    const t = turmas()
    expect((await criarHandlerTurmas({ turmas: t, segredo: SEGREDO }).DELETE(req('DELETE'))).status).toBe(200)
    expect(t.restaurar).toHaveBeenCalledOnce()
  })
})
