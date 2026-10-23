import { describe, expect, it } from 'vitest';
import lines from '../public/data/lines.json';
import params from '../public/data/params.json';
import { guessNextStep, nextFromPlan } from '../src/domain/nextStep';
import { planIda, timetablesFor } from '../src/domain/planner';
import { formatMinutes, toMinutes } from '../src/domain/time';
import type { Line, Params, Stop } from '../src/domain/types';

const P = params as Params;
const t = timetablesFor(lines as Line[], 'u');
const stop = (id: string, lat: number, lng: number): Stop => ({ id, nome: id, lat, lng, tipo: 'embarque', precisao: 'aproximado' });
// Coordenadas fictícias, só para a geometria do teste.
const stops = [
  stop('rod-cedral', -20.90, -49.27),
  stop('rod-rp', -20.81, -49.38),
  stop('terminal', -20.815, -49.375),
  stop('p110-gino', -20.76, -49.43),
  stop('qualisol', -20.761, -49.431),
];
const name = (id: string) => id;

describe('guessNextStep', () => {
  it('em Cedral mostra o próximo Itamarati', () => {
    const s = guessNextStep(t, P, toMinutes('06:30'), { lat: -20.901, lng: -49.271 }, stops)!;
    expect(s.titulo).toContain('Cedral');
    expect(formatMinutes(s.quando)).toBe('06:40');
  });

  it('na fábrica mostra a 110 passando no ponto', () => {
    const s = guessNextStep(t, P, toMinutes('17:00'), { lat: -20.7605, lng: -49.4305 }, stops)!;
    expect(formatMinutes(s.quando)).toBe('17:20');
  });

  it('no Centro de manhã mostra a 110; à tarde, o Itamarati de volta', () => {
    const pos = { lat: -20.812, lng: -49.378 };
    expect(formatMinutes(guessNextStep(t, P, toMinutes('07:20'), pos, stops)!.quando)).toBe('07:30');
    expect(formatMinutes(guessNextStep(t, P, toMinutes('18:05'), pos, stops)!.quando)).toBe('18:40');
  });

  it('sem posição decide só pela hora', () => {
    expect(formatMinutes(guessNextStep(t, P, toMinutes('06:00'), null, stops)!.quando)).toBe('06:20');
    expect(formatMinutes(guessNextStep(t, P, toMinutes('16:00'), null, stops)!.quando)).toBe('16:20');
  });

  it('devolve null quando acabaram os horários', () => {
    expect(guessNextStep(t, P, toMinutes('23:30'), { lat: -20.901, lng: -49.271 }, stops)).toBeNull();
  });
});

describe('nextFromPlan', () => {
  it('segue o trecho do plano ativo', () => {
    const plan = planIda(t, P, toMinutes('09:00')).noLimite!;
    expect(nextFromPlan(plan, toMinutes('06:00'), name)!.titulo).toBe('Itamarati sai de rod-cedral');
    expect(formatMinutes(nextFromPlan(plan, toMinutes('07:45'), name)!.quando)).toBe('07:40');
    expect(formatMinutes(nextFromPlan(plan, toMinutes('08:00'), name)!.quando)).toBe('08:25');
    expect(nextFromPlan(plan, toMinutes('09:10'), name)).toBeNull();
  });
});

describe('próximas partidas', () => {
  it('traz a linha, o trecho e as duas partidas seguintes', () => {
    const s = guessNextStep(t, P, toMinutes('06:30'), { lat: -20.901, lng: -49.271 }, stops)!;
    expect(s.tipo).toBe('itamarati');
    expect([s.de, s.para]).toEqual(['rod-cedral', 'rod-rp']);
    expect(s.seguintes.map(formatMinutes)).toEqual(['07:00', '07:50']);
  });

  it('a última do dia não tem seguintes', () => {
    const s = guessNextStep(t, P, toMinutes('22:00'), { lat: -20.901, lng: -49.271 }, stops)!;
    expect(formatMinutes(s.quando)).toBe('22:15');
    expect(s.seguintes).toEqual([]);
  });
});
