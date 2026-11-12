import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { surfaceHeight } from './terrain.js';

// Perseverance real: 3.0 m de largo, 2.7 m de ancho, 2.2 m de alto
const REAL_LENGTH = 3.0;
const MAX_SPEED = 3.0;      // m/s (acelerado; el real va a ~0.04 m/s)
const TURN_RATE = 0.9;      // rad/s
const CAMERA_RE = /cam|watson|lens/i;
const NOT_CAMERA_RE = /cover|bracket|wiring|mount/i;
const CAMERA_INFO = {
  Mastcam_Z_cams: 'Mastcam-Z, par estéreo con zoom en el mástil',
  NavCams: 'Navcams, navegación estéreo en el mástil',
  lens: 'SuperCam, telescopio/láser en el mástil',
  hazcams_front: 'Hazcams delanteras, evitación de peligros',
  hazcams_rear: 'Hazcams traseras, evitación de peligros',
  WATSON: 'WATSON, cámara de primer plano en el brazo (SHERLOC)',
  Up_Look_Camera: 'cámara EDL que mira hacia arriba (paracaídas)',
  Down_Look_Camera: 'cámara EDL que mira hacia abajo (aterrizaje)',
};

// Ejes de las ruedas medidos en el modelo (m): lados ±X, filas delantera/media/trasera en Z (frente = +Z)
export const WHEEL_X = 1.1;
export const WHEEL_Z = [1.25, 0.05, -0.95];
export const MID_WHEELS = [-WHEEL_X, WHEEL_X].map(x => new THREE.Vector2(x, WHEEL_Z[1]));

// Wheels_objs trae las 6 ruedas en 3 mallas (una por material). Separa los triángulos
// de cada rueda y la cuelga de un pivote en su eje para poder girarla y orientarla.
function rigWheels(model) {
  const group = model.getObjectByName('Wheels_objs');
  if (!group) return [];
  model.updateMatrixWorld(true);
  const R = group.matrixWorld.clone(), Rinv = R.clone().invert();
  const axis = new THREE.Vector3(1, 0, 0).transformDirection(Rinv);
  const up = new THREE.Vector3(0, 1, 0).transformDirection(Rinv);
  const rowOf = z => (z > (WHEEL_Z[0] + WHEEL_Z[1]) / 2 ? 0 : z > (WHEEL_Z[1] + WHEEL_Z[2]) / 2 ? 1 : 2);
  const wheelOf = (x, z) => (x < 0 ? 0 : 3) + rowOf(z);
  const parts = Array.from({ length: 6 }, () => ({ meshes: [], box: new THREE.Box3() }));
  const v = new THREE.Vector3();

  for (const mesh of group.children.filter(o => o.isMesh)) {
    const g = mesh.geometry.clone().applyMatrix4(mesh.matrix);
    const pos = g.attributes.position;
    const world = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) v.fromBufferAttribute(pos, i).applyMatrix4(R).toArray(world, i * 3);
    const index = g.index ? g.index.array : Uint32Array.from({ length: pos.count }, (_, i) => i);
    const lists = Array.from({ length: 6 }, () => []);
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
      const k = wheelOf((world[a] + world[b] + world[c]) / 3, (world[a + 2] + world[b + 2] + world[c + 2]) / 3);
      lists[k].push(index[t], index[t + 1], index[t + 2]);
      for (const j of [a, b, c]) parts[k].box.expandByPoint(v.fromArray(world, j));
    }
    lists.forEach((list, k) => {
      if (!list.length) return;
      const sub = new THREE.BufferGeometry();
      for (const name in g.attributes) sub.setAttribute(name, g.attributes[name]);
      sub.setIndex(new THREE.BufferAttribute(Uint32Array.from(list), 1));
      const m = new THREE.Mesh(sub, mesh.material);
      m.castShadow = m.receiveShadow = true;
      parts[k].meshes.push(m);
    });
    group.remove(mesh);
  }

  return parts.map((p, k) => {
    const cw = p.box.getCenter(new THREE.Vector3());
    const c = cw.clone().applyMatrix4(Rinv);
    const pivot = new THREE.Object3D();
    pivot.position.copy(c);
    const inner = new THREE.Group();
    inner.position.copy(c).negate();
    inner.add(...p.meshes);
    pivot.add(inner);
    group.add(pivot);
    return {
      pivot, axis, up, x: cw.x, z: cw.z,
      radius: (p.box.max.y - p.box.min.y) / 2,
      corner: k % 3 !== 1, spin: 0, steer: 0,
    };
  });
}

const qSpin = new THREE.Quaternion(), qSteer = new THREE.Quaternion();

// Gira cada rueda según su avance real y orienta las de las esquinas como el rover:
// Ackermann al doblar y en diagonal (tangente) al girar en el sitio
function animateWheels(wheels, speed, yawRate, dt) {
  const k = 1 - Math.exp(-dt * 6);
  for (const w of wheels) {
    const vx = yawRate * w.z, vz = speed - yawRate * w.x;
    if (w.corner && Math.hypot(vx, vz) > 0.02) {
      let a = Math.atan2(vx, vz);
      if (a > Math.PI / 2) a -= Math.PI; else if (a < -Math.PI / 2) a += Math.PI;
      w.steer += (a - w.steer) * k;
    }
    w.spin += (vx * Math.sin(w.steer) + vz * Math.cos(w.steer)) * dt / w.radius;
    qSteer.setFromAxisAngle(w.up, w.steer);
    qSpin.setFromAxisAngle(w.axis, w.spin);
    w.pivot.quaternion.multiplyQuaternions(qSteer, qSpin);
  }
}

export async function loadRover() {
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync('/models/perseverance.glb');
  draco.dispose();

  const model = gltf.scene;
  model.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });

  // El modelo viene con el mástil plegado; CylinderAction lo despliega y a mitad del clip está arriba
  const mast = THREE.AnimationClip.findByName(gltf.animations, 'CylinderAction');
  if (mast) {
    const mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(mast).play();
    mixer.setTime(mast.duration * 0.5);
    model.updateMatrixWorld(true);
  }

  // Escala a tamaño real y apoya las ruedas en y = 0
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const s = REAL_LENGTH / size.z;
  model.scale.setScalar(s);
  box.setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.set(-c.x, -box.min.y, -c.z);
  box.setFromObject(model).getSize(size);
  console.log(`[rover] escala ${s.toFixed(3)} → ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m (ancho × alto × largo)`);

  // Piezas que son cámaras (las usaremos al final). Se omiten tapas/soportes/cables
  // y las submallas que el loader crea dentro de una pieza ya listada.
  const cams = [];
  model.traverse(o => {
    if (!o.name || !CAMERA_RE.test(o.name) || NOT_CAMERA_RE.test(o.name)) return;
    for (let a = o.parent; a; a = a.parent) if (cams.includes(a)) return;
    cams.push(o);
  });
  const p = new THREE.Vector3();
  console.log(`[cámaras] ${cams.length} piezas del rover que son cámaras:`);
  for (const o of cams) {
    o.getWorldPosition(p);
    const desc = CAMERA_INFO[o.name] ? ` — ${CAMERA_INFO[o.name]}` : '';
    console.log(`[cámaras]   ${o.name}${desc}  (pos en el rover: ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)} m)`);
  }

  const root = new THREE.Group();
  root.add(model);
  root.userData.cameras = cams;
  root.userData.wheels = rigWheels(model);
  const rad = root.userData.wheels.map(w => w.radius * 2);
  console.log(`[rover] ${rad.length} ruedas separadas, diámetro ≈ ${(rad.reduce((a, b) => a + b, 0) / (rad.length || 1)).toFixed(2)} m`);
  return root;
}

export function createRoverController(rover, startX, startZ, startYaw, { collide } = {}) {
  const keys = new Set();
  addEventListener('keydown', e => keys.add(e.code));
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  const state = { x: startX, z: startZ, yaw: startYaw, speed: 0 };
  const up = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();

  function contact(lx, lz) {
    const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);
    const x = state.x + lx * cy + lz * sy;
    const z = state.z - lx * sy + lz * cy;
    return new THREE.Vector3(x, surfaceHeight(x, z), z);
  }

  function place(dt) {
    // Plano de apoyo a partir de los contactos de las ruedas de las esquinas
    const fl = contact(-WHEEL_X, WHEEL_Z[0]), fr = contact(WHEEL_X, WHEEL_Z[0]);
    const bl = contact(-WHEEL_X, WHEEL_Z[2]), br = contact(WHEEL_X, WHEEL_Z[2]);
    fwd.subVectors(fl.clone().add(fr), bl.clone().add(br)).normalize();
    right.subVectors(fr.clone().add(br), fl.clone().add(bl)).normalize();
    up.crossVectors(fwd, right).normalize();       // z × x = y
    right.crossVectors(up, fwd).normalize();       // y × z = x
    fwd.crossVectors(right, up).normalize();       // x × y = z
    m.makeBasis(right, up, fwd);
    q.setFromRotationMatrix(m);
    const k = dt > 0 ? 1 - Math.exp(-dt * 8) : 1;
    rover.quaternion.slerp(q, k);
    const y = (fl.y + fr.y + bl.y + br.y) / 4;
    rover.position.set(state.x, dt > 0 ? THREE.MathUtils.lerp(rover.position.y, y, k) : y, state.z);
  }

  place(0);

  return {
    state,
    keys,
    update(dt) {
      const fwdKey = keys.has('KeyW') || keys.has('ArrowUp');
      const backKey = keys.has('KeyS') || keys.has('ArrowDown');
      const leftKey = keys.has('KeyA') || keys.has('ArrowLeft');
      const rightKey = keys.has('KeyD') || keys.has('ArrowRight');
      const throttle = (fwdKey ? 1 : 0) - (backKey ? 1 : 0);
      const target = throttle * MAX_SPEED * (throttle < 0 ? 0.5 : 1);
      state.speed = THREE.MathUtils.lerp(state.speed, target, 1 - Math.exp(-dt * (throttle ? 1.5 : 3)));
      if (Math.abs(state.speed) < 0.01 && !throttle) state.speed = 0;
      const steer = (leftKey ? 1 : 0) - (rightKey ? 1 : 0);
      // Gira en sitio si está detenido (como el rover real), o mientras avanza
      const yawRate = steer * TURN_RATE * (state.speed < -0.05 ? -1 : 1);
      state.yaw += yawRate * dt;
      const d = state.speed * dt;
      state.x += Math.sin(state.yaw) * d;
      state.z += Math.cos(state.yaw) * d;
      collide?.(state); // rocas grandes: lo sacan de la roca y lo frenan
      place(dt);
      animateWheels(rover.userData.wheels, state.speed, yawRate, dt);
      return state;
    },
    driving() {
      return state.speed !== 0 || ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].some(k => keys.has(k));
    },
  };
}
