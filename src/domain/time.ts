import type { DayType, Holiday } from './types';

export const TIME_ZONE = 'America/Sao_Paulo';

/** "06:40" → 400. Aceita minutos acima de 24h na volta ("24:15" → 1455). */
export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`Horário inválido: "${hhmm}"`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (min > 59) throw new Error(`Horário inválido: "${hhmm}"`);
  return h * 60 + min;
}

export function isValidTime(hhmm: string): boolean {
  try {
    return toMinutes(hhmm) < 24 * 60;
  } catch {
    return false;
  }
}

/** 400 → "06:40"; 1455 → "00:15" (horário do relógio). */
export function formatMinutes(total: number): string {
  const t = ((Math.round(total) % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Duração amigável: "12 min", "1 h 05 min". */
export function formatDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, '0')} min`;
}

export interface LocalNow {
  /** "AAAA-MM-DD" no fuso de São Paulo */
  date: string;
  /** minutos desde 00:00 */
  minutes: number;
  /** segundos dentro do minuto, para a contagem regressiva */
  seconds: number;
}

export function localNow(d: Date = new Date()): LocalNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    seconds: Number(get('second')),
  };
}

/** Domingo de Páscoa (algoritmo de Meeus/Butcher), como "AAAA-MM-DD". */
export function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function holidayOn(date: string, holidays: Holiday[]): Holiday | undefined {
  const year = Number(date.slice(0, 4));
  return holidays.find((h) => {
    const mov = /^pascoa([+-]\d+)$/.exec(h.data);
    if (mov) return addDays(easter(year), Number(mov[1])) === date;
    if (/^\d{2}-\d{2}$/.test(h.data)) return date.slice(5) === h.data;
    return h.data === date;
  });
}

/** Dia da semana (0 = domingo) de uma data "AAAA-MM-DD". */
export function weekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Feriado conta como domingo. */
export function dayTypeOf(date: string, holidays: Holiday[]): DayType {
  if (holidayOn(date, holidays)) return 'd';
  const w = weekday(date);
  if (w === 0) return 'd';
  if (w === 6) return 's';
  return 'u';
}
