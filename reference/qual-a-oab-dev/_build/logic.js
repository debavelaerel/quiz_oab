/* Recommendation logic for "Qual a OAB da sua aprovação em 2027?".
 * Pure functions over DATA (data.json) and the lead's answers A. The same file is
 * injected into the quiz and run by _build/check.py against diagnosis/logic.py,
 * so any change here must be mirrored there (check.py fails if they diverge). */
(function (root) {
  "use strict";

  function day(s) { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; }
  function semIdx(s) { const [y, m] = s.split("-").map(Number); return y * 2 + (m >= 7 ? 1 : 0); }
  function semLabel(idx) { return { ano: Math.floor(idx / 2), sem: (idx % 2) + 1 }; }
  function year(s) { return Number(s.slice(0, 4)); }

  function make(DATA) {
    const R = DATA.regra;

    function nivel(A) {
      if (A.tentativa === "reprov") return DATA.pontosNivel[A.pontos] || null;
      return A.nivel || null;
    }

    // Course position at a given semester index (sem) or year (ano).
    function posicaoEm(A, today, alvo) {
      const P = Number(A.periodo);
      if (A.regime === "ano") return P + (year(alvo) - year(today));
      return P + (semIdx(alvo) - semIdx(today));
    }

    function elegivel(A, ex, today) {
      if (A.situacao === "formado") return true;
      const min = A.regime === "ano" ? R.anoMinimo : R.periodoMinimo;
      return posicaoEm(A, today, ex.corte) >= min;
    }

    function futuros(today) { return DATA.exames.filter(ex => day(today) <= day(ex.fase1)); }

    // Exam that is still ahead and allowed, but whose registration already closed:
    // the quiz asks whether the lead registered for it.
    function exameInscricaoFechada(A, today) {
      return futuros(today).find(ex => elegivel(A, ex, today) && day(today) > day(ex.inscFim)) || null;
    }

    function statusExame(A, ex, today) {
      if (day(today) > day(ex.fase1)) return "passou";
      if (!elegivel(A, ex, today)) return "nao_libera";
      if (day(today) > day(ex.inscFim)) return A.inscrito === "s" ? "ok" : "sem_inscricao";
      return "ok";
    }

    function statusTurma(t, today) {
      if (day(today) > day(t.vendasFim)) return "encerrada";
      if (day(today) < day(t.vendasIni)) return "breve";
      return "aberta";
    }

    function horasTurma(t) { return DATA.rotinas[String(t.dias)].horas; }

    function turmasDisponiveis(exId, today) {
      return DATA.turmas.filter(t => t.exame === exId && statusTurma(t, today) !== "encerrada")
        .sort((a, b) => b.dias - a.dias);
    }

    // True when the course is too early for any exam still ahead.
    function cedo(A, today) {
      if (A.situacao === "formado" || !A.periodo) return false;
      return !futuros(today).some(ex => elegivel(A, ex, today));
    }

    function primeiraVez(A, today) {
      const P = Number(A.periodo);
      if (A.regime === "ano") return { ano: year(today) + (R.anoMinimo - P), sem: null };
      return semLabel(semIdx(today) + (R.periodoMinimo - P));
    }

    // Asked to everyone who stays in the quiz: it qualifies the lead and shapes the laudo copy.
    function perguntaTentativa(A) { return true; }

    function recomendar(A, today) {
      if (A.tentativa === "f2") return { tipo: "f2" };
      if (cedo(A, today)) return { tipo: "cedo", quando: primeiraVez(A, today) };
      const cands = futuros(today).filter(ex => statusExame(A, ex, today) === "ok");
      if (!cands.length) return { tipo: "sem_prova" };
      const h = DATA.horasValor[A.horas] || 0;
      // Every turma starts from zero, so only the time left and the hours a day matter.
      const passos = [
        ["ok", t => horasTurma(t) <= h],
        ["acima", () => true],
      ];
      for (const [tipo, ok] of passos) {
        for (const ex of cands) {
          const t = turmasDisponiveis(ex.id, today).find(ok);
          if (t) return { tipo, exame: ex.id, turma: t.dias };
        }
      }
      return { tipo: "sem_turma", exame: cands[0].id };
    }

    // An earlier exam the lead could reach by studying more hours a day.
    function atalho(A, today, rec) {
      if (!rec.exame) return null;
      const h = DATA.horasValor[A.horas] || 0;
      for (const ex of futuros(today)) {
        if (ex.id === rec.exame) break;
        if (statusExame(A, ex, today) !== "ok") continue;
        const t = turmasDisponiveis(ex.id, today).filter(t => horasTurma(t) > h)
          .sort((a, b) => horasTurma(a) - horasTurma(b))[0];
        if (t) return { exame: ex.id, turma: t.dias, horas: horasTurma(t) };
      }
      return null;
    }

    // Semester by semester, from now until the last cutoff, with the course position.
    function escada(A, today) {
      if (A.situacao === "formado" || !A.periodo) return [];
      const fim = Math.max(...DATA.exames.map(ex => semIdx(ex.corte)));
      const out = [];
      for (let i = semIdx(today); i <= fim; i++) {
        const lab = semLabel(i);
        const ref = `${lab.ano}-${lab.sem === 1 ? "03" : "09"}-01`;
        const pos = posicaoEm(A, today, ref);
        const exames = DATA.exames.filter(ex => semIdx(ex.corte) === i).map(ex => ex.id);
        out.push({ ano: lab.ano, sem: lab.sem, pos, exames, agora: i === semIdx(today) });
      }
      return out;
    }

    function diasAte(today, s) { return day(s) - day(today); }

    return { nivel, elegivel, statusExame, statusTurma, horasTurma, turmasDisponiveis, cedo,
      primeiraVez, perguntaTentativa, exameInscricaoFechada, recomendar, atalho, escada, diasAte };
  }

  const api = { make, day, semIdx };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.QOLogic = api;
})(this);
