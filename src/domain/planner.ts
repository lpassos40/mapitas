import { toMinutes } from './time';
import { IDS, type DayType, type Line, type Params } from './types';

export type LegKind = 'onibus' | 'caminhada';

export interface Leg {
  tipo: LegKind;
  /** linha/sentido, só em trechos de ônibus */
  linha?: string;
  sentido?: string;
  de: string;
  para: string;
  /** minutos desde 00:00 do dia (pode passar de 1440) */
  inicio: number;
  fim: number;
}

export interface Plan {
  sentido: 'ida' | 'volta';
  legs: Leg[];
  /** início do primeiro trecho */
  saida: number;
  /** fim do último trecho */
  chegada: number;
}

/** Horários de partida (em minutos, ordenados) usados pelo planejador. */
export interface Timetables {
  itamaratiIda: number[];
  itamaratiVolta: number[];
  /** partidas do Terminal Urbano */
  l110: number[];
}

export function timetablesFor(lines: Line[], day: DayType): Timetables {
  const get = (linha: string, sentido: string) => {
    const dir = lines.find((l) => l.id === linha)?.sentidos.find((s) => s.id === sentido);
    return (dir?.horarios[day] ?? []).map(toMinutes).sort((a, b) => a - b);
  };
  return {
    itamaratiIda: get(IDS.itamarati, IDS.itamaratiIda),
    itamaratiVolta: get(IDS.itamarati, IDS.itamaratiVolta),
    l110: get(IDS.l110, IDS.l110Sentido),
  };
}

/** Primeira partida >= t, ou undefined. */
export function firstAtOrAfter(times: number[], t: number): number | undefined {
  return times.find((x) => x >= t);
}

/** Monta a ida a partir de uma partida do Itamarati em Cedral. */
export function buildIda(t: Timetables, p: Params, saidaItamarati: number): Plan | null {
  const chegaRP = saidaItamarati + p.viagemItamarati;
  const chegaTerminal = chegaRP + p.caminhadaRodoviariaTerminal;
  const sai110 = firstAtOrAfter(t.l110, chegaTerminal + p.margemBaldeacao);
  if (sai110 === undefined) return null;
  const desce = sai110 + p.onibus110TerminalQualisol;
  const chega = desce + p.caminhadaFabricaPonto;
  return {
    sentido: 'ida',
    saida: saidaItamarati,
    chegada: chega,
    legs: [
      { tipo: 'onibus', linha: IDS.itamarati, sentido: IDS.itamaratiIda, de: IDS.rodCedral, para: IDS.rodRP, inicio: saidaItamarati, fim: chegaRP },
      { tipo: 'caminhada', de: IDS.rodRP, para: IDS.terminal, inicio: chegaRP, fim: chegaTerminal },
      { tipo: 'onibus', linha: IDS.l110, sentido: IDS.l110Sentido, de: IDS.terminal, para: IDS.ponto110, inicio: sai110, fim: desce },
      { tipo: 'caminhada', de: IDS.ponto110, para: IDS.qualisol, inicio: desce, fim: chega },
    ],
  };
}

/** Todas as idas possíveis do dia, uma por partida do Itamarati. */
export function allIdas(t: Timetables, p: Params): Plan[] {
  return t.itamaratiIda.map((s) => buildIda(t, p, s)).filter((x): x is Plan => x !== null);
}

/** Última combinação (saída mais tarde de Cedral) que chega até `limite`. */
function latestArrivingBy(plans: Plan[], limite: number): Plan | null {
  let best: Plan | null = null;
  for (const plan of plans) {
    if (plan.chegada <= limite && (!best || plan.saida > best.saida)) best = plan;
  }
  return best;
}

export interface IdaResult {
  noLimite: Plan | null;
  comFolga: Plan | null;
}

/** Planejador de ida: `chegada` é o horário em que preciso estar na Qualisol. */
export function planIda(t: Timetables, p: Params, chegada: number): IdaResult {
  const plans = allIdas(t, p);
  return {
    noLimite: latestArrivingBy(plans, chegada),
    comFolga: latestArrivingBy(plans, chegada - p.folgaMinima),
  };
}

/**
 * Monta a volta a partir de uma partida da 110 no Terminal (a 110 é circular:
 * passa no ponto da Qualisol `onibus110TerminalQualisol` minutos depois e chega
 * ao Centro `onibus110QualisolCentro` minutos depois disso).
 */
export function buildVolta(t: Timetables, p: Params, saidaFabrica: number, sai110Terminal: number): Plan | null {
  const noPonto = saidaFabrica + p.caminhadaFabricaPonto;
  const passa = sai110Terminal + p.onibus110TerminalQualisol;
  if (passa < noPonto) return null;
  const chegaCentro = passa + p.onibus110QualisolCentro;
  const naRodoviaria = chegaCentro + p.caminhadaRodoviariaTerminal;
  const saiItamarati = firstAtOrAfter(t.itamaratiVolta, naRodoviaria + p.margemBaldeacao);
  if (saiItamarati === undefined) return null;
  const chega = saiItamarati + p.viagemItamarati;
  return {
    sentido: 'volta',
    saida: saidaFabrica,
    chegada: chega,
    legs: [
      { tipo: 'caminhada', de: IDS.qualisol, para: IDS.ponto110, inicio: saidaFabrica, fim: noPonto },
      { tipo: 'onibus', linha: IDS.l110, sentido: IDS.l110Sentido, de: IDS.ponto110, para: IDS.terminal, inicio: passa, fim: chegaCentro },
      { tipo: 'caminhada', de: IDS.terminal, para: IDS.rodRP, inicio: chegaCentro, fim: naRodoviaria },
      { tipo: 'onibus', linha: IDS.itamarati, sentido: IDS.itamaratiVolta, de: IDS.rodRP, para: IDS.rodCedral, inicio: saiItamarati, fim: chega },
    ],
  };
}

/**
 * Planejador de volta: a partir do horário de saída da fábrica, a primeira
 * combinação e as seguintes (até `max`), sem repetir o mesmo Itamarati.
 */
export function planVolta(t: Timetables, p: Params, saidaFabrica: number, max = 3): Plan[] {
  const result: Plan[] = [];
  for (const s of t.l110) {
    const plan = buildVolta(t, p, saidaFabrica, s);
    if (!plan) continue;
    if (result.some((r) => r.chegada === plan.chegada)) continue;
    result.push(plan);
    if (result.length >= max) break;
  }
  return result;
}

/** Espera total parado (baldeações), útil para comparar opções. */
export function waitingTime(plan: Plan): number {
  let wait = 0;
  for (let i = 1; i < plan.legs.length; i++) wait += plan.legs[i].inicio - plan.legs[i - 1].fim;
  return wait;
}
