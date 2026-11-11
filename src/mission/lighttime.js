// Tiempo de luz Tierra–Marte a partir de los elementos orbitales aproximados de JPL
// (E. M. Standish, "Keplerian Elements for Approximate Positions of the Major Planets",
// tabla 1, válida 1800–2050). El error en la distancia es menor al 1 %.

const AU_KM = 149597870.7;
const C_KM_S = 299792.458;
const DEG = Math.PI / 180;

// [a (UA), e, I (°), L (°), ϖ (°), Ω (°)] y su cambio por siglo juliano
const EARTH = {
  el: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
  rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
};
const MARS = {
  el: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
  rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
};

function heliocentric(planet, T) {
  const [a, e, I, L, wbar, node] = planet.el.map((v, i) => v + planet.rate[i] * T);
  const w = (wbar - node) * DEG;
  let M = ((L - wbar) % 360) * DEG;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(node * DEG), sO = Math.sin(node * DEG);
  const cI = Math.cos(I * DEG), sI = Math.sin(I * DEG);
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  ];
}

/** Distancia Tierra–Marte en UA para una fecha (ms desde 1970). */
export function earthMarsAU(ms) {
  const T = (ms / 86400000 + 2440587.5 - 2451545) / 36525;
  const p = heliocentric(EARTH, T), q = heliocentric(MARS, T);
  return Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
}

/** Minutos que tarda la luz (o una orden de radio) en ir de la Tierra a Marte. */
export function lightMinutes(ms) {
  return (earthMarsAU(ms) * AU_KM) / C_KM_S / 60;
}
