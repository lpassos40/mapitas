// Gera public/data/shapes.json com traçados aproximados (OSRM, perfil carro):
// - Itamarati: rodoviária de Cedral ⇄ rodoviária de Rio Preto
// - 110: pela sequência de ruas do itinerário, usando os cruzamentos entre
//   ruas consecutivas como pontos de passagem.
// Uso: npm run shapes (depois de npm run geocode)
import type { Shape, Stop } from '../src/domain/types';
import { nominatim, osrmRoute, readJson, writeJson, type LatLng } from './osm';

const ITINERARIO_110 = [
  'Rua Bernardino de Campos',
  'Rua Fernão Dias Paes Leme',
  'Rua Cristóvão Colombo',
  'Rua Capitão João Batista de Souza',
  'Rua Sergipe',
  'Avenida Danilo Galeazzi',
  'Rua Doutor Antônio Homsi Filho',
  'Rodovia Transbrasiliana',
  'Avenida Santa Paula', // no itinerário: "Av. Paula"
  'Rua Alerio Francisco Mariano',
  'Rua Antônio Francisco Dutra',
  'Rua Admar Gonçalves',
  'Rua José Ernesto Sobrinho',
  'Rua Antônio Machado',
  'Rua Gino Cecconi',
  'Rua Doutor Leonan Luís Almeida Gouveia', // grafia do OSM
  'Rua Cinco',
  'Rua Luiz Rocha Ribeiro',
  'Avenida Doutor Antônio Marques dos Santos',
  'Rua Renato Biscuola',
  'Rua Bela Vista',
  'Rua Josina Teixeira de Carvalho',
  'Rua Cristóvão Colombo',
  'Rua General Glicério',
  'Rua Jordão Reis',
];

const stops = await readJson<Stop[]>('stops.json');
const at = (id: string): LatLng => {
  const s = stops.find((x) => x.id === id);
  if (!s) throw new Error(`Ponto ${id} não está em stops.json`);
  return [s.lat, s.lng];
};

// Área da cidade (Centro ao Distrito Industrial), para não pegar ruas homônimas de outras cidades.
const CITY_VIEWBOX = '-49.45,-20.66,-49.30,-20.87';

/**
 * Vértices das vias com esse nome. Quando há homônimas (ex.: "Rua Cinco"),
 * fica só com os trechos mais próximos da rua anterior do itinerário.
 */
async function streetPoints(name: string, prev: LatLng[] | null): Promise<LatLng[]> {
  const hits = await nominatim({ q: name, viewbox: CITY_VIEWBOX, bounded: '1', polygon_geojson: '1', limit: '30' });
  const ways: LatLng[][] = [];
  for (const h of hits) {
    if (h.category !== 'highway' || !h.geojson) continue;
    const g = h.geojson;
    const lines = (g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []) as [number, number][][];
    for (const line of lines) ways.push(line.map(([lng, lat]) => [lat, lng]));
  }
  if (!prev || ways.length <= 1) return ways.flat();
  const d = ways.map((w) => crossing(prev, w).m);
  const min = Math.min(...d);
  return ways.filter((_, i) => d[i] <= min + 300).flat();
}

function dist2(a: LatLng, b: LatLng): number {
  const dx = (a[1] - b[1]) * Math.cos((a[0] * Math.PI) / 180);
  const dy = a[0] - b[0];
  return dx * dx + dy * dy;
}

/** Par de vértices mais próximo entre duas vias (≈ cruzamento) e a distância em metros. */
function crossing(a: LatLng[], b: LatLng[]): { pa: LatLng; pb: LatLng; p: LatLng; m: number } {
  let best = { i: 0, j: 0, d: Infinity };
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      const d = dist2(a[i], b[j]);
      if (d < best.d) best = { i, j, d };
    }
  }
  const p: LatLng = [(a[best.i][0] + b[best.j][0]) / 2, (a[best.i][1] + b[best.j][1]) / 2];
  return { pa: a[best.i], pb: b[best.j], p, m: Math.sqrt(best.d) * 111_000 };
}

const shapes: Shape[] = [];

console.log('Itamarati…');
shapes.push({ linha: 'itamarati', sentido: 'cedral-rp', precisao: 'aproximado', pontos: await osrmRoute('car', [at('rod-cedral'), at('rod-rp')]) });
shapes.push({ linha: 'itamarati', sentido: 'rp-cedral', precisao: 'aproximado', pontos: await osrmRoute('car', [at('rod-rp'), at('rod-cedral')]) });

console.log('110…');
const terminal = at('terminal');
const found: { name: string; pts: LatLng[] }[] = [];
for (const name of ITINERARIO_110) {
  const pts = await streetPoints(name, found.at(-1)?.pts ?? null);
  if (pts.length === 0) console.warn(`  ! ${name}: não encontrada, ignorada`);
  else found.push({ name, pts });
}

// Rua longe das duas vizinhas é quase certamente homônima de outro bairro.
const ISOLADA_M = 2500;
const ruas = found.filter((r, i) => {
  const gap = (j: number) => (found[j] ? crossing(r.pts, found[j].pts).m : 0);
  const isolada = gap(i - 1) > ISOLADA_M && gap(i + 1) > ISOLADA_M;
  if (isolada) console.warn(`  ! ${r.name}: longe das ruas vizinhas, ignorada`);
  return !isolada;
});

const waypoints: LatLng[] = [terminal];
for (let i = 1; i < ruas.length; i++) {
  const c = crossing(ruas[i - 1].pts, ruas[i].pts);
  if (c.m <= 150) {
    waypoints.push(c.p);
  } else {
    // Ruas que não se tocam no OSM: passa pelo fim de uma e pelo começo da outra.
    console.warn(`  ! ${ruas[i - 1].name} → ${ruas[i].name}: ${Math.round(c.m)} m entre elas`);
    waypoints.push(c.pa, c.pb);
  }
}
waypoints.push(terminal);
shapes.push({ linha: '110', sentido: 'circular', precisao: 'aproximado', pontos: await osrmRoute('car', waypoints) });

await writeJson('shapes.json', shapes);
for (const s of shapes) console.log(`${s.linha}/${s.sentido}: ${s.pontos.length} pontos`);
