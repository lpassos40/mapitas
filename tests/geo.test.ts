import { describe, expect, it } from 'vitest';
import { sliceShape } from '../src/domain/geo';

// Circuito quadrado: começa e termina em (0,0), passa por (0,2) no meio.
const loop: [number, number][] = [
  [0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [1, 0], [0, 0],
];

describe('sliceShape', () => {
  it('ida: do começo do circuito até o ponto', () => {
    expect(sliceShape(loop, { lat: 0, lng: 0 }, { lat: 0, lng: 2 })).toEqual([[0, 0], [0, 1], [0, 2]]);
  });

  it('volta: do ponto até o fim do circuito', () => {
    expect(sliceShape(loop, { lat: 0, lng: 2 }, { lat: 0, lng: 0 })).toEqual([[0, 2], [1, 2], [1, 1], [1, 0], [0, 0]]);
  });
});
