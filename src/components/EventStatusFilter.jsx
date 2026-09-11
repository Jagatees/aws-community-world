import './EventStatusFilter.css';

const OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
  { value: 'all', label: 'All' },
];

export default function EventStatusFilter({ value, onChange, counts, darkMode }) {
  return (
    <div className={`event-status-bar${darkMode ? '' : ' event-status-bar--light'}`}>
      <span className="event-status-label">Show events</span>
      <div className="event-status-options" role="group" aria-label="Event status">
        {OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            <span>{counts[option.value].toLocaleString()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
