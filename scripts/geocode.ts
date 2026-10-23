// Gera public/data/stops.json geocodificando os endereços via Nominatim.
// Todos os pontos saem como "aproximado": corrija depois pelo app.
// Uso: npm run geocode
import type { Stop } from '../src/domain/types';
import { nominatim, round, writeJson } from './osm';

interface Source extends Omit<Stop, 'lat' | 'lng' | 'precisao'> {
  busca: Record<string, string>;
}

const RP = 'São José do Rio Preto';

const sources: Source[] = [
  {
    id: 'rod-cedral',
    nome: 'Rodoviária de Cedral',
    tipo: 'embarque',
    // Endereço da rodoviária não encontrado: usa o Centro (Prefeitura) como ponto de partida.
    busca: { street: '429 Avenida Antônio dos Santos Galante', city: 'Cedral', state: 'São Paulo' },
    observacao: 'Endereço da rodoviária não encontrado; posição do Centro de Cedral. Corrija no local.',
  },
  {
    id: 'rod-rp',
    nome: 'Rodoviária de Rio Preto',
    tipo: 'desembarque',
    busca: { street: 'Rua Pedro Amaral', city: RP, state: 'São Paulo' },
    observacao: 'Rua Pedro Amaral, s/n. Desce e embarca o Itamarati.',
  },
  {
    id: 'terminal',
    nome: 'Terminal Urbano',
    tipo: 'embarque',
    // A estação nomeada no OSM é mais precisa que o centro da rua.
    busca: { q: 'Terminal Urbano Rio Preto' },
    observacao: 'Rua Bernardino de Campos, 2491. Partidas da 110.',
  },
  {
    id: 'p110-gino',
    nome: 'Ponto da 110 — Rua Gino Cecconi',
    tipo: 'desembarque',
    busca: { street: 'Rua Gino Cecconi', city: RP, state: 'São Paulo' },
    observacao: 'Desce na ida; embarca na volta (a 110 segue o circuito até o Centro).',
  },
  {
    id: 'qualisol',
    nome: 'Qualisol',
    tipo: 'referencia',
    busca: { street: '100 Rua Kamel Chaddad', city: RP, state: 'São Paulo' },
    observacao: 'Rua Kamel Chaddad, 100 — Distrito Industrial Dr. Carlos Arnaldo e Silva, CEP 15052-755.',
  },
];

const stops: Stop[] = [];
for (const { busca, ...s } of sources) {
  let [hit] = await nominatim({ ...busca, limit: '1' });
  if (!hit && busca.street) {
    // Sem número: tenta só a rua.
    const street = busca.street.replace(/^\d+\s+/, '');
    [hit] = await nominatim({ ...busca, street, limit: '1' });
  }
  if (!hit) throw new Error(`Nada encontrado para ${s.nome}`);
  console.log(`${s.id.padEnd(10)} ${hit.lat}, ${hit.lon}  ${hit.display_name}`);
  stops.push({ ...s, lat: round(Number(hit.lat)), lng: round(Number(hit.lon)), precisao: 'aproximado' });
}

await writeJson('stops.json', stops);
console.log(`stops.json: ${stops.length} pontos`);
