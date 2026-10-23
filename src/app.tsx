import { useState } from 'preact/hooks';
import { NextStepCard } from './components/NextStepCard';
import { go, useHashRoute } from './hooks';
import { MapView } from './map/MapView';
import { Planner } from './screens/Planner';
import { Schedules } from './screens/Schedules';
import { Settings } from './screens/Settings';
import { useAppState } from './state';

const TABS = [
  { id: 'mapa', label: 'Mapa', icon: '🗺️' },
  { id: 'planejar', label: 'Planejar', icon: '🧭' },
  { id: 'horarios', label: 'Horários', icon: '🕒' },
  { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
];

export function App() {
  const state = useAppState();
  const route = useHashRoute();
  const [centerTick, setCenterTick] = useState(0);

  if (state.error) {
    return (
      <div class="screen">
        <h1>Não foi possível carregar os dados</h1>
        <p class="warn">{state.error}</p>
        <button class="btn" onClick={() => location.reload()}>
          Tentar de novo
        </button>
      </div>
    );
  }
  if (!state.dataset) return <div class="loading">Carregando…</div>;

  const onMap = route === 'mapa';
  return (
    <div class="app">
      <main class="content">
        <div class="map-screen" hidden={!onMap}>
          <MapView dataset={state.dataset} plan={state.plan} position={state.position} visible={onMap} centerTick={centerTick} />
          <button
            class="fab"
            aria-label="Centralizar na minha posição"
            disabled={!state.position}
            onClick={() => setCenterTick((n) => n + 1)}
          >
            ◎
          </button>
          <div class="overlay-bottom">
            {state.geoError && <p class="toast">{state.geoError}</p>}
            <NextStepCard dataset={state.dataset} plan={state.plan} position={state.position} />
          </div>
        </div>
        {route === 'planejar' && <Planner dataset={state.dataset} />}
        {route === 'horarios' && <Schedules dataset={state.dataset} />}
        {route === 'ajustes' && <Settings state={state} />}
      </main>
      <nav class="tabbar">
        {TABS.map((t) => (
          <button key={t.id} aria-current={route === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
