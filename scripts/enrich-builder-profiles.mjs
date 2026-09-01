import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATHS = {
  communityBuilders: path.join(__dirname, '..', 'src', 'data', 'community-builders.json'),
  heroes: path.join(__dirname, '..', 'src', 'data', 'heroes.json'),
  studentGroups: path.join(__dirname, '..', 'src', 'data', 'cloud-clubs.json'),
};
const PROFILE_API_URL = 'https://api.builder.aws.com/ums/getProfileByAlias';
const CONCURRENCY = Math.max(1, Number.parseInt(process.env.PROFILE_ENRICH_CONCURRENCY || '8', 10));
const LIMIT = Math.max(0, Number.parseInt(process.env.PROFILE_ENRICH_LIMIT || '0', 10));
const DRY_RUN = process.env.PROFILE_ENRICH_DRY_RUN === '1';
const MAX_ERROR_RATE = Math.max(0, Number.parseFloat(process.env.PROFILE_ENRICH_MAX_ERROR_RATE || '0.05'));
const ONLY_ALIASES = new Set(
  (process.env.PROFILE_ENRICH_ONLY || '')
    .split(',')
    .map((alias) => alias.trim())
    .filter(Boolean),
);

const SOCIAL_SOURCES = [
  { source: 'linkedIn', target: 'linkedin', baseUrl: 'https://www.linkedin.com/in/' },
  { source: 'github', target: 'github', baseUrl: 'https://github.com/' },
  { source: 'twitter', target: 'x', baseUrl: 'https://x.com/' },
  { source: 'devto', target: 'devto', baseUrl: 'https://dev.to/' },
  { source: 'youtube', target: 'youtube', baseUrl: 'https://www.youtube.com/@' },
  { source: 'facebook', target: 'facebook', baseUrl: 'https://www.facebook.com/' },
  { source: 'repost', target: 'repost', baseUrl: 'https://repost.aws/community/users/' },
  { source: 'blog', target: 'blog' },
  { source: 'personal', target: 'website' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildHeaders() {
  return {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    origin: 'https://builder.aws.com',
    referer: 'https://builder.aws.com/',
    'user-agent': 'Mozilla/5.0 (compatible; aws-community-world-profile-bot/1.0)',
    'builder-session-token': 'dummy',
  };
}

function validateHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function normalizeSocialUrl(value, baseUrl) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return validateHttpUrl(trimmed);
  }

  if (/^\/\//.test(trimmed)) {
    return validateHttpUrl(`https:${trimmed}`);
  }

  if (/^[\w.-]+\.[a-z]{2,}(?:[/?#]|$)/i.test(trimmed)) {
    return validateHttpUrl(`https://${trimmed}`);
  }

  if (!baseUrl) return '';

  const handle = trimmed.replace(/^@/, '').replace(/^\/+|\/+$/g, '');
  return handle ? validateHttpUrl(`${baseUrl}${handle}`) : '';
}

function normalizeSocials(socials) {
  if (!socials || typeof socials !== 'object') return {};

  const normalized = {};
  const seenUrls = new Set();

  for (const { source, target, baseUrl } of SOCIAL_SOURCES) {
    const url = normalizeSocialUrl(socials[source], baseUrl);
    if (!url || seenUrls.has(url)) continue;
    normalized[target] = url;
    seenUrls.add(url);
  }

  return normalized;
}

function getAlias(profileUrl) {
  try {
    const pathname = new URL(profileUrl).pathname;
    return decodeURIComponent(pathname.split('/@')[1] ?? '').trim();
  } catch {
    return '';
  }
}

async function fetchProfile(alias) {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(PROFILE_API_URL, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ alias }),
      });

      if (!response.ok) {
        const error = new Error(`${response.status} ${response.statusText}`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }

      const payload = await response.json();
      if (!payload?.profile) throw new Error('Profile was not returned');
      return payload.profile;
    } catch (error) {
      lastError = error;
      if (attempt === 2 || error.retryable === false) break;
      await sleep(500 * (2 ** attempt));
    }
  }

  throw lastError;
}

async function readDataFile(filePath, label) {
  const data = JSON.parse((await readFile(filePath, 'utf8')).replace(/^\uFEFF/, ''));
  if (!Array.isArray(data)) throw new Error(`${label} must contain an array`);
  return data;
}

function applySocialLinks(entity, profileUrl, socialsByAlias) {
  const alias = getAlias(profileUrl);
  if (!alias || !socialsByAlias.has(alias)) return entity;

  const socialLinks = socialsByAlias.get(alias);
  if (Object.keys(socialLinks).length === 0) return entity;

  return {
    ...entity,
    socialLinks: {
      ...entity.socialLinks,
      ...socialLinks,
    },
  };
}

function hasSocialLinks(entity) {
  return Boolean(entity?.socialLinks && Object.keys(entity.socialLinks).length > 0);
}

async function main() {
  const [communityBuilders, heroes, studentGroups] = await Promise.all([
    readDataFile(DATA_PATHS.communityBuilders, 'community-builders.json'),
    readDataFile(DATA_PATHS.heroes, 'heroes.json'),
    readDataFile(DATA_PATHS.studentGroups, 'cloud-clubs.json'),
  ]);
  const profileReferences = [
    ...communityBuilders.map((builder) => builder.profileUrl),
    ...heroes.map((hero) => hero.builderProfileUrl),
    ...studentGroups.flatMap((group) => (group.ledBy ?? []).map((leader) => leader.profileUrl)),
  ];
  const aliases = [...new Set(profileReferences.map(getAlias).filter(Boolean))];
  const missingAliases = profileReferences.filter((profileUrl) => !getAlias(profileUrl)).length;
  const selectedAliases = ONLY_ALIASES.size > 0
    ? aliases.filter((alias) => ONLY_ALIASES.has(alias))
    : aliases;
  const requestedAliases = LIMIT > 0 ? selectedAliases.slice(0, LIMIT) : selectedAliases;
  const socialsByAlias = new Map();
  const stats = {
    processed: 0,
    withSocials: 0,
    withoutSocials: 0,
    errors: 0,
  };
  let cursor = 0;

  async function worker() {
    while (cursor < requestedAliases.length) {
      const index = cursor;
      cursor += 1;
      const alias = requestedAliases[index];

      try {
        const profile = await fetchProfile(alias);
        const socialLinks = normalizeSocials(profile.socials);
        socialsByAlias.set(alias, socialLinks);
        stats.processed += 1;
        if (Object.keys(socialLinks).length > 0) stats.withSocials += 1;
        else stats.withoutSocials += 1;
      } catch (error) {
        stats.errors += 1;
        console.warn(`Could not enrich @${alias}: ${error.message}`);
      }

      const completed = stats.processed + stats.errors;
      if (completed % 100 === 0 || completed === requestedAliases.length) {
        console.log(`Checked ${completed}/${requestedAliases.length} unique Builder Center profiles`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, requestedAliases.length || 1) }, () => worker()));

  const attempted = stats.processed + stats.errors;
  const errorRate = attempted > 0 ? stats.errors / attempted : 0;
  if (errorRate > MAX_ERROR_RATE) {
    throw new Error(`Profile enrichment error rate ${(errorRate * 100).toFixed(1)}% exceeded the ${(MAX_ERROR_RATE * 100).toFixed(1)}% limit; data was not written`);
  }

  const updatedCommunityBuilders = communityBuilders.map((builder) => (
    applySocialLinks(builder, builder.profileUrl, socialsByAlias)
  ));
  const updatedHeroes = heroes.map((hero) => (
    applySocialLinks(hero, hero.builderProfileUrl, socialsByAlias)
  ));
  const updatedStudentGroups = studentGroups.map((group) => ({
    ...group,
    ledBy: (group.ledBy ?? []).map((leader) => (
      applySocialLinks(leader, leader.profileUrl, socialsByAlias)
    )),
  }));

  if (!DRY_RUN) {
    await Promise.all([
      writeFile(DATA_PATHS.communityBuilders, `${JSON.stringify(updatedCommunityBuilders, null, 2)}\n`, 'utf8'),
      writeFile(DATA_PATHS.heroes, `${JSON.stringify(updatedHeroes, null, 2)}\n`, 'utf8'),
      writeFile(DATA_PATHS.studentGroups, `${JSON.stringify(updatedStudentGroups, null, 2)}\n`, 'utf8'),
    ]);
  }

  console.log(
    `${DRY_RUN ? 'Would update' : 'Updated'} ${stats.processed} unique profiles: `
    + `${stats.withSocials} with public links, ${stats.withoutSocials} without, `
    + `${missingAliases} records without a profile alias, ${stats.errors} errors`,
  );
  console.log(
    `Public links now shown for ${updatedCommunityBuilders.filter(hasSocialLinks).length} Community Builders, `
    + `${updatedHeroes.filter(hasSocialLinks).length} Heroes, and `
    + `${updatedStudentGroups.flatMap((group) => group.ledBy ?? []).filter(hasSocialLinks).length} Student Builder Group leaders`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
