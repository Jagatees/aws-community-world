import { useState } from 'react';

export default function GlobeViewControls({ globeDesign, availableGlobeDesigns, onDesignChange: setGlobeDesign, designButtonLabel, onZoom: triggerZoom, onNearMe: handleNearMe, nearMeLoading }) {
  const [nearMeHover, setNearMeHover] = useState(false);
  const isListView = globeDesign === 'list';
  const isGeoLibreView = globeDesign === 'geolibre';
  const viewControlBg = 'rgba(12, 25, 36, 0.9)';
  const viewControlBorder = 'rgba(104, 148, 180, 0.38)';
  const viewControlText = '#B7C6D2';
  const viewControlShadow = '0 14px 34px rgba(3, 12, 21, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.04)';
  function designButtonStyles(design) {
    const active = globeDesign === design;
    return {
      position: 'relative',
      zIndex: 1,
      backgroundColor: 'transparent',
      color: active ? '#FFD54A' : viewControlText,
      cursor: 'pointer',
      minWidth: '64px',
      minHeight: '40px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      touchAction: 'manipulation',
      transition: 'color 220ms ease, transform 160ms ease',
    };
  }


  return (
                <div
                  className="mobile-globe-controls absolute bottom-5 z-20"
                  style={{ left: '50%', transform: 'translateX(-50%)' }}
                >
                  <div className="flex items-stretch gap-3">
                    <div
                      className="grid items-center rounded-full p-1"
                      style={{
                        position: 'relative',
                        '--design-count': availableGlobeDesigns.length,
                        gridTemplateColumns: `repeat(${availableGlobeDesigns.length}, minmax(64px, 1fr))`,
                        background: viewControlBg,
                        border: `1px solid ${viewControlBorder}`,
                        boxShadow: viewControlShadow,
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                      }}
                      aria-label="Globe design switcher"
                      role="group"
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: '4px',
                          top: '4px',
                          bottom: '4px',
                          width: `calc((100% - 8px) / ${availableGlobeDesigns.length})`,
                          borderRadius: '999px',
                          background: '#0B111B',
                          boxShadow: 'inset 0 0 0 1px #FF9900, 0 5px 16px rgba(3, 12, 21, 0.38)',
                          transform: `translate3d(${Math.max(0, availableGlobeDesigns.indexOf(globeDesign)) * 100}%, 0, 0)`,
                          transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
                          willChange: 'transform',
                          pointerEvents: 'none',
                        }}
                      />
                      {availableGlobeDesigns.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setGlobeDesign(d)}
                          className="rounded-full px-3 py-1 text-xs font-semibold capitalize active:scale-[0.97]"
                          style={designButtonStyles(d)}
                          aria-pressed={globeDesign === d}
                        >
                          {designButtonLabel(d)}
                        </button>
                      ))}
                    </div>

                    <div
                      className={`${isListView || isGeoLibreView ? 'hidden' : 'flex'} items-center rounded-full p-1`}
                      style={{
                        background: viewControlBg,
                        border: `1px solid ${viewControlBorder}`,
                        boxShadow: viewControlShadow,
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                      }}
                      aria-label="Zoom controls"
                    >
                      {[['out', '-'], ['in', '+']].map(([dir, label]) => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => triggerZoom(dir)}
                          className="map-zoom-button rounded-full px-3 py-1 text-sm font-semibold"
                          style={{
                            color: viewControlText,
                            minWidth: '44px',
                            minHeight: '44px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            touchAction: 'manipulation',
                          }}
                          aria-label={`Zoom ${dir}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleNearMe}
                      onMouseEnter={() => setNearMeHover(true)}
                      onMouseLeave={() => setNearMeHover(false)}
                      className={`${isListView || isGeoLibreView ? 'hidden' : ''} rounded-full px-4 py-1 text-xs font-semibold`}
                      style={{
                        backgroundColor: nearMeLoading ? '#182735' : nearMeHover ? '#182B3A' : viewControlBg,
                        color: nearMeLoading ? '#6F8291' : nearMeHover ? '#FFD54A' : viewControlText,
                        minHeight: '44px',
                        border: `1px solid ${nearMeHover && !nearMeLoading ? '#FF9900' : viewControlBorder}`,
                        boxShadow: viewControlShadow,
                        transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                        cursor: nearMeLoading ? 'wait' : 'pointer',
                        touchAction: 'manipulation',
                        whiteSpace: 'nowrap',
                      }}
                      aria-label="Near me"
                    >
                      {nearMeLoading ? 'Locating...' : 'Near Me'}
                    </button>
                  </div>
                </div>


  );
}
