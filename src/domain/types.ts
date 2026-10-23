/** u = segunda a sexta, s = sábado, d = domingo e feriado */
export type DayType = 'u' | 's' | 'd';
export const DAY_TYPES: DayType[] = ['u', 's', 'd'];
export const DAY_TYPE_LABEL: Record<DayType, string> = {
  u: 'Dia útil',
  s: 'Sábado',
  d: 'Domingo/feriado',
};

export type Precision = 'aproximado' | 'confirmado';
export type StopKind = 'embarque' | 'desembarque' | 'referencia';

export interface Stop {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  tipo: StopKind;
  precisao: Precision;
  observacao?: string;
}

export interface Direction {
  id: string;
  nome: string;
  /** Horários "HH:MM" de partida do primeiro ponto, por tipo de dia. */
  horarios: Record<DayType, string[]>;
  /** IDs de stops, em ordem. */
  paradas: string[];
}

export interface Line {
  id: string;
  nome: string;
  operadora: string;
  cor: string;
  sentidos: Direction[];
}

export interface Shape {
  linha: string;
  sentido: string;
  precisao: Precision;
  /** [lat, lng] */
  pontos: [number, number][];
}

/** Tempos em minutos. */
export interface Params {
  viagemItamarati: number;
  caminhadaRodoviariaTerminal: number;
  onibus110TerminalQualisol: number;
  onibus110QualisolCentro: number;
  caminhadaFabricaPonto: number;
  folgaMinima: number;
  margemBaldeacao: number;
}

/**
 * data: "MM-DD" (todo ano), "AAAA-MM-DD" (data única) ou
 * "pascoa+N"/"pascoa-N" (móvel, em dias a partir do domingo de Páscoa).
 */
export interface Holiday {
  data: string;
  nome: string;
}

export interface Dataset {
  versao: 1;
  atualizadoEm: string;
  stops: Stop[];
  lines: Line[];
  shapes: Shape[];
  params: Params;
  holidays: Holiday[];
}

/** IDs fixos usados pelo planejador. */
export const IDS = {
  itamarati: 'itamarati',
  itamaratiIda: 'cedral-rp',
  itamaratiVolta: 'rp-cedral',
  l110: '110',
  l110Sentido: 'circular',
  rodCedral: 'rod-cedral',
  rodRP: 'rod-rp',
  terminal: 'terminal',
  ponto110: 'p110-gino',
  qualisol: 'qualisol',
} as const;
