import { NextResponse } from 'next/server'
import { exigirSessaoAdmin, NOME_COOKIE_ADMIN } from '@/lib/server/adminAuth'

export const runtime = 'nodejs'

export async function POST(req: Request): Promise<Response> {
  const negado = exigirSessaoAdmin(req, process.env.ADMIN_SESSION_SECRET)
  if (negado) return negado
  const res = NextResponse.json({ ok: true }, { status: 200 })
  res.cookies.set(NOME_COOKIE_ADMIN, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
