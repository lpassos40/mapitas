import { isValidTime } from '../domain/time';
import { DAY_TYPES, type Dataset, type Params } from '../domain/types';

const PARAM_KEYS: (keyof Params)[] = [
  'viagemItamarati',
  'caminhadaRodoviariaTerminal',
  'onibus110TerminalQualisol',
  'onibus110QualisolCentro',
  'caminhadaFabricaPonto',
  'folgaMinima',
  'margemBaldeacao',
];

function fail(msg: string): never {
  throw new Error(`Arquivo inválido: ${msg}`);
}

/** Checagem leve do JSON importado; lança Error com mensagem em português. */
export function validateDataset(raw: unknown): Dataset {
  const d = raw as Partial<Dataset>;
  if (!d || typeof d !== 'object') fail('não é um objeto JSON');
  if (!Array.isArray(d.stops)) fail('faltam os pontos (stops)');
  if (!Array.isArray(d.lines)) fail('faltam as linhas (lines)');
  if (!Array.isArray(d.shapes)) fail('faltam os traçados (shapes)');
  if (!d.params) fail('faltam os tempos (params)');
  for (const s of d.stops) {
    if (!s.id || typeof s.lat !== 'number' || typeof s.lng !== 'number') fail(`ponto sem id ou coordenadas: ${JSON.stringify(s)}`);
  }
  for (const l of d.lines) {
    for (const dir of l.sentidos ?? fail(`linha ${l.id} sem sentidos`)) {
      for (const day of DAY_TYPES) {
        for (const t of dir.horarios?.[day] ?? []) if (!isValidTime(t)) fail(`horário "${t}" em ${l.id}/${dir.id}`);
      }
    }
  }
  for (const k of PARAM_KEYS) {
    const v = d.params[k];
    if (typeof v !== 'number' || v < 0) fail(`tempo "${k}" ausente ou negativo`);
  }
  return {
    versao: 1,
    atualizadoEm: d.atualizadoEm ?? '',
    stops: d.stops,
    lines: d.lines,
    shapes: d.shapes,
    params: d.params,
    holidays: Array.isArray(d.holidays) ? d.holidays : [],
  };
}
