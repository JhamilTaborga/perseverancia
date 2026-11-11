// Mini control de misión con el patrón de Open MCT:
// - cada dato se declara con metadatos (clave, nombre, unidad, formato, proveedor),
// - un proveedor dice qué datos sirve y responde request (historial) y subscribe (en vivo),
// - la vista solo habla con este registro, nunca con el proveedor directamente.
// Un punto de telemetría tiene la forma { sol, value }.
import { lightMinutes } from './lighttime.js';

const LANDING_MS = Date.UTC(2021, 1, 18, 20, 55); // aterrizaje en Jezero
const SOL_MS = 88775244; // un día marciano

export const solAt = ms => (ms - LANDING_MS) / SOL_MS;
export const msAtSol = sol => LANDING_MS + sol * SOL_MS; // fecha terrestre aproximada de un sol

export function createTelemetry() {
  const data = new Map();
  const providers = [];
  const find = (key, cap) => providers.find(p => p[cap] && p.supports(key));
  return {
    define(meta) { data.set(meta.key, meta); },
    metadata: key => data.get(key),
    keys: () => [...data.keys()],
    addProvider(p) { providers.push(p); },
    request(key) {
      const p = find(key, 'request');
      return p ? p.request(key) : Promise.reject(new Error(`sin proveedor para ${key}`));
    },
    subscribe(key, cb) {
      const p = find(key, 'subscribe');
      return p ? p.subscribe(key, cb) : () => {};
    },
  };
}

// Datos de manejo de la NASA (mapa MMGIS de Mars 2020):
// - M20_waypoints.json: todas las paradas, con sol, odometría, altura y actitud (el historial)
// - M20_waypoints_current.json: solo la última parada publicada (dónde está Percy ahora)
const NASA_JSON = 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/';
export const WAYPOINTS_URL = NASA_JSON + 'M20_waypoints.json';
export const CURRENT_URL = NASA_JSON + 'M20_waypoints_current.json';
const POLL_MS = 10 * 60 * 1000; // la NASA publica pocas veces por semana; con 10 min basta
const FIELDS = { distancia: 'dist_total_m', altura: 'elev_geoid', inclinacion: 'tilt' };

// Siempre revalida con la NASA (nada de copias viejas del navegador) y anota cuándo la NASA subió el archivo
async function nasaStops(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`NASA respondió ${r.status} en ${url}`);
  const updated = Date.parse(r.headers.get('Last-Modified')) || null;
  return (await r.json()).features.map(f => ({ ...f.properties, updated }));
}

// Solo paradas de fin de manejo: las localizaciones a mitad de trayecto traen odometría 0; -9999 = sin dato
const usable = (p, field) => p.final === 'y' && Number.isFinite(p[field]) && p[field] > -9000;
const toPoint = (p, key) => ({
  sol: p.sol, value: key === 'distancia' ? p[FIELDS[key]] / 1000 : p[FIELDS[key]], updated: p.updated,
});

export function nasaWaypointsProvider() {
  const stops = new Map(); // parada (RMC = sitio_manejo) → datos
  const merge = list => list.filter(p => !stops.has(p.RMC) && stops.set(p.RMC, p));
  const ordered = () => [...stops.values()].sort((a, b) => a.site - b.site || a.drive - b.drive);
  let load = null;
  const loadAll = () => (load ??= Promise.all([nasaStops(WAYPOINTS_URL), nasaStops(CURRENT_URL)])
    .then(([all, current]) => { merge(all); merge(current); }));

  // Una sola consulta periódica a la NASA para todas las suscripciones
  const listeners = new Set();
  let timer = null;
  const poll = async () => {
    try {
      const fresh = merge(await nasaStops(CURRENT_URL));
      fresh.forEach(p => listeners.forEach(l => l(p)));
    } catch (e) {
      console.warn('[misión] no se pudo consultar la NASA, se reintenta en 10 min:', e.message);
    }
  };

  return {
    supports: key => key in FIELDS,
    async request(key) {
      await loadAll();
      return ordered().filter(p => usable(p, FIELDS[key])).map(p => toPoint(p, key));
    },
    subscribe(key, cb) {
      const l = p => usable(p, FIELDS[key]) && cb(toPoint(p, key));
      listeners.add(l);
      timer ??= setInterval(poll, POLL_MS);
      return () => {
        listeners.delete(l);
        if (!listeners.size) { clearInterval(timer); timer = null; }
      };
    },
  };
}

// Tiempo de luz calculado aquí mismo: un punto por día de la misión y uno nuevo cada segundo
export function lightTimeProvider() {
  const point = ms => ({ sol: solAt(ms), value: lightMinutes(ms) });
  return {
    supports: key => key === 'luz',
    async request() {
      const out = [];
      for (let ms = LANDING_MS; ms < Date.now(); ms += 86400000) out.push(point(ms));
      out.push(point(Date.now()));
      return out;
    },
    subscribe(key, cb) {
      const id = setInterval(() => cb(point(Date.now())), 1000);
      return () => clearInterval(id);
    },
  };
}
