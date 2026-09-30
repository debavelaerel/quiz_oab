import { describe, expect, it } from 'vitest'
import { rotuloDiagnostico, rotuloExame, rotuloResposta, rotuloStatus, rotuloTeste, rotuloTipo, rotuloTurma } from './adminLabels'

describe('adminLabels', () => {
  it('rotuloResposta: opção única vira o texto da opção', () => {
    expect(rotuloResposta('situacao', 'cursando')).toBe('Estou cursando Direito')
    expect(rotuloResposta('periodo', '7')).toBe('7º')
  })
  it('rotuloResposta: múltipla separada por "+" vira lista', () => {
    expect(rotuloResposta('rotina', 'filhos+casa')).toBe('Cuido de filhos; Cuido da casa')
  })
  it('rotuloResposta: valor ou campo desconhecido devolve o valor cru; vazio vira travessão', () => {
    expect(rotuloResposta('situacao', 'zzz')).toBe('zzz')
    expect(rotuloResposta('naoexiste', 'x')).toBe('x')
    expect(rotuloResposta('situacao', undefined)).toBe('—')
  })
  it('teste como letras separadas por espaço', () => {
    expect(rotuloTeste(['C', 'B', 'A', 'X', 'A'])).toBe('C B A X A')
    expect(rotuloTeste([])).toBe('—')
  })
  it('tipo, diagnóstico, status, exame e turma', () => {
    expect(rotuloTipo('ok')).toBe('Turma no ritmo')
    expect(rotuloTipo(null)).toBe('—')
    expect(rotuloTipo('novo')).toBe('novo')
    expect(rotuloDiagnostico('nao_se_aplica')).toBe('Não se aplica')
    expect(rotuloDiagnostico('pendente')).toBe('Gerando…')
    expect(rotuloDiagnostico('pronto')).toBe('Pronto')
    expect(rotuloDiagnostico('erro')).toBe('Erro')
    expect(rotuloDiagnostico('desligado')).toBe('Desligado')
    expect(rotuloDiagnostico(null)).toBe('—')
    expect(rotuloStatus('concluido')).toBe('Concluído')
    expect(rotuloExame('48')).toBe('OAB 48')
    expect(rotuloExame(null)).toBe('—')
    expect(rotuloTurma(90)).toBe('Turma de 90 dias')
    expect(rotuloTurma(null)).toBe('—')
  })
})
