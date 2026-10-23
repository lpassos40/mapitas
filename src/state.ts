import { useEffect, useState } from 'preact/hooks';
import { clearEdits, loadDataset, saveDataset } from './data/store';
import type { Plan } from './domain/planner';
import type { Dataset } from './domain/types';

export interface Position {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface AppState {
  dataset: Dataset | null;
  defaults: Dataset | null;
  edited: boolean;
  defaultsChanged: boolean;
  error: string | null;
  /** opção escolhida no planejador, desenhada no mapa */
  plan: Plan | null;
  position: Position | null;
  geoError: string | null;
}

let state: AppState = {
  dataset: null,
  defaults: null,
  edited: false,
  defaultsChanged: false,
  error: null,
  plan: null,
  position: null,
  geoError: null,
};
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useAppState(): AppState {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => {
    const l = () => setSnapshot(state);
    listeners.add(l);
    // O estado pode ter mudado entre o render e a assinatura (dados em cache chegam rápido).
    l();
    return () => void listeners.delete(l);
  }, []);
  return snapshot;
}

export async function init(): Promise<void> {
  try {
    const r = await loadDataset();
    setState({ dataset: r.dataset, defaults: r.defaults, edited: r.edited, defaultsChanged: r.defaultsChanged });
  } catch (e) {
    setState({ error: e instanceof Error ? e.message : String(e) });
  }
  watchPosition();
}

function watchPosition() {
  if (!('geolocation' in navigator)) {
    setState({ geoError: 'Este aparelho não informa a localização.' });
    return;
  }
  navigator.geolocation.watchPosition(
    (p) => setState({ position: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }, geoError: null }),
    (e) =>
      setState({
        geoError: e.code === e.PERMISSION_DENIED ? 'Permita o acesso à localização para ver onde você está.' : 'Localização indisponível no momento.',
      }),
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
  );
}

export function setPlan(plan: Plan | null): void {
  setState({ plan });
}

/** Aplica uma edição e grava no IndexedDB. */
export async function updateDataset(fn: (d: Dataset) => Dataset): Promise<void> {
  const { dataset, defaults } = state;
  if (!dataset || !defaults) return;
  const next = await saveDataset(fn(structuredClone(dataset)), defaults);
  setState({ dataset: next, edited: true, defaultsChanged: false });
}

export async function replaceDataset(d: Dataset): Promise<void> {
  await updateDataset(() => d);
}

export async function resetToDefaults(): Promise<void> {
  await clearEdits();
  setState({ dataset: state.defaults, edited: false, defaultsChanged: false, plan: null });
}

export function keepEdits(): void {
  const { dataset } = state;
  if (dataset) void replaceDataset(dataset);
}
