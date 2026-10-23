import { useState } from 'preact/hooks';
import { exportJson, importJson } from '../data/store';
import { isValidTime } from '../domain/time';
import { DAY_TYPE_LABEL, DAY_TYPES, type Dataset, type DayType, type Params, type Precision } from '../domain/types';
import { keepEdits, replaceDataset, resetToDefaults, updateDataset, type AppState } from '../state';

const PARAM_LABEL: Record<keyof Params, string> = {
  viagemItamarati: 'Viagem do Itamarati (Cedral ⇄ Rio Preto)',
  caminhadaRodoviariaTerminal: 'Caminhada rodoviária ⇄ Terminal',
  onibus110TerminalQualisol: '110: Terminal → ponto da Qualisol',
  onibus110QualisolCentro: '110: ponto da Qualisol → Centro',
  caminhadaFabricaPonto: 'Caminhada fábrica ⇄ ponto',
  folgaMinima: 'Folga mínima na chegada',
  margemBaldeacao: 'Margem mínima na baldeação',
};

function ParamsEditor({ params }: { params: Params }) {
  return (
    <section class="card">
      <h2>Tempos (minutos)</h2>
      {(Object.keys(PARAM_LABEL) as (keyof Params)[]).map((k) => (
        <label class="field field-row" key={k}>
          <span>{PARAM_LABEL[k]}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={240}
            value={params[k]}
            onChange={(e) => {
              const v = Number(e.currentTarget.value);
              if (Number.isFinite(v) && v >= 0) void updateDataset((d) => ({ ...d, params: { ...d.params, [k]: Math.round(v) } }));
            }}
          />
        </label>
      ))}
    </section>
  );
}

/** Horários de um sentido/tipo de dia, um campo de texto ("06:40 07:00 …"). */
function TimesField({ lineId, dirId, day, times }: { lineId: string; dirId: string; day: DayType; times: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const save = (text: string) => {
    const list = text.split(/[\s,;]+/).filter(Boolean);
    const bad = list.find((t) => !isValidTime(t));
    if (bad) {
      setError(`"${bad}" não é um horário (use HH:MM).`);
      return;
    }
    setError(null);
    const sorted = [...new Set(list)].sort();
    void updateDataset((d) => {
      const dir = d.lines.find((l) => l.id === lineId)!.sentidos.find((s) => s.id === dirId)!;
      dir.horarios[day] = sorted;
      return d;
    });
  };
  return (
    <label class="field">
      <span>{DAY_TYPE_LABEL[day]}</span>
      <textarea rows={3} spellcheck={false} onChange={(e) => save(e.currentTarget.value)} value={times.join(' ')} />
      {error && <span class="warn">{error}</span>}
    </label>
  );
}

function SchedulesEditor({ dataset }: { dataset: Dataset }) {
  return (
    <section class="card">
      <h2>Horários</h2>
      <p class="note">Separe por espaço. Ao sair do campo, a lista é ordenada e salva.</p>
      {dataset.lines.flatMap((l) =>
        l.sentidos.map((s) => (
          <fieldset key={`${l.id}/${s.id}`}>
            <legend>
              {l.nome} — {s.nome}
            </legend>
            {DAY_TYPES.map((day) => (
              <TimesField key={day} lineId={l.id} dirId={s.id} day={day} times={s.horarios[day]} />
            ))}
          </fieldset>
        )),
      )}
    </section>
  );
}

function StopsEditor({ dataset }: { dataset: Dataset }) {
  const patch = (id: string, changes: Partial<Dataset['stops'][number]>) =>
    void updateDataset((d) => ({ ...d, stops: d.stops.map((s) => (s.id === id ? { ...s, ...changes } : s)) }));
  return (
    <section class="card">
      <h2>Pontos</h2>
      <p class="note">Na Fase 3 o app marca pelo GPS. Por enquanto, cole a coordenada (ex.: do Google Maps).</p>
      {dataset.stops.map((s) => (
        <fieldset key={s.id}>
          <legend>{s.nome}</legend>
          <label class="field">
            <span>Latitude, longitude</span>
            <input
              type="text"
              inputMode="decimal"
              value={`${s.lat}, ${s.lng}`}
              onChange={(e) => {
                const m = /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(e.currentTarget.value);
                if (m) patch(s.id, { lat: Number(m[1]), lng: Number(m[2]) });
              }}
            />
          </label>
          <label class="field field-row">
            <span>Precisão</span>
            <select value={s.precisao} onChange={(e) => patch(s.id, { precisao: e.currentTarget.value as Precision })}>
              <option value="aproximado">Aproximado</option>
              <option value="confirmado">Confirmado</option>
            </select>
          </label>
          {s.observacao && <p class="note">{s.observacao}</p>}
        </fieldset>
      ))}
    </section>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Backup({ dataset, edited }: { dataset: Dataset; edited: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section class="card">
      <h2>Backup</h2>
      <p class="note">
        {edited ? 'Você tem edições salvas neste aparelho.' : 'Usando os dados do repositório.'} Exporte para commitar
        as correções (veja o README).
      </p>
      <div class="buttons">
        <button class="btn" onClick={() => download(`mapitas-dados-${today}.json`, exportJson(dataset))}>
          Exportar JSON
        </button>
        <label class="btn">
          Importar JSON
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0];
              if (!file) return;
              try {
                await replaceDataset(importJson(await file.text()));
                setMsg('Dados importados.');
              } catch (err) {
                setMsg(err instanceof Error ? err.message : String(err));
              }
              e.currentTarget.value = '';
            }}
          />
        </label>
        <button
          class="btn btn-danger"
          disabled={!edited}
          onClick={() => {
            if (confirm('Descartar suas edições e voltar aos dados do repositório?')) void resetToDefaults().then(() => setMsg('Dados padrão restaurados.'));
          }}
        >
          Restaurar padrão
        </button>
      </div>
      {msg && <p class="note" role="status">{msg}</p>}
    </section>
  );
}

export function Settings({ state }: { state: AppState }) {
  const dataset = state.dataset!;
  return (
    <div class="screen">
      <h1>Ajustes</h1>
      {state.defaultsChanged && (
        <section class="card banner">
          <p>Os dados do repositório mudaram desde suas edições neste aparelho.</p>
          <div class="buttons">
            <button class="btn" onClick={() => void resetToDefaults()}>
              Usar os do repositório
            </button>
            <button class="btn btn-ghost" onClick={keepEdits}>
              Manter os meus
            </button>
          </div>
        </section>
      )}
      <ParamsEditor params={dataset.params} />
      <SchedulesEditor dataset={dataset} />
      <StopsEditor dataset={dataset} />
      <Backup dataset={dataset} edited={state.edited} />
    </div>
  );
}
