import { useMemo, useState } from 'react';
import './GeoLibreScene.css';

const PROJECT_FILES = {
  heroes: 'heroes',
  'community-builders': 'community-builders',
  'user-groups': 'user-groups',
  'cloud-clubs': 'cloud-clubs',
  'kiro-ambassadors': 'kiro-ambassadors',
  'kiro-events': 'kiro-events',
  'community-days': 'community-days',
  news: 'news',
};

function getProjectBaseUrl() {
  if (typeof window === 'undefined') return 'https://www.awscommunityglobe.click/geolibre';
  if (window.location.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return `${window.location.origin}/geolibre`;
  }
  return 'https://www.awscommunityglobe.click/geolibre';
}

export default function GeoLibreScene({ category = 'heroes' }) {
  const [ready, setReady] = useState(false);
  const projectFile = PROJECT_FILES[category] || PROJECT_FILES.heroes;
  const embedUrl = useMemo(() => {
    const projectUrl = `${getProjectBaseUrl()}/${projectFile}.geolibre.json`;
    return `https://web.geolibre.app/?url=${encodeURIComponent(projectUrl)}&maponly&theme=dark&welcome=0`;
  }, [projectFile]);

  return (
    <section className="geolibre-scene" aria-label="GeoLibre community globe">
      <iframe
        key={projectFile}
        className={`geolibre-scene__frame ${ready ? 'is-ready' : ''}`}
        src={embedUrl}
        title="GeoLibre community globe"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="fullscreen; geolocation"
        onLoad={() => setReady(true)}
      />
      {!ready && (
        <div className="geolibre-scene__loading" role="status">
          <span aria-hidden="true" />
          Loading GeoLibre globe…
        </div>
      )}
    </section>
  );
}
