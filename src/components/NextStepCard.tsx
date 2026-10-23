import { guessNextStep, nextFromPlan, type NextStep } from '../domain/nextStep';
import { timetablesFor } from '../domain/planner';
import { formatMinutes } from '../domain/time';
import type { Dataset } from '../domain/types';
import { useNow, useTodayType } from '../hooks';
import { setPlan, type AppState } from '../state';
import { Icon, LineBadge, shortName } from './ui';

interface Props {
  dataset: Dataset;
  plan: AppState['plan'];
  position: AppState['position'];
  geoError: string | null;
}

/** Contagem compacta: número grande + legenda curta. */
function countdown(step: NextStep, nowSec: number): { num: string; unit: string } {
  const left = step.quando * 60 - nowSec;
  if (left <= 0) return step.leg && step.leg.fim * 60 > nowSec ? { num: formatMinutes(step.leg.fim), unit: 'em andamento até' } : { num: 'agora', unit: '' };
  const min = Math.ceil(left / 60);
  if (min < 60) return { num: String(min), unit: min === 1 ? 'minuto' : 'minutos' };
  return { num: `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`, unit: 'para sair' };
}

export function NextStepCard({ dataset, plan, position, geoError }: Props) {
  const now = useNow();
  const day = useTodayType(dataset.holidays);
  const name = (id: string) => shortName(dataset, id);
  const t = timetablesFor(dataset.lines, day);
  const nowSec = now.minutes * 60 + now.seconds;

  let step = plan ? nextFromPlan(plan, now.minutes, name) : guessNextStep(t, dataset.params, now.minutes, position, dataset.stops);
  const planPassed = plan !== null && step === null;
  if (planPassed) step = nextFromPlan(plan, -1, name);

  const c = step && !planPassed ? countdown(step, nowSec) : null;

  return (
    <section class="sheet" aria-live="polite">
      {plan && (
        <div class="sheet-plan">
          <span>
            Seu trajeto · {plan.sentido} · chega <strong>{formatMinutes(plan.chegada)}</strong>
          </span>
          <button class="icon-btn" aria-label="Limpar trajeto" onClick={() => setPlan(null)}>
            <Icon name="close" size={20} />
          </button>
        </div>
      )}

      {step ? (
        <div class="sheet-main">
          <div class="sheet-info">
            <div class="sheet-line">
              <LineBadge kind={step.tipo} dataset={dataset} />
              <span class="sheet-route">
                {name(step.de)} → {name(step.para)}
              </span>
            </div>
            <div class="sheet-time">{formatMinutes(step.quando)}</div>
          </div>
          <div class={`sheet-count${planPassed ? ' is-past' : ''}`}>
            {c ? (
              <>
                <span class="count-num">{c.num}</span>
                <span class="count-unit">{c.unit}</span>
              </>
            ) : (
              <span class="count-unit">já passou hoje</span>
            )}
          </div>
        </div>
      ) : (
        <p class="sheet-empty">Sem mais ônibus hoje.</p>
      )}

      {((step && step.seguintes.length > 0) || geoError) && (
        <div class="sheet-foot">
          {step && step.seguintes.length > 0 && <span>Depois: {step.seguintes.map(formatMinutes).join(' · ')}</span>}
          {geoError && (
            <span class="sheet-gps" title={geoError}>
              <Icon name="gps-off" size={16} /> sem localização
            </span>
          )}
        </div>
      )}
    </section>
  );
}
