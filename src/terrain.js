import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

const noise = new ImprovedNoise();
const WIND = new THREE.Vector2(Math.cos(0.6), Math.sin(0.6));

function fbm(x, z, oct = 5) {
  let a = 1, f = 1, s = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise.noise(x * f, z * f, 1.7 + i * 3.1);
    a *= 0.5; f *= 2.03;
  }
  return s;
}

// Dunas transversales: cresta asimétrica (barlovento suave, sotavento abrupto)
function dunes(x, z) {
  const warp = fbm(x * 0.006, z * 0.006, 3) * 40;
  const d = (x * WIND.x + z * WIND.y) * 0.045 + warp * 0.045;
  const t = d - Math.floor(d);
  const profile = t < 0.78 ? Math.pow(t / 0.78, 1.6) : Math.pow((1 - t) / 0.22, 1.3);
  const amp = 0.5 + 0.5 * fbm(x * 0.004 + 10, z * 0.004, 2);
  return profile * 5.5 * Math.max(0.15, amp);
}

export function heightAt(x, z) {
  let h = fbm(x * 0.004, z * 0.004, 5) * 9;
  h += dunes(x, z);
  h += fbm(x * 0.05, z * 0.05, 3) * 0.15;
  // Mesetas y montañas lejanas en el horizonte
  const r = Math.hypot(x, z);
  const far = THREE.MathUtils.smoothstep(r, 380, 650);
  const ridge = 1 - Math.abs(noise.noise(x * 0.006, z * 0.006, 8.2));
  h += far * (Math.pow(ridge, 3) * 110 + fbm(x * 0.01, z * 0.01, 4) * 25 + 20);
  return h;
}

const SIZE = 1400, SEG = 420, CELL = SIZE / SEG;

// Altura de la malla tal como se dibuja (interpolada en sus triángulos), para que
// ruedas y huellas apoyen exactamente sobre la superficie visible
export function surfaceHeight(x, z) {
  const gx = (x + SIZE / 2) / CELL, gz = (z + SIZE / 2) / CELL;
  const ix = Math.floor(gx), iz = Math.floor(gz);
  const fx = gx - ix, fz = gz - iz;
  const x0 = ix * CELL - SIZE / 2, z0 = iz * CELL - SIZE / 2;
  const hb = heightAt(x0, z0 + CELL), hd = heightAt(x0 + CELL, z0);
  // PlaneGeometry divide cada celda por la diagonal b-d
  if (fx + fz <= 1) {
    const ha = heightAt(x0, z0);
    return ha + (hd - ha) * fx + (hb - ha) * fz;
  }
  const hc = heightAt(x0 + CELL, z0 + CELL);
  return hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
}

export function createTerrain() {
  const size = SIZE, seg = SEG;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  const nrm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(0xc98552);
  const crest = new THREE.Color(0xe2aa74);
  const rock = new THREE.Color(0x74402a);
  const dark = new THREE.Color(0x9a5634);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const slope = 1 - nrm.getY(i);
    const n = fbm(x * 0.02, z * 0.02, 3);
    c.copy(sand).lerp(dark, THREE.MathUtils.clamp(0.5 + n * 0.8, 0, 1) * 0.6);
    c.lerp(crest, THREE.MathUtils.clamp(dunes(x, z) / 5.5, 0, 1) * 0.45);
    c.lerp(rock, THREE.MathUtils.smoothstep(slope, 0.12, 0.45));
    c.multiplyScalar(0.92 + 0.12 * noise.noise(x * 0.3, z * 0.3, 4.4));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 });
  // Ondulaciones de arena (ripples) y grano fino perturbando la normal en el shader
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p){
          vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y);
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 w = vWPos.xz;
          float warp = vnoise(w * 0.15) * 6.0;
          float ph = dot(w, vec2(0.825, 0.565)) * 6.5 + warp;
          float fade = 1.0 - smoothstep(25.0, 140.0, length(vWPos - cameraPosition));
          vec2 g = vec2(0.825, 0.565) * cos(ph) * 0.07;
          g += (vec2(vnoise(w * 9.0), vnoise(w * 9.0 + 17.0)) - 0.5) * 0.08;
          vec3 pert = (viewMatrix * vec4(g.x, 0.0, g.y, 0.0)).xyz;
          normal = normalize(normal - pert * fade);
          diffuseColor.rgb *= 1.0 + (sin(ph) * 0.02 + (vnoise(w * 3.0) - 0.5) * 0.08) * fade;
        }`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}
