// Panel de control de misión dentro de la simulación. La tecla T lo muestra u oculta.
import { createTelemetry, nasaWaypointsProvider, lightTimeProvider, solAt, msAtSol, WAYPOINTS_URL } from './telemetry.js';

const JPL_ORBITS_URL = 'https://ssd.jpl.nasa.gov/planets/approx_pos.html';

const num = (v, d) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });

// Metadatos de cada dato: lo que Open MCT guarda en telemetry.values
const DATA = [
  {
    key: 'distancia', name: 'Distancia recorrida', unit: 'km', decimals: 2,
    source: { text: 'mars.nasa.gov · M20_waypoints.json → dist_total_m', url: WAYPOINTS_URL },
    explain: (v) => `Todo lo que Percy ha manejado desde que aterrizó, sumando cada trayecto: unas ${Math.round(v / 0.105)} canchas de fútbol puestas en fila.`,
  },
  {
    key: 'altura', name: 'Altura del terreno', unit: 'm', decimals: 0,
    source: { text: 'mars.nasa.gov · M20_waypoints.json → elev_geoid', url: WAYPOINTS_URL },
    explain: (v, h) => `Percy está ${num(Math.abs(v), 0)} m por debajo del “nivel del mar” de Marte. Ya subió ${num(v - Math.min(...h.map(p => p.value)), 0)} m desde lo más hondo del cráter Jezero.`,
  },
  {
    key: 'inclinacion', name: 'Inclinación', unit: '°', decimals: 1,
    source: { text: 'mars.nasa.gov · M20_waypoints.json → tilt', url: WAYPOINTS_URL },
    explain: (v, h) => `Cuánto estaba ladeado Percy en su última parada. Lo más empinado que ha pisado: ${num(Math.max(...h.map(p => p.value)), 1)}°.`,
  },
  {
    key: 'luz', name: 'Tiempo de luz Tierra → Marte', unit: 'min', decimals: 2,
    source: { text: 'ssd.jpl.nasa.gov · órbitas de los planetas', url: JPL_ORBITS_URL },
    explain: (v) => {
      const s = Math.round(v * 60);
      return `Una orden enviada ahora desde la Tierra tarda ${Math.floor(s / 60)} min ${s % 60} s en llegar a Percy. Por eso en la NASA nadie lo maneja con joystick.`;
    },
  },
];

const CSS = `
.mc { position: fixed; left: 16px; right: 16px; bottom: 16px; max-height: calc(100vh - 32px); overflow-y: auto;
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  font: 12px/1.45 ui-monospace, "Cascadia Mono", Consolas, monospace; color: #f3dcc4;
  background: rgba(28, 13, 6, 0.72); backdrop-filter: blur(6px); border: 1px solid rgba(255, 179, 107, 0.28);
  border-radius: 6px; box-shadow: 0 8px 28px rgba(0,0,0,.35); scrollbar-width: thin; z-index: 5; }
.mc[hidden] { display: none; }
.mc-head { grid-column: 1 / -1; display: flex; align-items: baseline; gap: 16px; padding: 7px 12px 6px;
  border-bottom: 1px solid rgba(255, 179, 107, 0.2); letter-spacing: .1em; text-transform: uppercase; font-size: 11px; }
.mc-head b { color: #ffb36b; font-weight: 700; }
.mc-clock { color: #c9a88a; letter-spacing: .04em; font-variant-numeric: tabular-nums; }
/* Los cuadros comparten filas (subgrid): nombre, número, gráfica, frase y fuente quedan a la misma altura
   en todos, aunque la frase de uno ocupe más líneas que la de otro */
.mc-card { display: grid; grid-row: span 5; grid-template-rows: subgrid; row-gap: 0; align-content: start;
  padding: 8px 12px 9px; border-left: 1px solid rgba(255, 179, 107, 0.12); min-width: 0; }
.mc-card:first-of-type { border-left: 0; }
@media (max-width: 900px) {
  .mc { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mc-card:nth-of-type(3) { border-left: 0; }
  .mc-card:nth-of-type(n+3) { border-top: 1px solid rgba(255, 179, 107, 0.12); }
}
.mc-name { color: #c9a88a; text-transform: uppercase; letter-spacing: .08em; font-size: 10.5px; }
.mc-value { font-size: 26px; font-weight: 700; color: #fff1e2; font-variant-numeric: tabular-nums; line-height: 1.2; margin-top: 2px; }
.mc-value small { font-size: 13px; color: #ffb36b; font-weight: 600; margin-left: 4px; }
.mc-value.wait { font-size: 14px; color: #c9a88a; font-weight: 400; }
.mc-value.err { font-size: 13px; color: #ff8a6b; font-weight: 400; }
.mc canvas { display: block; width: 100%; height: 48px; margin: 4px 0 3px; cursor: crosshair; touch-action: none; }
/* Número y fecha siempre en una sola línea: la fecha se recorta con "…" antes que saltar de renglón */
.mc-value { display: flex; align-items: baseline; flex-wrap: nowrap; min-width: 0; white-space: nowrap; }
.mc-value.hover { color: #ffb36b; }
.mc-when { margin-left: auto; padding-left: 8px; min-width: 0; overflow: hidden; text-overflow: ellipsis;
  font-size: 10.5px; font-weight: 400; color: #9c7f66; letter-spacing: .04em; }
.mc-value.hover .mc-when { color: #f3dcc4; }
.mc-say { font-family: system-ui, sans-serif; font-size: 12.5px; color: #f3dcc4; margin: 0; }
.mc-src { color: #9c7f66; font-size: 10.5px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-src a { color: inherit; text-decoration: underline; text-decoration-color: rgba(255,179,107,.35); text-underline-offset: 2px; }
.mc-src a:hover, .mc-src a:focus-visible { color: #ffb36b; outline: none; }
.mc-foot { margin-left: auto; color: #9c7f66; letter-spacing: .04em; text-transform: none; }
.mc-chip { position: fixed; right: 16px; bottom: 16px; font: 11px ui-monospace, Consolas, monospace; letter-spacing: .08em;
  color: #f3dcc4; background: rgba(28, 13, 6, 0.6); border: 1px solid rgba(255, 179, 107, 0.28); border-radius: 4px;
  padding: 6px 10px; text-transform: uppercase; z-index: 5; pointer-events: none; }
.mc kbd, .mc-chip kbd { color: #ffb36b; font: inherit; font-weight: 700; }
`;

// Punto con el sol más cercano (los puntos vienen ordenados por sol)
function nearest(points, sol) {
  let lo = 0, hi = points.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; (points[mid].sol < sol ? (lo = mid) : (hi = mid)); }
  return Math.abs(points[lo].sol - sol) <= Math.abs(points[hi].sol - sol) ? points[lo] : points[hi];
}

// Todas las gráficas comparten eje: del sol 0 a hoy
const PAD = { l: 2, r: 6, t: 6, b: 12 };
const solMax = () => solAt(Date.now());
const solFromPx = (canvas, px) => Math.min(Math.max(((px - PAD.l) / (canvas.clientWidth - PAD.l - PAD.r)) * solMax(), 0), solMax());
const fmtDate = ms => new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

// Dibuja la gráfica; si hay un sol señalado (hoverSol), marca el punto más cercano y lo devuelve
function drawChart(canvas, points, hoverSol = null) {
  const dpr = Math.min(devicePixelRatio, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const vals = points.map(p => p.value);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const pad = PAD, max = Math.max(solMax(), points[points.length - 1].sol);
  const x = s => pad.l + (s / max) * (w - pad.l - pad.r);
  const y = v => pad.t + (1 - (v - lo) / span) * (h - pad.t - pad.b);
  // Rejilla tenue cada 500 soles
  g.strokeStyle = 'rgba(255,179,107,0.10)'; g.lineWidth = 1;
  for (let s = 500; s < max; s += 500) { g.beginPath(); g.moveTo(x(s), pad.t); g.lineTo(x(s), h - pad.b); g.stroke(); }
  g.beginPath();
  points.forEach((p, i) => (i ? g.lineTo(x(p.sol), y(p.value)) : g.moveTo(x(p.sol), y(p.value))));
  const last = points[points.length - 1];
  g.strokeStyle = '#ffb36b'; g.lineWidth = 1.4; g.stroke();
  g.lineTo(x(last.sol), h - pad.b); g.lineTo(x(points[0].sol), h - pad.b); g.closePath();
  g.fillStyle = 'rgba(255,179,107,0.12)'; g.fill();
  g.fillStyle = '#fff1e2';
  g.beginPath(); g.arc(x(last.sol), y(last.value), 2.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#9c7f66'; g.font = '9.5px ui-monospace, Consolas, monospace';
  g.textAlign = 'left'; g.fillText('sol 0', pad.l, h - 1);
  g.textAlign = 'right'; g.fillText(`sol ${Math.floor(max)} · hoy`, w - pad.r, h - 1);
  if (hoverSol === null) return null;
  const p = nearest(points, hoverSol);
  const px = x(p.sol), py = y(p.value);
  g.strokeStyle = 'rgba(255,241,226,0.55)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(px, pad.t - 4); g.lineTo(px, h - pad.b); g.stroke();
  g.fillStyle = '#ffb36b'; g.strokeStyle = '#fff1e2'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(px, py, 3.6, 0, Math.PI * 2); g.fill(); g.stroke();
  return { point: p, px };
}

export function createMissionControl() {
  const telemetry = createTelemetry();
  DATA.forEach(d => telemetry.define(d));
  telemetry.addProvider(nasaWaypointsProvider());
  telemetry.addProvider(lightTimeProvider());

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const panel = document.createElement('aside');
  panel.className = 'mc';
  panel.setAttribute('aria-label', 'Control de misión');
  panel.innerHTML = `<div class="mc-head"><b>Control de misión · Percy</b><span class="mc-clock"></span></div>`;
  const chip = document.createElement('div');
  chip.className = 'mc-chip';
  chip.innerHTML = '<kbd>T</kbd> · control de misión';
  chip.hidden = true;

  const values = {};
  const clock = panel.querySelector('.mc-clock');
  const tickClock = () => {
    const d = new Date();
    clock.textContent = `sol ${Math.floor(solAt(d.getTime()))} · ${d.toISOString().slice(11, 16)} UTC`;
  };
  tickClock();
  setInterval(tickClock, 1000);

  // Un solo sol señalado para todo el panel: el mouse sobre cualquier gráfica mueve las cuatro
  let hoverSol = null;
  const renderAll = () => panel.querySelectorAll('.mc-card').forEach(c => c.render());

  for (const key of telemetry.keys()) {
    const meta = telemetry.metadata(key);
    const card = document.createElement('section');
    card.className = 'mc-card';
    card.innerHTML = `<div class="mc-name">${meta.name}</div><div class="mc-value wait">cargando…</div>
      <canvas aria-hidden="true"></canvas>
      <p class="mc-say"></p><div class="mc-src">Fuente: <a href="${meta.source.url}" target="_blank" rel="noopener" title="${meta.source.url}">${meta.source.text}</a></div>`;
    panel.appendChild(card);
    const [valueEl, canvas, say] = ['.mc-value', 'canvas', '.mc-say'].map(s => card.querySelector(s));
    let history = [];
    // El número grande muestra el último dato; con el mouse sobre cualquier gráfica, el del sol señalado
    const render = () => {
      const last = history[history.length - 1];
      values[key] = last.value;
      say.textContent = meta.explain(last.value, history);
      const hit = panel.hidden ? null : drawChart(canvas, history, hoverSol);
      const shown = hit ? hit.point : last;
      const when = hit
        ? `sol ${Math.floor(shown.sol)} · ${fmtDate(msAtSol(shown.sol))}`
        : key === 'luz' ? `en vivo · ${fmtDate(Date.now())}` : `último dato · ${fmtDate(msAtSol(shown.sol))}`;
      valueEl.className = hit ? 'mc-value hover' : 'mc-value';
      valueEl.innerHTML = `${num(shown.value, meta.decimals)}<small>${meta.unit}</small><span class="mc-when">${when}</span>`;
    };
    canvas.addEventListener('pointermove', e => {
      hoverSol = solFromPx(canvas, e.clientX - canvas.getBoundingClientRect().left);
      renderAll();
    });
    canvas.addEventListener('pointerleave', () => {
      hoverSol = null;
      renderAll();
    });
    card.render = () => history.length && render();
    telemetry.request(key).then(points => {
      history = points;
      render();
      // En vivo: el tiempo de luz cada segundo; los manejos cuando la NASA publica una parada nueva
      telemetry.subscribe(key, p => { history.push(p); render(); });
    }).catch(e => {
      valueEl.className = 'mc-value err';
      valueEl.textContent = 'Sin datos: no se pudo leer la NASA';
      console.error(`[misión] ${meta.name}:`, e);
    });
  }

  const foot = document.createElement('span');
  foot.className = 'mc-foot';
  foot.innerHTML = 'Gráficas: toda la misión, del aterrizaje a hoy · <kbd>T</kbd> ocultar';
  panel.querySelector('.mc-head').appendChild(foot);
  addEventListener('resize', () => panel.querySelectorAll('.mc-card').forEach(c => c.render()));
  document.body.append(panel, chip);

  addEventListener('keydown', e => {
    if (e.code !== 'KeyT' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    panel.hidden = !panel.hidden;
    chip.hidden = !panel.hidden;
    if (!panel.hidden) panel.querySelectorAll('.mc-card').forEach(c => c.render());
  });

  return { telemetry, values, visible: () => !panel.hidden };
}
