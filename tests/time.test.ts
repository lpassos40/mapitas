import { describe, expect, it } from 'vitest';
import holidays from '../public/data/holidays.json';
import { dayTypeOf, easter, formatDuration, formatMinutes, isValidTime, localNow, toMinutes } from '../src/domain/time';

describe('conversão de horários', () => {
  it('converte ida e volta', () => {
    expect(toMinutes('06:40')).toBe(400);
    expect(formatMinutes(400)).toBe('06:40');
    expect(formatMinutes(1455)).toBe('00:15');
  });

  it('valida horários', () => {
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('7:5')).toBe(false);
    expect(isValidTime('abc')).toBe(false);
  });

  it('formata durações', () => {
    expect(formatDuration(12)).toBe('12 min');
    expect(formatDuration(65)).toBe('1 h 05 min');
    expect(formatDuration(120)).toBe('2 h');
  });
});

describe('tipo de dia', () => {
  it('detecta útil, sábado e domingo', () => {
    expect(dayTypeOf('2026-10-23', holidays)).toBe('u'); // sexta
    expect(dayTypeOf('2026-10-24', holidays)).toBe('s');
    expect(dayTypeOf('2026-10-25', holidays)).toBe('d');
  });

  it('feriado conta como domingo', () => {
    expect(dayTypeOf('2026-10-12', holidays)).toBe('d'); // segunda, N. Sra. Aparecida
    expect(dayTypeOf('2026-04-03', holidays)).toBe('d'); // Sexta-feira Santa
    expect(dayTypeOf('2026-06-04', holidays)).toBe('d'); // Corpus Christi
  });

  it('calcula a Páscoa', () => {
    expect(easter(2024)).toBe('2024-03-31');
    expect(easter(2025)).toBe('2025-04-20');
    expect(easter(2026)).toBe('2026-04-05');
  });

  it('usa o fuso de São Paulo', () => {
    // 02:30 UTC de sábado = 23:30 de sexta em São Paulo
    const now = localNow(new Date('2026-10-24T02:30:00Z'));
    expect(now.date).toBe('2026-10-23');
    expect(now.minutes).toBe(23 * 60 + 30);
  });
});
