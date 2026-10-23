import { describe, expect, it } from 'vitest';
import lines from '../public/data/lines.json';
import params from '../public/data/params.json';
import { planIda, planVolta, timetablesFor, waitingTime, type Plan } from '../src/domain/planner';
import { formatMinutes, toMinutes } from '../src/domain/time';
import type { Line, Params } from '../src/domain/types';

const P = params as Params;
const util = timetablesFor(lines as Line[], 'u');
const m = toMinutes;
const hm = (plan: Plan | null) =>
  plan && { saida: formatMinutes(plan.saida), chegada: formatMinutes(plan.chegada) };

describe('planIda (dia útil, params padrão)', () => {
  it('escolhe a última combinação que chega a tempo e a que chega com folga', () => {
    const r = planIda(util, P, m('09:00'));
    // 07:00 → RP 07:40 → Terminal 07:50 → 110 08:25 → ponto 08:55 → Qualisol 09:00
    expect(hm(r.noLimite)).toEqual({ saida: '07:00', chegada: '09:00' });
    // folga de 20 min: chegar até 08:40 → 06:20 (chega 08:05)
    expect(hm(r.comFolga)).toEqual({ saida: '06:20', chegada: '08:05' });
  });

  it('prefere a saída mais tarde quando duas partidas pegam a mesma 110', () => {
    // 06:40 e 07:00 pegam a 110 das 08:25 e chegam às 09:00
    const r = planIda(util, P, m('09:10'));
    expect(hm(r.noLimite)).toEqual({ saida: '07:00', chegada: '09:00' });
  });

  it('chegada exatamente no horário conta como a tempo', () => {
    const r = planIda(util, P, m('08:05'));
    expect(hm(r.noLimite)).toEqual({ saida: '06:20', chegada: '08:05' });
    expect(hm(r.comFolga)).toEqual({ saida: '05:10', chegada: '07:00' });
  });

  it('respeita a margem de baldeação no Terminal', () => {
    // 06:40 chega ao Terminal às 07:30: com margem 5 perde a 110 das 07:30
    const comMargem = planIda(util, P, m('08:10'));
    expect(hm(comMargem.noLimite)).toEqual({ saida: '06:20', chegada: '08:05' });
    const semMargem = planIda(util, { ...P, margemBaldeacao: 0 }, m('08:10'));
    expect(hm(semMargem.noLimite)).toEqual({ saida: '06:40', chegada: '08:05' });
  });

  it('devolve null quando nada chega a tempo', () => {
    const r = planIda(util, P, m('06:00'));
    expect(r.noLimite).toBeNull();
    expect(r.comFolga).toBeNull();
  });

  it('monta os quatro trechos em sequência, sem sobreposição', () => {
    const plan = planIda(util, P, m('09:00')).noLimite!;
    expect(plan.legs.map((l) => l.tipo)).toEqual(['onibus', 'caminhada', 'onibus', 'caminhada']);
    for (let i = 1; i < plan.legs.length; i++) {
      expect(plan.legs[i].inicio).toBeGreaterThanOrEqual(plan.legs[i - 1].fim);
    }
    expect(formatMinutes(plan.legs[2].inicio)).toBe('08:25');
    expect(waitingTime(plan)).toBe(35);
  });

  it('usa os tempos editados nos params', () => {
    const r = planIda(util, { ...P, viagemItamarati: 75 }, m('09:00'));
    // 07:00 → RP 08:15 → Terminal 08:25 (+5) perde a 110 das 08:25
    // 06:40 → RP 07:55 → Terminal 08:05 (+5) → 110 08:25 → 09:00
    expect(hm(r.noLimite)).toEqual({ saida: '06:40', chegada: '09:00' });
  });

  it('usa a tabela do tipo de dia', () => {
    const sab = timetablesFor(lines as Line[], 's');
    const r = planIda(sab, P, m('09:00'));
    // sáb: 07:10 → 07:50 → 08:00 (+5) → 110 08:25 → 09:00
    expect(hm(r.noLimite)).toEqual({ saida: '07:10', chegada: '09:00' });
  });
});

describe('planVolta (dia útil, params padrão)', () => {
  it('calcula a 110 e o Itamarati a partir da saída da fábrica', () => {
    const [first, second, third] = planVolta(util, P, m('17:00'));
    // ponto 17:05 → 110 das 16:50 passa 17:20 → Centro 17:50 → rodoviária 18:00 (+5) → Itamarati 18:40 → 19:20
    expect(formatMinutes(first.legs[1].inicio)).toBe('17:20');
    expect(formatMinutes(first.legs[3].inicio)).toBe('18:40');
    expect(formatMinutes(first.chegada)).toBe('19:20');
    expect(formatMinutes(second.chegada)).toBe('20:10');
    expect(formatMinutes(third.chegada)).toBe('21:10');
  });

  it('não repete opções que caem no mesmo Itamarati', () => {
    const plans = planVolta(util, P, m('12:00'), 5);
    const chegadas = plans.map((p) => p.chegada);
    expect(new Set(chegadas).size).toBe(chegadas.length);
  });

  it('pega o último Itamarati da noite', () => {
    const [plan] = planVolta(util, P, m('21:00'));
    expect(formatMinutes(plan.legs[3].inicio)).toBe('23:15');
    expect(formatMinutes(plan.chegada)).toBe('23:55');
  });

  it('devolve lista vazia quando não há mais combinação no dia', () => {
    expect(planVolta(util, P, m('23:00'))).toEqual([]);
  });
});
