import { useEffect, useState } from 'preact/hooks';
import { dayTypeOf, localNow, type LocalNow } from './domain/time';
import type { DayType, Holiday } from './domain/types';

/** Hora local de São Paulo, atualizada a cada `ms`. */
export function useNow(ms = 1000): LocalNow {
  const [now, setNow] = useState(() => localNow());
  useEffect(() => {
    const id = setInterval(() => setNow(localNow()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useTodayType(holidays: Holiday[]): DayType {
  const now = useNow(60_000);
  return dayTypeOf(now.date, holidays);
}

/** Estado lembrado no localStorage (só conveniência; falha em silêncio). */
export function useLocal<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  const save = (next: T) => {
    setV(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* sem armazenamento: só não lembra */
    }
  };
  return [v, save];
}

export function useHashRoute(): string {
  const read = () => location.hash.replace(/^#\/?/, '') || 'mapa';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(route: string): void {
  location.hash = `#/${route}`;
}
