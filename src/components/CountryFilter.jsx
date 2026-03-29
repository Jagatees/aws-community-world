/**
 * CountryFilter — a dropdown to filter members by country.
 *
 * @param {{
 *   countries: string[],
 *   selected: string | null,
 *   onChange: (country: string | null) => void,
 *   darkMode: boolean
 * }} props
 */
export default function CountryFilter({ countries, selected, onChange, darkMode }) {
  if (!countries.length) return null;

  const bg = darkMode ? '#1B2836' : '#ffffff';
  const border = darkMode ? '#2D3F50' : '#b0c8e0';
  const text = darkMode ? '#FFFFFF' : '#0F1923';

  return (
    <select
      value={selected ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label="Filter by country"
      style={{
        backgroundColor: bg,
        color: selected ? '#FF9900' : text,
        border: `1px solid ${selected ? '#FF9900' : border}`,
        borderRadius: '999px',
        padding: '3px 28px 3px 12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        outline: 'none',
        flexShrink: 0,
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238B9BAA' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
      }}
    >
      <option value="">🌍 All Countries</option>
      {countries.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
