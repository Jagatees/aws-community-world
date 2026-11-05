function readMembers(module) {
  if (!Array.isArray(module?.default)) throw new TypeError('Invalid student group data');
  return module.default;
}

// A failed summary chunk must not make the directory disappear when the full
// dataset is still available. Keep the second import lazy on healthy visits.
export async function loadStudentGroupMapData(loadSummary, loadFull) {
  try {
    return readMembers(await loadSummary());
  } catch {
    return readMembers(await loadFull());
  }
}
