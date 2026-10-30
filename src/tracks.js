import * as THREE from 'three';
import { surfaceHeight } from './terrain.js';
import { MID_WHEELS } from './rover.js';

const MAX = 5000;        // puntos por huella (~600 m)
const STEP = 0.12;       // metros entre puntos de la franja
const WIDTH = 0.62;      // rueda de 0.40 m + bordes de arena levantada
const TILE = 0.4;        // metros de huella por repetición de la textura (8 garras)
const LIFT = 0.012;

// Relieve de la huella: surco donde pisa la rueda, bordes levantados a los lados
// y las marcas curvas de las garras (grousers) de la rueda de Perseverance
function heightField(u, v) {
  const t = Math.abs(u - 0.5) * 2;
  const groove = 1 - THREE.MathUtils.smoothstep(t, 0.6, 0.72);
  const berm = Math.exp(-(((t - 0.8) / 0.08) ** 2));
  const g = (v * 8 + Math.abs(u - 0.5) * 0.9) % 1;
  const grouser = Math.exp(-(((g - 0.5) / 0.1) ** 2));
  return -0.5 * groove + 0.35 * berm - 0.45 * grouser * groove;
}

function makeTextures(anisotropy) {
  const W = 64, H = 128, S = 6;
  const albedo = new Uint8Array(W * H * 4);
  const normal = new Uint8Array(W * H * 4);
  const h = (x, y) => heightField(THREE.MathUtils.clamp(x / (W - 1), 0, 1), (((y % H) + H) % H) / H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const u = x / (W - 1), t = Math.abs(u - 0.5) * 2;
      const hv = h(x, y);
      // la arena removida se ve más oscura en el surco y más clara en los bordes
      const shade = THREE.MathUtils.clamp(0.86 + hv * 0.28, 0, 1);
      albedo[i] = albedo[i + 1] = albedo[i + 2] = shade * 255;
      albedo[i + 3] = (1 - THREE.MathUtils.smoothstep(t, 0.82, 1.0)) * 235;
      const nx = (h(x - 1, y) - h(x + 1, y)) * S, ny = (h(x, y - 1) - h(x, y + 1)) * S;
      const len = Math.hypot(nx, ny, 1);
      normal[i] = (nx / len * 0.5 + 0.5) * 255;
      normal[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      normal[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
    }
  }
  const make = (data, color) => {
    const tex = new THREE.DataTexture(data, W, H);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = anisotropy;
    if (color) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };
  return { map: make(albedo, true), normalMap: make(normal, false) };
}

// Una franja continua (ribbon) que sigue a una rueda, en un buffer circular
function createRibbon(material) {
  const pos = new Float32Array(MAX * 2 * 3);
  const nrm = new Float32Array(MAX * 2 * 3);
  const uv = new Float32Array(MAX * 2 * 2);
  const idx = new Uint32Array(MAX * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;

  let head = -1, last = null, dist = 0;
  const p = new THREE.Vector3(), side = new THREE.Vector3(), n = new THREE.Vector3();

  function writePoint(i, x, z, dx, dz) {
    side.set(dz, 0, -dx).normalize().multiplyScalar(WIDTH / 2);
    const e = 0.25;
    n.set(surfaceHeight(x - e, z) - surfaceHeight(x + e, z), 2 * e,
      surfaceHeight(x, z - e) - surfaceHeight(x, z + e)).normalize();
    for (let s = 0; s < 2; s++) {
      const sign = s === 0 ? 1 : -1;
      const vx = x + side.x * sign, vz = z + side.z * sign;
      p.set(vx, surfaceHeight(vx, vz) + LIFT, vz);
      p.toArray(pos, (i * 2 + s) * 3);
      n.toArray(nrm, (i * 2 + s) * 3);
      uv[(i * 2 + s) * 2] = s;
      uv[(i * 2 + s) * 2 + 1] = dist / TILE;
    }
  }

  function setSegment(i, connect) {
    const j = (i + 1) % MAX, o = i * 6;
    if (connect) idx.set([2 * i, 2 * i + 1, 2 * j, 2 * i + 1, 2 * j + 1, 2 * j], o);
    else idx.fill(0, o, o + 6);
  }

  return {
    mesh,
    update(x, z, hx, hz) {
      if (last) {
        const dx = x - last.x, dz = z - last.z, d = Math.hypot(dx, dz);
        if (d < STEP) return;
        dist += d;
        const prev = head;
        head = (head + 1) % MAX;
        writePoint(head, x, z, dx, dz);
        setSegment(prev, true);
        setSegment(head, false);   // corta la unión con el punto más viejo del buffer
      } else {
        head = 0;
        writePoint(head, x, z, hx, hz);
      }
      last = { x, z };
      for (const a of ['position', 'normal', 'uv']) geo.attributes[a].needsUpdate = true;
      geo.index.needsUpdate = true;
    },
  };
}

export function createTracks(anisotropy = 8) {
  const { map, normalMap } = makeTextures(anisotropy);
  const material = new THREE.MeshStandardMaterial({
    color: 0xc98a5e, map, normalMap, normalScale: new THREE.Vector2(1.6, 1.6),
    roughness: 1, metalness: 0, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const group = new THREE.Group();
  const ribbons = MID_WHEELS.map(() => createRibbon(material));
  for (const r of ribbons) group.add(r.mesh);

  return {
    mesh: group,
    update(state) {
      const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);
      MID_WHEELS.forEach((w, k) => {
        const x = state.x + w.x * cy + w.y * sy;
        const z = state.z - w.x * sy + w.y * cy;
        ribbons[k].update(x, z, sy, cy);
      });
    },
  };
}
