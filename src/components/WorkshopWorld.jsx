import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowSquareOutIcon, ArrowUpIcon, CompassIcon, CubeIcon, DoorOpenIcon, ListIcon, MagnifyingGlassIcon, MoonIcon, StorefrontIcon, SunIcon, XIcon } from '@phosphor-icons/react';
import catalog from '../data/workshops.json';
import icons from '../data/aws-service-icons.json';
import { countServiceWorkshops, DEFAULT_WORKSHOP_FILTERS, filterServices, languageName, WORKSHOP_LEVELS } from '../utils/workshops';
import { LANE_CENTERS, buildStreetLayout } from '../utils/workshopWorldLayout';
import { createWorkshopWorld } from '../utils/workshopWorldScene';
import './WorkshopWorld.css';

const COUNTS = countServiceWorkshops(catalog.workshops);
const WORLD_SERVICES = filterServices(catalog, DEFAULT_WORKSHOP_FILTERS);
const { shops: ADDRESSES, streets: STREETS } = buildStreetLayout(WORLD_SERVICES, COUNTS);
const CATEGORIES = [...new Set(catalog.services.flatMap(service => service.categories))].sort();

function Icon({ service }) {
  return icons[service.id] ? <img src={icons[service.id].src} alt="" width="32" height="32" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /> : <CubeIcon size={28} />;
}

function MiniMap({ position, inside, guide }) {
  if (!position || inside) return null;
  return <div className="world-map" aria-label="Nearby cloud lanes"><svg viewBox={`${position.x - 26} ${position.z - 30} 52 60`} role="img" aria-label="Your position in the workshop world">
    <rect x={position.x - 26} y={position.z - 30} width="52" height="60" fill="#263858" />
    {LANE_CENTERS.map(x => <path key={x} d={`M${x} -50 V1000`} stroke="#738bb8" strokeWidth="8.6" />)}
    {STREETS.filter(street => Math.abs(street.x - position.x) < 32 && street.startZ < position.z + 32 && street.endZ > position.z - 32).map(street => <path key={street.id} d={`M${street.x} ${street.startZ} V${street.endZ}`} stroke={street.color} strokeWidth="3"><title>{street.name}</title></path>)}
    {ADDRESSES.filter(shop => Math.abs(shop.x - position.x) < 36 && Math.abs(shop.z - position.z) < 38).map(shop => <rect key={shop.id} x={shop.x - 4.5} y={shop.z - 5} width="9" height="10" rx="2" fill={shop.count ? shop.streetColor : '#76829e'} />)}
    {guide?.route?.length > 1 && <polyline data-guide-route="true" points={guide.route.map(point => `${point.x},${point.z}`).join(' ')} fill="none" stroke="#e1bfff" strokeWidth="1" />}
    {guide?.position && <circle data-kiro="true" cx={guide.position.x} cy={guide.position.z} r="1.4" fill="#c5a0ff" stroke="#fff" strokeWidth=".5"><title>Kiro</title></circle>}
    <circle data-player="true" cx={position.x} cy={position.z} r="1.8" fill="#fff" />
    <path d={`M${position.x} ${position.z} l${-Math.sin(position.yaw) * 6} ${-Math.cos(position.yaw) * 6}`} stroke="#fff" strokeWidth="1" />
  </svg><span>You are here</span></div>;
}

function HoldButton({ name, direction, engine, children }) {
  return <button type="button" aria-label={name} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); engine.current?.move(direction, true); }} onPointerUp={() => engine.current?.move(direction, false)} onPointerCancel={() => engine.current?.move(direction, false)} onLostPointerCapture={() => engine.current?.move(direction, false)} onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); engine.current?.move(direction, true); } }} onKeyUp={() => engine.current?.move(direction, false)} onBlur={() => engine.current?.move(direction, false)}>{children}</button>;
}

export default function WorkshopWorld({ filters, onChange, searchQuery, darkMode, onThemeChange }) {
  const host = useRef(null), engine = useRef(null), detailHeading = useRef(null), directoryHeading = useRef(null);
  const [directory, setDirectory] = useState(false);
  const [directoryMode, setDirectoryMode] = useState('shops');
  const [selection, setSelection] = useState(null);
  const [status, setStatus] = useState({ location: STREETS[0]?.name, nearby: null, position: null });
  const [unavailable, setUnavailable] = useState(false);
  const [closedShop, setClosedShop] = useState(null);
  const [limit, setLimit] = useState(30);
  const [guideSearch, setGuideSearch] = useState(''), [guideCategory, setGuideCategory] = useState(''), [guideLimit, setGuideLimit] = useState(30);
  const service = catalog.services.find(item => item.id === filters.service);
  const serviceId = service?.id || '';
  const services = useMemo(() => filterServices(catalog, filters, searchQuery), [filters, searchQuery]);
  const guideServices = useMemo(() => filterServices(catalog, { ...DEFAULT_WORKSHOP_FILTERS, category: guideCategory }, guideSearch), [guideCategory, guideSearch]);
  const stock = useMemo(() => serviceId ? catalog.workshops.filter(item => item.serviceIds.includes(serviceId)).sort((a, b) => a.title.localeCompare(b.title)) : [], [serviceId]);
  const selected = selection?.service === serviceId ? stock.find(item => item.id === selection?.id) : null;
  const callbacks = useRef({ filters, onChange });
  useEffect(() => { callbacks.current = { filters, onChange }; }, [filters, onChange]);
  useEffect(() => {
    const notifyService = id => {
      const current = callbacks.current;
      if (current.filters.service !== id) current.onChange({ ...current.filters, service: id }, { navigate: true });
      setSelection(null); setDirectory(false); setClosedShop(null);
    };
    const world = createWorkshopWorld(host.current, {
      services: WORLD_SERVICES, workshops: catalog.workshops, counts: COUNTS, darkMode,
      initialService: callbacks.current.filters.service, initialCategory: callbacks.current.filters.category,
      onEnter: notifyService, onLeave: () => notifyService(''), onStatus: setStatus,
      onItem: (id, itemId) => { setSelection({ service: id, id: itemId }); setDirectory(false); },
      onClosed: id => setClosedShop(catalog.services.find(item => item.id === id)),
      onUnavailable: () => setUnavailable(true),
      onGuideReady: () => { setSelection(null); setClosedShop(null); setDirectoryMode('guide'); setDirectory(true); },
    });
    engine.current = world;
    return () => { world?.dispose(); engine.current = null; };
  }, [darkMode]);
  useEffect(() => { engine.current?.setService(filters.service); }, [filters.service, darkMode]);
  useEffect(() => { engine.current?.pause(directory || Boolean(selected) || Boolean(closedShop)); }, [directory, selected, closedShop, darkMode]);
  useEffect(() => { if (selected || closedShop) detailHeading.current?.focus({ preventScroll: true }); }, [selected, closedShop]);
  useEffect(() => { if (directory) directoryHeading.current?.focus({ preventScroll: true }); }, [directory, directoryMode]);
  const set = (patch, options) => onChange({ ...filters, ...patch }, options);
  const visit = id => {
    setDirectory(false); setClosedShop(null); setSelection(null);
    if (unavailable) { set({ service: id }, { navigate: true }); setDirectory(true); return; }
    engine.current?.visit(id);
  };
  const visitStreet = id => {
    setClosedShop(null); setSelection(null);
    if (unavailable) { set({ service: '', category: id }, { search: '' }); setDirectoryMode('shops'); return; }
    setDirectory(false); engine.current?.visitStreet(id);
  };
  const leave = () => {
    if (unavailable) set({ service: '' }, { navigate: true }); else engine.current?.leave();
    setDirectory(false); setSelection(null);
  };
  const closePanel = () => { setSelection(null); setClosedShop(null); setDirectory(false); requestAnimationFrame(() => engine.current?.focus()); };
  const chooseItem = id => { setSelection({ service: serviceId, id }); setDirectory(false); };
  const toggleDirectory = () => { setSelection(null); setClosedShop(null); setDirectoryMode('shops'); setDirectory(value => directoryMode === 'shops' ? !value : true); };
  const showStreets = () => { setSelection(null); setClosedShop(null); setDirectoryMode('streets'); setDirectory(value => directoryMode === 'streets' ? !value : true); };
  const summonKiro = () => { setSelection(null); setClosedShop(null); setDirectory(false); engine.current?.callGuide(); };
  const guideTo = id => { setDirectory(false); if (unavailable) { setDirectoryMode('shops'); visit(id); } else engine.current?.guideTo(id); };
  const nearby = status.nearby;
  const helper = status.guide;
  const helperMessage = helper?.error || (helper?.mode === 'coming' ? 'Kiro is coming to you…' : helper?.mode === 'returning' ? 'Coming back to meet you…' : helper?.mode === 'arrived' ? (helper.closed ? 'Here we are. This shop has no workshops yet.' : 'Here we are! Walk through the shop door.') : helper?.destination ? (helper.waiting ? 'I’ll wait here. Follow the purple trail.' : 'Follow me along the purple trail.') : helper?.mode === 'ready' ? 'Where would you like to go?' : 'Your guide to the service streets');
  const activeStreet = STREETS.find(street => street.id === status.streetId);

  return <main className="workshops-page workshop-world walking-world" data-theme={darkMode ? 'dark' : 'light'} aria-label="Walkable workshop world" onKeyDown={event => { if (event.key === 'Escape') closePanel(); }}>
    <header className="world-topbar"><h1><StorefrontIcon size={22} /> Workshop world</h1><div className="world-top-actions"><button type="button" className="workshop-button secondary" onClick={showStreets} aria-expanded={directory && directoryMode === 'streets'}><CompassIcon size={17} /><span>Streets</span></button><button type="button" className="workshop-button secondary" onClick={toggleDirectory} aria-expanded={directory && directoryMode === 'shops'}><MagnifyingGlassIcon size={17} /><span>{service ? 'Workshops' : 'Find a shop'}</span></button><button type="button" className="workshop-button secondary" onClick={() => set({ mode: 'catalog' }, { navigate: true })}><ArrowLeftIcon size={16} /><span>Card view</span></button><button type="button" className="workshop-theme" onClick={() => onThemeChange(!darkMode)} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} theme`}>{darkMode ? <SunIcon size={19} /> : <MoonIcon size={19} />}</button></div></header>
    <div className="world-viewport"><div ref={host} className="world-canvas" />
      {!unavailable && <>
        <div className="world-location"><span style={activeStreet ? { borderColor: activeStreet.color } : undefined}>{service ? 'INSIDE THE SERVER SHOP' : 'CATEGORY STREET'}</span><h2>{service?.name || status.location}</h2><p>{service ? `${stock.length} workshops · ${activeStreet?.name || ''}` : activeStreet ? `${activeStreet.shopCount} services · ${activeStreet.openCount} open shops · Walk right in.` : 'Pick a category in Streets to start exploring.'}</p></div>
        <div className="world-crosshair" aria-hidden="true" /><MiniMap position={status.position} inside={Boolean(service)} guide={helper} />
        {!service && <aside className={`world-kiro ${helper?.destination ? 'is-guiding' : ''}`} aria-label="Kiro guide" data-mode={helper?.mode || 'roaming'} data-waiting={helper?.waiting || false}>
          <button type="button" className="world-call-kiro" aria-label="Call Kiro" onClick={summonKiro}><img src="/aws-service-icons/kiro.svg" alt="" width="32" height="32" /><span><strong>{helper?.destination ? 'Kiro is your guide' : 'Call Kiro'}</strong><small>{helper?.destination ? 'Choose another service' : 'Come here & help me explore'}</small></span></button>
          {(helper?.mode !== 'roaming' || helper?.error) && <div className="world-kiro-progress"><p role="status">{helperMessage}</p>{helper?.name && <><strong>{helper.name}</strong><small>{helper.mode === 'arrived' ? 'You have arrived' : `${helper.remaining} m to the shop`} · {helper.closed ? 'Closed' : 'Open'}</small></>}<button type="button" onClick={() => engine.current?.cancelGuide()}>{helper?.destination ? 'Stop guidance' : 'Let Kiro roam'}</button></div>}
        </aside>}
        <div className="world-walk-controls" role="group" aria-label="Walking controls"><div className="world-direction-pad">
          <HoldButton name="Walk forward" direction="forward" engine={engine}><ArrowUpIcon /></HoldButton><HoldButton name="Step left" direction="left" engine={engine}><ArrowLeftIcon /></HoldButton><HoldButton name="Walk backward" direction="backward" engine={engine}><ArrowDownIcon /></HoldButton><HoldButton name="Step right" direction="right" engine={engine}><ArrowRightIcon /></HoldButton>
        </div><div className="world-look-pad"><HoldButton name="Turn left" direction="turnLeft" engine={engine}><ArrowLeftIcon /></HoldButton><span>Look</span><HoldButton name="Turn right" direction="turnRight" engine={engine}><ArrowRightIcon /></HoldButton></div></div>
        <div className="world-interaction" aria-live="polite">{nearby ? <button type="button" onClick={() => engine.current?.interact()} className={nearby.type === 'closed' ? 'is-closed' : ''}><kbd>E</kbd><span><strong>{nearby.label}</strong><small>{nearby.hint}</small></span><ArrowRightIcon size={18} /></button> : <p>Walk closer to a door or workshop display</p>}</div>
        <div className="world-help"><span><kbd>W A S D</kbd> walk · Drag to look · <kbd>E</kbd> interact · Shift to run</span><button type="button" onClick={() => engine.current?.mouseLook()}>Mouse look</button><span className="world-escape">Esc releases mouse</span></div>
        {service && <button type="button" className="world-exit" onClick={leave}><DoorOpenIcon size={17} /> Exit shop</button>}
        <button type="button" className="world-home" aria-label="Return to world entrance" onClick={() => engine.current?.home()}><CompassIcon size={19} /></button>
      </>}
      {unavailable && <div className="world-unavailable" role="status"><CubeIcon size={38} /><h2>3D is unavailable in this browser</h2><p>You can still browse every service and workshop in the directory.</p><button type="button" className="workshop-button" onClick={() => setDirectory(true)}><ListIcon /> Open directory</button></div>}
      {(directory || selected || closedShop) && <div className="world-panel" role="region" aria-label={selected ? 'Workshop details' : closedShop ? 'Closed shop' : directoryMode === 'guide' ? 'Kiro service guide' : directoryMode === 'streets' ? 'Category streets' : 'World directory'}>
        <div className="world-panel-top"><span>{selected ? 'WORKSHOP ITEM' : closedShop ? 'SHOP CLOSED' : directoryMode === 'guide' ? 'KIRO · YOUR STREET GUIDE' : directoryMode === 'streets' ? 'EXPLORE BY CATEGORY' : service ? 'IN THIS SHOP' : 'SERVICE DIRECTORY'}</span><button type="button" aria-label="Close panel" onClick={closePanel}><XIcon size={21} /></button></div>
        {selected ? <article className="workshop-world-detail"><h2 ref={detailHeading} tabIndex={-1}>{selected.title}</h2><div className="workshop-world-item-meta"><span>{selected.level ? `${selected.level} · ${WORKSHOP_LEVELS[selected.level]}` : 'Self-paced'}</span><span>{selected.durationHours ? `${selected.durationHours} hours` : 'Duration not listed'}</span>{selected.sandboxAvailable && <span>Sandbox available</span>}</div><p>{selected.description}</p><small>{selected.languages.map(languageName).join(', ')}</small><a className="workshop-button" href={selected.url} target="_blank" rel="noopener noreferrer">Open workshop <ArrowSquareOutIcon size={17} /></a><small>Opens the AWS workshop in a new tab.</small><button type="button" className="world-text-button" onClick={closePanel}>Keep exploring the shop</button></article>
          : closedShop ? <article className="workshop-world-detail"><Icon service={closedShop} /><h2 ref={detailHeading} tabIndex={-1}>{closedShop.name}</h2><p>This shop is closed because no workshops are listed in the current catalog. This does not mean the AWS service is closed.</p><button type="button" className="workshop-button" onClick={closePanel}>Keep walking</button></article>
          : directoryMode === 'guide' ? <><div className="world-kiro-intro"><img src="/aws-service-icons/kiro.svg" alt="Kiro" width="48" height="48" /><h2 ref={directoryHeading} tabIndex={-1}>Where shall we go?</h2></div><p className="world-panel-note">Choose a service. I’ll lead you along a purple floor trail and wait if you fall behind. Use the walking controls to follow me.</p><div className="workshop-search"><MagnifyingGlassIcon size={18} /><input aria-label="Find a service for Kiro" placeholder="Find a service…" value={guideSearch} onChange={event => { setGuideSearch(event.target.value); setGuideLimit(30); }} /></div><label className="workshop-select"><span>Category</span><select aria-label="Kiro service category" value={guideCategory} onChange={event => { setGuideCategory(event.target.value); setGuideLimit(30); }}><option value="">All categories</option>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label><div className="world-directory-items">{guideServices.slice(0, guideLimit).map(shop => <button type="button" key={shop.id} data-guide-service={shop.id} onClick={() => guideTo(shop.id)}><Icon service={shop} /><span><strong>{shop.name}</strong><small>{ADDRESSES.find(address => address.id === shop.id).streetName} · {COUNTS.get(shop.id) ? `${COUNTS.get(shop.id)} workshops` : 'Closed · No workshops yet'}</small></span><ArrowRightIcon /></button>)}</div>{!guideServices.length && <p className="world-panel-note">No services match. Try a different name or category.</p>}{guideServices.length > guideLimit && <button type="button" className="workshop-button secondary" onClick={() => setGuideLimit(value => value + 30)}>Show more services</button>}</>
          : directoryMode === 'streets' ? <><h2 ref={directoryHeading} tabIndex={-1}>Choose a street</h2><p className="world-panel-note">Each category has its own street. Jump there, then walk into a service shop.</p><div className="world-street-list">{STREETS.map(street => <button type="button" key={street.id} data-street={street.id} aria-label={`Visit ${street.name}`} onClick={() => visitStreet(street.id)} style={{ '--street-color': street.color }}><span className="world-street-marker"><CompassIcon size={20} /></span><span><strong>{street.name}</strong><small>{street.category}</small><span>{street.shopCount} services · {street.openCount ? `${street.openCount} open shops` : 'No workshops yet'}{activeStreet?.id === street.id ? ' · You are here' : ''}</span></span><ArrowRightIcon size={16} /></button>)}</div><p className="world-panel-note">Each service has one shop on its primary category street. The shop directory also finds services listed in other categories.</p></>
          : <><h2 ref={directoryHeading} tabIndex={-1}>{service ? service.name : 'Where do you want to go?'}</h2>
            {service ? <><p className="world-panel-note">Every workshop is displayed inside this shop. You can also open one here.</p><button type="button" className="world-text-button" onClick={leave}><ArrowLeftIcon /> Back outside</button><div className="world-directory-items">{stock.map((item, index) => <button type="button" key={item.id} data-workshop-item={item.id} onClick={() => chooseItem(item.id)}><b>{String(index + 1).padStart(2, '0')}</b><span><strong>{item.title}</strong><small>{item.level ? `${item.level} · ${WORKSHOP_LEVELS[item.level]}` : 'Self-paced'}</small></span><ArrowRightIcon /></button>)}</div>{!stock.length && <p className="world-panel-note">No workshops here yet.</p>}</>
              : <><p className="world-panel-note">Jump to a storefront, then walk through its door.</p><div className="workshop-search"><MagnifyingGlassIcon size={18} /><input aria-label="Find a service shop" placeholder="Search services…" value={searchQuery} onChange={event => { setLimit(30); set({}, { search: event.target.value }); }} /></div><label className="workshop-select"><span>Category</span><select aria-label="Shop category" value={filters.category} onChange={event => { setLimit(30); set({ category: event.target.value }); }}><option value="">All categories</option>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label><label className="workshop-check"><input type="checkbox" checked={filters.withWorkshops} onChange={event => { setLimit(30); set({ withWorkshops: event.target.checked }); }} /> Open shops only</label><p className="world-panel-note" role="status">{services.length} shops · {catalog.services.length} in the world</p>
                <div className="world-directory-items">{services.slice(0, limit).map(shop => { const address = ADDRESSES.find(item => item.id === shop.id); return <button type="button" key={shop.id} data-shop={shop.id} onClick={() => visit(shop.id)}><Icon service={shop} /><span><strong>{shop.name}</strong><small>{COUNTS.get(shop.id) ? `${COUNTS.get(shop.id)} workshops · Open` : 'Closed · No workshops'}<br />{address.streetName} · Shop {address.block * 2 + (address.rotation > 0 ? 1 : 2)}</small></span><ArrowRightIcon /></button>; })}</div>
                {!services.length && <><h3>No shops match</h3><button type="button" className="world-text-button" onClick={() => set({ category: '', withWorkshops: false }, { search: '' })}>Clear filters</button></>}{services.length > limit && <button type="button" className="workshop-button secondary" onClick={() => setLimit(value => value + 30)}>Show more shops</button>}</>}
          </>}
      </div>}
    </div>
  </main>;
}
