import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { heightAt } from './terrain.js';

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

// Contactos de las ruedas (izquierda/derecha × delantera/media/trasera), en metros, frente = +Z
export const WHEELS = [-1.05, 1.05].flatMap(x => [1.05, 0.0, -1.05].map(z => new THREE.Vector2(x, z)));

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
  return root;
}

export function createRoverController(rover, startX, startZ, startYaw) {
  const keys = new Set();
  addEventListener('keydown', e => keys.add(e.code));
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  const state = { x: startX, z: startZ, yaw: startYaw, speed: 0, moved: 0 };
  const up = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();

  function contact(lx, lz) {
    const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);
    const x = state.x + lx * cy + lz * sy;
    const z = state.z - lx * sy + lz * cy;
    return new THREE.Vector3(x, heightAt(x, z), z);
  }

  function place(dt) {
    // Plano de apoyo a partir de los contactos de las ruedas
    const fl = contact(-1.05, 1.05), fr = contact(1.05, 1.05);
    const bl = contact(-1.05, -1.05), br = contact(1.05, -1.05);
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
      state.yaw += steer * TURN_RATE * dt * (state.speed < -0.05 ? -1 : 1);
      const d = state.speed * dt;
      state.x += Math.sin(state.yaw) * d;
      state.z += Math.cos(state.yaw) * d;
      state.moved = Math.abs(d) + Math.abs(steer) * dt * 0.6;
      place(dt);
      return state;
    },
    driving() {
      return state.speed !== 0 || ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].some(k => keys.has(k));
    },
  };
}
