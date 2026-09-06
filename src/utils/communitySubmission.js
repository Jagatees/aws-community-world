export function buildSubmissionUrl({ kind, name, category, location, source, date, notes }) {
  const official = new URL(source);
  if (!['https:', 'http:'].includes(official.protocol)) throw new Error('Use an http or https source link.');
  const body = [`## Missing ${kind}`, `**Name:** ${name}`, `**Category:** ${category}`, `**Location:** ${location}`, `**Official source:** ${official.href}`,
    ...(kind === 'event' ? [`**Event date:** ${date || 'See official source'}`] : []), '', '### Additional details', notes || 'None provided.', '', 'Submitted through AWS Community World. Please verify before adding to the directory.'].join('\n');
  const url = new URL('https://github.com/Jagatees/aws-community-world/issues/new');
  url.searchParams.set('title', `[Missing ${kind}] ${name}`);
  url.searchParams.set('body', body);
  return url.href;
}
