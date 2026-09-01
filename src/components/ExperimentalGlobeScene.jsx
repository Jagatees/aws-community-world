import { useEffect, useMemo, useRef, useState } from 'react';
import createGlobe from 'cobe';
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { getMemberImage } from '../utils/memberMarkers';
import ExperimentalEventReveal from './ExperimentalEventReveal';
import ExperimentalGlobalInfra from './ExperimentalGlobalInfra';
import ExperimentalPixelMap from './ExperimentalPixelMap';
import './ExperimentalGlobeScene.css';

const HERO_PLACEHOLDER = 'https://d1.awsstatic.com/getting-started-guides/new-heros-nov-2022/AWS-Heroes%20program-community-heroes_logo_dark.efe13e0d50fdf64d8a4524bf876d79a64dd82488.png';
const GLOBE_ROTATE_SPEED = 0.00125;
const CARD_ANGLE_STEP = 0.22;
const CARD_SCALE = 0.0086;
const FRONT_LAYER_DEPTH = 0.35;
const RING_CONFIG = [
  { y: 0.93, radiusX: 5.15, radiusZ: 1.75, phase: -0.08, direction: 1 },
  { y: 0, radiusX: 5.75, radiusZ: 2.1, phase: 0.04, direction: -1 },
  { y: -0.93, radiusX: 5.15, radiusZ: 1.75, phase: 0.12, direction: 1 },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function wrapCentered(value, length) {
  return ((value + length / 2) % length + length) % length - length / 2;
}

function makePortraitElement(member, image, onMarkerClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'experimental-globe__portrait';
  button.setAttribute('aria-label', `Open ${member.name}`);
  button.title = member.name;

  const frame = document.createElement('span');
  frame.className = 'experimental-globe__portrait-frame';
  const imageFrame = document.createElement('span');
  imageFrame.className = 'experimental-globe__portrait-image';
  const portrait = document.createElement('img');
  portrait.src = image;
  portrait.alt = member.name;
  portrait.loading = 'lazy';
  portrait.draggable = false;
  portrait.addEventListener('error', () => {
    if (portrait.src !== HERO_PLACEHOLDER) portrait.src = HERO_PLACEHOLDER;
  });
  const sheen = document.createElement('span');
  sheen.className = 'experimental-globe__portrait-sheen';

  imageFrame.append(portrait);
  frame.append(imageFrame, sheen);
  button.append(frame);
  button.addEventListener('click', () => onMarkerClick(member));
  return button;
}

function HeroOrbitScene({ members, onMarkerClick, cardOpen }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const backLayerRef = useRef(null);
  const frontLayerRef = useRef(null);
  const sizeRef = useRef({ width: 1, height: 1 });
  const phiRef = useRef(0.3);
  const thetaRef = useRef(-0.08);
  const ringOffsetRef = useRef(0);
  const ringTargetRef = useRef(0);

  const portraitRows = useMemo(() => {
    const rows = [[], [], []];
    members.forEach((member, index) => {
      rows[index % 3].push({ member, image: getMemberImage(member) || HERO_PLACEHOLDER });
    });
    return rows;
  }, [members]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !backLayerRef.current || !frontLayerRef.current) {
      return undefined;
    }

    const container = containerRef.current;
    const backLayer = backLayerRef.current;
    const frontLayer = frontLayerRef.current;
    const backScene = new THREE.Scene();
    const frontScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 12.5);

    const backRenderer = new CSS3DRenderer();
    const frontRenderer = new CSS3DRenderer();
    backRenderer.domElement.className = 'experimental-globe__css3d-stage';
    frontRenderer.domElement.className = 'experimental-globe__css3d-stage';
    backLayer.append(backRenderer.domElement);
    frontLayer.append(frontRenderer.domElement);

    const portraitObjects = portraitRows.flatMap((row, rowIndex) => row.map(({ member, image }, index) => {
      const element = makePortraitElement(member, image, onMarkerClick);
      element.dataset.ring = `${rowIndex}`;
      element.dataset.slot = `${index}`;
      const object = new CSS3DObject(element);
      object.scale.setScalar(CARD_SCALE);
      object.userData = { index, rowIndex, rowLength: row.length };
      frontScene.add(object);
      return object;
    }));

    const layoutPortraits = () => {
      portraitObjects.forEach((object) => {
        const { index, rowIndex, rowLength } = object.userData;
        const config = RING_CONFIG[rowIndex];
        const relativeIndex = wrapCentered(
          index - ringOffsetRef.current * config.direction,
          rowLength,
        );
        const angle = relativeIndex * CARD_ANGLE_STEP + config.phase;
        const visible = Math.abs(angle) <= Math.PI;
        object.visible = true;
        object.element.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) {
          object.element.style.pointerEvents = 'none';
          object.position.set(0, 0, -50);
          if (object.parent !== backScene) backScene.add(object);
          return;
        }

        const x = Math.sin(angle) * config.radiusX;
        const z = Math.cos(angle) * config.radiusZ;
        const depth = (z + config.radiusZ) / (config.radiusZ * 2);
        const edge = Math.abs(Math.sin(angle));
        const scale = CARD_SCALE * (0.8 + depth * 0.15);

        object.position.set(x, config.y, z);
        object.rotation.set(0, angle * 0.58, 0);
        object.scale.setScalar(scale);
        object.element.style.opacity = `${clamp(0.34 + depth * 0.72 - edge * 0.08, 0.28, 1)}`;
        object.element.style.pointerEvents = z > FRONT_LAYER_DEPTH ? 'auto' : 'none';

        const destination = z > FRONT_LAYER_DEPTH ? frontScene : backScene;
        if (object.parent !== destination) destination.add(object);
      });
    };

    const updateSize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = {
        width: Math.round(width * pixelRatio),
        height: Math.round(height * pixelRatio),
      };
      camera.aspect = width / height;
      camera.position.z = width < 700 ? 14.8 : 12.5;
      camera.updateProjectionMatrix();
      backRenderer.setSize(width, height);
      frontRenderer.setSize(width, height);
    };

    updateSize();
    layoutPortraits();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: sizeRef.current.width,
      height: sizeRef.current.height,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: 1,
      diffuse: 1.35,
      mapSamples: 22000,
      mapBrightness: 8.5,
      mapBaseBrightness: 0.035,
      baseColor: [0.008, 0.055, 0.09],
      markerColor: [0.12, 0.88, 1],
      glowColor: [0.02, 0.72, 1],
      markers: [],
      opacity: 0.98,
      scale: 0.68,
      onRender: (state) => {
        if (!cardOpen) phiRef.current += GLOBE_ROTATE_SPEED;
        state.width = sizeRef.current.width;
        state.height = sizeRef.current.height;
        state.phi = phiRef.current;
        state.theta = thetaRef.current;
        state.scale = 0.68;
      },
    });

    let animationFrame = 0;
    let previousTime = performance.now();
    const render = (time) => {
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const easing = 1 - Math.exp(-delta * 10);
      ringOffsetRef.current += (ringTargetRef.current - ringOffsetRef.current) * easing;
      layoutPortraits();
      backRenderer.render(backScene, camera);
      frontRenderer.render(frontScene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      globe.destroy();
      backLayer.replaceChildren();
      frontLayer.replaceChildren();
    };
  }, [cardOpen, onMarkerClick, portraitRows]);

  return (
    <section
      ref={containerRef}
      className="experimental-globe"
      aria-label="Experimental infinite 3D Hero carousel"
      onWheel={(event) => {
        event.preventDefault();
        const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
        ringTargetRef.current += delta * 0.0045;
      }}
    >
      <div className="experimental-globe__ambient" aria-hidden="true" />
      <div className="experimental-globe__grid" aria-hidden="true" />
      <div ref={backLayerRef} className="experimental-globe__css3d experimental-globe__css3d--back" />
      <canvas ref={canvasRef} className="experimental-globe__canvas" aria-hidden="true" />
      <div ref={frontLayerRef} className="experimental-globe__css3d experimental-globe__css3d--front" />
      <div className="experimental-globe__scan" aria-hidden="true" />
    </section>
  );
}

const EXPERIMENTS = [
  { id: 'pixel-build', label: 'Country Mosaic', description: 'One square per country' },
  { id: 'hero-orbit', label: 'Hero Orbit', description: 'Browse AWS Heroes' },
  { id: 'event-reveal', label: 'Event Reveal', description: 'Play a cinematic globe intro' },
  { id: 'global-infra', label: 'Global Infra', description: 'Explore AWS infrastructure' },
];

export default function ExperimentalGlobeScene(props) {
  const [experiment, setExperiment] = useState('hero-orbit');

  return (
    <div className="experimental-lab">
      <nav className="experimental-lab__picker" aria-label="Choose an experiment">
        {EXPERIMENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={experiment === item.id ? 'is-active' : ''}
            aria-pressed={experiment === item.id}
            onClick={() => setExperiment(item.id)}
          >
            <span>{item.label}</span>
            <small>{item.description}</small>
          </button>
        ))}
      </nav>

      <div className="experimental-lab__stage">
        {experiment === 'pixel-build' ? (
          <ExperimentalPixelMap />
        ) : experiment === 'hero-orbit' ? (
          <HeroOrbitScene {...props} />
        ) : experiment === 'event-reveal' ? (
          <ExperimentalEventReveal />
        ) : (
          <ExperimentalGlobalInfra />
        )}
      </div>
    </div>
  );
}
