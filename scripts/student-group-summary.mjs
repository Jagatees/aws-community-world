// Build-time projection: details stay in the existing lazy-loaded full dataset.
// IDs, locations, filters and the first usable portrait remain available on maps.
export function summarizeStudentGroups(groups) {
  return groups.map((group) => {
    const usableImage = value => typeof value === 'string' && value.trim() && !value.includes('/assets/default-avatar-');
    const avatarUrl = usableImage(group.avatarUrl)
      ? group.avatarUrl
      : group.ledBy?.find(leader => usableImage(leader?.imageUrl))?.imageUrl || '';
    return {
      id: group.id, name: group.name, location: group.location,
      country: group.country, lat: group.lat, lng: group.lng,
      tag: group.tag, isNew: group.isNew, forceSeparateMarker: group.forceSeparateMarker,
      avatarUrl,
    };
  });
}

export function studentGroupSummaryPlugin() {
  const moduleId = 'virtual:student-group-summary';
  const resolvedId = `\0${moduleId}`;
  return {
    name: 'student-group-summary',
    resolveId(id) { if (id === moduleId) return resolvedId; },
    async load(id) {
      if (id !== resolvedId) return;
      const { readFile } = await import('node:fs/promises');
      const { fileURLToPath } = await import('node:url');
      const source = new URL('../src/data/cloud-clubs.json', import.meta.url);
      this.addWatchFile(fileURLToPath(source));
      return `export default ${JSON.stringify(summarizeStudentGroups(JSON.parse(await readFile(source, 'utf8'))))}`;
    },
  };
}
