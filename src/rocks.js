import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { heightAt } from './terrain.js';

const noise = new ImprovedNoise();

function rockGeometry(seed) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise.noise(v.x * 1.4 + seed, v.y * 1.4, v.z * 1.4) * 0.45
            + noise.noise(v.x * 4 + seed, v.y * 4, v.z * 4) * 0.12;
    v.multiplyScalar(1 + n);
    v.y *= 0.62;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function rand(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function createRocks() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a4632, roughness: 0.9, flatShading: true });
  const r = rand(1234);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), t = new THREE.Vector3();
  const e = new THREE.Euler();
  for (let k = 0; k < 4; k++) {
    const count = 160;
    const mesh = new THREE.InstancedMesh(rockGeometry(k * 17.3), mat, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    for (let i = 0; i < count; i++) {
      // más densidad cerca de la cámara
      const ang = r() * Math.PI * 2;
      const dist = 4 + Math.pow(r(), 1.8) * 230;
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist - 20;
      const big = r() < 0.06;
      const sc = big ? 2.5 + r() * 3.5 : 0.15 + Math.pow(r(), 3) * 1.4;
      s.set(sc * (0.8 + r() * 0.5), sc * (0.7 + r() * 0.5), sc * (0.8 + r() * 0.5));
      e.set(r() * 0.4, r() * Math.PI * 2, r() * 0.4);
      q.setFromEuler(e);
      t.set(x, heightAt(x, z) + sc * 0.15, z);
      m.compose(t, q, s);
      mesh.setMatrixAt(i, m);
    }
    group.add(mesh);
  }
  return group;
}
