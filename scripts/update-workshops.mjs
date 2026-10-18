import { readFile, writeFile, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const WORKSHOP_SOURCE = 'https://builder.aws.com/build/workshops';
export const SERVICE_SOURCE = 'https://aws.amazon.com/products/';
const output = new URL('../src/data/workshops.json', import.meta.url);
const userAgent = 'aws-community-world/1.0 (https://github.com/Jagatees/aws-community-world)';

const text = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const key = value => text(value).toLowerCase().replace(/&/g, 'and').replace(/\b(amazon|aws)\b/g, '').replace(/[^a-z0-9]/g, '');
const keys = value => [value.replace(/\([^)]*\)/g, ''), ...Array.from(value.matchAll(/\(([^)]+)\)/g), match => match[1])].map(key).filter(Boolean);
const unique = values => [...new Set(values.filter(Boolean))];
const slug = value => text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CATEGORY_NAMES = {
  'ai-ml': 'AI & Machine Learning', 'machine-learning': 'AI & Machine Learning',
  'Artificial Intelligence (AI)': 'AI & Machine Learning', 'Machine Learning': 'AI & Machine Learning',
  analytics: 'Analytics', 'app-integration': 'Application Integration', 'arch-strategy': 'Architecture Strategy',
  blockchain: 'Blockchain', 'business-apps': 'Business Applications', compute: 'Compute', containers: 'Containers',
  'cost-mgmt': 'Cloud Financial Management', databases: 'Databases', devtools: 'Developer Tools', euc: 'End-User Computing',
  iot: 'Internet of Things', 'media-services': 'Media Services', 'mgmt-govern': 'Management & Governance',
  migration: 'Migration', mobile: 'Front End Web & Mobile', 'networking-content-dev': 'Networking & Content Delivery',
  quantum: 'Quantum Technologies', satellite: 'Aerospace & Satellite',
  'security-identity-compliance': 'Security, Identity & Compliance', Security: 'Security, Identity & Compliance',
  'Security & Identity': 'Security, Identity & Compliance', serverless: 'Serverless', storage: 'Storage',
};

// Only explicit service/feature relationships, never fuzzy name matches.
const PARENTS = {
  'AWS Toolkit for Visual Studio': 'AWS Tools and SDKs',
  'Amazon CloudWatch Logs': 'Amazon CloudWatch',
  'Amazon CloudWatch Events': 'Amazon CloudWatch',
  'Amazon SageMaker Studio': 'Amazon SageMaker',
  'Amazon SageMaker with MLflow': 'Amazon SageMaker',
  'AWS Transform Custom': 'AWS Transform',
  'Amazon RDS for MySQL': 'Amazon RDS',
  'Amazon RDS for Oracle': 'Amazon RDS',
  'Amazon RDS for PostgreSQL': 'Amazon RDS',
  'Amazon RDS for SQL Server': 'Amazon RDS',
  'Amazon S3 Tables': 'Amazon Simple Storage Service (S3)',
  'Amazon FSx for Lustre': 'Amazon FSx',
  'Amazon OpenSearch Ingestion': 'Amazon OpenSearch Service',
  'Amazon EC2 Spot': 'Amazon EC2',
  'EC2 Image Builder': 'Amazon EC2',
  'Amazon Kinesis Data Streams': 'Amazon Kinesis',
};

export function publicUrl(value, domain) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing catalog link.');
  const url = new URL(value, `https://${domain}/`);
  const officialProductHost = domain === 'aws.amazon.com' && ['kiro.dev'].includes(url.hostname);
  if (url.protocol !== 'https:' || (!officialProductHost && url.hostname !== domain && !url.hostname.endsWith(`.${domain}`))) throw new Error(`Unexpected catalog link host: ${url.hostname}`);
  url.search = '';
  url.hash = '';
  return url.href;
}

export function extractWorkshops(html) {
  const match = html.match(/<script\b[^>]*id=["']__bingo-ssr-query-state__["'][^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Workshop hydration data missing; existing snapshot preserved.');
  const state = JSON.parse(match[1]);
  const query = state.workshops?.queries?.find(item => item.queryKey?.[0] === 'workshops' && item.queryKey?.[1] === 'list' && item.queryKey?.[2] === 'en');
  if (!Array.isArray(query?.state?.data) || !query.state.data.length) throw new Error('Empty or unrecognized workshop catalog.');
  return query.state.data;
}

export function buildCatalog(rawWorkshops, productPayload, checkedAt = new Date().toISOString()) {
  if (!Array.isArray(productPayload.items) || !productPayload.items.length || productPayload.items.length !== productPayload.metadata?.totalHits) throw new Error('Incomplete AWS product directory; existing snapshot preserved.');
  const services = [];
  const serviceKeys = new Map();
  const workshopIds = new Set();
  for (const { item, tags = [] } of productPayload.items) {
    const fields = item?.additionalFields;
    const name = text(fields?.title);
    if (!name || !item?.name) throw new Error('Invalid AWS product record.');
    const canonical = key(name);
    if (serviceKeys.has(canonical)) continue;
    let category;
    try { category = JSON.parse(fields.badge)?.value?.[0]; } catch { /* Older directory entries only provide category tags. */ }
    const categoryTags = tags.filter(tag => tag.tagNamespaceId === 'GLOBAL#aws-tech-category').map(tag => tag.name);
    const fallbackCategory = text(category) || tags.find(tag => tag.tagNamespaceId === 'GLOBAL#aws-technology-categories')?.name || 'Other services';
    const categories = unique((categoryTags.length ? categoryTags : [fallbackCategory]).map(value => CATEGORY_NAMES[value] || value));
    const service = {
      id: item.name, name, description: text(fields.body),
      category: categories[0], categories,
      url: publicUrl(fields.ctaLink, 'aws.amazon.com'), aliases: [], kind: 'product',
    };
    services.push(service);
    for (const candidate of [canonical, ...keys(name)]) serviceKeys.set(candidate, service);
  }
  const resolveService = name => keys(name).map(candidate => serviceKeys.get(candidate)).find(Boolean);
  const rawTags = unique(rawWorkshops.flatMap(workshop => workshop.attributes?.find(attribute => attribute.name === 'AWS services')?.value?.stringListValue || []));
  const tagServices = new Map();
  for (const name of rawTags) {
    let service = resolveService(name);
    const parent = PARENTS[name] ? resolveService(PARENTS[name]) : null;
    if (!service) {
      service = { id: `catalog-${slug(name)}`, name, description: '', category: parent?.category || 'More services & features', categories: parent?.categories || ['More services & features'], url: '', aliases: [], kind: 'catalog' };
      services.push(service);
      for (const candidate of keys(name)) serviceKeys.set(candidate, service);
    }
    if (service.name !== name) service.aliases = unique([...service.aliases, name]);
    tagServices.set(name, unique([service.id, parent?.id]));
  }
  if (new Set(services.map(service => service.id)).size !== services.length) throw new Error('Duplicate service identifiers.');
  const workshops = rawWorkshops.map(item => {
    if (!item.contentId || !text(item.title) || workshopIds.has(item.contentId)) throw new Error('Missing or duplicate workshop identifier.');
    workshopIds.add(item.contentId);
    const attribute = name => item.attributes?.find(value => value.name === name)?.value || {};
    const services = unique(attribute('AWS services').stringListValue || []);
    const level = attribute('Complexity level').stringValue?.match(/\b[1-4]00\b/)?.[0] || '';
    const duration = Number(attribute('Recommended duration').stringValue);
    return {
      id: item.contentId, title: text(item.title), description: text(item.description),
      url: publicUrl(item.catalogUrl, 'workshops.aws'), services,
      serviceIds: unique(services.flatMap(name => tagServices.get(name) || [])),
      topics: unique(attribute('Topics').stringListValue || []), level,
      durationHours: Number.isFinite(duration) && duration > 0 ? duration : null,
      languages: unique((item.localeCodes || []).map(locale => String(locale).split(/[-_]/)[0].toLowerCase())),
      updatedAt: Number.isFinite(Date.parse(item.lastUpdatedAt)) ? item.lastUpdatedAt : null,
      createdAt: Number.isFinite(Date.parse(item.createdAt)) ? item.createdAt : null,
      sandboxAvailable: item.demoEnabled === true,
    };
  });
  if (!workshops.length) throw new Error('Empty workshop catalog.');
  return { sourceUrl: WORKSHOP_SOURCE, servicesSourceUrl: SERVICE_SOURCE, checkedAt, productCount: services.filter(service => service.kind === 'product').length, services: services.sort((a, b) => a.name.localeCompare(b.name)), workshops: workshops.sort((a, b) => a.title.localeCompare(b.title)) };
}

export async function fetchCatalog(fetchImpl = fetch) {
  const productUrl = new URL('https://aws.amazon.com/api/dirs/items/search');
  productUrl.search = new URLSearchParams({ 'item.directoryId': 'products-cards-interactive-aws-products-ams', 'item.locale': 'en_US', 'tags.id': 'GLOBAL#local-tags-aws-products-type#service', sort_by: 'item.additionalFields.title', sort_order: 'asc', size: '1000' });
  const responses = await Promise.all([WORKSHOP_SOURCE, productUrl].map(url => fetchImpl(url, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(30000) })));
  if (responses.some(response => !response.ok)) throw new Error('Could not fetch complete workshop sources; existing snapshot preserved.');
  return buildCatalog(extractWorkshops(await responses[0].text()), await responses[1].json());
}

async function main() {
  const catalog = await fetchCatalog();
  let previous;
  try { previous = JSON.parse(await readFile(output, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous && (catalog.workshops.length < previous.workshops.length / 2 || catalog.services.length < previous.services.length / 2)) throw new Error('Catalog shrank by more than half. Review the source before replacing the snapshot.');
  const temporary = new URL('./workshops.json.tmp', output);
  await writeFile(temporary, `${JSON.stringify(catalog, null, 2)}\n`);
  await rename(temporary, output);
  console.log(`Imported ${catalog.workshops.length} workshops, ${catalog.productCount} AWS products and ${catalog.services.length - catalog.productCount} additional workshop services/features.`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main().catch(error => { console.error(error.message); process.exitCode = 1; });
