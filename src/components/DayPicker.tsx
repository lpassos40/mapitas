import { DAY_TYPE_LABEL, DAY_TYPES, type DayType } from '../domain/types';

interface Props {
  value: DayType | 'auto';
  today: DayType;
  onChange: (v: DayType | 'auto') => void;
}

/** Tipo de dia: automático (hoje) ou escolhido à mão. Feriado = domingo. */
export function DayPicker({ value, today, onChange }: Props) {
  return (
    <div class="segmented segmented-small" role="radiogroup" aria-label="Tipo de dia">
      <button role="radio" aria-checked={value === 'auto'} onClick={() => onChange('auto')}>
        Hoje ({DAY_TYPE_LABEL[today]})
      </button>
      {DAY_TYPES.map((d) => (
        <button key={d} role="radio" aria-checked={value === d} onClick={() => onChange(d)}>
          {DAY_TYPE_LABEL[d]}
        </button>
      ))}
    </div>
  );
}
