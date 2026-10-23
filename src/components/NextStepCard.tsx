import { guessNextStep, legTitle, nextFromPlan } from '../domain/nextStep';
import { timetablesFor } from '../domain/planner';
import { formatDuration, formatMinutes } from '../domain/time';
import { DAY_TYPE_LABEL, type Dataset } from '../domain/types';
import { useNow, useTodayType } from '../hooks';
import { setPlan, type AppState } from '../state';
import { planTitle } from './PlanView';

interface Props {
  dataset: Dataset;
  plan: AppState['plan'];
  position: AppState['position'];
}

export function NextStepCard({ dataset, plan, position }: Props) {
  const now = useNow();
  const day = useTodayType(dataset.holidays);
  const stopName = (id: string) => dataset.stops.find((s) => s.id === id)?.nome ?? id;
  const t = timetablesFor(dataset.lines, day);
  const step = plan ? nextFromPlan(plan, now.minutes, stopName) : guessNextStep(t, dataset.params, now.minutes, position, dataset.stops);

  let when = '';
  if (step) {
    const left = step.quando * 60 - (now.minutes * 60 + now.seconds);
    if (left > 59) when = `em ${formatDuration(Math.floor(left / 60))}`;
    else if (left > 0) when = 'agora';
    else when = step.leg ? `em andamento até ${formatMinutes(step.leg.fim)}` : 'agora';
  }

  return (
    <section class="card next" aria-live="polite">
      <div class="next-head">
        <span class="chip">{DAY_TYPE_LABEL[day]}</span>
        {plan && (
          <span class="chip chip-plan">
            {planTitle(plan)}
            <button class="chip-x" aria-label="Limpar trajeto" onClick={() => setPlan(null)}>
              ✕
            </button>
          </span>
        )}
      </div>
      {step ? (
        <>
          <p class="next-title">
            {step.titulo} às <strong>{formatMinutes(step.quando)}</strong>
          </p>
          <p class="next-when">{when}</p>
        </>
      ) : plan ? (
        <>
          <p class="next-title">
            {legTitle(plan.legs[0], stopName)} às <strong>{formatMinutes(plan.legs[0].inicio)}</strong>
          </p>
          <p class="next-when next-past">já passou hoje</p>
        </>
      ) : (
        <p class="next-title">Sem mais ônibus hoje.</p>
      )}
    </section>
  );
}
