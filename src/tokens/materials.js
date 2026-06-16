/*
  materials.js — THE TOKEN SPINE (continuous edition).
  Instead of snapping to a few fixed archetypes, every shader uniform is a
  CONTINUOUS function of the exact composition + physics:
    • atmosphere scattering/absorption = weighted blend of per-gas optics
    • shell thickness = real scale height  H ∝ T / (molar mass · gravity)
    • surface colour = a smooth temperature colormap (no banding)
    • a per-planet SEED offsets the noise so every world is unique
  → effectively unlimited, one-of-a-kind planets, with no threshold jumps.
*/

export const STARS = {
  M: { sunColor: '#ffd3b0', sunIntensity: 13 },
  K: { sunColor: '#ffe7c4', sunIntensity: 14 },
  G: { sunColor: '#fff4ea', sunIntensity: 16 },
  F: { sunColor: '#eef2ff', sunIntensity: 18 },
  A: { sunColor: '#dde7ff', sunIntensity: 20 },
};
export const GAS_COLORS = {
  N2: '#6f8fb0', O2: '#5fb0d0', CO2: '#46b59a', CH4: '#d18a4e', H2: '#7f9ad4', H2O: '#5bbcd6',
};

// Per-gas optical properties: molar mass, Rayleigh strength, red/green/blue absorption.
const GAS = {
  N2:  { M: 28, ray: 1.0,  abs: [0, 0, 0] },
  O2:  { M: 32, ray: 1.1,  abs: [0, 0, 0] },
  CO2: { M: 44, ray: 2.4,  abs: [0, 0, 0] },
  CH4: { M: 16, ray: 2.0,  abs: [9, 2, 0.4] },   // absorbs red → world reads teal
  H2:  { M: 2,  ray: 0.25, abs: [0, 0, 0] },
  H2O: { M: 18, ray: 1.4,  abs: [0, 0, 0] },      // feeds the Mie haze term
};

// ---- colour helpers (continuous) ----
const hx = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); };

// smooth temperature → base surface colour (no bands)
const TEMP_STOPS = [
  [100, '#eaf3ff'], [235, '#bcd2e6'], [273, '#86a6ad'], [300, '#74804f'],
  [340, '#b58a55'], [430, '#9c4a25'], [700, '#ff5a2a'], [1300, '#ffd9a0'],
];
function colormap(T) {
  if (T <= TEMP_STOPS[0][0]) return TEMP_STOPS[0][1];
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    if (T <= TEMP_STOPS[i][0]) {
      const [t0, c0] = TEMP_STOPS[i - 1], [t1, c1] = TEMP_STOPS[i];
      return mix(c0, c1, (T - t0) / (t1 - t0));
    }
  }
  return TEMP_STOPS[TEMP_STOPS.length - 1][1];
}
function surfaceBase(T, water, stripped) {
  if (stripped) return '#6e6e6e';
  let base = colormap(T);
  if (T >= 265 && T <= 375 && water > 0) base = mix(base, '#1f5f9e', Math.min(1, water / 65)); // ocean blend
  return base;
}

// continuous atmospheric rim colour from composition
function rimColor(p, stripped) {
  if (stripped) return '#20303a';
  const a = p.atmosphere, tot = Math.max(1, sum(a));
  let c = '#7fb0ff';
  c = mix(c, '#46d6c0', Math.min(1, (a.CH4 / tot) * 2.2));            // methane teal
  c = mix(c, '#e8d6a0', Math.min(1, (a.CO2 / tot) * 1.6));            // CO₂ amber
  c = mix(c, '#cf8ad0', Math.min(1, (a.CH4 / tot) * (a.CO2 / tot) * 6)); // both → exotic violet
  return c;
}

const sum = (a) => a.N2 + a.O2 + a.CO2 + a.CH4 + a.H2 + a.H2O;
function lightDir(azDeg, elDeg) {
  const az = azDeg * Math.PI / 180, el = elDeg * Math.PI / 180;
  return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
}

// per-planet seed → 3 noise offsets, so every world's terrain/clouds are unique
function planetSeed(p) {
  const a = p.atmosphere;
  const h = p.star.charCodeAt(0) * 7 + p.mass * 13.1 + p.radius * 29.7 + p.distance * 53.3 + p.rotation * 0.071
    + a.N2 * 1.3 + a.O2 * 2.7 + a.CO2 * 3.9 + a.CH4 * 5.1 + a.H2 * 6.3 + a.H2O * 7.7;
  const r = (x) => { const v = Math.sin(x) * 43758.5453; return v - Math.floor(v); };
  return [r(h) * 24, r(h * 1.7 + 11) * 24, r(h * 2.3 + 27) * 24];
}

// shared continuous descriptors
function giantness(p) { const a = p.atmosphere, tot = Math.max(1, sum(a)); return (a.H2 / tot) + Math.max(0, p.radius - 2.0) * 0.3; }
function bodyType(p, d) {
  if (d.retention === 'stripped') return 0;
  if (giantness(p) > 0.4) return 1;                                  // gas giant
  const a = p.atmosphere, tot = Math.max(1, sum(a));
  if (d.Tsurf < 240 || a.H2O / tot > 0.35) return 2;                 // ice giant
  return 0;                                                          // terrestrial
}

// ---- ATMOSPHERE shader uniforms (continuous scattering from composition) ----
export function atmosphereUniforms(p, d) {
  const star = STARS[p.star] || STARS.G;
  const stripped = d.retention === 'stripped';
  const a = p.atmosphere, tot = Math.max(1, sum(a));
  let M = 0, ray = 0, abs = [0, 0, 0];
  for (const g in a) { const f = a[g] / tot, t = GAS[g]; M += f * t.M; ray += f * t.ray; abs[0] += f * t.abs[0]; abs[1] += f * t.abs[1]; abs[2] += f * t.abs[2]; }
  const mie = 0.4 + (a.H2O / tot) * 4.0;
  let Hr = 0.03 * (d.Tsurf / 255) * (29 / Math.max(2, M)) / Math.max(0.2, d.gravity);
  Hr = Math.min(0.09, Math.max(0.008, Hr));
  const fill = stripped ? 0 : Math.min(1.2, tot / 100);
  const atmoHeight = stripped ? 0.012 : Math.min(0.16, Math.max(0.03, Hr * 3.2 * fill));
  const k = 9.0 * ray * fill;
  const type = bodyType(p, d);
  const base = type === 1 ? '#27405e' : surfaceBase(d.Tsurf, p.water, stripped);
  return {
    uAtmoHeight: atmoHeight, uHr: Hr, uHm: Hr * 0.8,
    uBetaR: [0.30 * k, 0.70 * k, 1.7 * k],
    uBetaM: [mie * fill, mie * fill, mie * fill * 1.05],
    uBetaA: [abs[0] * 0.9, abs[1] * 0.9, abs[2] * 0.9],
    uMieG: 0.6 + 0.25 * (a.H2O / tot),
    uSurfaceMode: type, uSurfColA: type === 1 ? '#b8cbe0' : mix(base, '#ffffff', 0.3), uSurfColB: type === 1 ? '#27405e' : mix(base, '#000000', 0.5),
    uSunColor: star.sunColor, uSunIntensity: stripped ? star.sunIntensity * 0.85 : star.sunIntensity,
    uNightAmbient: 0.004, uViewSteps: 80, uLightSteps: 10, uLightDir: lightDir(112, 6), uSeed: planetSeed(p),
    uRingInner: 1.35, uRingOuter: 2.3, uRingColor: d.Tsurf < 150 ? '#bcd0dc' : '#cbb188', uRingOpacity: type === 1 ? 0.85 : 0.0,
  };
}

// ---- SURFACE shader uniforms (continuous colours + per-planet seed) ----
export function surfaceUniforms(p, d) {
  const star = STARS[p.star] || STARS.G;
  const stripped = d.retention === 'stripped';
  const a = p.atmosphere, tot = Math.max(1, sum(a));
  const type = bodyType(p, d);
  let colA, colB, colC, colD, colE, sea, cloudAmt, storm = 0, band = 8, warp = 0.5, rimS = 0.6;

  if (type === 1) {                       // gas giant
    const b = colormap(d.Tsurf);
    colA = mix(b, '#000000', 0.4); colB = mix(b, '#ffffff', 0.3); colC = mix(b, '#ffffff', 0.5); colD = mix(b, '#ffffff', 0.7); colE = '#d9683a';
    sea = 1; cloudAmt = 0; storm = 0.7; band = 12 + Math.min(10, 24 / Math.max(1, p.rotation) * 6); warp = 0.6; rimS = 0.5;
  } else if (type === 2) {                // ice giant
    const b = mix(colormap(d.Tsurf), '#3f93a6', 0.5);
    colA = mix(b, '#000000', 0.4); colB = b; colC = mix(b, '#ffffff', 0.4); colD = mix(b, '#ffffff', 0.7); colE = '#ffffff';
    sea = 0.6; cloudAmt = 0.2; storm = 0.4; band = 9; warp = 0.4; rimS = 0.6;
  } else {                                // terrestrial / rocky
    const base = surfaceBase(d.Tsurf, p.water, stripped);
    colA = mix(base, '#06121f', 0.5);
    colB = mix(base, '#000000', 0.15);
    colC = stripped ? mix(base, '#000000', 0.1) : (p.star === 'M' ? '#5a2e2e' : (p.star === 'A' || p.star === 'F') ? '#5a4a7a' : mix(base, '#3f7a45', 0.5));
    colD = mix(base, '#9c8a54', 0.4); colE = stripped ? '#bdbdbd' : '#eef6ff';
    sea = stripped ? 1.0 : Math.max(0.2, 0.78 - (p.water / 100) * 0.5);
    cloudAmt = stripped ? 0 : Math.min(0.75, p.water / 100 * 0.4 + a.H2O / tot * 1.5);
    rimS = stripped ? 0.15 : 0.6;
  }
  return {
    uSunColor: star.sunColor, uAmbient: 0.05, uNightAmbient: stripped ? 0.01 : 0.02, uSurfaceType: type,
    uColA: colA, uColB: colB, uColC: colC, uColD: colD, uColE: colE, uCloudCol: '#eef4ff',
    uAtmoCol: rimColor(p, stripped), uSeaLevel: sea, uCloudAmount: cloudAmt, uCloudSharp: 0.55,
    uBandFreq: band, uWarp: warp, uStorm: storm, uBumpStrength: 1.2, uRimStrength: rimS, uRAtmo: 1.05,
    uLightDir: lightDir(112, 6), uSeed: planetSeed(p),
    uRingInner: 1.35, uRingOuter: 2.3, uRingColor: d.Tsurf < 150 ? '#bcd0dc' : '#cbb188', uRingOpacity: type === 1 ? 0.85 : 0.0,
  };
}

// ---- CUTAWAY shader uniforms (continuous core size + colours) ----
export function cutawayUniforms(p, d) {
  const star = STARS[p.star] || STARS.G;
  const stripped = d.retention === 'stripped';
  const density = p.mass / Math.pow(p.radius, 3);
  const coreFrac = Math.max(0.30, Math.min(0.62, 0.40 + (density - 1) * 0.07));
  const type = bodyType(p, d);                 // match the other two views
  const base = surfaceBase(d.Tsurf, p.water, stripped);

  // layer materials by body type (interior is a schematic, recoloured to fit)
  let crustA, crustB, mantleA, mantleB, coreCol, innerCore, surfA, surfB, crustBase;
  if (type === 1) {                            // gas giant: clouds → metallic hydrogen → hot core
    const b = colormap(d.Tsurf);
    surfA = mix(b, '#ffffff', 0.35); surfB = mix(b, '#000000', 0.35);
    crustA = '#d8c4a0'; crustB = '#a98a64'; mantleA = '#34507a'; mantleB = '#6f8fc0';
    coreCol = '#ff7a3a'; innerCore = '#ffe1a0'; crustBase = 0.78;
  } else if (type === 2) {                     // ice giant: icy shell → water/ammonia mantle
    const b = mix(colormap(d.Tsurf), '#3f93a6', 0.5);
    surfA = mix(b, '#ffffff', 0.35); surfB = mix(b, '#000000', 0.35);
    crustA = '#9fc6cf'; crustB = '#cfe9ef'; mantleA = '#2a6f86'; mantleB = '#4f9fb0';
    coreCol = '#c25a3a'; innerCore = '#ffd9a0'; crustBase = 0.80;
  } else {                                     // terrestrial / rocky
    surfA = mix(base, '#ffffff', 0.25); surfB = mix(base, '#000000', 0.5);
    crustA = '#5a4a3a'; crustB = '#8a7256'; mantleA = '#7a3a22'; mantleB = '#b25a2e';
    coreCol = '#ff6a2a'; innerCore = '#ffe1a0'; crustBase = 0.86;
  }
  return {
    uRAtmo: 1.06, uRSurface: 1.0, uRCrustBase: crustBase, uRMantleBase: coreFrac, uRInnerCore: coreFrac * 0.5,
    uCrustA: crustA, uCrustB: crustB, uMantleA: mantleA, uMantleB: mantleB,
    uCoreCol: coreCol, uInnerCoreCol: innerCore, uSurfA: surfA, uSurfB: surfB,
    uAtmoCol: rimColor(p, stripped), uCoreEmissive: 1.0 + Math.min(0.9, (p.mass - 1) * 0.05 + (density - 1) * 0.1),
    uRimStrength: 0.5, uBoundaryGlow: 0.85, uNightAmbient: 0.02, uSunColor: star.sunColor, uAmbient: 0.14,
    uLightDir: lightDir(120, 10), uSeed: planetSeed(p),
  };
}
