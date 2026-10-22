export const BEDROCK_MODEL_CATALOG_URL = 'https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html';

const PATH_STEPS = [
  {
    id: 'kiro-foundations',
    label: 'Get comfortable with Kiro',
    rationale: 'Start with Kiro’s spec-driven workflow so you can plan and steer the build before adding model and agent complexity.',
    preferredIds: ['de3c344e-5cee-48a9-84e9-0292b7708734', '7aa94656-c586-4ee3-8b5a-5494b3b488b4'],
    matches: workshop => hasService(workshop, 'kiro') && /kiro express|kiro core/i.test(workshop.title),
  },
  {
    id: 'bedrock-and-kiro',
    label: 'Build with Bedrock, Kiro, and agent tools',
    rationale: 'Connect Kiro to Bedrock and learn how Strands and AgentCore fit into an agent-building workflow.',
    preferredIds: ['cdbce152-b193-43df-8099-908ee2d1a6e4'],
    matches: workshop => hasService(workshop, 'amazon bedrock') && hasService(workshop, 'kiro') && /agentcore|strands|agent/i.test(searchable(workshop)),
  },
  {
    id: 'responsible-ai',
    label: 'Add safety checks',
    rationale: 'Put responsible-use controls in place before exposing a generative AI application to users.',
    preferredIds: ['53c38a96-45e0-4019-967a-c73dcbe7a839', '3f7fa89c-c004-4ee0-908c-934d57d0d418'],
    matches: workshop => hasService(workshop, 'amazon bedrock') && /guardrail/i.test(searchable(workshop)),
  },
  {
    id: 'agentcore-deploy',
    label: 'Run an agent with AgentCore',
    rationale: 'Move from a local prototype to the managed runtime and services used to operate agents on AWS.',
    preferredIds: ['c770f35f-90a9-4e02-8985-4ef912bddb77'],
    matches: workshop => hasService(workshop, 'amazon bedrock agentcore') && /getting started|getting started with agentcore|official workshop/i.test(workshop.title),
  },
  {
    id: 'evaluate-and-observe',
    label: 'Evaluate and observe the result',
    rationale: 'Finish with evaluation and observability so you can measure quality and diagnose production behavior.',
    preferredIds: ['7b162876-713b-4ba9-88f8-524ee00d1f7c', '927fb19e-6733-4986-904c-3e63b28c21e7', 'a2a9ba66-60b1-4dca-b38f-b2112d82d1b8'],
    matches: workshop => hasService(workshop, 'amazon bedrock')
      && /evaluat|observab|prototype to production/i.test(searchable(workshop)),
  },
];

function searchable(workshop) {
  return [workshop.title, workshop.description, ...(workshop.topics || []), ...(workshop.services || [])].join(' ').toLocaleLowerCase();
}

function hasService(workshop, fragment) {
  return (workshop.services || []).some(service => service.toLocaleLowerCase().includes(fragment));
}

function chooseWorkshop(workshops, step, usedIds) {
  const preferredOrder = new Map(step.preferredIds.map((id, index) => [id, index]));
  return workshops.filter(workshop => !usedIds.has(workshop.id)
    && (preferredOrder.has(workshop.id) || step.matches(workshop)))
    .sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)
      || (preferredOrder.get(a.id) ?? Infinity) - (preferredOrder.get(b.id) ?? Infinity)
      || (a.durationHours ?? Infinity) - (b.durationHours ?? Infinity)
      || a.title.localeCompare(b.title))[0];
}

export function curateLearningPaths(catalog, refreshedAt = new Date().toISOString()) {
  const usedIds = new Set();
  const steps = PATH_STEPS.flatMap(step => {
    const workshop = chooseWorkshop(catalog.workshops, step, usedIds);
    if (!workshop) return [];
    usedIds.add(workshop.id);
    return [{ id: step.id, label: step.label, rationale: step.rationale, workshopId: workshop.id }];
  });

  return {
    refreshedAt,
    cadence: 'Monthly, on the first day of the month',
    catalogCheckedAt: catalog.checkedAt,
    paths: [{
      id: 'kiro-current-models',
      title: 'Build with Kiro and today’s models',
      description: 'A guided route from Kiro fundamentals to a Bedrock-powered agent you can secure, deploy, and evaluate.',
      modelCatalogUrl: BEDROCK_MODEL_CATALOG_URL,
      steps,
    }],
  };
}

export function validateLearningPaths(data, catalog) {
  const workshopIds = new Set(catalog.workshops.map(workshop => workshop.id));
  if (!Array.isArray(data.paths) || !data.paths.length) throw new Error('At least one curated learning path is required.');
  for (const path of data.paths) {
    if (!path.title || !Array.isArray(path.steps) || path.steps.length < 3) throw new Error(`Learning path “${path.id}” is incomplete.`);
    for (const step of path.steps) {
      if (!workshopIds.has(step.workshopId)) throw new Error(`Learning path step “${step.id}” references a missing workshop.`);
    }
  }
  return true;
}
