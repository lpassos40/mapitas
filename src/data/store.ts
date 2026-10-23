import { del, get, set } from 'idb-keyval';
import type { Dataset } from '../domain/types';
import { validateDataset } from './validate';

const KEY = 'mapitas:dataset';
const FILES = ['stops', 'lines', 'shapes', 'params', 'holidays'] as const;

interface Saved {
  dataset: Dataset;
  /** impressão digital dos dados padrão sobre os quais as edições foram feitas */
  baseHash: string;
}

export interface LoadResult {
  dataset: Dataset;
  defaults: Dataset;
  edited: boolean;
  /** há edições locais, mas os dados do repositório mudaram desde então */
  defaultsChanged: boolean;
}

async function loadDefaults(): Promise<Dataset> {
  const base = import.meta.env.BASE_URL;
  const [stops, lines, shapes, params, holidays] = await Promise.all(
    FILES.map(async (f) => {
      const res = await fetch(`${base}data/${f}.json`);
      if (!res.ok) throw new Error(`Falha ao carregar ${f}.json (${res.status})`);
      return res.json();
    }),
  );
  return { versao: 1, atualizadoEm: '', stops, lines, shapes, params, holidays };
}

function hash(d: Dataset): string {
  const s = JSON.stringify([d.stops, d.lines, d.shapes, d.params, d.holidays]);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

export async function loadDataset(): Promise<LoadResult> {
  const defaults = await loadDefaults();
  let saved: Saved | undefined;
  try {
    saved = await get<Saved>(KEY);
  } catch {
    saved = undefined; // IndexedDB indisponível (aba anônima etc.)
  }
  if (!saved) return { dataset: defaults, defaults, edited: false, defaultsChanged: false };
  return { dataset: saved.dataset, defaults, edited: true, defaultsChanged: saved.baseHash !== hash(defaults) };
}

export async function saveDataset(dataset: Dataset, defaults: Dataset): Promise<Dataset> {
  const stamped = { ...dataset, atualizadoEm: new Date().toISOString() };
  await set(KEY, { dataset: stamped, baseHash: hash(defaults) } satisfies Saved);
  return stamped;
}

export async function clearEdits(): Promise<void> {
  await del(KEY);
}

export function exportJson(dataset: Dataset): string {
  return JSON.stringify(dataset, null, 2) + '\n';
}

export function importJson(text: string): Dataset {
  return validateDataset(JSON.parse(text));
}
