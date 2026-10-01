import { describe, expect, it } from 'vitest'
import { criarMemorySessionRepo } from '@/lib/server/memorySessionRepo'
import { concluirSessao, iniciarSessao } from '@/lib/server/quizService'
import { criarHandlerResult } from './route'

const UTM = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }
const RESP = {
  situacao: 'formado', tentativa: 'nunca', nivel: 'b1', metodo: 'zero', trava: 'materiais', motivo: 'advocacia',
  compromisso: 'bastante', trabalho: 'estagio', rotina: 'nada', horas: 'h3', vde: 'insta', investir: 'parcela', parcela: 'p80',
}
const get = (q: string) => new Request(`http://x/api/quiz/result?${q}`)

describe('GET /api/quiz/result', () => {
  it('200 sem e-mail nem WhatsApp; 404 para token desconhecido; 422 para malformado', async () => {
    const repo = criarMemorySessionRepo()
    const { sessao } = await iniciarSessao(repo, { utm: UTM, hoje: '2026-09-30' })
    await concluirSessao(repo, {
      sessionToken: sessao.sessionToken, respostas: RESP, teste: ['C', 'B', 'A', 'X', 'A'],
      nome: 'Maria', contato: { email: 'maria@exemplo.com', whatsapp: '(85) 99999-0000' }, consentimento: true,
    })
    const h = criarHandlerResult(repo)
    const r = await h(get(`session_token=${sessao.sessionToken}`))
    expect(r.status).toBe(200)
    const txt = await r.text()
    expect(txt).not.toContain('@')
    expect(txt).not.toContain('99999')
    expect(txt).not.toContain('5585')
    expect((await h(get('session_token=00000000-0000-4000-8000-000000000000'))).status).toBe(404)
    expect((await h(get('session_token=x'))).status).toBe(422)
  })
})
