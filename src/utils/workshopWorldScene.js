import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import icons from '../data/aws-service-icons.json';
import { createKiroGuide } from './kiroWorldGuide';
import { BLOCK_SPACING, DISPLAY_HALF_DEPTH, DISPLAY_HALF_WIDTH, LANE_CENTERS, ROOM_HALF_WIDTH, WORLD_START, blockedByShop, buildStreetLayout, interiorLayout, shopEntrance, shopLocalPosition, streetAtPosition, streetColor, streetEntrance } from './workshopWorldLayout';

const shortName = name => name.replace(/^(Amazon|AWS)\s+/, '');
const EYE_HEIGHT = 1.72;
const KEY_MOVES = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', KeyD: 'right', ArrowLeft: 'turnLeft', ArrowRight: 'turnRight', ShiftLeft: 'run', ShiftRight: 'run' };

// One persistent first-person world. Nearby storefronts are streamed while distant
// buildings use instancing. Crossing a doorway loads that shop's complete interior.
export function createWorkshopWorld(host, { services, workshops, counts, darkMode, initialService, initialCategory, onEnter, onLeave, onItem, onClosed, onStatus, onUnavailable, onGuideReady }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
  catch { queueMicrotask(onUnavailable); return null; }
  let disposed = false, unavailable = false, paused = false, focused = true, frame = 0, lastTime = 0;
  let yaw = WORLD_START.yaw, pitch = 0, inside = null, room = null, roomData = null, nearby = null;
  let lastStatus = '', lastPublish = 0, streamKey = '', pointer = null, returnShop = null;
  let slowFrames = 0, economical = false;
  const movement = new Set(), keys = new Set();
  const world = buildStreetLayout(services, counts);
  const { shops: layout, streets, maxRows, bounds } = world;
  const shopsById = new Map(layout.map(shop => [shop.id, shop]));
  const stock = new Map(layout.map(shop => [shop.id, workshops.filter(item => item.serviceIds.includes(shop.id)).sort((a, b) => a.title.localeCompare(b.title))]));
  const scene = new THREE.Scene();
  const sky = darkMode ? '#91b7e5' : '#a6cdef';
  const fog = new THREE.Fog(sky, 38, 110);
  scene.background = new THREE.Color(sky); scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(68, 1, .08, 180);
  camera.rotation.order = 'YXZ'; camera.position.set(WORLD_START.x, EYE_HEIGHT, WORLD_START.z);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Only nearby streamed buildings cast shadows, and idle frames reuse the map.
  renderer.shadowMap.autoUpdate = false;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Walk through the workshop world. W A S D to move, arrow keys to turn, drag to look, E to interact.');
  host.appendChild(canvas);
  const outside = new THREE.Group(); scene.add(outside);
  const geometry = new THREE.BoxGeometry(1, 1, 1), plane = new THREE.PlaneGeometry(1, 1), puff = new THREE.SphereGeometry(1, 16, 10);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
  const rounded = new Map(), batchable = new Set([geometry, puff, cylinder]);
  const materials = new Map();
  const vertexMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .52, metalness: .08 });
  const glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  const detailed = new Map();
  const doors = new Map();
  const targets = [];
  const raycaster = new THREE.Raycaster(), cursor = new THREE.Vector2();
  const { minX, maxX, minZ, maxZ } = bounds;
  const centerX = (minX + maxX) / 2, worldWidth = maxX - minX;
  const sun = new THREE.DirectionalLight('#fff0d7', 3.2);
  sun.position.set(-16, 30, -15); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.normalBias = .12; sun.shadow.bias = -.0005;
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 75 });
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#e1edff', '#8c88a1', 1.65));

  function invalidate() { if (!disposed && !unavailable && !frame) frame = requestAnimationFrame(render); }
  function material(color, glow = false) {
    const key = color + glow;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .52, metalness: .08, ...(glow ? { emissive: color, emissiveIntensity: .65 } : {}) }));
    return materials.get(key);
  }
  function box(parent, pos, scale, color, glow = false) {
    const mesh = new THREE.Mesh(geometry, material(color, glow)); mesh.position.set(...pos); mesh.scale.set(...scale); parent.add(mesh); return mesh;
  }
  function sphere(parent, pos, scale, color) {
    const mesh = new THREE.Mesh(puff, material(color)); mesh.position.set(...pos); mesh.scale.set(...scale); parent.add(mesh); return mesh;
  }
  function roundBox(parent, pos, size, color, radius = .12, glow = false) {
    const key = [...size, radius].join(':');
    if (!rounded.has(key)) {
      const source = new RoundedBoxGeometry(...size, radius >= .15 ? 2 : 1, radius);
      const shape = mergeVertices(source); source.dispose();
      rounded.set(key, shape); batchable.add(shape);
    }
    const mesh = new THREE.Mesh(rounded.get(key), material(color, glow)); mesh.position.set(...pos); parent.add(mesh); return mesh;
  }
  function drum(parent, pos, size, color, glow = false) {
    const mesh = new THREE.Mesh(cylinder, material(color, glow)); mesh.position.set(...pos); mesh.scale.set(...size); parent.add(mesh); return mesh;
  }
  function cloud(parent, x, y, z, scale = 1) {
    const root = group(parent, [x, y, z]); root.scale.setScalar(scale);
    [[-1.8, 0, 0, 1.35], [-.7, .5, -.25, 1.55], [.8, .25, 0, 1.65], [2, -.15, .1, 1.2], [0, -.45, .6, 1.4]].forEach(([px, py, pz, r]) => sphere(root, [px, py, pz], [r, r * .78, r * .85], '#fff5e9'));
    return root;
  }
  function group(parent, position = [0, 0, 0]) { const value = new THREE.Group(); value.position.set(...position); parent.add(value); return value; }
  function resource(owner, value) { (owner.userData.resources ||= new Set()).add(value); return value; }
  function disposeGroup(owner) {
    if (!owner) return;
    owner.userData.disposed = true;
    owner.traverse(child => { for (const value of child.userData.resources || []) value.dispose(); });
    owner.removeFromParent(); owner.clear();
  }
  function batchStaticGeometry(owner) {
    owner.updateWorldMatrix(true, true);
    const inverse = owner.matrixWorld.clone().invert();
    for (const glow of [false, true]) {
      const parts = [], meshes = [];
      owner.traverse(mesh => {
        if (!mesh.isMesh || mesh.isInstancedMesh || mesh.userData.itemId || mesh.material.transparent || !batchable.has(mesh.geometry) || Boolean(mesh.material.emissiveIntensity > 0 && mesh.material.emissive?.getHex()) !== glow) return;
        let parent = mesh.parent;
        while (parent && parent !== owner) { if (parent.userData.dynamic) return; parent = parent.parent; }
        const part = mesh.geometry.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
        const color = mesh.material.color, colors = new Float32Array(part.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) { colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b; }
        part.setAttribute('color', new THREE.BufferAttribute(colors, 3)); parts.push(part); meshes.push(mesh);
      });
      if (!parts.length) continue;
      const combined = resource(owner, mergeGeometries(parts));
      const merged = new THREE.Mesh(combined, glow ? glowMaterial : vertexMaterial);
      merged.castShadow = !glow && Boolean(owner.userData.castShadow);
      merged.receiveShadow = !glow; owner.add(merged);
      parts.forEach(part => part.dispose()); meshes.forEach(mesh => mesh.removeFromParent());
    }
  }
  function textTexture(owner, title, subtitle = '', bg = '#193c48', wide = false) {
    const element = document.createElement('canvas'); element.width = wide ? 768 : 640; element.height = wide ? 192 : 400;
    const width = element.width, height = element.height;
    const ctx = element.getContext('2d');
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); }
    ctx.fillStyle = '#f6f2e9'; ctx.font = `600 ${wide ? 64 : 43}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = []; let line = '';
    for (const word of title.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width - 64) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    const maxLines = wide ? 2 : 4, shown = lines.slice(0, maxLines);
    const leading = wide ? 64 : 52, top = (wide ? 76 : subtitle ? 175 : 200) - (shown.length - 1) * leading / 2;
    shown.forEach((value, index) => ctx.fillText(value + (index === maxLines - 1 && lines.length > maxLines ? '…' : ''), width / 2, top + index * leading, width - 64));
    if (subtitle) { ctx.font = `500 ${wide ? 25 : 28}px system-ui, sans-serif`; ctx.fillStyle = '#ffce86'; ctx.fillText(subtitle, width / 2, height - 32, width - 64); }
    const texture = resource(owner, new THREE.CanvasTexture(element)); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }
  function sign(owner, parent, position, size, texture) {
    const mat = resource(owner, new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
    const mesh = new THREE.Mesh(plane, mat); mesh.position.set(...position); mesh.scale.set(size[0], size[1], 1); parent.add(mesh); return mesh;
  }
  function icon(owner, parent, position, size, shop) {
    const entry = icons[shop.id];
    if (!entry) return;
    const texture = resource(owner, new THREE.TextureLoader().load(entry.src, value => {
      if (disposed || owner.userData.disposed) { value.dispose(); return; }
      value.colorSpace = THREE.SRGBColorSpace; invalidate();
    }, undefined, () => {}));
    texture.colorSpace = THREE.SRGBColorSpace; sign(owner, parent, position, [size, size], texture);
  }
  function serverPanel(parent, x, z, accent, open) {
    roundBox(parent, [x, 1.7, z], [3.05, 3.25, .48], '#2c4058', .22);
    roundBox(parent, [x, 1.7, z + .25], [2.67, 2.91, .12], '#111e33', .12);
    for (let row = 0; row < 5; row++) {
      const y = .55 + row * .57;
      roundBox(parent, [x, y, z + .34], [2.5, .46, .2], '#34465e', .07);
      for (let vent = 0; vent < 4; vent++) box(parent, [x - .78 + vent * .36, y, z + .45], [.23, .035, .015], '#111f34');
      sphere(parent, [x + 1, y, z + .47], [.065, .065, .035], open ? '#ffc56d' : '#737b86');
      box(parent, [x + .8, y, z + .46], [.035, .13, .03], open ? '#a4fff0' : '#8892a5', open);
    }
    box(parent, [x, .1, z], [2.8, .07, .52], accent, open);
  }
  function planter(parent, x, z, scale = 1, leafy = false) {
    const pot = group(parent, [x, 0, z]); pot.scale.setScalar(scale);
    roundBox(pot, [0, .33, 0], [1.18, .66, .95], '#f1e5d2', .18);
    roundBox(pot, [0, .65, 0], [.95, .045, .72], '#55594a', .05);
    if (leafy) {
      drum(pot, [0, 1.05, 0], [.035, .8, .035], '#68874a');
      for (let i = 0; i < 7; i++) {
        const angle = i * 2.4, leaf = sphere(pot, [Math.sin(angle) * .19, .98 + i % 3 * .14, Math.cos(angle) * .18], [.16, .48, .09], i % 2 ? '#55855a' : '#91ab58');
        leaf.rotation.set(Math.cos(angle) * .5, angle, Math.sin(angle) * .5);
      }
    } else {
      [[-.3, .86, .06, .38], [.24, .98, -.05, .48], [.06, .88, .22, .38], [-.12, 1.2, -.15, .36]].forEach(([px, py, pz, r], i) => sphere(pot, [px, py, pz], [r, r, r], ['#6b9858', '#92ac59', '#507e57', '#b3bf65'][i]));
    }
    return pot;
  }
  function streetLamp(parent, x, z, accent) {
    const lamp = group(parent, [x, 0, z]);
    drum(lamp, [0, 3.4, 0], [.055, 6.8, .055], '#566379');
    roundBox(lamp, [.3, 6.75, 0], [.7, .13, .17], '#566379', .06);
    drum(lamp, [.6, 6.72, 0], [.28, .12, .28], '#d8b788');
    drum(lamp, [.6, 6.65, 0], [.22, .025, .22], '#ffe1a4', true);
    roundBox(lamp, [0, .13, 0], [.25, .26, .25], '#f1e5d2', .06);
    roundBox(lamp, [-.38, 5.8, 0], [.65, 1.25, .08], accent, .06);
    cloud(lamp, -.38, 5.82, .09, .075);
  }
  function storefront(shop) {
    const root = group(outside, [shop.x, 0, shop.z]); root.rotation.y = shop.rotation;
    root.scale.y = .85;
    root.userData.castShadow = true;
    const open = Boolean(shop.count), accent = open ? shop.streetColor : '#78869b';
    // The collision footprint stays fixed while the facade becomes a soft server shop.
    roundBox(root, [0, 4.62, 0], [10, 2.35, 9.1], '#344764', .45);
    box(root, [0, 1.8, -4.4], [10, 3.6, .2], '#dcc6a6');
    for (const x of [-4.9, 4.9]) {
      roundBox(root, [x, 1.8, 0], [.3, 3.6, 8.8], '#425671', .12);
      box(root, [x, 3.35, 0], [.32, .065, 8.5], '#ffe2ac', open);
      for (let z = -3; z <= 3; z += 1.5) roundBox(root, [x * 1.02, 1.65, z], [.08, 2.3, .13], '#8593a7', .04);
    }
    roundBox(root, [0, .025, .1], [10.25, .12, 9.5], '#e4ddda', .05);
    box(root, [0, .04, 4.84], [9.8, .04, .07], '#ffdda1', open);
    roundBox(root, [0, 5.78, 0], [10.15, .18, 9.15], '#b7a2d7', .08);
    cloud(root, 0, 6.1, .5, 1.45);
    for (const side of [-1, 1]) serverPanel(root, side * 3.25, 4.38, accent, open);
    for (const x of [-1.32, 1.32]) {
      roundBox(root, [x, 1.75, 4.55], [.25, 3.5, .48], '#e3c89e', .1);
      box(root, [x * .92, 1.75, 4.81], [.04, 3.1, .03], '#ffe2ab', open);
    }
    roundBox(root, [0, 3.5, 4.55], [2.9, .28, .48], '#e3c89e', .12);
    box(root, [0, 3.45, 4.81], [2.4, .045, .03], '#ffe2ab', open);
    if (open) {
      // A visible, warm vestibule behind doors that slide clear of the entrance.
      box(root, [0, 1.75, -1.75], [2.6, 3.5, .12], '#eec99e', true);
      for (const x of [-1.45, 1.45]) box(root, [x, 1.75, 1.35], [.12, 3.5, 6.1], '#efcfaa');
      roundBox(root, [0, .85, -.65], [2.6, 1.65, 1], '#c4966c', .1);
      roundBox(root, [0, 1.73, -.65], [2.9, .16, 1.15], '#f2ddbd', .07);
      roundBox(root, [0, 2.3, -.8], [1.7, .95, .15], '#304d67', .1);
      icon(root, root, [0, 2.3, -.7], .7, shop);
      planter(root, 1.8, -.5, .8, true);
      const door = group(root, [0, 0, 4.63]); door.userData.dynamic = true; door.userData.open = 0;
      const glass = resource(root, new THREE.MeshStandardMaterial({ color: '#c8e5eb', transparent: true, opacity: .14, roughness: .18, depthWrite: false }));
      for (const side of [-1, 1]) {
        const leaf = group(door, [side * .6, 0, 0]); leaf.userData.side = side;
        const pane = new THREE.Mesh(geometry, glass); pane.position.y = 1.73; pane.scale.set(1.14, 3.25, .055); leaf.add(pane);
        for (const edge of [-.57, .57]) roundBox(leaf, [edge, 1.73, 0], [.045, 3.25, .08], '#c8b69b', .02);
        for (const y of [.1, 3.35]) box(leaf, [0, y, 0], [1.18, .05, .08], '#c8b69b');
        roundBox(leaf, [-side * .36, 1.53, .08], [.045, .48, .07], '#fff2ce', .02, true);
        batchStaticGeometry(leaf);
      }
      doors.set(shop.id, door);
    } else {
      box(root, [0, 1.7, 4.7], [2.4, 3.3, .14], '#81909e');
      for (let i = 0; i < 15; i++) box(root, [0, .18 + i * .22, 4.79], [2.35, .04, .04], '#5b697b');
      sign(root, root, [0, 1.75, 4.84], [2.15, 1], textTexture(root, 'CLOSED', 'No workshops yet'));
    }
    roundBox(root, [0, 4.65, 4.55], [10.2, 2.25, .65], accent, .3);
    roundBox(root, [.62, 4.65, 4.9], [8.3, 1.92, .12], '#263e56', .18);
    roundBox(root, [-3.95, 4.65, 4.94], [1.75, 1.85, .19], '#344761', .15);
    icon(root, root, [-3.95, 4.65, 5.05], 1.45, shop);
    sign(root, root, [.65, 4.65, 4.98], [7.8, 1.8], textTexture(root, shortName(shop.name), open ? `${shop.count} WORKSHOPS · COME EXPLORE` : 'NO WORKSHOPS YET', null, true));
    roundBox(root, [0, 3.49, 4.65], [9.1, .07, .2], '#ffdc9a', .03, open);
    for (const side of [-1, 1]) planter(root, side * 4.55, 4.35, .88, side === 1);
    streetLamp(root, -5.1, 4.3, accent);
    batchStaticGeometry(root);
    return root;
  }

  function tiledFloor(owner, parent, x, z, width, depth, warm = false, y = .015) {
    const element = document.createElement('canvas'); element.width = element.height = 512;
    const ctx = element.getContext('2d');
    ctx.fillStyle = warm ? '#a49281' : '#6c81a0'; ctx.fillRect(0, 0, 512, 512);
    const palette = warm ? ['#dbc8b1', '#e4d1b9', '#d3bfa7', '#e2cdb3'] : ['#a8bdd9', '#b5c5de', '#9eafd0', '#afbed7'];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const px = col * 128, py = row * 128;
      ctx.fillStyle = palette[(row * 3 + col) % palette.length]; ctx.fillRect(px + 1, py + 1, 125, 125);
      ctx.fillStyle = '#ffffff38'; ctx.fillRect(px + 2, py + 2, 123, 1); ctx.fillRect(px + 2, py + 2, 1, 123);
      ctx.fillStyle = '#13274618'; ctx.fillRect(px + 2, py + 125, 123, 1);
    }
    const map = resource(owner, new THREE.CanvasTexture(element)); map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(width / 6.4, depth / 6.4);
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const mat = resource(owner, new THREE.MeshStandardMaterial({ map, roughness: .66, metalness: .05 }));
    const mesh = new THREE.Mesh(plane, mat); mesh.position.set(x, y, z); mesh.rotation.x = -Math.PI / 2; mesh.scale.set(width, depth, 1); mesh.receiveShadow = true; parent.add(mesh);
  }

  // A connected cloud deck: compact lanes and circuit traces, with no falling gaps.
  box(outside, [centerX, -.3, (maxZ + minZ - 1) / 2], [worldWidth + 1, .55, maxZ - minZ + 1], '#d7d4e1');
  tiledFloor(outside, outside, centerX, (maxZ + minZ) / 2, worldWidth + 1, maxZ - minZ, false);
  for (const x of LANE_CENTERS) {
    for (const side of [-1, 1]) {
      box(outside, [x + side * 4.25, .032, (maxZ - 12) / 2], [.12, .02, maxZ + 12], '#c7fff0', true);
      box(outside, [x + side * 4.05, .032, (maxZ - 12) / 2], [.035, .02, maxZ + 12], '#f0f1ff', true);
    }
  }
  const paint = [];
  for (let row = 0; row <= maxRows; row++) {
    const z = row * BLOCK_SPACING - BLOCK_SPACING / 2;
    box(outside, [centerX, .031, z], [worldWidth, .012, .07], '#d6fff5', true);
    for (const x of LANE_CENTERS) {
      for (const side of [-1, 1]) {
        const arrow = box(outside, [x + side * .19, .052, z + side * .19], [.07, .015, .55], '#defff8', true); arrow.rotation.y = side * Math.PI / 4;
      }
      paint.push([x, .052, z + 3, .12, .02, 1.1]);
    }
    if (row % 2 === 0) for (const x of [minX - 2.8, maxX + 2.8]) batchStaticGeometry(cloud(outside, x, -1.6, z, 2.5));
  }
  for (const street of streets) {
    const center = (street.startZ + street.endZ) / 2, length = street.endZ - street.startZ;
    // Each category occupies a continuous, color-coded section of the lane.
    for (const side of [-1, 1]) box(outside, [street.x + side * 3.85, .045, center], [.065, .02, length], street.color);
    // Keep the entire sign in the gap between shop rows, clear of facades and plants.
    // Offset the post from the crossing's center so the walking route stays open.
    const gateway = group(outside, [street.x - 4.55, 0, street.startZ + .65]);
    drum(gateway, [0, .75, 0], [.055, 1.5, .055], '#465d73');
    roundBox(gateway, [0, 1.65, 0], [2.7, .93, .2], '#e6dccf', .2);
    const label = textTexture(outside, street.name, `${street.shopCount} SERVICES`, null, true);
    for (const side of [-1, 1]) {
      roundBox(gateway, [0, 1.65, side * .12], [2.54, .8, .13], '#30465d', .15);
      const face = sign(outside, gateway, [0, 1.65, side * .2], [2.4, .69], label);
      face.rotation.y = side < 0 ? Math.PI : 0;
    }
  }
  for (let x = minX; x <= maxX; x += 11) batchStaticGeometry(cloud(outside, x, -1.7, -14, 2.2));
  // A ringed planet and distant cloud islands give the compact district a sky-world setting.
  sphere(outside, [18, 25, 65], [8, 8, 8], '#c2a9e0');
  const ringGeometry = resource(outside, new THREE.TorusGeometry(11, .25, 8, 80));
  const ring = new THREE.Mesh(ringGeometry, material('#ebc6ee')); ring.position.set(18, 25, 65); ring.rotation.set(1.1, .2, -.3); outside.add(ring);
  for (let i = 0; i < 12; i++) batchStaticGeometry(cloud(outside, -15 + (i % 4) * 32, 15 + (i % 3) * 5, 30 + Math.floor(i / 4) * 45, 1.7 + i % 2));
  const stripes = new THREE.InstancedMesh(geometry, material('#c9f9ef', true), paint.length);
  const dummy = new THREE.Object3D();
  paint.forEach((p, i) => { dummy.position.set(p[0], p[1], p[2]); dummy.scale.set(p[3], p[4], p[5]); dummy.updateMatrix(); stripes.setMatrixAt(i, dummy.matrix); }); outside.add(stripes);
  const distant = new THREE.InstancedMesh(geometry, material('#ffffff'), layout.length);
  function distantMatrix(index, hidden) { const shop = layout[index]; dummy.position.set(shop.x, 2.6, shop.z); dummy.scale.set(hidden ? 0 : 9, hidden ? 0 : 5.2, hidden ? 0 : 10); dummy.updateMatrix(); distant.setMatrixAt(index, dummy.matrix); }
  layout.forEach((shop, index) => { distantMatrix(index, false); distant.setColorAt(index, new THREE.Color(shop.count ? '#667f9e' : '#7e8999')); }); outside.add(distant);
  batchStaticGeometry(outside);
  const playerPosition = () => ({ x: camera.position.x, z: camera.position.z, yaw });
  const guide = createKiroGuide({ parent: outside, world, invalidate, onReady: () => { stop(); if (document.pointerLockElement === canvas) document.exitPointerLock(); onGuideReady(); } });
  guide.reset(playerPosition());
  function stream(force = false) {
    if (inside) return;
    const key = `${Math.floor(camera.position.x / 8)}:${Math.floor(camera.position.z / 8)}`;
    if (!force && key === streamKey) return;
    streamKey = key;
    layout.forEach((shop, index) => {
      const distance = Math.hypot(shop.x - camera.position.x, shop.z - camera.position.z);
      if (distance < 38 && !detailed.has(shop.id)) { detailed.set(shop.id, storefront(shop)); distantMatrix(index, true); }
      else if (distance > 48 && detailed.has(shop.id)) { disposeGroup(detailed.get(shop.id)); detailed.delete(shop.id); doors.delete(shop.id); distantMatrix(index, false); }
    });
    distant.instanceMatrix.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true;
  }
  function buildInterior(shop) {
    room = group(scene); roomData = interiorLayout(stock.get(shop.id));
    const depth = roomData.depth, center = 8 - depth / 2, width = ROOM_HALF_WIDTH * 2;
    const accent = streetColor(shop.category);
    box(room, [0, -.12, center], [width, .2, depth], '#bfa98d');
    tiledFloor(room, room, 0, center, width, depth, true, 0);
    for (const x of [-1.45, 1.45]) box(room, [x, .015, center], [.075, .02, depth], '#ffe5a7', true);
    box(room, [0, 5.8, center], [width, .2, depth], '#c0a084');
    for (const x of [-ROOM_HALF_WIDTH, ROOM_HALF_WIDTH]) {
      box(room, [x, 2.9, center], [.2, 5.8, depth], '#e5caaa');
      box(room, [x * .98, .32, center], [.15, .64, depth], '#b99775');
      box(room, [x * .98, 3.3, center], [.15, .09, depth], '#ffdda3', true);
    }
    box(room, [0, 2.9, 8 - depth], [width, 5.8, .2], '#e5caaa');
    for (const side of [-1, 1]) box(room, [side * (ROOM_HALF_WIDTH + 1.5) / 2, 2.9, 8], [ROOM_HALF_WIDTH - 1.5, 5.8, .2], '#e5caaa');
    const exitSign = sign(room, room, [0, 3.35, 7.85], [2.7, .7], textTexture(room, 'EXIT', '', '#2b7667')); exitSign.rotation.y = Math.PI;
    const outsideView = sign(room, room, [0, 1.55, 8.15], [3, 3.1], textTexture(room, 'BACK TO', 'THE CLOUD', '#91b7e5')); outsideView.rotation.y = Math.PI;
    // Repeated curved timber ribs and cloud pendants form the shop's vaulted canopy.
    const archPoints = Array.from({ length: 17 }, (_, i) => {
      const t = i / 16 * Math.PI; return new THREE.Vector3(-Math.cos(t) * 7.25, 3.75 + Math.sin(t) * 1.85, 0);
    });
    const arch = new THREE.CatmullRomCurve3(archPoints);
    const beamGeometry = resource(room, new THREE.TubeGeometry(arch, 32, .15, 6, false));
    const stripGeometry = resource(room, new THREE.TubeGeometry(arch, 32, .033, 6, false));
    for (let z = 5.5; z > 9 - depth; z -= 4.8) {
      const beam = new THREE.Mesh(beamGeometry, material('#b5906e')); beam.position.z = z; room.add(beam);
      const strip = new THREE.Mesh(stripGeometry, material('#ffdc9b', true)); strip.position.set(0, -.16, z + .02); room.add(strip);
      for (const side of [-1, 1]) {
        drum(room, [side * 5.1, 4.05, z - 1], [.015, 1.25, .015], '#8e7968');
        cloud(room, side * 5.1, 3.45, z - 1, .3);
        drum(room, [side * 5.1, 3.22, z - 1], [.37, .04, .22], '#ffe9bb', true);
      }
    }
    const rear = 8 - depth + .25;
    roundBox(room, [0, 2.75, rear], [5.8, 4.4, .14], '#bfa386', .5);
    roundBox(room, [0, 2.75, rear + .1], [5.3, 3.9, .12], '#ffe1a7', .45, true);
    roundBox(room, [0, 2.75, rear + .2], [5.1, 3.7, .12], '#b89778', .4);
    cloud(room, 0, 3, rear + .4, .55);
    roundBox(room, [0, .6, rear + .5], [4, 1.2, .7], '#a88661', .12);
    roundBox(room, [0, 1.23, rear + .5], [4.2, .12, .9], '#f0d8b4', .05);
    for (const x of [-6.6, 6.6]) {
      planter(room, x, 5.5, 1.05, true);
      for (let z = 1; z > 10 - depth; z -= 6.4) planter(room, x, z, .9, true);
    }
    for (const x of [-2.45, 2.45]) drum(room, [x, 4.65, -2], [.022, 1.65, .022], '#8c785e');
    roundBox(room, [0, 3.75, -2], [6.25, 1.65, .3], '#d6bd9c', .32);
    roundBox(room, [0, 3.75, -1.83], [6.02, 1.43, .12], '#2e4b5e', .26);
    icon(room, room, [-2.28, 3.75, -1.75], 1.02, shop);
    sign(room, room, [.63, 3.75, -1.75], [4.45, 1.2], textTexture(room, shortName(shop.name), 'PICK A WORKSHOP', null, true));
    const warmLight = new THREE.PointLight('#ffd5a0', 16, 18, 2); warmLight.position.set(0, 3.6, 2); room.add(warmLight);
    roomData.displays.forEach(item => {
      const stand = group(room, [item.x, 0, item.z]);
      roundBox(stand, [0, .52, 0], [1.8, 1.04, 1.35], '#2d4256', .13);
      roundBox(stand, [0, 1.1, 0], [2.05, .14, 1.55], '#edd5b3', .065);
      for (let row = 0; row < 3; row++) {
        roundBox(stand, [0, .26 + row * .25, .69], [1.5, .19, .08], '#445569', .03);
        box(stand, [-.58, .26 + row * .25, .75], [.08, .08, .03], '#a4ffe6', true);
        box(stand, [-.37, .26 + row * .25, .75], [.08, .04, .03], '#ffc871', true);
        for (let j = 0; j < 3; j++) box(stand, [.14 + j * .29, .26 + row * .25, .75], [.18, .025, .03], '#192c40');
      }
      roundBox(stand, [0, 1.23, -.12], [.65, .07, .4], '#52667a', .03);
      box(stand, [0, 1.45, -.2], [.12, .4, .12], '#cbb995');
      const kit = roundBox(stand, [0, 1.98, -.18], [1.98, 1.3, .2], '#e7d4bb', .12);
      roundBox(stand, [0, 2, -.065], [1.79, 1.1, .045], '#29465d', .055);
      const cover = sign(room, stand, [0, 2, -.035], [1.68, .99], textTexture(room, item.title, `${String(item.number).padStart(2, '0')}  ·  ${item.level || 'SELF-PACED'}`, '#29465d'));
      roundBox(stand, [0, 1.2, .47], [.85, .055, .25], '#c7b89f', .025);
      const deskPlant = planter(stand, .8, .4, .22, true); deskPlant.position.y = 1.18;
      // Stools stay within each display's existing collision footprint.
      drum(stand, [0, .25, .82], [.22, .5, .22], '#638578');
      drum(stand, [0, .53, .82], [.3, .12, .22], '#e6cda9');
      box(stand, [.7, 1.18, .5], [.1, .025, .05], accent);
      kit.userData.itemId = item.id; cover.userData.itemId = item.id;
      targets.push(kit, cover);
    });
    // Only the monitor and its screen remain separate for item raycasting.
    batchStaticGeometry(room);
  }
  function updateCamera() { camera.rotation.set(pitch, yaw, 0, 'YXZ'); camera.updateMatrixWorld(); }
  function stop() { movement.clear(); keys.clear(); pointer = null; }
  function focus() { focused = true; canvas.focus({ preventScroll: true }); }
  function enter(shop, notify = true) {
    if (!shop.count) { onClosed(shop.id); return; }
    stop(); guide.cancel(); disposeGroup(room); targets.length = 0;
    inside = shop; returnShop = shop; outside.visible = false; scene.fog = null; sun.castShadow = false; buildInterior(shop);
    camera.position.set(0, EYE_HEIGHT, 4.8); yaw = 0; pitch = 0; nearby = null;
    if (notify) onEnter(shop.id);
    updateCamera(); publish(true); focus(); invalidate();
  }
  function leave(notify = true) {
    if (!inside) return;
    const shop = returnShop || inside; inside = null; disposeGroup(room); room = null; roomData = null; targets.length = 0;
    outside.visible = true; scene.fog = fog; sun.castShadow = !economical; renderer.shadowMap.needsUpdate = true; stop();
    const point = shopEntrance(shop, 7.7); camera.position.set(point.x, EYE_HEIGHT, point.z); yaw = point.yaw + Math.PI; pitch = 0; nearby = null;
    guide.reset(playerPosition());
    if (notify) onLeave();
    stream(true); updateCamera(); publish(true); focus(); invalidate();
  }
  function visit(id) {
    const shop = shopsById.get(id); if (!shop) return;
    if (inside) leave(); stop();
    const point = shopEntrance(shop); camera.position.set(point.x, EYE_HEIGHT, point.z); yaw = point.yaw; pitch = 0;
    guide.reset(playerPosition());
    stream(true); updateCamera(); publish(true); focus(); invalidate();
  }
  function visitStreet(id) {
    const street = streets.find(item => item.id === id); if (!street) return;
    if (inside) leave(); stop();
    const point = streetEntrance(street); camera.position.set(point.x, EYE_HEIGHT, point.z); yaw = point.yaw; pitch = 0;
    guide.reset(playerPosition());
    stream(true); updateCamera(); publish(true); focus(); invalidate();
  }
  function findNearby() {
    if (inside) {
      if (Math.hypot(camera.position.x, camera.position.z - 8) < 2.8 && Math.cos(yaw) < -.3) return { type: 'exit', id: 'exit', label: 'Back to the cloud', hint: 'Walk through the door or press E' };
      let best, min = 4.3;
      for (const item of roomData.displays) {
        const dx = item.x - camera.position.x, dz = item.z - camera.position.z, distance = Math.hypot(dx, dz);
        if (distance < min && (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / Math.max(.01, distance) > .05) { best = item; min = distance; }
      }
      return best ? { type: 'item', id: best.id, label: best.title, hint: 'Explore workshop · E or tap' } : null;
    }
    let best, min = 3.9;
    for (const shop of layout) {
      const local = shopLocalPosition(shop, camera.position.x, camera.position.z);
      const distance = Math.hypot(local.x, local.z - 4.65);
      if (local.z > 4 && distance < min) { best = shop; min = distance; }
    }
    if (best) return { type: best.count ? 'door' : 'closed', id: best.id, label: best.count ? `Enter ${best.name}` : `${best.name} is closed`, hint: best.count ? `${best.count} workshops · Walk through the door or press E` : 'No workshops in this catalog yet' };
    const helper = guide.snapshot(), dx = helper.position.x - camera.position.x, dz = helper.position.z - camera.position.z;
    return ['ready', 'roaming', 'arrived'].includes(helper.mode) && guide.canTalk(playerPosition()) && (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) > .7 ? { type: 'kiro', id: 'kiro', label: 'Talk to Kiro', hint: 'Choose a service and follow me there' } : null;
  }
  function interact() {
    if (paused) return;
    nearby = findNearby(); if (!nearby) return;
    if (nearby.type === 'door') enter(shopsById.get(nearby.id));
    else if (nearby.type === 'exit') leave();
    else if (nearby.type === 'closed') onClosed(nearby.id);
    else if (nearby.type === 'kiro') callGuide();
    else if (inside) { stop(); if (document.pointerLockElement === canvas) document.exitPointerLock(); onItem(inside.id, nearby.id); }
  }
  function publish(force = false) {
    nearby = findNearby();
    const street = inside ? streets.find(item => item.id === inside.streetId) : streetAtPosition(streets, camera.position.x, camera.position.z);
    const location = street?.name || 'Cloud plaza';
    const helper = guide.snapshot();
    const key = `${inside?.id || ''}:${nearby?.type}:${nearby?.id}:${location}:${helper.mode}:${helper.destination}:${helper.waiting}`;
    const now = performance.now();
    if (force || key !== lastStatus || now - lastPublish > 180) {
      lastStatus = key; lastPublish = now;
      onStatus({ location, streetId: street?.id, nearby, position: playerPosition(), guide: helper });
    }
  }
  function blocked(x, z) {
    if (inside) {
      if (Math.abs(x) > ROOM_HALF_WIDTH - .35 || z < 8 - roomData.depth + .4 || z > 8.6 || (z > 7.65 && Math.abs(x) > 1.2)) return true;
      return roomData.displays.some(item => Math.abs(x - item.x) < DISPLAY_HALF_WIDTH && Math.abs(z - item.z) < DISPLAY_HALF_DEPTH);
    }
    return x < minX || x > maxX || z < minZ || z > maxZ || layout.some(shop => blockedByShop(shop, x, z));
  }
  function step(delta) {
    if (paused) return false;
    const active = name => movement.has(name) || [...keys].some(key => KEY_MOVES[key] === name);
    const turn = Number(active('turnLeft')) - Number(active('turnRight'));
    yaw += turn * delta * 1.7;
    let forward = Number(active('forward')) - Number(active('backward'));
    let right = Number(active('right')) - Number(active('left'));
    const length = Math.hypot(forward, right); if (length) { forward /= length; right /= length; }
    const speed = (active('run') ? 6 : 3.5) * delta;
    const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed;
    const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed;
    if (!blocked(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
    if (!blocked(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
    if (inside && camera.position.z > 8.15 && Math.abs(camera.position.x) < 1.2) { leave(); return true; }
    if (!inside) for (const shop of layout) {
      if (!shop.count) continue;
      const local = shopLocalPosition(shop, camera.position.x, camera.position.z);
      if (Math.abs(local.x) < 1.05 && local.z < 4.6 && local.z > 3.7) { enter(shop); return true; }
    }
    return Boolean(turn || length);
  }
  function render(now) {
    frame = 0; if (disposed || unavailable) return;
    const elapsed = Math.max(0, lastTime ? (now - lastTime) / 1000 : 1 / 60);
    const delta = Math.min(.25, elapsed); lastTime = now;
    // Keep walking speed stable on slower GPUs, with small collision-safe steps.
    const steps = Math.max(1, Math.ceil(delta / .035)); let moving = false;
    for (let i = 0; i < steps; i++) moving = step(delta / steps) || moving;
    if (!economical && elapsed > .065) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (!economical && slowFrames >= 8) {
      economical = true; sun.castShadow = false; renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, .85)); resize();
    }
    updateCamera(); stream();
    const guiding = guide.update(delta, now, playerPosition(), !inside && !paused && focused && !document.hidden);
    let animating = false;
    if (!inside) for (const [id, door] of doors) {
      const shop = shopsById.get(id), local = shopLocalPosition(shop, camera.position.x, camera.position.z);
      const target = Math.abs(local.x) < 2.5 && local.z < 8.5 && local.z > 4 ? 1 : 0;
      if (Math.abs(door.userData.open - target) > .005) {
        door.userData.open = THREE.MathUtils.damp(door.userData.open, target, 9, delta || .016);
        for (const leaf of door.children) leaf.position.x = leaf.userData.side * (.6 + door.userData.open * 1.2);
        animating = true;
      }
    }
    if (!inside && renderer.shadowMap.needsUpdate) {
      sun.position.set(camera.position.x - 16, 30, camera.position.z - 15);
      sun.target.position.set(camera.position.x, 0, camera.position.z);
      renderer.shadowMap.needsUpdate = true;
    }
    publish(!moving && !animating && !guiding); renderer.render(scene, camera);
    if (moving || animating || guiding) invalidate(); else lastTime = 0;
  }
  function resize() { if (!host.clientWidth || !host.clientHeight) return; renderer.setSize(host.clientWidth, host.clientHeight); camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); invalidate(); }
  const observer = new ResizeObserver(resize); observer.observe(host);
  function keydown(event) {
    if (event.code === 'Escape') { stop(); if (document.pointerLockElement === canvas) document.exitPointerLock(); return; }
    if (paused || event.target instanceof HTMLElement && event.target.closest('input,select,textarea,button,a')) return;
    if (KEY_MOVES[event.code]) { event.preventDefault(); keys.add(event.code); invalidate(); }
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); interact(); }
  }
  function keyup(event) { keys.delete(event.code); }
  function look(dx, dy) { if (paused) return; yaw -= dx * .003; pitch = THREE.MathUtils.clamp(pitch - dy * .003, -1.15, 1.15); invalidate(); }
  function pointerDown(event) { if (paused) return; focus(); pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, dragged: false }; canvas.setPointerCapture(event.pointerId); }
  function pointerMove(event) {
    if (document.pointerLockElement === canvas) return;
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 5) pointer.dragged = true;
    look(dx, dy); pointer.x = event.clientX; pointer.y = event.clientY;
  }
  function pointerUp(event) {
    if (pointer && pointer.id === event.pointerId && !pointer.dragged && !paused) {
      const rect = canvas.getBoundingClientRect(); cursor.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(cursor, camera);
      if (inside) { const hit = raycaster.intersectObjects(targets)[0]; if (hit && hit.distance <= 4.5) { stop(); onItem(inside.id, hit.object.userData.itemId); } }
      else if (guide.canTalk(playerPosition()) && raycaster.intersectObjects(guide.model.targets)[0]) callGuide();
    }
    pointer = null;
  }
  const mouseMove = event => { if (document.pointerLockElement === canvas) look(event.movementX, event.movementY); };
  const pointerLockChange = () => { if (document.pointerLockElement !== canvas) stop(); };
  const cancelPointer = () => { pointer = null; };
  const visibility = () => { if (document.hidden) { stop(); cancelAnimationFrame(frame); frame = 0; } else invalidate(); };
  const contextLost = event => { event.preventDefault(); unavailable = true; stop(); cancelAnimationFrame(frame); frame = 0; onUnavailable(); };
  const blur = () => { focused = false; stop(); }, regainFocus = () => { focused = true; invalidate(); };
  const events = [[canvas, 'pointerdown', pointerDown], [canvas, 'pointermove', pointerMove], [canvas, 'pointerup', pointerUp], [canvas, 'pointercancel', cancelPointer], [canvas, 'webglcontextlost', contextLost], [window, 'keydown', keydown], [window, 'keyup', keyup], [window, 'blur', blur], [window, 'focus', regainFocus], [document, 'mousemove', mouseMove], [document, 'pointerlockchange', pointerLockChange], [document, 'visibilitychange', visibility]];
  events.forEach(([target, name, fn]) => target.addEventListener(name, fn));
  resize(); stream(true); updateCamera();
  const initial = shopsById.get(initialService);
  if (initial?.count) enter(initial, false); else if (initial) { visit(initial.id); queueMicrotask(() => { if (!disposed) onLeave(); }); }
  else if (initialCategory) visitStreet(initialCategory);
  queueMicrotask(() => { if (!disposed) publish(true); }); invalidate();
  function callGuide() { if (inside) leave(); stop(); guide.call(playerPosition()); publish(true); focus(); invalidate(); }
  return {
    focus, visit, visitStreet, leave, interact, callGuide,
    guideTo(id) { if (inside) leave(); stop(); guide.guideTo(id, playerPosition()); publish(true); focus(); invalidate(); },
    cancelGuide() { guide.cancel(); publish(true); invalidate(); },
    move(direction, pressed) { if (paused && pressed) return; if (pressed) movement.add(direction); else movement.delete(direction); invalidate(); },
    pause(value) { paused = value; stop(); if (value && document.pointerLockElement === canvas) document.exitPointerLock(); invalidate(); },
    setService(id) { if ((inside?.id || '') === (id || '')) return; const shop = shopsById.get(id); if (shop?.count) enter(shop, false); else if (inside) leave(false); else if (shop) { visit(id); queueMicrotask(() => { if (!disposed) onLeave(); }); } },
    mouseLook() { focus(); try { const result = canvas.requestPointerLock?.(); result?.catch(() => {}); } catch { /* Drag-to-look remains available. */ } },
    home() { if (inside) leave(); stop(); camera.position.set(WORLD_START.x, EYE_HEIGHT, WORLD_START.z); yaw = WORLD_START.yaw; pitch = 0; guide.reset(playerPosition()); stream(true); publish(true); focus(); invalidate(); },
    dispose() { disposed = true; stop(); cancelAnimationFrame(frame); observer.disconnect(); if (document.pointerLockElement === canvas) document.exitPointerLock(); events.forEach(([target, name, fn]) => target.removeEventListener(name, fn)); guide.dispose(); for (const owner of detailed.values()) disposeGroup(owner); disposeGroup(room); disposeGroup(outside); geometry.dispose(); plane.dispose(); puff.dispose(); cylinder.dispose(); for (const value of rounded.values()) value.dispose(); vertexMaterial.dispose(); glowMaterial.dispose(); for (const value of materials.values()) value.dispose(); sun.shadow.dispose(); distant.dispose(); stripes.dispose(); scene.clear(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); },
  };
}
