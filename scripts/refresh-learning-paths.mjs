import { readFile, writeFile } from 'node:fs/promises';
import catalog from '../src/data/workshops.json' with { type: 'json' };
import { curateLearningPaths, validateLearningPaths } from '../src/utils/learningPaths.js';

const output = new URL('../src/data/learning-paths.json', import.meta.url);
const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
}).formatToParts(new Date());
const part = type => parts.find(item => item.type === type)?.value;
const refreshedAt = `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}+08:00`;
const data = curateLearningPaths(catalog, refreshedAt);
validateLearningPaths(data, catalog);
const contents = `${JSON.stringify(data, null, 2)}\n`;

let previous = '';
try { previous = await readFile(output, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (previous !== contents) await writeFile(output, contents);
console.log(`Refreshed ${data.paths.length} AI-curated learning path with ${data.paths[0].steps.length} catalog-backed steps (${data.refreshedAt}).`);
