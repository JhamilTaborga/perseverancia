import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createTerrain, heightAt } from './terrain.js';
import { createRocks } from './rocks.js';
import { createSky } from './sky.js';
import { createMoons } from './moons.js';
import { createDust } from './dust.js';
import { loadRover, createRoverController } from './rover.js';
import { createTracks } from './tracks.js';
import { createMissionControl } from './mission/hud.js';

const mission = createMissionControl();
if (import.meta.env.DEV) window.__mission = mission;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xc98c5e, 0.0042);

// El rover arranca mirando hacia el sol (-Z); la cámara lo sigue desde atrás
const START = { x: 0, z: 20, yaw: Math.PI };
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 4000);
const FOLLOW = { dist: 7.5, height: 0.9, lookY: 1.5 };
const startY = heightAt(START.x, START.z);
camera.position.set(START.x + 2.2, startY + FOLLOW.lookY + FOLLOW.height, START.z + 7.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(START.x, startY + FOLLOW.lookY, START.z);
controls.enableDamping = true;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minDistance = 4;
controls.maxDistance = 60;

// Sol de tarde, bajo en el horizonte
const sunDir = new THREE.Vector3(-0.35, 0.27, -1).normalize();
const sun = new THREE.DirectionalLight(0xffc48a, 3.4);
sun.position.copy(sunDir).multiplyScalar(300).add(controls.target);
sun.target.position.copy(controls.target);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
const sc = sun.shadow.camera;
sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 800;
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 4;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xe8a878, 0x5a2814, 0.9));

scene.add(createSky(sunDir));
scene.add(createTerrain());
scene.add(createRocks());
scene.add(createMoons());
const dust = createDust(new THREE.Vector3(START.x, heightAt(START.x, START.z) - 1, START.z));
scene.add(dust);

const tracks = createTracks(renderer.capabilities.getMaxAnisotropy());
scene.add(tracks.mesh);

let rover = null, drive = null;
loadRover().then(r => {
  rover = r;
  if (import.meta.env.DEV) window.__rover = rover;
  scene.add(rover);
  drive = createRoverController(rover, START.x, START.z, START.yaw);
}).catch(e => console.error('[rover] no se pudo cargar el modelo:', e));

const followOffset = new THREE.Vector3();
const behind = new THREE.Vector3();
const prevTarget = new THREE.Vector3();

// La cámara se traslada con el rover; al conducir se acomoda suavemente detrás de él
function followRover(dt) {
  const s = drive.update(dt);
  prevTarget.copy(controls.target);
  controls.target.set(rover.position.x, rover.position.y + FOLLOW.lookY, rover.position.z);
  camera.position.add(controls.target).sub(prevTarget);
  if (drive.driving()) {
    followOffset.subVectors(camera.position, controls.target);
    behind.set(-Math.sin(s.yaw) * FOLLOW.dist, FOLLOW.height, -Math.cos(s.yaw) * FOLLOW.dist);
    followOffset.lerp(behind, 1 - Math.exp(-dt * 1.2));
    camera.position.addVectors(controls.target, followOffset);
  }
  const ground = heightAt(camera.position.x, camera.position.z) + 0.8;
  if (camera.position.y < ground) camera.position.y = ground;
  tracks.update(s);
  // Sombras y polvo centrados en el rover
  sun.target.position.copy(rover.position);
  sun.position.copy(sunDir).multiplyScalar(300).add(rover.position);
  dust.userData.center.set(rover.position.x, rover.position.y - 1, rover.position.z);
}

// Post-proceso: bloom suave + gradación cinematográfica, viñeta y grano
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.6, 0.9));
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = mix(vec3(dot(c, vec3(0.299,0.587,0.114))), c, 1.08);
      c = pow(c, vec3(0.97, 1.0, 1.06));
      float v = smoothstep(0.95, 0.35, length(vUv - 0.5));
      c *= mix(0.62, 1.0, v);
      c += (hash(vUv * 1000.0) - 0.5) * 0.035;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(grade);

const timer = new THREE.Timer();
let frames = 0;
renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  const t = timer.getElapsed();
  if (rover) followRover(dt);
  controls.update();
  dust.userData.update(dt, t);
  grade.uniforms.time.value = t % 10;
  composer.render();
  if (rover && ++frames === 3) window.__sceneReady = true;
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
