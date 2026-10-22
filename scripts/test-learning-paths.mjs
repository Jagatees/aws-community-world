import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import catalog from '../src/data/workshops.json' with { type: 'json' };
import savedPaths from '../src/data/learning-paths.json' with { type: 'json' };
import { BEDROCK_MODEL_CATALOG_URL, curateLearningPaths, validateLearningPaths } from '../src/utils/learningPaths.js';

assert.equal(validateLearningPaths(savedPaths, catalog), true);
assert.equal(savedPaths.paths[0].steps.length, 5);
assert.equal(new Set(savedPaths.paths[0].steps.map(step => step.workshopId)).size, 5, 'a workshop should appear only once in a path');
assert.equal(savedPaths.paths[0].modelCatalogUrl, BEDROCK_MODEL_CATALOG_URL);
assert.match(savedPaths.paths[0].title, /Kiro/i);

const selected = savedPaths.paths[0].steps.map(step => catalog.workshops.find(workshop => workshop.id === step.workshopId));
assert.match(selected[0].title, /Kiro Express|Kiro Core/i);
assert.match(selected[1].title, /Bedrock.*Kiro|Kiro.*Bedrock/i);
assert.match(selected[2].title, /Guardrail/i);
assert.match(selected[3].title, /AgentCore/i);
assert.match(selected[4].title, /Evaluat|Observab|Prototype/i);

const refreshed = curateLearningPaths(catalog, '2026-11-01T08:00:00+08:00');
assert.equal(refreshed.refreshedAt, '2026-11-01T08:00:00+08:00');
assert.equal(refreshed.catalogCheckedAt, catalog.checkedAt);
assert.equal(validateLearningPaths(refreshed, catalog), true);

const newerKiro = {
  ...catalog.workshops.find(workshop => workshop.title === 'Kiro Express'),
  id: 'newer-kiro-express-workshop',
  title: 'Kiro Express: Latest Workflow',
  updatedAt: '2026-10-31T00:00:00Z',
};
const monthlyUpdate = curateLearningPaths({ ...catalog, workshops: [...catalog.workshops, newerKiro] }, '2026-11-01T08:00:00+08:00');
assert.equal(monthlyUpdate.paths[0].steps[0].workshopId, newerKiro.id, 'newer matching workshops should be considered during the monthly refresh');

const generatedSource = await readFile(new URL('./refresh-learning-paths.mjs', import.meta.url), 'utf8');
assert.match(generatedSource, /Asia\/Singapore/);
console.log(`Curated learning path checks passed (${catalog.workshops.length} workshops reviewed).`);
