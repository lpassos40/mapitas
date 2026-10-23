import { Fragment } from 'preact';
import type { StepKind } from '../domain/nextStep';
import type { Leg, Plan } from '../domain/planner';
import { formatDuration, formatMinutes } from '../domain/time';
import { IDS, type Dataset } from '../domain/types';
import { LineBadge, shortName } from './ui';

function kindOf(leg: Leg): StepKind {
  return leg.tipo === 'caminhada' ? 'caminhada' : leg.linha === IDS.itamarati ? 'itamarati' : '110';
}

/** Trechos em uma linha cada: horário · selo · de → para. */
export function PlanLegs({ plan, dataset }: { plan: Plan; dataset: Dataset }) {
  const name = (id: string) => shortName(dataset, id);
  return (
    <ol class="legs">
      {plan.legs.map((leg, i) => {
        const wait = i > 0 ? leg.inicio - plan.legs[i - 1].fim : 0;
        return (
          <Fragment key={i}>
            {wait > 0 && <li class="leg-wait">espera {formatDuration(wait)}</li>}
            <li class="leg">
              <span class="leg-time">{formatMinutes(leg.inicio)}</span>
              <LineBadge kind={kindOf(leg)} dataset={dataset} />
              <span class="leg-where">
                {leg.tipo === 'caminhada' ? `${formatDuration(leg.fim - leg.inicio)} até ${name(leg.para)}` : `${name(leg.de)} → ${name(leg.para)}`}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
