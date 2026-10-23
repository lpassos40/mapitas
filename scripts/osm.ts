// Acesso a Nominatim e OSRM só durante o desenvolvimento.
// Políticas: https://operations.osmfoundation.org/policies/nominatim/
// (no máximo 1 req/s, User-Agent identificado) e uso leve dos servidores FOSSGIS.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const USER_AGENT = 'mapitas-dev/0.1 (+https://github.com/lpassos40/mapitas)';
export const DATA_DIR = fileURLToPath(new URL('../public/data/', import.meta.url));

let last = 0;
async function politeFetch(url: string): Promise<unknown> {
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-BR' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} em ${url}`);
  return res.json();
}

export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  category?: string;
  type?: string;
  geojson?: { type: string; coordinates: unknown };
}

export function nominatim(params: Record<string, string>): Promise<NominatimResult[]> {
  const q = new URLSearchParams({ format: 'jsonv2', countrycodes: 'br', addressdetails: '0', ...params });
  return politeFetch(`https://nominatim.openstreetmap.org/search?${q}`) as Promise<NominatimResult[]>;
}

export type LatLng = [number, number];

/** Rota pelos pontos, devolve [lat, lng][]. */
export async function osrmRoute(profile: 'car' | 'foot', points: LatLng[]): Promise<LatLng[]> {
  const coords = points.map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
  const url = `https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${coords}?overview=full&geometries=geojson&continue_straight=true`;
  const data = (await politeFetch(url)) as { code: string; routes: { geometry: { coordinates: [number, number][] } }[] };
  if (data.code !== 'Ok') throw new Error(`OSRM: ${data.code}`);
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [round(lat), round(lng)]);
}

export function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(DATA_DIR + name, 'utf8')) as T;
}

export async function writeJson(name: string, data: unknown): Promise<void> {
  await writeFile(DATA_DIR + name, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
