import { useEffect, useRef, useState } from 'react';

const GLOBE_MODES = [
  { id: 'community', label: 'Community', description: 'People and groups' },
  { id: 'events', label: 'Events', description: 'Events and latest news' },
  { id: 'insights', label: 'Insights', description: 'Community intelligence dashboard' },
  { id: 'experimental', label: 'Experimental', description: 'A playground for new ideas and surprise features' },
];

/**
 * @param {{
 *   darkMode: boolean,
 *   activeSection: 'community' | 'events' | 'insights' | 'experimental',
 *   onSectionChange: (section: 'community' | 'events' | 'insights' | 'experimental') => void,
 * }} props
 */
export default function Header({ darkMode, activeSection, onSectionChange }) {
  const [repoStats, setRepoStats] = useState({ stars: 6, forks: 3 });
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const modeMenuRef = useRef(null);
  const surface = darkMode ? 'rgba(27, 40, 54, 0.7)' : 'rgba(255, 255, 255, 0.78)';
  const border = darkMode ? 'rgba(45, 63, 80, 0.7)' : 'rgba(208, 220, 232, 0.95)';
  const text = darkMode ? '#FFFFFF' : '#0F1923';
  const muted = darkMode ? '#8B9BAA' : '#5a7a99';
  const activeModeLabel = GLOBE_MODES.find((mode) => mode.id === activeSection)?.label ?? 'Community';

  useEffect(() => {
    if (!window.matchMedia('(min-width: 640px)').matches) return undefined;

    const controller = new AbortController();
    const refreshStats = () => {
      fetch('https://api.github.com/repos/Jagatees/aws-community-world', {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
          return response.json();
        })
        .then((repository) => {
          setRepoStats({
            stars: repository.stargazers_count ?? 0,
            forks: repository.forks_count ?? 0,
          });
        })
        .catch((error) => {
          if (error.name !== 'AbortError') console.warn('Could not refresh GitHub repository stats.', error);
        });
    };

    const idleId = 'requestIdleCallback' in window
      ? window.requestIdleCallback(refreshStats, { timeout: 2500 })
      : window.setTimeout(refreshStats, 1200);

    return () => {
      controller.abort();
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, []);

  useEffect(() => {
    if (!modeMenuOpen) return undefined;

    const closeMenu = (event) => {
      if (event.key === 'Escape' || !modeMenuRef.current?.contains(event.target)) setModeMenuOpen(false);
    };

    window.addEventListener('keydown', closeMenu);
    window.addEventListener('pointerdown', closeMenu);
    return () => {
      window.removeEventListener('keydown', closeMenu);
      window.removeEventListener('pointerdown', closeMenu);
    };
  }, [modeMenuOpen]);

  return (
    <header
      className="app-header relative z-30 w-full px-4 py-2 flex items-center gap-3"
      style={{
        backgroundColor: surface,
        borderBottom: `1px solid ${border}`,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      <span className="app-brand-aws text-lg font-bold tracking-tight" style={{ color: '#FF9900' }}>AWS</span>
      <span style={{ color: border }} className="app-brand-divider text-lg select-none" aria-hidden="true">|</span>
      <div ref={modeMenuRef} className="globe-mode-picker text-base font-semibold" style={{ color: text }}>
        <button
          type="button"
          onClick={() => setModeMenuOpen((open) => !open)}
          aria-label="Choose AWS Globe content"
          aria-haspopup="menu"
          aria-expanded={modeMenuOpen}
          className="section-mode-switch focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: '#FF9900', cursor: 'pointer' }}
        >
          <span>{activeModeLabel}</span>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 6 3 3 3-3" /></svg>
        </button>
        {modeMenuOpen && (
          <div className="globe-mode-menu" role="menu" aria-label="AWS Globe content">
            {GLOBE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="menuitemradio"
                aria-checked={activeSection === mode.id}
                className={activeSection === mode.id ? 'is-active' : ''}
                onClick={() => {
                  onSectionChange(mode.id);
                  setModeMenuOpen(false);
                }}
              >
                <span><strong>{mode.label}</strong><small>{mode.description}</small></span>
                {activeSection === mode.id && <i aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
      </div>
      <span
        className="app-brand-globe text-lg font-bold tracking-tight"
        style={{ color: text }}
      >
        Globe
      </span>

      <div className="header-spacer flex-1" />

      {/* LinkedIn link */}
      <a
        href="https://www.linkedin.com/in/jagatees"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Connect with the creator on LinkedIn"
        title="Connect with the creator on LinkedIn"
        className="header-external-link inline-flex items-center gap-1.5 rounded px-1 py-1 transition-colors"
        style={{ color: muted }}
        onMouseEnter={(event) => (event.currentTarget.style.color = '#FF9900')}
        onMouseLeave={(event) => (event.currentTarget.style.color = muted)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        <span className="hidden text-[11px] font-bold sm:inline">Creator</span>
      </a>

      {/* Telegram link */}
      <a
        href="https://t.me/awsomeupdates"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join AWSome Updates on Telegram for tech news"
        title="Join my Telegram channel for tech news"
        className="header-external-link inline-flex items-center gap-1.5 rounded px-1 py-1 transition-colors"
        style={{ color: muted }}
        onMouseEnter={(event) => (event.currentTarget.style.color = '#FF9900')}
        onMouseLeave={(event) => (event.currentTarget.style.color = muted)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
        </svg>
        <span className="hidden text-[11px] font-bold sm:inline">Tech news</span>
      </a>

      {/* GitHub link */}
      <a
        href="https://github.com/Jagatees/aws-community-world"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`GitHub repository, ${repoStats.stars} stars and ${repoStats.forks} forks`}
        title={`${repoStats.stars} stars · ${repoStats.forks} forks`}
        className="header-external-link header-repo-link inline-flex items-center gap-2 rounded px-1 py-1 transition-colors"
        style={{ color: muted }}
        onMouseEnter={(event) => (event.currentTarget.style.color = '#FF9900')}
        onMouseLeave={(event) => (event.currentTarget.style.color = muted)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        <span className="header-repo-stat inline-flex items-center gap-1 text-[11px] font-bold tabular-nums">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="m12 2.2 2.96 6 6.62.96-4.79 4.67 1.13 6.59L12 17.31l-5.92 3.11 1.13-6.59-4.79-4.67 6.62-.96L12 2.2Z" />
          </svg>
          {repoStats.stars}
        </span>
        <span className="header-repo-stat inline-flex items-center gap-1 text-[11px] font-bold tabular-nums">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="6" cy="4" r="2" />
            <circle cx="18" cy="6" r="2" />
            <circle cx="6" cy="20" r="2" />
            <path d="M6 6v12M8 8c6 0 8-2 8-2" />
          </svg>
          {repoStats.forks}
        </span>
      </a>
    </header>
  );
}
