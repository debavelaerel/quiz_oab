import { obterTurmas } from '@/lib/server/container'
import { exigirSessaoAdmin } from '@/lib/server/adminAuth'
import { validarEdicoes } from '@/lib/oab/turmas'
import { jsonAdmin } from '@/lib/server/adminRota'
import type { criarServicoTurmas } from '@/lib/server/turmasRepo'

export const runtime = 'nodejs'

type Deps = { turmas: ReturnType<typeof criarServicoTurmas>; segredo: string | undefined }

export function criarHandlerTurmas(d: Deps) {
  return {
    /** Salva as datas (a lista completa das turmas). */
    async PUT(req: Request): Promise<Response> {
      const negado = exigirSessaoAdmin(req, d.segredo)
      if (negado) return negado
      let corpo: { turmas?: unknown }
      try { corpo = await req.json() } catch { return jsonAdmin({ erro: 'json inválido' }, 400) }
      const v = validarEdicoes(corpo?.turmas)
      if (!v.ok) return jsonAdmin({ erro: 'datas inválidas', erros: v.erros }, 422)
      try { await d.turmas.salvar(v.edicoes) } catch (e) {
        console.error('[admin/turmas] falha ao salvar', String(e))
        return jsonAdmin({ erro: 'não foi possível salvar agora' }, 500)
      }
      return jsonAdmin({ ok: true }, 200)
    },
    /** Volta às datas padrão (as do data.json). */
    async DELETE(req: Request): Promise<Response> {
      const negado = exigirSessaoAdmin(req, d.segredo)
      if (negado) return negado
      try { await d.turmas.restaurar() } catch (e) {
        console.error('[admin/turmas] falha ao restaurar', String(e))
        return jsonAdmin({ erro: 'não foi possível restaurar agora' }, 500)
      }
      return jsonAdmin({ ok: true }, 200)
    },
  }
}

const h = () => criarHandlerTurmas({ turmas: obterTurmas(), segredo: process.env.ADMIN_SESSION_SECRET })
export const PUT = (req: Request) => h().PUT(req)
export const DELETE = (req: Request) => h().DELETE(req)
