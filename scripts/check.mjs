// Abre la escena en Opera GX (o Chrome Dev / Edge), guarda una captura y lista errores de consola.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'http://localhost:5173/';
const OUT = path.resolve('screenshots/check.png');
const OUT_START = path.resolve('screenshots/check-inicio.png');
const OUT_TURN = path.resolve('screenshots/check-giro.png');
const OUT_MISSION = path.resolve('screenshots/check-mision.png');
const OUT_MISSION_HIDDEN = path.resolve('screenshots/check-mision-oculta.png');
const OUT_MISSION_HOVER = path.resolve('screenshots/check-mision-mouse.png');

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
  else if (m.type() === 'log' && /^\[(rover|cámaras|misión)\]/.test(m.text())) logs.push(m.text());
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
// Control de misión: los 4 datos deben tener número real y T debe ocultarlo y mostrarlo
const MISSION_KEYS = ['distancia', 'altura', 'inclinacion', 'luz'];
try {
  await page.waitForFunction(keys => keys.every(k => Number.isFinite(window.__mission?.values[k])),
    MISSION_KEYS, { timeout: 30000 });
} catch {
  errors.push('[check] el control de misión no cargó los 4 datos en 30 s');
}
const mission = await page.evaluate(() => ({ ...window.__mission?.values }));
for (const k of MISSION_KEYS) logs.push(`[misión] ${k}: ${mission[k] ?? 'sin dato'}`);
await page.screenshot({ path: OUT_MISSION });
// El último dato mostrado debe ser la última parada que publica la NASA
const nasaNow = await fetch('https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints_current.json', { cache: 'no-store' })
  .then(r => r.json()).then(j => j.features.at(-1).properties.sol).catch(() => null);
const values = () => page.evaluate(() => [...document.querySelectorAll('.mc-value')].map(v => v.innerText.replace(/\s+/g, ' ')));
const before = await values();
logs.push(`[misión] última parada publicada por la NASA: sol ${nasaNow}`);
const shownSols = await page.evaluate(keys => Promise.all(keys.map(k => window.__mission.telemetry.request(k)
  .then(h => h.at(-1).sol))), MISSION_KEYS.slice(0, 3));
for (const [i, k] of MISSION_KEYS.slice(0, 3).entries()) {
  if (shownSols[i] !== nasaNow) errors.push(`[check] ${k} no muestra el último dato de la NASA (sol ${nasaNow}), sino el sol ${shownSols[i]}`);
  if (!before[i].includes('último dato · ')) errors.push(`[check] ${k} no indica la fecha del último dato: "${before[i]}"`);
}
// El mouse sobre una sola gráfica debe cambiar los 4 cuadros a la vez, y al salir volver al dato actual
const charts = await page.$$('.mc canvas');
for (const i of [1, 3]) {
  const box = await charts[i].boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
  const during = await values();
  if (i === 1) await page.screenshot({ path: OUT_MISSION_HOVER });
  logs.push(`[misión] mouse sobre ${MISSION_KEYS[i]}: ${during.map(v => `"${v}"`).join(' | ')}`);
  during.forEach((v, j) => {
    if (v === before[j] || !/sol \d+ · /.test(v)) errors.push(`[check] con el mouse sobre ${MISSION_KEYS[i]}, ${MISSION_KEYS[j]} no cambió`);
  });
}
await page.mouse.move(800, 200);
const after = await values();
logs.push(`[misión] mouse fuera: ${after.map(v => `"${v}"`).join(' | ')}`);
after.forEach((v, j) => {
  if (/sol \d+ · /.test(v)) errors.push(`[check] ${MISSION_KEYS[j]} no vuelve al dato actual al sacar el mouse`);
});
const missionVisible = () => page.evaluate(() => window.__mission.visible()
  && getComputedStyle(document.querySelector('.mc')).display !== 'none');
const shown0 = await missionVisible();
await page.keyboard.press('KeyT');
const shown1 = await missionVisible();
await page.screenshot({ path: OUT_MISSION_HIDDEN });
await page.keyboard.press('KeyT');
const shown2 = await missionVisible();
logs.push(`[misión] visible al inicio: ${shown0}, tras T: ${shown1}, tras otra T: ${shown2}`);
if (!(shown0 && !shown1 && shown2)) errors.push('[check] la tecla T no oculta/muestra el control de misión');
// Cámaras de Percy: clic en cada punto → foto real revelada; flechas cambian de foto sin mover el rover; Esc vuelve
const roverPos = () => page.evaluate(() => window.__rover.position.toArray().map(n => n.toFixed(3)).join(','));
const photoInfo = () => page.evaluate(() => {
  const img = document.querySelector('.pv-frame img');
  return { src: img.currentSrc, w: img.naturalWidth, h: img.naturalHeight,
    meta: document.querySelector('.pv-meta').innerText.replace(/\s+/g, ' ') };
});
const waitRevealed = () => page.waitForFunction(() => window.__photos.state.revealed
  && document.querySelector('.pv-frame img').naturalWidth > 0, null, { timeout: 30000 });
for (const key of ['mastcam', 'navcam', 'hazcam', 'watson']) {
  try {
    await page.locator(`.pc-dot[data-camera="${key}"]`).click({ timeout: 8000 });
    await waitRevealed();
    const first = await photoInfo();
    await page.screenshot({ path: path.resolve(`screenshots/check-foto-${key}.png`) });
    const before = await roverPos();
    await page.keyboard.press('ArrowRight');
    await waitRevealed();
    const second = await photoInfo();
    const after = await roverPos();
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => !window.__photos.isOpen());
    logs.push(`[fotos] ${key}: ${first.w}×${first.h} "${first.meta}" → con → otra foto: ${second.src !== first.src}, rover quieto: ${before === after}, Esc cierra: ${closed}`);
    if (!(first.w > 0 && /mars\.nasa\.gov/.test(first.src))) errors.push(`[check] ${key} no abrió una foto real de la NASA`);
    if (second.src === first.src) errors.push(`[check] ${key}: la flecha → no cambió de foto`);
    if (before !== after) errors.push(`[check] ${key}: las flechas movieron el rover con el visor abierto`);
    if (!closed) errors.push(`[check] ${key}: Esc no cerró el visor`);
  } catch (e) {
    errors.push(`[check] la cámara ${key} no abrió su foto: ${e.message.split('\n')[0]}`);
    await page.keyboard.press('Escape');
  }
}
// Al cambiar el tamaño de la ventana, cada parte de los cuadros (nombre, número, gráfica, frase, fuente)
// debe quedar a la misma altura en todos los cuadros de una fila, con o sin mouse encima
const PARTS = ['.mc-name', '.mc-value', 'canvas', '.mc-say', '.mc-src'];
const layout = () => page.evaluate(parts => [...document.querySelectorAll('.mc-card')].map(c => {
  const r = c.getBoundingClientRect();
  return { row: Math.round(r.top), parts: parts.map(s => Math.round(c.querySelector(s).getBoundingClientRect().top)) };
}), PARTS);
const misaligned = cards => {
  const rows = Object.groupBy(cards, c => c.row);
  return Object.values(rows).flatMap(row => PARTS.filter((_, i) => {
    const tops = row.map(c => c.parts[i]);
    return Math.max(...tops) - Math.min(...tops) > 1;
  }));
};
for (const width of [1920, 1600, 1366, 1280, 1100, 1024, 900, 800, 600]) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(300);
  const rest = await layout();
  const box = await (await page.$$('.mc canvas'))[1].boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
  const hover = await layout();
  await page.mouse.move(5, 5);
  const bad = [...new Set([...misaligned(rest), ...misaligned(hover)])];
  const jump = JSON.stringify(rest) !== JSON.stringify(hover);
  logs.push(`[misión] ${width}px: ${bad.length ? 'desalineado ' + bad.join(' ') : 'alineado'}${jump ? ', salta con el mouse' : ''}`);
  if (bad.length) errors.push(`[check] a ${width}px los cuadros no alinean: ${bad.join(' ')}`);
  if (jump) errors.push(`[check] a ${width}px los cuadros cambian de tamaño con el mouse encima`);
  if (width === 1100 || width === 800) await page.screenshot({ path: path.resolve(`screenshots/check-mision-${width}.png`) });
}
await browser.close();
if (server) server.kill();

for (const l of logs) console.log(l);
console.log(`Captura inicio: ${OUT_START}`);
console.log(`Captura tras conducir: ${OUT}`);
console.log(`Captura girando en sitio: ${OUT_TURN}`);
console.log(`Captura control de misión: ${OUT_MISSION}`);
console.log(`Captura control oculto (T): ${OUT_MISSION_HIDDEN}`);
for (const w of warnings) console.log(w);
if (errors.length) {
  console.log(`\n${errors.length} error(es):`);
  for (const e of errors) console.log(e);
  process.exit(1);
}
console.log('\n0 errores de consola.');
