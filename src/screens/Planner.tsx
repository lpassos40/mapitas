import { PlanLegs } from '../components/PlanView';
import { AppBar, DaySelect, TripStrip } from '../components/ui';
import { planIda, planVolta, timetablesFor, waitingTime, type Plan } from '../domain/planner';
import { formatDuration, formatMinutes, isValidTime, toMinutes } from '../domain/time';
import type { Dataset, DayType } from '../domain/types';
import { go, useLocal, useTodayType } from '../hooks';
import { setPlan } from '../state';

interface OptionProps {
  tag: string;
  tone: 'yellow' | 'green' | 'plain';
  plan: Plan | null;
  dataset: Dataset;
  emptyText?: string;
}

function Option({ tag, tone, plan, dataset, emptyText }: OptionProps) {
  if (!plan) {
    return (
      <article class="option is-empty">
        <header class="option-head">
          <span class={`tag tag-${tone}`}>{tag}</span>
        </header>
        <p class="option-empty">{emptyText ?? 'Nenhuma combinação chega a tempo.'}</p>
      </article>
    );
  }
  const first = plan.legs.find((l) => l.tipo === 'onibus')!;
  const wait = waitingTime(plan);
  return (
    <article class="option">
      <header class="option-head">
        <span class={`tag tag-${tone}`}>{tag}</span>
        <span class="option-arrive">
          <small>chega</small> {formatMinutes(plan.chegada)}
        </span>
      </header>
      <p class="option-sub">
        {plan.sentido === 'ida' ? `Sair de Cedral às ${formatMinutes(first.inicio)}` : `Pegar a 110 às ${formatMinutes(first.inicio)}`}
        {wait > 0 && ` · ${formatDuration(wait)} de espera`}
      </p>
      <TripStrip plan={plan} dataset={dataset} />
      <PlanLegs plan={plan} dataset={dataset} />
      <button
        class="btn btn-block"
        onClick={() => {
          setPlan(plan);
          go('mapa');
        }}
      >
        Ver no mapa
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
      <AppBar title="Planejar">
        <DaySelect value={dayChoice} today={today} onChange={setDayChoice} />
      </AppBar>

      <div class="planner-form">
        <div class="segmented" role="tablist">
          <button role="tab" aria-selected={mode === 'ida'} onClick={() => setMode('ida')}>
            Ida
          </button>
          <button role="tab" aria-selected={mode === 'volta'} onClick={() => setMode('volta')}>
            Volta
          </button>
        </div>
        <label class="time-field">
          <span>{mode === 'ida' ? 'Chegar na Qualisol até' : 'Sair da fábrica às'}</span>
          <input type="time" value={value} onInput={(e) => setValue(e.currentTarget.value)} required />
        </label>
      </div>

      {!valid && <p class="warn">Informe um horário.</p>}

      {valid && mode === 'ida' && (() => {
        const r = planIda(t, p, toMinutes(value));
        return (
          <div class="options">
            <Option tag="Com folga" tone="green" plan={r.comFolga} dataset={dataset} />
            <Option tag="No limite" tone="yellow" plan={r.noLimite} dataset={dataset} />
          </div>
        );
      })()}

      {valid && mode === 'volta' && (() => {
        const plans = planVolta(t, p, toMinutes(value));
        if (plans.length === 0) {
          return <Option tag="Volta" tone="plain" plan={null} dataset={dataset} emptyText="Sem combinação de volta depois desse horário." />;
        }
        return (
          <div class="options">
            {plans.map((plan, i) => (
              <Option key={i} tag={i === 0 ? 'Primeira' : `${i + 1}ª opção`} tone={i === 0 ? 'green' : 'plain'} plan={plan} dataset={dataset} />
            ))}
          </div>
        );
      })()}

      <p class="note">
        Tempos usados: Itamarati {p.viagemItamarati} min, 110 {p.onibus110TerminalQualisol} min, folga {p.folgaMinima} min, baldeação{' '}
        {p.margemBaldeacao} min. Mude em Ajustes.
      </p>
    </div>
  );
}
