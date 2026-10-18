import * as THREE from 'three';
import { createKiroModel } from './kiroWorldModel';
import { createWorldNavigator, distance2D, pointOnRoute, projectOnRoute, routeLength } from './workshopWorldNavigation';
import { shopEntrance } from './workshopWorldLayout';

export function createKiroGuide({ parent, world, invalidate, onReady }) {
  const navigator = createWorldNavigator(world), model = createKiroModel(invalidate);
  parent.add(model.root);
  const floor = new THREE.Group(); parent.add(floor);
  const resources = [], instances = [];
  const own = value => { resources.push(value); return value; };
  const lineGeometry = own(new THREE.BoxGeometry(1, 1, 1));
  const trailMaterial = own(new THREE.MeshBasicMaterial({ color: '#d4b5ff' }));
  const arrowMaterial = own(new THREE.MeshBasicMaterial({ color: '#fff0ff', side: THREE.DoubleSide }));
  const arrowGeometry = own(new THREE.BufferGeometry());
  arrowGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-.3, 0, .24, 0, 0, -.3, .3, 0, .24, 0, 0, .09], 3));
  arrowGeometry.setIndex([0, 1, 3, 1, 2, 3]); arrowGeometry.computeVertexNormals();
  const endpoint = new THREE.Mesh(own(new THREE.TorusGeometry(.65, .065, 8, 40)), trailMaterial); endpoint.rotation.x = Math.PI / 2;
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 256; labelCanvas.height = 80;
  const ctx = labelCanvas.getContext('2d'); ctx.fillStyle = '#382056'; ctx.beginPath(); ctx.roundRect(12, 8, 232, 64, 28); ctx.fill(); ctx.fillStyle = '#eee5ff'; ctx.font = '700 34px system-ui'; ctx.textAlign = 'center'; ctx.fillText('KIRO', 128, 52);
  const labelTexture = own(new THREE.CanvasTexture(labelCanvas)); labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: labelTexture, depthTest: true, toneMapped: false }))); label.position.y = .95; label.scale.set(.85, .27, 1); model.root.add(label);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)'); let reduced = motion.matches;
  const motionChanged = event => { reduced = event.matches; invalidate(); }; motion.addEventListener('change', motionChanged);
  let mode = 'roaming', destination = null, path = [], route = [], progress = 0, total = 0, waiting = false, nextRoam = 0, lastRepath = 0, wander = 0, error = '';
  let lastPlayer = { x: 0, z: -9, yaw: Math.PI }, clock = 0;
  const position = () => ({ x: model.root.position.x, z: model.root.position.z });

  function clearFloor() { floor.clear(); instances.forEach(mesh => mesh.dispose()); instances.length = 0; }
  function showRoute(points) {
    clearFloor(); if (points.length < 2) return;
    const dummy = new THREE.Object3D(), lines = new THREE.InstancedMesh(lineGeometry, trailMaterial, points.length - 1);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i]; dummy.position.set((a.x + b.x) / 2, .13, (a.z + b.z) / 2); dummy.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z), 0); dummy.scale.set(.14, .035, distance2D(a, b)); dummy.updateMatrix(); lines.setMatrixAt(i - 1, dummy.matrix);
    }
    floor.add(lines); instances.push(lines);
    const length = routeLength(points), count = Math.max(1, Math.floor(length / 2.3)), arrows = new THREE.InstancedMesh(arrowGeometry, arrowMaterial, count);
    for (let i = 0; i < count; i++) {
      const distance = Math.min(length, .8 + i * 2.3), a = pointOnRoute(points, distance), b = pointOnRoute(points, Math.min(length, distance + .15));
      dummy.position.set(a.x, .16, a.z); dummy.rotation.set(0, Math.atan2(a.x - b.x, a.z - b.z), 0); dummy.scale.setScalar(1); dummy.updateMatrix(); arrows.setMatrixAt(i, dummy.matrix);
    }
    floor.add(arrows); instances.push(arrows);
    endpoint.position.set(points.at(-1).x, .16, points.at(-1).z); floor.add(endpoint);
  }
  function nearPlayer(player, radius = 2.8) {
    for (const turn of [0, .7, -.7, 1.5, -1.5, Math.PI]) {
      const angle = player.yaw + turn, target = { x: player.x - Math.sin(angle) * radius, z: player.z - Math.cos(angle) * radius };
      if (navigator.clear(player, target)) return target;
    }
    return { x: player.x, z: player.z };
  }
  function face(point, delta) {
    const target = Math.atan2(point.x - model.root.position.x, point.z - model.root.position.z);
    const angle = Math.atan2(Math.sin(target - model.root.rotation.y), Math.cos(target - model.root.rotation.y));
    model.root.rotation.y += angle * Math.min(1, delta * 9);
  }
  function startPath(points) { path = points; progress = 0; total = routeLength(path); }
  function advance(delta, speed) {
    progress = Math.min(total, progress + speed * delta);
    const next = pointOnRoute(path, progress); face(pointOnRoute(path, Math.min(total, progress + .5)), delta);
    model.root.position.x = next.x; model.root.position.z = next.z;
    return progress >= total - .01;
  }
  function cancel() { destination = null; path = []; route = []; waiting = false; error = ''; mode = 'roaming'; nextRoam = clock + 2; clearFloor(); invalidate(); }
  function reset(player) { cancel(); const point = nearPlayer({ ...player, yaw: player.yaw + .4 }, 4); model.root.position.set(point.x, 1.25, point.z); model.root.rotation.y = Math.atan2(player.x - point.x, player.z - point.z); lastPlayer = { ...player }; }
  function call(player) {
    cancel(); lastPlayer = { ...player }; mode = 'coming'; startPath(navigator.route(position(), nearPlayer(player)));
    if (!path.length) { mode = 'ready'; error = 'Choose a service to plan a route.'; onReady(); }
    invalidate();
  }
  function guideTo(id, player) {
    const shop = world.shops.find(item => item.id === id); if (!shop) return;
    const connection = navigator.route(player, position()), onward = navigator.route(position(), shopEntrance(shop));
    if (!connection.length || !onward.length) { error = 'Step back onto the street, then call Kiro again.'; mode = 'ready'; invalidate(); return; }
    destination = shop; error = ''; route = [...connection, ...onward.slice(1)]; showRoute(route); startPath(onward); mode = 'guiding'; waiting = false; invalidate();
  }
  function arrive(player) {
    mode = 'arrived'; waiting = false;
    const door = shopEntrance(destination);
    const sides = [-1, 1].map(side => ({ x: door.x + Math.cos(destination.rotation) * side * 2.1, z: door.z - Math.sin(destination.rotation) * side * 2.1 })).sort((a, b) => distance2D(b, player) - distance2D(a, player));
    const aside = sides.find(point => navigator.clear(position(), point));
    startPath(aside ? navigator.route(position(), aside) : []);
  }
  function update(delta, now, player, active) {
    lastPlayer = { ...player }; clock = now / 1000;
    if (!active) return false;
    let moving = false;
    if (mode === 'coming' || mode === 'returning') {
      if (clock - lastRepath > 1 && distance2D(path.at(-1) || position(), player) > 4.5) { startPath(navigator.route(position(), nearPlayer(player))); lastRepath = clock; }
      if (path.length) {
        moving = true;
        if (advance(delta, 5)) {
          if (destination) guideTo(destination.id, player);
          else { mode = 'ready'; path = []; face(player, 1); onReady(); }
        }
      }
    } else if (mode === 'guiding') {
      const away = distance2D(position(), player), offPath = projectOnRoute(route, player).distance;
      if (offPath > 4 && clock - lastRepath > 2) {
        const back = navigator.route(position(), nearPlayer(player));
        if (back.length) { mode = 'returning'; startPath(back); route = navigator.toShop(player, destination); showRoute(route); lastRepath = clock; }
      } else {
        waiting = away > (waiting ? 5 : 7);
        if (!waiting && progress < total) { moving = true; advance(delta, away < 3.5 ? 4.3 : 3.3); }
        if (progress >= total - .01) {
          face(player, delta);
          if (distance2D(player, shopEntrance(destination)) < 3.4) arrive(player);
          else waiting = true;
        }
      }
    } else if (mode === 'roaming') {
      if (distance2D(position(), player) > 12 || (!reduced && clock > nextRoam && !path.length)) {
        const angle = ++wander * 2.4;
        const candidate = { x: player.x + Math.sin(angle) * 5, z: player.z + Math.cos(angle) * 5 };
        const roamingPath = navigator.route(position(), navigator.clear(player, candidate) ? candidate : nearPlayer(player, 4));
        if (routeLength(roamingPath) < 24) startPath(roamingPath);
        nextRoam = clock + 3;
      }
      if (path.length) { moving = true; if (advance(delta, 1.5)) { path = []; nextRoam = clock + 3; } }
    } else {
      if (mode === 'arrived' && path.length) { moving = true; if (advance(delta, 3.5)) path = []; }
      face(player, delta);
    }
    model.root.position.y = 1.25 + (reduced ? 0 : Math.sin(clock * (moving ? 5 : 2.5)) * .065);
    model.body.rotation.z = reduced ? 0 : Math.sin(clock * 5) * (moving ? .055 : .012);
    const opacity = THREE.MathUtils.smoothstep(distance2D(position(), player), .55, 1.3);
    model.setOpacity(opacity); label.material.opacity = opacity;
    return moving || !reduced;
  }
  return {
    model, update, reset, cancel, call, guideTo,
    canTalk(player) { return distance2D(position(), player) < 5 && navigator.clear(position(), player); },
    snapshot() { return { mode, destination: destination?.id || '', name: destination?.name || '', closed: destination ? !destination.count : false, waiting, error, position: position(), route, remaining: destination ? Math.ceil(Math.max(0, routeLength(route) - projectOnRoute(route, lastPlayer).progress)) : 0 }; },
    dispose() { motion.removeEventListener('change', motionChanged); clearFloor(); floor.removeFromParent(); model.dispose(); resources.forEach(value => value.dispose()); },
  };
}
