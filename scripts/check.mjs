// Abre la escena en Opera GX (o Chrome Dev / Edge), guarda una captura y lista errores de consola.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'http://localhost:5173/';
const OUT = path.resolve('screenshots/check.png');
const OUT_START = path.resolve('screenshots/check-inicio.png');
const OUT_TURN = path.resolve('screenshots/check-giro.png');

async function serverUp() {
  try { return (await fetch(URL)).ok; } catch { return false; }
}

async function ensureServer() {
  if (await serverUp()) return null;
  console.log('Dev server no responde; arrancando vite...');
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], { shell: true, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await serverUp()) return proc;
  }
  throw new Error('No se pudo arrancar el dev server');
}

function operaPath() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Opera GX');
  if (!fs.existsSync(base)) return null;
  const versions = fs.readdirSync(base)
    .filter(d => /^\d+(\.\d+)+$/.test(d) && fs.existsSync(path.join(base, d, 'opera.exe')))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return versions.length ? path.join(base, versions[0], 'opera.exe') : null;
}

const gpuArgs = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run'];

async function launch() {
  const candidates = [];
  const opera = operaPath();
  if (opera) candidates.push({ name: 'Opera GX', opts: { executablePath: opera } });
  candidates.push({ name: 'Chrome Dev', opts: { channel: 'chrome-dev' } });
  candidates.push({ name: 'Edge', opts: { channel: 'msedge' } });
  for (const c of candidates) {
    try {
      const browser = await chromium.launch({ ...c.opts, headless: false, args: [...gpuArgs, '--window-position=-2400,0'] });
      return { browser, name: c.name };
    } catch (e) {
      console.log(`No se pudo lanzar ${c.name}: ${e.message.split('\n')[0]}`);
    }
  }
  throw new Error('Ningún navegador Chromium disponible');
}

const server = await ensureServer();
const { browser, name } = await launch();
console.log(`Navegador: ${name}`);

const errors = [];
const warnings = [];
const logs = [];
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', m => {
  if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
  else if (m.type() === 'warning') warnings.push(`[console.warn] ${m.text()}`);
  else if (m.type() === 'log' && /^\[(rover|cámaras)\]/.test(m.text())) logs.push(m.text());
});
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r => errors.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(URL, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 40000 });
} catch {
  errors.push('[check] window.__sceneReady no se activó en 40 s');
}
await page.waitForTimeout(2500);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await page.screenshot({ path: OUT_START });
// Conduce: avanza con W y gira con A para comprobar huellas y seguimiento de cámara
await page.mouse.click(800, 450);
await page.keyboard.down('KeyW');
await page.waitForTimeout(4000);
const wheelState = () => page.evaluate(() => (window.__rover?.userData.wheels || [])
  .map(w => ({ spin: w.spin, steer: w.steer })));
const degrees = ws => ws.map(w => (w.steer * 180 / Math.PI).toFixed(0)).join(' ');
await page.keyboard.down('KeyA');
await page.waitForTimeout(1800);
const turning = await wheelState();
await page.keyboard.up('KeyA');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyW');
await page.waitForTimeout(1500);
await page.screenshot({ path: OUT });
// Giro en el sitio: las ruedas de las esquinas deben quedar en diagonal
await page.keyboard.down('KeyD');
await page.waitForTimeout(1200);
const spinning = await wheelState();
await page.screenshot({ path: OUT_TURN });
await page.keyboard.up('KeyD');
const wheels = await wheelState();
if (wheels.length) {
  logs.push('[rover] giro de ruedas (vueltas): ' + wheels.map(w => (w.spin / (2 * Math.PI)).toFixed(1)).join(' '));
  logs.push('[rover] orientación al doblar (°):     ' + degrees(turning));
  logs.push('[rover] orientación girando en sitio (°): ' + degrees(spinning));
  if (wheels.some(w => Math.abs(w.spin) < 0.5)) errors.push('[check] alguna rueda no giró al conducir');
}
await browser.close();
if (server) server.kill();

for (const l of logs) console.log(l);
console.log(`Captura inicio: ${OUT_START}`);
console.log(`Captura tras conducir: ${OUT}`);
console.log(`Captura girando en sitio: ${OUT_TURN}`);
for (const w of warnings) console.log(w);
if (errors.length) {
  console.log(`\n${errors.length} error(es):`);
  for (const e of errors) console.log(e);
  process.exit(1);
}
console.log('\n0 errores de consola.');
