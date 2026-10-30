import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { WHEELS } from './rover.js';

const MAX = 6000;
const STEP = 0.22;      // metros entre huellas
const WHEEL_W = 0.42;

// Textura de la banda de rodadura: surcos de las garras de la rueda
function treadTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 32);
  const grd = g.createLinearGradient(0, 0, 64, 0);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.15, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.85, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 32);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let x = 8; x < 56; x += 12) g.fillRect(x, 2, 3, 28);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createTracks() {
  const geo = new THREE.PlaneGeometry(WHEEL_W, STEP * 1.15);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    map: treadTexture(), color: 0x3a1a0c, transparent: true, opacity: 0.75,
    roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;

  let next = 0, travelled = 0;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qn = new THREE.Quaternion();
  const n = new THREE.Vector3(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const Y = new THREE.Vector3(0, 1, 0);

  function stamp(state) {
    const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);
    // solo las ruedas delanteras y traseras de cada lado; las medias pisan la misma huella
    for (const w of WHEELS) {
      if (w.y === 0) continue;
      const x = state.x + w.x * cy + w.y * sy;
      const z = state.z - w.x * sy + w.y * cy;
      const e = 0.3;
      n.set(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
      qn.setFromUnitVectors(Y, n);
      q.setFromAxisAngle(Y, state.yaw).premultiply(qn);
      p.set(x, heightAt(x, z) + 0.02, z);
      m.compose(p, q, one);
      mesh.setMatrixAt(next, m);
      next = (next + 1) % MAX;
      mesh.count = Math.min(mesh.count + 1, MAX);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    mesh,
    update(state) {
      travelled += state.moved;
      if (travelled >= STEP) {
        travelled = 0;
        stamp(state);
      }
    },
  };
}
