import { PlanLegs } from '../components/PlanView';
import { DayPicker } from '../components/DayPicker';
import { planIda, planVolta, timetablesFor, type Plan } from '../domain/planner';
import { formatMinutes, isValidTime, toMinutes } from '../domain/time';
import type { Dataset, DayType } from '../domain/types';
import { go, useLocal, useTodayType } from '../hooks';
import { setPlan } from '../state';

function Option({ label, hint, plan, dataset }: { label: string; hint: string; plan: Plan | null; dataset: Dataset }) {
  if (!plan) {
    return (
      <article class="card option option-empty">
        <h3>{label}</h3>
        <p>Nenhuma combinação chega a tempo.</p>
      </article>
    );
  }
  const show = () => {
    setPlan(plan);
    go('mapa');
  };
  return (
    <article class="card option">
      <button class="option-hit" onClick={show} aria-label={`${label}: ver no mapa`}>
        <h3>
          {label} <small>{hint}</small>
        </h3>
        <p class="option-summary">
          {plan.sentido === 'ida' ? `Sai ${formatMinutes(plan.saida)}` : `110 passa ${formatMinutes(plan.legs[1].inicio)}`} → chega{' '}
          <strong>{formatMinutes(plan.chegada)}</strong>
        </p>
        <PlanLegs plan={plan} dataset={dataset} />
        <span class="option-cta">Ver no mapa ›</span>
      </button>
    </article>
  );
}

export function Planner({ dataset }: { dataset: Dataset }) {
  const today = useTodayType(dataset.holidays);
  const [mode, setMode] = useLocal<'ida' | 'volta'>('planner:mode', 'ida');
  const [chegada, setChegada] = useLocal('planner:chegada', '08:00');
  const [saida, setSaida] = useLocal('planner:saida', '17:00');
  const [dayChoice, setDayChoice] = useLocal<DayType | 'auto'>('planner:day', 'auto');
  const day = dayChoice === 'auto' ? today : dayChoice;
  const t = timetablesFor(dataset.lines, day);
  const p = dataset.params;

  const value = mode === 'ida' ? chegada : saida;
  const setValue = mode === 'ida' ? setChegada : setSaida;
  const valid = isValidTime(value);

  return (
    <div class="screen">
      <h1>Planejar</h1>
      <div class="segmented" role="tablist">
        <button role="tab" aria-selected={mode === 'ida'} onClick={() => setMode('ida')}>
          Ida
        </button>
        <button role="tab" aria-selected={mode === 'volta'} onClick={() => setMode('volta')}>
          Volta
        </button>
      </div>

      <label class="field field-big">
        <span>{mode === 'ida' ? 'Preciso chegar na Qualisol às' : 'Saio da fábrica às'}</span>
        <input type="time" value={value} onInput={(e) => setValue(e.currentTarget.value)} required />
      </label>

      <DayPicker value={dayChoice} today={today} onChange={setDayChoice} />

      {!valid && <p class="warn">Informe um horário.</p>}

      {valid && mode === 'ida' && (() => {
        const r = planIda(t, p, toMinutes(value));
        return (
          <>
            <Option label="No limite" hint="última que chega a tempo" plan={r.noLimite} dataset={dataset} />
            <Option label="Com folga" hint={`chega ${p.folgaMinima} min antes ou mais`} plan={r.comFolga} dataset={dataset} />
          </>
        );
      })()}

      {valid && mode === 'volta' && (() => {
        const plans = planVolta(t, p, toMinutes(value));
        if (plans.length === 0) {
          return (
            <article class="card option option-empty">
              <p>Sem combinação de volta para hoje depois desse horário.</p>
            </article>
          );
        }
        return plans.map((plan, i) => (
          <Option key={i} label={i === 0 ? 'Primeira opção' : `Opção ${i + 1}`} hint="" plan={plan} dataset={dataset} />
        ));
      })()}
    </div>
  );
}
