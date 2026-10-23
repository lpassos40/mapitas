import type { ComponentChildren } from 'preact';
import type { StepKind } from '../domain/nextStep';
import type { Plan } from '../domain/planner';
import { formatMinutes } from '../domain/time';
import { DAY_TYPE_LABEL, DAY_TYPES, IDS, type Dataset, type DayType } from '../domain/types';

/** Nomes curtos para caber numa linha no celular. */
const SHORT: Record<string, string> = {
  [IDS.rodCedral]: 'Cedral',
  [IDS.rodRP]: 'Rodoviária',
  [IDS.terminal]: 'Terminal',
  [IDS.ponto110]: 'Gino Cecconi',
  [IDS.qualisol]: 'Qualisol',
};

export function shortName(dataset: Dataset, id: string): string {
  return SHORT[id] ?? dataset.stops.find((s) => s.id === id)?.nome ?? id;
}

export function kindColor(dataset: Dataset, kind: StepKind): string {
  if (kind === 'caminhada') return 'var(--walk)';
  return dataset.lines.find((l) => l.id === (kind === 'itamarati' ? IDS.itamarati : IDS.l110))?.cor ?? 'var(--ink)';
}

const BADGE_LABEL: Record<StepKind, string> = { itamarati: 'Itamarati', '110': '110', caminhada: 'A pé' };

export function LineBadge({ kind, dataset }: { kind: StepKind; dataset: Dataset }) {
  return (
    <span class={`badge badge-${kind}`} style={{ '--c': kindColor(dataset, kind) }}>
      {BADGE_LABEL[kind]}
    </span>
  );
}

export function AppBar({ title, children }: { title: string; children?: ComponentChildren }) {
  return (
    <header class="appbar">
      <h1>{title}</h1>
      {children}
    </header>
  );
}

/** Tipo de dia compacto: um select com "Hoje" como padrão. */
export function DaySelect({ value, today, onChange }: { value: DayType | 'auto'; today: DayType; onChange: (v: DayType | 'auto') => void }) {
  return (
    <label class="select-chip">
      <span class="sr-only">Tipo de dia</span>
      <select value={value} onChange={(e) => onChange(e.currentTarget.value as DayType | 'auto')}>
        <option value="auto">Hoje · {DAY_TYPE_LABEL[today]}</option>
        {DAY_TYPES.map((d) => (
          <option key={d} value={d}>
            {DAY_TYPE_LABEL[d]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Barra do trajeto: cada trecho proporcional à duração; espera hachurada. */
export function TripStrip({ plan, dataset }: { plan: Plan; dataset: Dataset }) {
  const total = plan.chegada - plan.saida;
  const parts: { kind: StepKind | 'espera'; min: number }[] = [];
  plan.legs.forEach((leg, i) => {
    const wait = i > 0 ? leg.inicio - plan.legs[i - 1].fim : 0;
    if (wait > 0) parts.push({ kind: 'espera', min: wait });
    const kind: StepKind = leg.tipo === 'caminhada' ? 'caminhada' : leg.linha === IDS.itamarati ? 'itamarati' : '110';
    parts.push({ kind, min: leg.fim - leg.inicio });
  });
  return (
    <div class="strip" aria-hidden="true">
      <div class="strip-bar">
        {parts.map((p, i) => (
          <span
            key={i}
            class={`strip-seg strip-${p.kind}`}
            style={{ flexGrow: p.min, '--c': p.kind === 'espera' ? undefined : kindColor(dataset, p.kind) }}
          />
        ))}
      </div>
      <div class="strip-ends">
        <span>{formatMinutes(plan.saida)}</span>
        <span>{Math.floor(total / 60)}h{String(total % 60).padStart(2, '0')}</span>
        <span>{formatMinutes(plan.chegada)}</span>
      </div>
    </div>
  );
}

type IconName = 'map' | 'route' | 'clock' | 'sliders' | 'locate' | 'close' | 'gps-off';

const PATHS: Record<IconName, string> = {
  map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 3',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  locate: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3',
  close: 'M6 6l12 12M18 6L6 18',
  'gps-off': 'M12 19a7 7 0 0 1-7-7M12 5a7 7 0 0 1 7 7M12 2v3M12 19v3M2 12h3M19 12h3M4 4l16 16',
};

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
