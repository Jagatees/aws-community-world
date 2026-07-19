import { useCallback, useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';

const TOUR_STOPS = [
  {
    city: 'BUEA, CAMEROON',
    event: 'AWS Community Day Cameroon',
    date: '25 JUL 2026',
    type: 'COMMUNITY DAY',
    lat: 4.155,
    lng: 9.242,
  },
  {
    city: 'AHMEDABAD, INDIA',
    event: 'AWS Community Day Ahmedabad',
    date: '25 JUL 2026',
    type: 'DEVOPS EDITION',
    lat: 23.023,
    lng: 72.571,
  },
  {
    city: 'OTTAWA, CANADA',
    event: 'AWS Ottawa Community Day',
    date: '22 AUG 2026',
    type: 'COMMUNITY DAY',
    lat: 45.421,
    lng: -75.697,
  },
  {
    city: 'SINGAPORE',
    event: 'AWS Community Day Singapore',
    date: '22 AUG 2026',
    type: 'FEATURED EVENT',
    lat: 1.352,
    lng: 103.82,
    featured: true,
  },
];

const TRAVEL_MS = 1050;
const ACTIVATE_MS = 650;
const CARD_MS = 1050;
const STOP_DURATION = TRAVEL_MS + ACTIVATE_MS + CARD_MS;
const TOUR_DURATION = STOP_DURATION * TOUR_STOPS.length;

function setEventCardContent(element, stop, index) {
  element.dataset.featured = stop.featured ? 'true' : 'false';
  element.querySelector('[data-card-signal]').textContent = `LIVE EVENT 0${index + 1}`;
  element.querySelector('[data-card-type]').textContent = stop.type;
  element.querySelector('[data-card-event]').textContent = stop.event;
  element.querySelector('[data-card-city]').textContent = stop.city;
  element.querySelector('[data-card-date]').textContent = stop.date;
}

function createEventCard() {
  const element = document.createElement('article');
  element.className = 'event-reveal__three-card';
  element.setAttribute('aria-live', 'polite');
  element.innerHTML = `
    <div class="event-reveal__three-card-topline">
      <span data-card-signal></span>
      <span data-card-type></span>
    </div>
    <strong data-card-event></strong>
    <span data-card-city></span>
    <small data-card-date></small>
    <i aria-hidden="true"></i>
  `;
  return element;
}

export default function ExperimentalEventReveal() {
  const containerRef = useRef(null);
  const globeLayerRef = useRef(null);
  const globeRef = useRef(null);
  const cardLayerRef = useRef(null);
  const sizeRef = useRef({ width: 1, height: 1 });
  const phaseRef = useRef('idle');
  const [runId, setRunId] = useState(0);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [activeStop, setActiveStop] = useState(0);

  const updatePhase = useCallback((nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const startReveal = useCallback(() => {
    const globe = globeRef.current;
    const controls = globe?.controls();
    if (controls) controls.autoRotate = false;
    globe?.pointsData([]).ringsData([]);
    setRunId((current) => current + 1);
    setRunning(true);
    setActiveStop(0);
    updatePhase('travel');
  }, [updatePhase]);

  useEffect(() => {
    if (!containerRef.current || !globeLayerRef.current || !cardLayerRef.current) return undefined;

    const container = containerRef.current;
    const globeLayer = globeLayerRef.current;
    const cardLayer = cardLayerRef.current;
    const updateSize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      sizeRef.current = {
        cssWidth: width,
        cssHeight: height,
      };
      globeRef.current?.width(width).height(height);
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    const earthGlobe = Globe()(globeLayer)
      .width(sizeRef.current.cssWidth)
      .height(sizeRef.current.cssHeight)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#4a90d9')
      .atmosphereAltitude(0.16)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .showGraticules(false)
      .pointsData([])
      .pointLat('lat')
      .pointLng('lng')
      .pointColor((event) => event.featured ? '#ffb31a' : '#ff9900')
      .pointAltitude((event) => event.active ? 0.09 : 0.025)
      .pointRadius((event) => event.active ? 0.42 : 0.16)
      .pointsMerge(false)
      .ringsData([])
      .ringLat('lat')
      .ringLng('lng')
      .ringColor(() => (progress) => `rgba(255, 153, 0, ${Math.max(0, 1 - progress)})`)
      .ringMaxRadius(4.2)
      .ringPropagationSpeed(2.4)
      .ringRepeatPeriod(720)
      .pointOfView({ lat: 18, lng: 20, altitude: 2.2 });

    const globeControls = earthGlobe.controls();
    if (globeControls) {
      globeControls.autoRotate = true;
      globeControls.autoRotateSpeed = 0.35;
      globeControls.enablePan = false;
      globeControls.enableZoom = false;
      globeControls.enableRotate = false;
      globeControls.enableDamping = true;
      globeControls.dampingFactor = 0.08;
    }
    earthGlobe.renderer()?.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    globeRef.current = earthGlobe;

    const cssScene = new THREE.Scene();
    const cssCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    cssCamera.position.set(0, 0, 12.5);
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.domElement.className = 'event-reveal__three-stage';
    cardLayer.append(cssRenderer.domElement);

    const cardElement = createEventCard();
    setEventCardContent(cardElement, TOUR_STOPS[0], 0);
    const cardObject = new CSS3DObject(cardElement);
    cardObject.position.set(4.6, 0.25, -2);
    cardObject.rotation.y = -0.65;
    cardObject.scale.setScalar(0.004);
    cssScene.add(cardObject);

    let animationFrame = 0;
    let previousTime = performance.now();
    const renderCssScene = (time) => {
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const width = sizeRef.current.cssWidth || 1;
      const height = sizeRef.current.cssHeight || 1;
      const isMobile = width < 680;
      const isCompact = width < 1000;
      const cardVisible = phaseRef.current === 'card' || phaseRef.current === 'featured';
      const targetX = isMobile ? 0 : isCompact ? 3 : 4.25;
      const targetY = isMobile ? -2.65 : 0.4;
      const targetZ = cardVisible ? 1.1 : -2;
      const targetScale = cardVisible ? (isMobile ? 0.0069 : isCompact ? 0.0063 : 0.0082) : 0.0035;

      const cardAriaHidden = cardVisible ? 'false' : 'true';
      if (cardElement.getAttribute('aria-hidden') !== cardAriaHidden) {
        cardElement.setAttribute('aria-hidden', cardAriaHidden);
      }

      cardObject.position.x = THREE.MathUtils.damp(cardObject.position.x, targetX, 6.5, delta);
      cardObject.position.y = THREE.MathUtils.damp(cardObject.position.y, targetY, 6.5, delta);
      cardObject.position.z = THREE.MathUtils.damp(cardObject.position.z, targetZ, 6.5, delta);
      cardObject.rotation.y = THREE.MathUtils.damp(cardObject.rotation.y, cardVisible ? -0.08 : -0.72, 7, delta);
      const nextScale = THREE.MathUtils.damp(cardObject.scale.x, targetScale, 7, delta);
      cardObject.scale.setScalar(nextScale);
      cardElement.style.opacity = `${THREE.MathUtils.damp(Number(cardElement.style.opacity || 0), cardVisible ? 1 : 0, 9, delta)}`;

      cssCamera.aspect = width / height;
      cssCamera.position.z = isMobile ? 14.5 : 12.5;
      cssCamera.updateProjectionMatrix();
      cssRenderer.setSize(width, height);
      cssRenderer.render(cssScene, cssCamera);
      animationFrame = requestAnimationFrame(renderCssScene);
    };
    animationFrame = requestAnimationFrame(renderCssScene);

    const handleCardUpdate = (event) => {
      setEventCardContent(cardElement, TOUR_STOPS[event.detail], event.detail);
    };
    container.addEventListener('event-stop-change', handleCardUpdate);

    return () => {
      cancelAnimationFrame(animationFrame);
      container.removeEventListener('event-stop-change', handleCardUpdate);
      resizeObserver.disconnect();
      const renderer = earthGlobe.renderer?.();
      earthGlobe._destructor?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      globeRef.current = null;
      globeLayer.replaceChildren();
      cssScene.remove(cardObject);
      cardLayer.replaceChildren();
    };
  }, []);

  useEffect(() => {
    containerRef.current?.dispatchEvent(new CustomEvent('event-stop-change', { detail: activeStop }));
  }, [activeStop]);

  useEffect(() => {
    if (!runId) return undefined;

    const timers = [];
    TOUR_STOPS.forEach((stop, index) => {
      const stopStart = index * STOP_DURATION;
      timers.push(window.setTimeout(() => {
        const globe = globeRef.current;
        setActiveStop(index);
        updatePhase('travel');
        globe?.ringsData([]).pointOfView({ lat: stop.lat, lng: stop.lng, altitude: 2.05 }, TRAVEL_MS);
      }, stopStart));
      timers.push(window.setTimeout(() => {
        const visibleEvents = TOUR_STOPS.slice(0, index + 1).map((event, eventIndex) => ({
          ...event,
          active: eventIndex === index,
        }));
        globeRef.current?.pointsData(visibleEvents).ringsData([stop]);
        updatePhase('activate');
      }, stopStart + TRAVEL_MS));
      timers.push(window.setTimeout(
        () => updatePhase(stop.featured ? 'featured' : 'card'),
        stopStart + TRAVEL_MS + ACTIVATE_MS,
      ));
    });

    timers.push(window.setTimeout(() => {
      const finalStop = TOUR_STOPS[TOUR_STOPS.length - 1];
      globeRef.current
        ?.pointsData(TOUR_STOPS.map((event) => ({ ...event, active: event.featured })))
        .ringsData([finalStop])
        .pointOfView({ lat: finalStop.lat, lng: finalStop.lng, altitude: 2.05 }, 500);
      setRunning(false);
      updatePhase('complete');
    }, TOUR_DURATION));

    return () => timers.forEach(window.clearTimeout);
  }, [runId, updatePhase]);

  const stop = TOUR_STOPS[activeStop];
  const eventIsLive = phase === 'activate' || phase === 'card' || phase === 'featured' || phase === 'complete';

  return (
    <section
      ref={containerRef}
      className={`event-reveal event-reveal--${phase}`}
      aria-label="Cinematic AWS event globe experiment"
    >
      <div className="event-reveal__atmosphere" aria-hidden="true" />
      <div ref={globeLayerRef} className="event-reveal__earth" aria-hidden="true" />
      <div className="event-reveal__vignette" aria-hidden="true" />

      <div key={`beacon-${activeStop}-${runId}`} className="event-reveal__beacon" aria-hidden="true">
        <span className="event-reveal__beam" />
        <span className="event-reveal__pulse event-reveal__pulse--one" />
        <span className="event-reveal__pulse event-reveal__pulse--two" />
        <span className="event-reveal__spark event-reveal__spark--one" />
        <span className="event-reveal__spark event-reveal__spark--two" />
        <span className="event-reveal__spark event-reveal__spark--three" />
      </div>

      <div ref={cardLayerRef} className="event-reveal__three-layer" />

      <div className="event-reveal__journey" aria-live="polite">
        <span>{running ? `STOP 0${activeStop + 1} / 04` : phase === 'complete' ? 'TOUR COMPLETE' : 'GLOBAL EVENT TOUR'}</span>
        <strong>{running || phase === 'complete' ? stop.city : 'FOUR EVENTS. ONE GLOBE.'}</strong>
        <i className={eventIsLive ? 'is-live' : ''}>{eventIsLive ? 'EVENT LIVE' : phase === 'travel' ? 'TRAVELLING' : 'READY'}</i>
      </div>

      <div key={`title-${runId}`} className="event-reveal__title">
        <span>FEATURED EVENT</span>
        <strong>AWS COMMUNITY DAY</strong>
        <em>SINGAPORE</em>
        <small>22 AUGUST 2026</small>
      </div>

      <div className="event-reveal__controls">
        <button type="button" onClick={startReveal} disabled={running}>
          <span aria-hidden="true">{running ? '•••' : '▶'}</span>
          {running ? 'Touring events' : phase === 'complete' ? 'Replay event tour' : 'Start event tour'}
        </button>
        <small>Events light up as the globe arrives</small>
      </div>
    </section>
  );
}
