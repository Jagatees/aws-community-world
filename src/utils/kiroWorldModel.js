import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// A local 3D interpretation of Kiro's original ghost silhouette. The official
// source icon stays unchanged; its white body is extruded and softly bevelled.
export function createKiroModel(onLoad) {
  const root = new THREE.Group(), body = new THREE.Group(); body.scale.setScalar(.78); root.add(body);
  const resources = [], targets = []; let disposed = false;
  const own = resource => { resources.push(resource); return resource; };
  const white = own(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .35, emissive: '#bda7ef', emissiveIntensity: .14, transparent: true }));
  const black = own(new THREE.MeshBasicMaterial({ color: '#172033', transparent: true }));
  new SVGLoader().load('/aws-service-icons/kiro.svg', data => {
    if (disposed) return;
    const artwork = new THREE.Group(); artwork.scale.set(.0018, -.0018, .0018); body.add(artwork);
    for (const path of data.paths) {
      const node = path.userData.node;
      if (node.tagName !== 'path' || node.closest('mask')) continue;
      const eyes = node.getAttribute('fill') === 'black';
      for (const shape of SVGLoader.createShapes(path)) {
        const geometry = own(eyes ? new THREE.ShapeGeometry(shape, 16) : new THREE.ExtrudeGeometry(shape, { depth: 170, bevelEnabled: true, bevelSize: 38, bevelThickness: 75, bevelSegments: 5, curveSegments: 20, steps: 1 }));
        const mesh = new THREE.Mesh(geometry, eyes ? black : white); mesh.position.set(-600, -600, eyes ? 163 : -85); artwork.add(mesh); targets.push(mesh);
      }
    }
    onLoad();
  }, undefined, () => {
    if (disposed) return;
    const mesh = new THREE.Mesh(own(new THREE.SphereGeometry(.6, 24, 16)), white); mesh.scale.y = 1.25; body.add(mesh); targets.push(mesh);
    for (const x of [-.15, .15]) { const eye = new THREE.Mesh(own(new THREE.SphereGeometry(.07, 12, 8)), black); eye.position.set(x, .2, .57); eye.scale.y = 1.8; body.add(eye); }
    onLoad();
  });
  const ring = new THREE.Mesh(own(new THREE.TorusGeometry(.53, .025, 8, 40)), own(new THREE.MeshBasicMaterial({ color: '#cbb4ff', transparent: true, opacity: .85 })));
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.02; root.add(ring);
  return { root, body, targets, setOpacity(opacity) { white.opacity = opacity; black.opacity = opacity; white.depthWrite = opacity === 1; black.depthWrite = opacity === 1; }, dispose() { disposed = true; root.removeFromParent(); root.clear(); resources.forEach(resource => resource.dispose()); } };
}
