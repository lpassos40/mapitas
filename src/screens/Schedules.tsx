import { AppBar, DaySelect } from '../components/ui';
import { formatDuration, holidayOn, toMinutes } from '../domain/time';
import { IDS, type Dataset, type DayType } from '../domain/types';
import { useLocal, useNow, useTodayType } from '../hooks';

const TABLES = [
  { key: 'ida', linha: IDS.itamarati, sentido: IDS.itamaratiIda, label: 'Cedral → RP', origem: 'Sai da Rodoviária de Cedral' },
  { key: 'volta', linha: IDS.itamarati, sentido: IDS.itamaratiVolta, label: 'RP → Cedral', origem: 'Sai da Rodoviária de Rio Preto' },
  { key: '110', linha: IDS.l110, sentido: IDS.l110Sentido, label: '110', origem: 'Sai do Terminal Urbano' },
] as const;

export function Schedules({ dataset }: { dataset: Dataset }) {
  const now = useNow(30_000);
  const today = useTodayType(dataset.holidays);
  const [choice, setChoice] = useLocal<DayType | 'auto'>('schedules:day', 'auto');
  const [tableKey, setTableKey] = useLocal<string>('schedules:table', 'ida');
  const day = choice === 'auto' ? today : choice;
  // Passados e próximo só fazem sentido na tabela do dia de hoje.
  const isToday = day === today;
  const feriado = holidayOn(now.date, dataset.holidays);

  const table = TABLES.find((x) => x.key === tableKey) ?? TABLES[0];
  const line = dataset.lines.find((l) => l.id === table.linha);
  const times = [...(line?.sentidos.find((s) => s.id === table.sentido)?.horarios[day] ?? [])].sort();
  const nextIdx = isToday ? times.findIndex((x) => toMinutes(x) >= now.minutes) : -1;
  const next = nextIdx >= 0 ? times[nextIdx] : undefined;

  return (
    <div class="screen" style={{ '--line-color': line?.cor }}>
      <AppBar title="Horários">
        <DaySelect value={choice} today={today} onChange={setChoice} />
      </AppBar>

      <div class="segmented" role="tablist">
        {TABLES.map((x) => (
          <button key={x.key} role="tab" aria-selected={x.key === table.key} onClick={() => setTableKey(x.key)}>
            {x.label}
          </button>
        ))}
      </div>

      {feriado && choice === 'auto' && <p class="note">Hoje é feriado ({feriado.nome}): vale a tabela de domingo.</p>}

      {isToday && (
        <section class="next-block">
          {next ? (
            <>
              <span class="next-label">Próximo</span>
              <span class="next-big">{next}</span>
              <span class="next-in">em {formatDuration(toMinutes(next) - now.minutes)}</span>
            </>
          ) : (
            <span class="next-label">Sem mais partidas hoje</span>
          )}
        </section>
      )}

      <section class="table">
        <p class="table-origin">{table.origem}</p>
        {times.length === 0 ? (
          <p class="note">Sem horários neste tipo de dia.</p>
        ) : (
          <ul class="times">
            {times.map((x, i) => (
              <li
                key={x}
                class={i === nextIdx ? 'is-next' : isToday && (nextIdx < 0 || i < nextIdx) ? 'is-past' : ''}
                aria-current={i === nextIdx ? 'time' : undefined}
              >
                {x}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
