import { DayPicker } from '../components/DayPicker';
import { holidayOn, toMinutes } from '../domain/time';
import type { Dataset, DayType } from '../domain/types';
import { useLocal, useNow, useTodayType } from '../hooks';

export function Schedules({ dataset }: { dataset: Dataset }) {
  const now = useNow(30_000);
  const today = useTodayType(dataset.holidays);
  const [choice, setChoice] = useLocal<DayType | 'auto'>('schedules:day', 'auto');
  const day = choice === 'auto' ? today : choice;
  // Passados e próximo só fazem sentido na tabela do dia de hoje.
  const isToday = day === today;
  const feriado = holidayOn(now.date, dataset.holidays);

  return (
    <div class="screen">
      <h1>Horários</h1>
      <DayPicker value={choice} today={today} onChange={setChoice} />
      {feriado && <p class="note">Hoje é feriado ({feriado.nome}): vale a tabela de domingo.</p>}
      {dataset.lines.flatMap((line) =>
        line.sentidos.map((dir) => {
          const times = [...dir.horarios[day]].sort();
          const next = isToday ? times.find((x) => toMinutes(x) >= now.minutes) : undefined;
          return (
            <section class="card table" key={`${line.id}/${dir.id}`} style={{ '--line-color': line.cor }}>
              <h2>
                <span class="swatch" /> {line.id === '110' ? line.nome : `Itamarati ${dir.nome}`}
              </h2>
              {line.id === '110' && <p class="note">Partidas do Terminal Urbano.</p>}
              {times.length === 0 ? (
                <p class="note">Sem horários neste tipo de dia.</p>
              ) : (
                <ul class="times">
                  {times.map((x) => {
                    const past = isToday && toMinutes(x) < now.minutes;
                    return (
                      <li key={x} class={x === next ? 'next' : past ? 'past' : ''} aria-current={x === next ? 'time' : undefined}>
                        {x}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        }),
      )}
    </div>
  );
}
