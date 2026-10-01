// Extraído das 4 rotas /api/quiz/* que duplicavam essa mesma função —
// também usado agora por /api/admin/login pro rate-limit de tentativa de senha.
//
// Pega o ÚLTIMO valor, não o primeiro: um proxy que segue a convenção padrão
// de X-Forwarded-For (ex.: um ALB) ANEXA o IP de quem conectou nele ao final
// do header — não substitui um valor que o próprio cliente já tenha mandado.
// Ler o índice 0 pegaria o valor que o requisitante escolhe mandar
// (`X-Forwarded-For: 1.2.3.4`), deixando qualquer rate-limit por IP (inclusive
// o de tentativa de senha do /admin) contornável com um header diferente a
// cada requisição.
//
// Limites (ver README, notas para o devops): o último salto só é o IP real do
// cliente atrás de EXATAMENTE UM proxy confiável, como um ALB direto. Sem proxy
// nenhum o header não vem e todo mundo cai na mesma chave 'desconhecido'
// (um limite só para todos). Atrás de CloudFront + ALB o último salto é o
// CloudFront, e todos os usuários também dividem o mesmo limite.
export function ipDaRequisicao(req: Request): string {
  const partes = req.headers.get('x-forwarded-for')?.split(',').map((p) => p.trim()).filter(Boolean)
  return partes?.[partes.length - 1] ?? 'desconhecido'
}
