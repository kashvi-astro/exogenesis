/*
  physics.js — the rigorous core (ES module).
  Pure functions: numbers in, numbers out. All sizes in Earth units.
  Ported from the original Exogenesis tool, unchanged in its science.
*/

export const STAR_LUMINOSITY = { M: 0.02, K: 0.3, G: 1.0, F: 3.5, A: 20 };
export const STAR_ACTIVITY   = { M: 8,    K: 2,   G: 1,   F: 2,   A: 4 };
const EARTH_ESCAPE = 11.186;  // km/s
const T_CONST = 278.5;        // K, equilibrium-temp constant

export const surfaceGravity   = (m, r) => m / (r * r);                 // Earth g's
export const escapeVelocity   = (m, r) => EARTH_ESCAPE * Math.sqrt(m / r); // km/s
export const kelvinToCelsius  = (k) => k - 273.15;

export function equilibriumTemp(star, distanceAU, albedo) {
  const L = STAR_LUMINOSITY[star] ?? 1;
  return T_CONST * Math.pow(L, 0.25) * Math.pow(distanceAU, -0.5) * Math.pow(1 - albedo, 0.25);
}

export function greenhouseWarming(atmo) {
  const potency = atmo.CO2 * 2.0 + atmo.CH4 * 3.0 + atmo.H2O * 2.5;
  return 500 * (1 - Math.exp(-potency / 40));
}

export function waterState(tempK) {
  if (tempK < 273) return 'frozen';
  if (tempK <= 373) return 'liquid possible';
  return 'vapour';
}

export function radiationIndex(star, distanceAU) {
  const L = STAR_LUMINOSITY[star] ?? 1;
  const a = STAR_ACTIVITY[star] ?? 1;
  return (L / (distanceAU * distanceAU)) * a;
}

export function radiationLevel(index) {
  if (index < 1.5) return 'low';
  if (index < 6) return 'moderate';
  if (index < 25) return 'high';
  return 'extreme';
}

export function atmosphereRetention(escapeKmS, radIndex) {
  const vRatio = escapeKmS / EARTH_ESCAPE;
  const threshold = 5 * Math.pow(vRatio, 4);
  const ratio = radIndex / threshold;
  let state;
  if (ratio < 0.8) state = 'retained';
  else if (ratio < 1.5) state = 'marginal';
  else state = 'stripped';
  return { ratio, state };
}

export function habitabilityScore(d) {
  const tempScore  = Math.exp(-Math.pow((d.Tsurf - 288) / 40, 2));
  const waterScore = Math.min(1, d.water / 60);
  const gravScore  = Math.exp(-Math.pow((d.gravity - 1) / 1.5, 2));
  const radScore   = Math.exp(-d.radiation / 8);
  const base = 0.4 * tempScore + 0.2 * waterScore + 0.2 * gravScore + 0.2 * radScore;
  const retFactor = d.retention === 'retained' ? 1.0 : d.retention === 'marginal' ? 0.6 : 0.15;
  return Math.round(base * retFactor * 100);
}

export function habitabilityVerdict(score) {
  if (score >= 75) return { word: 'Potentially habitable', cls: 'ok' };
  if (score >= 50) return { word: 'Marginally habitable', cls: 'warn' };
  if (score >= 25) return { word: 'Hostile', cls: 'bad' };
  return { word: 'Uninhabitable', cls: 'bad' };
}

// Bundle: run the whole physics pass from raw inputs.
export const ALBEDO = 0.30;
export function computePhysics(p) {
  const gravity = surfaceGravity(p.mass, p.radius);
  const esc = escapeVelocity(p.mass, p.radius);
  const radiation = radiationIndex(p.star, p.distance);
  const ret = atmosphereRetention(esc, radiation);
  const Teq = equilibriumTemp(p.star, p.distance, ALBEDO);
  const dT = greenhouseWarming(p.atmosphere);
  const Tsurf = Teq + dT;
  const score = habitabilityScore({ Tsurf, water: p.water, gravity, radiation, retention: ret.state });
  return {
    gravity, escapeVelocity: esc, radiation, retention: ret.state, retentionRatio: ret.ratio,
    Teq, greenhouse: dT, Tsurf, score, verdict: habitabilityVerdict(score),
  };
}
