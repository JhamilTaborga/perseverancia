// Física sencilla de rocas, sin librerías:
// - rocas grandes: obstáculos fijos; el rover choca con ellas y se detiene (su caja contra el círculo de la roca)
// - piedras sueltas: las ruedas las empujan y las hacen saltar; ruedan cuesta abajo con la gravedad de Marte,
//   la arena las frena y chocan entre sí y contra las rocas grandes. Quietas un rato, se duermen.
import * as THREE from 'three';
import { surfaceHeight } from './terrain.js';
import { WHEEL_X, WHEEL_Z } from './rover.js';

const G = 3.71;            // gravedad de Marte (m/s²)
const MU = 0.9;            // fricción de rodar sobre arena suelta (alta: una piedra pateada se frena en ~1 m)
const ROLL = 0.7;          // fracción de la gravedad que acelera algo que rueda (≈ 5/7 de una esfera)
const BOUNCE = 0.3;        // restitución entre piedras
const HALF_W = 1.35;       // media anchura del rover con ruedas (m)
const HALF_L = 1.55;       // medio largo del rover (m)
const WHEEL_R = 0.27;      // radio de la huella de cada rueda en el suelo (m)

const WHEELS = WHEEL_Z.flatMap(z => [[-WHEEL_X, z], [WHEEL_X, z]]);

export function createRockPhysics(rocks) {
  const { statics, pebbles } = rocks.userData;
  const m = new THREE.Matrix4(), dq = new THREE.Quaternion(), axis = new THREE.Vector3(), pos = new THREE.Vector3();
  const prevWheels = WHEELS.map(() => null);
  const dirty = new Set();
  const stats = { pushes: 0, bumps: 0 };

  const ground = (x, z) => surfaceHeight(x, z);
  const wake = p => { p.awake = true; p.rest = 0; };

  // Rover contra rocas grandes: lo saca de la roca y frena si iba hacia ella
  function collideRover(state) {
    const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);
    for (const o of statics) {
      const dx = o.x - state.x, dz = o.z - state.z;
      if (Math.abs(dx) > o.r + 2.2 || Math.abs(dz) > o.r + 2.2) continue;
      // Centro de la roca en coordenadas del rover (+Z al frente, +X a su izquierda)
      const lx = dx * cy - dz * sy, lz = dx * sy + dz * cy;
      const cx = THREE.MathUtils.clamp(lx, -HALF_W, HALF_W), cz = THREE.MathUtils.clamp(lz, -HALF_L, HALF_L);
      let nx = lx - cx, nz = lz - cz;
      let d = Math.hypot(nx, nz), pen;
      if (d > 1e-4) { nx /= d; nz /= d; pen = o.r - d; }
      else { // centro dentro de la caja: sale por el lado más cercano
        const px = HALF_W - Math.abs(lx), pz = HALF_L - Math.abs(lz);
        if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; pen = px + o.r; } else { nx = 0; nz = Math.sign(lz) || 1; pen = pz + o.r; }
      }
      if (pen <= 0) continue;
      // Normal hacia la roca, en el mundo; el rover retrocede lo que se metió
      const wx = nx * cy + nz * sy, wz = -nx * sy + nz * cy;
      state.x -= wx * pen;
      state.z -= wz * pen;
      const heading = Math.sign(state.speed) * (Math.sin(state.yaw) * wx + Math.cos(state.yaw) * wz);
      if (heading > 0.2) { state.speed *= 0.15; stats.bumps++; }
    }
  }

  function collideStatics(p) {
    for (const o of statics) {
      const dx = p.x - o.x, dz = p.z - o.z, min = o.r + p.r;
      if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
      const d = Math.hypot(dx, dz);
      if (d >= min || d < 1e-5) continue;
      const nx = dx / d, nz = dz / d;
      p.x = o.x + nx * min; p.z = o.z + nz * min;
      const vn = p.vx * nx + p.vz * nz;
      if (vn < 0) { p.vx -= (1 + BOUNCE) * vn * nx; p.vz -= (1 + BOUNCE) * vn * nz; }
    }
  }

  function collidePebbles(p) {
    for (const o of pebbles) {
      if (o === p) continue;
      const dx = o.x - p.x, dz = o.z - p.z, min = o.r + p.r;
      if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
      const d = Math.hypot(dx, dz);
      if (d >= min || d < 1e-5) continue;
      const nx = dx / d, nz = dz / d, pen = min - d;
      const mp = p.r ** 3, mo = o.r ** 3, tot = mp + mo;
      p.x -= nx * pen * mo / tot; p.z -= nz * pen * mo / tot;
      o.x += nx * pen * mp / tot; o.z += nz * pen * mp / tot;
      const vn = (o.vx - p.vx) * nx + (o.vz - p.vz) * nz;
      if (vn < 0) {
        const j = -(1 + BOUNCE) * vn / (1 / mp + 1 / mo);
        p.vx -= j * nx / mp; p.vz -= j * nz / mp;
        o.vx += j * nx / mo; o.vz += j * nz / mo;
      }
      wake(o);
      dirty.add(o);
    }
  }

  // Ruedas contra piedras: la rueda pasa por encima de la grava y la exprime hacia los lados
  // (si solo la empujara hacia adelante, la arrastraría como una pala). Un golpe fuerte la hace saltar.
  function wheelKicks(state, dt) {
    const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);
    WHEELS.forEach(([lx, lz], i) => {
      const wx = state.x + lx * cy + lz * sy, wz = state.z - lx * sy + lz * cy;
      const prev = prevWheels[i];
      const vx = prev && dt > 0 ? (wx - prev[0]) / dt : 0, vz = prev && dt > 0 ? (wz - prev[1]) / dt : 0;
      prevWheels[i] = [wx, wz];
      const speed = Math.hypot(vx, vz);
      for (const p of pebbles) {
        const dx = p.x - wx, dz = p.z - wz, min = WHEEL_R + p.r;
        if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
        const d = Math.hypot(dx, dz);
        if (d >= min) continue;
        let nx = d > 1e-4 ? dx / d : sy, nz = d > 1e-4 ? dz / d : cy;
        let push = Math.max(0, vx * nx + vz * nz);
        if (speed > 0.05) {
          // Hacia el costado de la huella en que está la piedra, con un poco de avance
          const fx = vx / speed, fz = vz / speed;
          const side = Math.sign(fz * dx - fx * dz) || 1;
          const ex = fz * side * 0.85 + fx * 0.15, ez = -fx * side * 0.85 + fz * 0.15;
          const el = Math.hypot(ex, ez);
          nx = ex / el; nz = ez / el;
          push = Math.max(push, speed * 0.6);
        }
        p.x = wx + nx * min; p.z = wz + nz * min;
        // Más pesada, menos se mueve (la masa crece con el radio al cubo)
        const kick = (push * 0.5 + 0.08) * Math.min(1.2, (0.12 / p.r) ** 1.5);
        p.vx += nx * kick;
        p.vz += nz * kick;
        // Las chicas saltan más
        if (push > 0.8) p.vy = Math.max(p.vy, Math.min(1.0, push * 0.3 / Math.sqrt(p.r / 0.1)));
        wake(p);
        stats.pushes++;
      }
    });
  }

  function step(p, dt) {
    const e = 0.15;
    const gx = (ground(p.x + e, p.z) - ground(p.x - e, p.z)) / (2 * e);
    const gz = (ground(p.x, p.z + e) - ground(p.x, p.z - e)) / (2 * e);
    const floor = ground(p.x, p.z) + p.h;
    const airborne = p.y > floor + 0.005 || p.vy > 0;
    if (airborne) {
      p.vy -= G * dt;
      p.y += p.vy * dt;
      if (p.y <= floor) {
        p.y = floor;
        p.vy = Math.abs(p.vy) > 0.6 ? -p.vy * 0.25 : 0;
        p.vx *= 0.7; p.vz *= 0.7; // la arena se traga parte del golpe
      }
    } else {
      p.y = floor;
      p.vx -= G * ROLL * gx * dt;
      p.vz -= G * ROLL * gz * dt;
      const sp = Math.hypot(p.vx, p.vz), drop = MU * G * dt;
      if (sp <= drop) { p.vx = p.vz = 0; } else { p.vx *= (sp - drop) / sp; p.vz *= (sp - drop) / sp; }
    }
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    // Rueda: gira sobre el eje perpendicular al movimiento, tanto como avanzó
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > 1e-3 && !airborne) {
      axis.set(p.vz, 0, -p.vx).divideScalar(sp);
      p.q.premultiply(dq.setFromAxisAngle(axis, (sp * dt) / Math.max(p.r, 0.05)));
    }
    collideStatics(p);
    collidePebbles(p);
    if (!airborne && sp < 0.02 && p.vy === 0) {
      p.rest += dt;
      if (p.rest > 0.4) { p.awake = false; p.vx = p.vz = 0; }
    } else p.rest = 0;
    dirty.add(p);
  }

  function update(dt, state) {
    if (dt <= 0) return;
    wheelKicks(state, dt);
    // Subpasos para que los golpes rápidos no atraviesen piedras
    const n = Math.ceil(dt / (1 / 120));
    for (let s = 0; s < n; s++) for (const p of pebbles) if (p.awake) step(p, dt / n);
    const meshes = new Set();
    for (const p of dirty) {
      p.mesh.setMatrixAt(p.index, m.compose(pos.set(p.x, p.y, p.z), p.q, p.scale));
      meshes.add(p.mesh);
    }
    meshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
    dirty.clear();
  }

  return { update, collideRover, statics, pebbles, stats, awake: () => pebbles.filter(p => p.awake).length };
}
