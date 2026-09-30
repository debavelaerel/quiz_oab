import { randomInt } from 'node:crypto'

export const ALFABETO_REF = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // sem 0 1 O I L

export function gerarRefCurta(): string {
  let r = ''
  for (let i = 0; i < 4; i++) r += ALFABETO_REF[randomInt(ALFABETO_REF.length)]
  return r
}
