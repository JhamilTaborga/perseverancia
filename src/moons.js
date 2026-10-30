import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

const noise = new ImprovedNoise();

function lumpy(seed, stretch) {
  const g = new THREE.IcosahedronGeometry(1, 4);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let n = noise.noise(v.x * 1.5 + seed, v.y * 1.5, v.z * 1.5) * 0.22;
    // cráteres
    n -= Math.max(0, noise.noise(v.x * 5 + seed, v.y * 5, v.z * 5) - 0.25) * 0.5;
    v.multiplyScalar(1 + n);
    v.x *= stretch;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Fobos (grande, alargado) y Deimos (pequeño), pálidos tras la bruma del cielo
export function createMoons() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe6d6c6, roughness: 1, fog: false,
    emissive: 0xc8ab92, emissiveIntensity: 0.75,
  });
  const dir = (x, y) => new THREE.Vector3(x, y, -1).normalize().multiplyScalar(1000);
  const phobos = new THREE.Mesh(lumpy(3.3, 1.35), mat);
  phobos.position.copy(dir(0.42, 0.3));
  phobos.scale.setScalar(14);
  phobos.rotation.set(0.4, 1.2, 0.3);
  const deimos = new THREE.Mesh(lumpy(9.1, 1.15), mat);
  deimos.position.copy(dir(0.12, 0.38));
  deimos.scale.setScalar(6);
  const group = new THREE.Group();
  group.add(phobos, deimos);
  return group;
}
