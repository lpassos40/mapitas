import { Fragment } from 'preact';
import type { Leg, Plan } from '../domain/planner';
import { formatDuration, formatMinutes } from '../domain/time';
import { IDS, type Dataset } from '../domain/types';

export function planTitle(plan: Plan): string {
  return plan.sentido === 'ida'
    ? `Ida · chega ${formatMinutes(plan.chegada)}`
    : `Volta · chega ${formatMinutes(plan.chegada)}`;
}

function legText(leg: Leg, name: (id: string) => string): string {
  if (leg.tipo === 'caminhada') return `A pé até ${name(leg.para)} (${formatDuration(leg.fim - leg.inicio)})`;
  const linha = leg.linha === IDS.itamarati ? 'Itamarati' : '110 Distrito Carlos Arnaldo';
  return `${linha}: ${name(leg.de)} → ${name(leg.para)}, chega ${formatMinutes(leg.fim)}`;
}

export function PlanLegs({ plan, dataset }: { plan: Plan; dataset: Dataset }) {
  const name = (id: string) => dataset.stops.find((s) => s.id === id)?.nome ?? id;
  const color = (leg: Leg) => (leg.tipo === 'caminhada' ? 'var(--walk)' : dataset.lines.find((l) => l.id === leg.linha)?.cor);
  return (
    <ol class="legs">
      {plan.legs.map((leg, i) => {
        const wait = i > 0 ? leg.inicio - plan.legs[i - 1].fim : 0;
        return (
          <Fragment key={i}>
            {wait > 0 && (
              <li class="leg leg-wait">
                <span class="leg-time" />
                <span>espera {formatDuration(wait)}</span>
              </li>
            )}
            <li class={`leg leg-${leg.tipo}`} style={{ '--leg-color': color(leg) }}>
              <span class="leg-time">{formatMinutes(leg.inicio)}</span>
              <span>{legText(leg, name)}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
