// Keep the latest available observation per month without changing saved history.
export function getMonthlySnapshots(snapshots) {
  const months = new Map();
  snapshots.forEach((snapshot, index) => {
    const month = snapshot.date.slice(0, 7);
    const previous = months.get(month);
    if (!previous || snapshot.date >= previous.date) months.set(month, { month, date: snapshot.date, index });
  });
  return [...months.values()].sort((a, b) => a.date.localeCompare(b.date));
}
