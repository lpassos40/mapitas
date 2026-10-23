import { distanceM, type LatLng } from './nextStep';

type Pt = [number, number];

function nearestIndex(points: Pt[], p: LatLng, from = 0): number {
  let best = from;
  let bestD = Infinity;
  for (let i = from; i < points.length; i++) {
    const d = distanceM({ lat: points[i][0], lng: points[i][1] }, p);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Trecho do traçado entre dois pontos. Em linha circular (começo e fim no
 * mesmo lugar), `to` é procurado depois de `from`, para a volta pegar a
 * segunda metade do circuito.
 */
export function sliceShape(points: Pt[], from: LatLng, to: LatLng): Pt[] {
  if (points.length < 2) return points;
  const i = nearestIndex(points, from);
  // Se o ponto de partida é o começo de um circuito, i pode cair no fim: força o começo.
  const start = i === points.length - 1 ? 0 : i;
  const j = nearestIndex(points, to, start + 1);
  return points.slice(start, j + 1);
}

/** Comprimento de uma polilinha em metros. */
export function lengthM(points: Pt[]): number {
  let total = 0;
  for (let k = 1; k < points.length; k++) {
    total += distanceM({ lat: points[k - 1][0], lng: points[k - 1][1] }, { lat: points[k][0], lng: points[k][1] });
  }
  return total;
}
