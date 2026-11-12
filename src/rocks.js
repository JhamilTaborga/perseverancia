import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { heightAt, surfaceHeight } from './terrain.js';

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

const OBSTACLE_R = 0.45;   // radio (m) desde el que una roca frena al rover
const PEBBLE_ZONE = 100;   // m alrededor del punto de partida donde las piedras chicas se mueven
const EXTRA_PEBBLES = 520; // piedras sueltas de más cerca del inicio

// Rocas: las grandes son obstáculos fijos, las chicas cerca del inicio son piedras sueltas
// que el rover puede empujar (ver physics.js). El resto es decorado lejano.
export function createRocks(center = { x: 0, z: 20 }) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a4632, roughness: 0.9, flatShading: true });
  const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x6e4433, roughness: 0.92, flatShading: true });
  const r = rand(1234);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), t = new THREE.Vector3();
  const e = new THREE.Euler();
  const geos = [0, 1, 2, 3].map(k => rockGeometry(k * 17.3));
  const statics = [];   // { x, z, r } obstáculos
  const pebbles = [];   // piedras sueltas (se crean sus mallas al final)
  const fixed = geos.map(() => []);

  const addRock = (k, x, z, sx, sy, sz, rot, y) => {
    const radius = 0.9 * (sx + sz) / 2;
    if (radius < OBSTACLE_R && Math.hypot(x - center.x, z - center.z) < PEBBLE_ZONE) {
      pebbles.push({ k, x, z, r: radius, h: sy * 0.62 * 0.5, scale: new THREE.Vector3(sx, sy, sz),
        q: new THREE.Quaternion().setFromEuler(rot) });
      return;
    }
    if (radius >= OBSTACLE_R) statics.push({ x, z, r: radius });
    q.setFromEuler(rot);
    s.set(sx, sy, sz);
    t.set(x, y, z);
    fixed[k].push(m.compose(t, q, s).clone());
  };

  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < 160; i++) {
      // más densidad cerca de la cámara
      const ang = r() * Math.PI * 2;
      const dist = 4 + Math.pow(r(), 1.8) * 230;
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist - 20;
      const big = r() < 0.06;
      const sc = big ? 2.5 + r() * 3.5 : 0.15 + Math.pow(r(), 3) * 1.4;
      const sx = sc * (0.8 + r() * 0.5), sy = sc * (0.7 + r() * 0.5), sz = sc * (0.8 + r() * 0.5);
      e.set(r() * 0.4, r() * Math.PI * 2, r() * 0.4);
      addRock(k, x, z, sx, sy, sz, e, heightAt(x, z) + sc * 0.15);
    }
  }
  // Grava suelta alrededor del punto de partida, para que las ruedas tengan con qué jugar
  for (let i = 0; i < EXTRA_PEBBLES; i++) {
    const ang = r() * Math.PI * 2, dist = 3 + Math.pow(r(), 1.6) * 42;
    const x = center.x + Math.cos(ang) * dist, z = center.z + Math.sin(ang) * dist;
    const sc = 0.09 + Math.pow(r(), 2.2) * 0.3;
    e.set(r() * Math.PI, r() * Math.PI * 2, r() * Math.PI);
    addRock(i % 4, x, z, sc * (0.8 + r() * 0.5), sc * (0.7 + r() * 0.5), sc * (0.8 + r() * 0.5), e, 0);
  }

  geos.forEach((g, k) => {
    if (!fixed[k].length) return;
    const mesh = new THREE.InstancedMesh(g, mat, fixed[k].length);
    fixed[k].forEach((mm, i) => mesh.setMatrixAt(i, mm));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  });

  // Piedras sueltas: sin las que nacen encima de un obstáculo o de otra piedra
  const placed = [];
  for (const p of pebbles) {
    const blocked = statics.some(o => Math.hypot(o.x - p.x, o.z - p.z) < o.r + p.r)
      || placed.some(o => Math.hypot(o.x - p.x, o.z - p.z) < o.r + p.r);
    if (!blocked) placed.push(p);
  }
  const meshes = geos.map((g, k) => {
    const n = placed.filter(p => p.k === k).length;
    if (!n) return null;
    const mesh = new THREE.InstancedMesh(g, pebbleMat, n);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false; // se mueven: la esfera de recorte calculada al inicio dejaría de valer
    group.add(mesh);
    return mesh;
  });
  const counters = [0, 0, 0, 0];
  for (const p of placed) {
    p.mesh = meshes[p.k];
    p.index = counters[p.k]++;
    p.y = surfaceHeight(p.x, p.z) + p.h;
    p.vx = p.vz = p.vy = 0;
    p.awake = false;
    p.rest = 0;
    p.mesh.setMatrixAt(p.index, m.compose(t.set(p.x, p.y, p.z), p.q, p.scale));
  }

  group.userData.statics = statics;
  group.userData.pebbles = placed;
  return group;
}
