import type { Leg, Plan, Timetables } from './planner';
import { IDS, type Params, type Stop } from './types';

export type StepKind = 'itamarati' | '110' | 'caminhada';

export interface NextStep {
  /** Ex.: "Itamarati sai de Cedral" */
  titulo: string;
  /** minutos desde 00:00 em que acontece */
  quando: number;
  tipo: StepKind;
  /** IDs dos pontos do trecho */
  de: string;
  para: string;
  /** próximas partidas depois desta (só sem plano ativo) */
  seguintes: number[];
  /** trecho do plano, quando há plano ativo */
  leg?: Leg;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Distância em metros (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function legTitle(leg: Leg, stopName: (id: string) => string): string {
  if (leg.tipo === 'caminhada') return `Caminhe até ${stopName(leg.para)}`;
  const linha = leg.linha === IDS.itamarati ? 'Itamarati' : `110`;
  return `${linha} sai de ${stopName(leg.de)}`;
}

/** Próximo trecho de um plano ativo que ainda não começou (ou o atual). */
export function nextFromPlan(plan: Plan, now: number, stopName: (id: string) => string): NextStep | null {
  const leg = plan.legs.find((l) => l.fim > now);
  if (!leg) return null;
  const tipo: StepKind = leg.tipo === 'caminhada' ? 'caminhada' : leg.linha === IDS.itamarati ? 'itamarati' : '110';
  return { titulo: legTitle(leg, stopName), quando: leg.inicio, tipo, de: leg.de, para: leg.para, seguintes: [], leg };
}

type Zone = 'cedral' | 'centro' | 'fabrica' | 'desconhecida';

const ZONE_RADIUS_M: Record<Exclude<Zone, 'desconhecida'>, number> = {
  cedral: 4000,
  centro: 2000,
  fabrica: 2000,
};

export function zoneOf(pos: LatLng | null, stops: Stop[]): Zone {
  if (!pos) return 'desconhecida';
  const at = (id: string) => stops.find((s) => s.id === id);
  const near = (id: string, r: number) => {
    const s = at(id);
    return s ? distanceM(pos, s) <= r : false;
  };
  if (near(IDS.rodCedral, ZONE_RADIUS_M.cedral)) return 'cedral';
  if (near(IDS.qualisol, ZONE_RADIUS_M.fabrica) || near(IDS.ponto110, ZONE_RADIUS_M.fabrica)) return 'fabrica';
  if (near(IDS.terminal, ZONE_RADIUS_M.centro) || near(IDS.rodRP, ZONE_RADIUS_M.centro)) return 'centro';
  return 'desconhecida';
}

/** Antes do meio-dia considero que estou indo; depois, voltando. */
const MEIO_DIA = 12 * 60;

/**
 * Próximo passo sem plano ativo: decide pela posição (ponto conhecido mais
 * próximo) e pela hora.
 */
export function guessNextStep(
  t: Timetables,
  p: Params,
  now: number,
  pos: LatLng | null,
  stops: Stop[],
): NextStep | null {
  const zone = zoneOf(pos, stops);
  const indo = now < MEIO_DIA;
  const departure = (times: number[], step: Omit<NextStep, 'quando' | 'seguintes'>): NextStep | null => {
    const i = times.findIndex((x) => x >= now);
    return i < 0 ? null : { ...step, quando: times[i], seguintes: times.slice(i + 1, i + 3) };
  };
  const itamaratiCedral = () =>
    departure(t.itamaratiIda, { titulo: 'Itamarati sai de Cedral', tipo: 'itamarati', de: IDS.rodCedral, para: IDS.rodRP });
  const itamaratiRP = () =>
    departure(t.itamaratiVolta, { titulo: 'Itamarati sai da Rodoviária de Rio Preto', tipo: 'itamarati', de: IDS.rodRP, para: IDS.rodCedral });
  const l110Terminal = () =>
    departure(t.l110, { titulo: '110 sai do Terminal Urbano', tipo: '110', de: IDS.terminal, para: IDS.ponto110 });
  const l110Ponto = () =>
    departure(
      t.l110.map((x) => x + p.onibus110TerminalQualisol),
      { titulo: '110 passa no ponto da Qualisol', tipo: '110', de: IDS.ponto110, para: IDS.terminal },
    );

  switch (zone) {
    case 'cedral':
      return itamaratiCedral();
    case 'fabrica':
      return l110Ponto();
    case 'centro':
      return indo ? l110Terminal() : itamaratiRP();
    default:
      return indo ? itamaratiCedral() : l110Ponto();
  }
}
