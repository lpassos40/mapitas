import { useState } from 'preact/hooks';
import { NextStepCard } from './components/NextStepCard';
import { Icon } from './components/ui';
import { go, useHashRoute } from './hooks';
import { MapView } from './map/MapView';
import { Planner } from './screens/Planner';
import { Schedules } from './screens/Schedules';
import { Settings } from './screens/Settings';
import { useAppState } from './state';

const TABS = [
  { id: 'mapa', label: 'Mapa', icon: 'map' },
  { id: 'planejar', label: 'Planejar', icon: 'route' },
  { id: 'horarios', label: 'Horários', icon: 'clock' },
  { id: 'ajustes', label: 'Ajustes', icon: 'sliders' },
] as const;

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
          {state.position && (
            <button class="fab" aria-label="Centralizar na minha posição" onClick={() => setCenterTick((n) => n + 1)}>
              <Icon name="locate" size={28} />
            </button>
          )}
          <div class="overlay-bottom">
            <NextStepCard dataset={state.dataset} plan={state.plan} position={state.position} geoError={state.geoError} />
          </div>
        </div>
        {route === 'planejar' && <Planner dataset={state.dataset} />}
        {route === 'horarios' && <Schedules dataset={state.dataset} />}
        {route === 'ajustes' && <Settings state={state} />}
      </main>
      <nav class="tabbar">
        {TABS.map((t) => (
          <button key={t.id} aria-current={route === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
