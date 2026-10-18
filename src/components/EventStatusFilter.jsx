import './EventStatusFilter.css';

const OPTIONS = [
  { value: 'all', label: 'All', description: 'All events' },
  { value: 'today', label: 'Today', description: 'Scheduled for today or ongoing, in your time zone' },
  { value: 'upcoming', label: 'Upcoming', description: 'Starting tomorrow or later, in your time zone' },
  { value: 'ended', label: 'Ended', description: 'Events that have finished' },
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
            title={option.description}
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
