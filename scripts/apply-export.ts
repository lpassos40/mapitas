// Aplica um backup exportado pelo app (JSON único) em public/data/*.json,
// para commitar as correções.
// Uso: npm run apply-export -- caminho/mapitas-dados-AAAA-MM-DD.json
import { readFile } from 'node:fs/promises';
import { validateDataset } from '../src/data/validate';
import { writeJson } from './osm';

const file = process.argv[2];
if (!file) {
  console.error('Uso: npm run apply-export -- arquivo.json');
  process.exit(1);
}

const d = validateDataset(JSON.parse(await readFile(file, 'utf8')));
await writeJson('stops.json', d.stops);
await writeJson('lines.json', d.lines);
await writeJson('shapes.json', d.shapes);
await writeJson('params.json', d.params);
await writeJson('holidays.json', d.holidays);
console.log('public/data/ atualizado. Revise com "git diff" e faça o commit.');
