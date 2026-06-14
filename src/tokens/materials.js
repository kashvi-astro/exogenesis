/*
  materials.js — THE TOKEN SPINE.
  Scientific material tokens: each atmosphere/star carries physical params,
  not just a colour. One source of truth feeding BOTH the UI and the live
  shader. inputsToEngine() maps user inputs + computed physics → shader uniforms.
*/

// Atmosphere archetypes (scattering/absorption coefficients in 1/planet-radius).
// Colours fall out of the physics (methane absorbs red → teal, etc.).
export const ATMOSPHERES = {
  thin:       { label: 'Thin', atmoHeight: 0.035, Hr: 0.012, Hm: 0.010,
                betaR: [4.0, 2.6, 1.6], betaRScale: 1.6, betaM: [2.0, 1.8, 1.5], betaMScale: 1.2,
                mieG: 0.70, betaA: [0, 0, 0], betaAScale: 0, surfaceMode: 0, swatch: '#9fb8c4' },
  n2o2:       { label: 'Nitrogen–Oxygen', atmoHeight: 0.05, Hr: 0.020, Hm: 0.014,
                betaR: [5.5, 12.0, 24.0], betaRScale: 0.62, betaM: [3.0, 3.0, 3.2], betaMScale: 0.5,
                mieG: 0.70, betaA: [0, 0, 0], betaAScale: 0, surfaceMode: 0, swatch: '#6fa8e0' },
  h2he:       { label: 'H₂/He', atmoHeight: 0.12, Hr: 0.040, Hm: 0.028,
                betaR: [5.8, 13.5, 33.1], betaRScale: 0.55, betaM: [4.0, 4.0, 4.0], betaMScale: 0.5,
                mieG: 0.76, betaA: [0, 0, 0], betaAScale: 0, surfaceMode: 1, swatch: '#5a9bd4' },
  watervapor: { label: 'Water vapour', atmoHeight: 0.10, Hr: 0.034, Hm: 0.030,
                betaR: [4.5, 12.0, 22.0], betaRScale: 0.7, betaM: [8.0, 9.0, 9.5], betaMScale: 0.9,
                mieG: 0.62, betaA: [0, 0, 0], betaAScale: 0, surfaceMode: 2, swatch: '#5bbcd6' },
  co2:        { label: 'CO₂', atmoHeight: 0.055, Hr: 0.018, Hm: 0.014,
                betaR: [9.0, 7.0, 4.5], betaRScale: 1.1, betaM: [11.0, 9.0, 6.5], betaMScale: 1.3,
                mieG: 0.72, betaA: [0, 0, 0], betaAScale: 0, surfaceMode: 0, swatch: '#46b59a' },
  methane:    { label: 'Methane', atmoHeight: 0.11, Hr: 0.038, Hm: 0.030,
                betaR: [3.5, 9.5, 9.0], betaRScale: 0.8, betaM: [3.0, 4.5, 4.5], betaMScale: 0.6,
                mieG: 0.70, betaA: [8.0, 1.6, 0.2], betaAScale: 0.8, surfaceMode: 2, swatch: '#d18a4e' },
  exotic:     { label: 'Exotic haze', atmoHeight: 0.13, Hr: 0.045, Hm: 0.050,
                betaR: [7.0, 2.5, 9.5], betaRScale: 0.7, betaM: [9.5, 3.5, 11.0], betaMScale: 0.9,
                mieG: 0.84, betaA: [0.6, 7.5, 0.4], betaAScale: 0.9, surfaceMode: 2, swatch: '#a96fd0' },
};

// Star light tokens (tint + base brightness)
export const STARS = {
  M: { sunColor: '#ffd3b0', sunIntensity: 13 },
  K: { sunColor: '#ffe7c4', sunIntensity: 14 },
  G: { sunColor: '#fff4ea', sunIntensity: 16 },
  F: { sunColor: '#eef2ff', sunIntensity: 18 },
  A: { sunColor: '#dde7ff', sunIntensity: 20 },
};

// Per-gas display colours (UI swatches/dots)
export const GAS_COLORS = {
  N2: '#6f8fb0', O2: '#5fb0d0', CO2: '#46b59a', CH4: '#d18a4e', H2: '#7f9ad4', H2O: '#5bbcd6',
};

// Pick the atmosphere archetype that best matches the composition + state.
export function selectArchetype(inputs, physics) {
  if (physics.retention === 'stripped') return 'thin';
  const a = inputs.atmosphere;
  if (a.H2 >= 40) return 'h2he';
  if (a.CH4 >= 15 && a.CO2 >= 10) return 'exotic';
  if (a.CH4 >= 15) return 'methane';
  if (a.CO2 >= 40) return 'co2';
  if (a.H2O >= 30) return 'watervapor';
  if (a.O2 >= 8 || a.N2 >= 45) return 'n2o2';
  return 'thin';
}

// Surface colours from temperature (and water for temperate worlds).
function tempColors(Tsurf, water, stripped) {
  if (stripped && Tsurf < 700) return ['#c9c9c9', '#343434'];
  if (Tsurf >= 700) return ['#ffcaa0', '#5e1100'];
  if (Tsurf >= 400) return ['#caa06a', '#3a1a0e'];
  if (Tsurf >= 320) return ['#d8b98c', '#6b4a2a'];
  if (Tsurf >= 273) return water >= 25 ? ['#cfeaff', '#143f63'] : ['#d8c6a6', '#4e3a22'];
  if (Tsurf >= 235) return ['#dcebf5', '#56789a'];
  return ['#f0f7ff', '#9fb3c8'];
}

// Atmospheric rim colour per archetype (for the surface & cutaway shaders)
const RIM = { thin: '#9fb8c4', n2o2: '#8ab8ff', h2he: '#7fb0ff', watervapor: '#bfe0ff',
              co2: '#e8d6a0', methane: '#5fd6c0', exotic: '#cf8ad0' };

function lightDir(azDeg, elDeg) {
  const az = azDeg * Math.PI / 180, el = elDeg * Math.PI / 180;
  return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
}

// ---- ATMOSPHERE shader uniforms (single-scattering archetypes) ----
export function atmosphereUniforms(p, d) {
  const key = selectArchetype(p, d);
  const atm = ATMOSPHERES[key];
  const star = STARS[p.star] || STARS.G;
  const stripped = d.retention === 'stripped';
  let A, B;
  if (key === 'h2he') { A = '#27405e'; B = '#b8cbe0'; }
  else { [A, B] = tempColors(d.Tsurf, p.water, stripped); }
  const s = (arr, k) => arr.map((v) => v * k);
  return {
    uAtmoHeight: stripped ? 0.012 : atm.atmoHeight, uHr: atm.Hr, uHm: atm.Hm,
    uBetaR: s(atm.betaR, atm.betaRScale), uBetaM: s(atm.betaM, atm.betaMScale), uBetaA: s(atm.betaA, atm.betaAScale),
    uMieG: atm.mieG, uSurfaceMode: atm.surfaceMode, uSurfColA: A, uSurfColB: B,
    uSunColor: star.sunColor, uSunIntensity: stripped ? star.sunIntensity * 0.85 : star.sunIntensity,
    uNightAmbient: 0.004, uViewSteps: 80, uLightSteps: 10, uLightDir: lightDir(112, 6),
  };
}

// ---- SURFACE shader uniforms (continents/oceans/clouds, bands, storms) ----
export function surfaceUniforms(p, d) {
  const star = STARS[p.star] || STARS.G;
  const stripped = d.retention === 'stripped';
  const a = p.atmosphere;
  const key = selectArchetype(p, d);
  const atmoCol = stripped ? '#20303a' : (RIM[key] || '#8ab8ff');

  let type, colA, colB, colC, colD, colE, sea = 0.5, cloudAmt = 0, storm = 0, band = 8, warp = 0.5, rim = 0.6;
  const cloudCol = '#eef4ff';

  if (key === 'h2he' || (p.radius > 2.2 && p.mass > 15)) {
    type = 1; // gas giant — turbulent bands + red storm
    colA = '#3a4f74'; colB = '#9fb6d6'; colC = '#c8d6ea'; colD = '#e7eef8'; colE = '#d9683a';
    band = 16; warp = 0.6; storm = 1.0; rim = 0.5;
  } else if (key === 'methane' || key === 'watervapor' || d.Tsurf < 240) {
    type = 2; // ice giant — soft teal banding, white storm
    colA = '#1b4f5e'; colB = '#3f93a6'; colC = '#7fc3cf'; colD = '#cfeef2'; colE = '#ffffff';
    band = 10; warp = 0.4; storm = 0.5; rim = 0.6;
  } else {
    type = 0; // terrestrial
    const veg = p.star === 'M' ? '#5a2e2e' : (p.star === 'A' || p.star === 'F') ? '#5a4a7a' : '#3f7a45';
    if (d.Tsurf >= 320) { colA = '#6b4a2a'; colB = '#caa06a'; colC = '#caa06a'; colD = '#8a5a32'; colE = '#e6d7c0'; sea = 0.95; cloudAmt = 0.12; }
    else if (d.Tsurf < 255) { colA = '#2a4a66'; colB = '#6f96b8'; colC = '#cfe0ef'; colD = '#e8f2fb'; colE = '#ffffff'; sea = 0.55; cloudAmt = 0.2; }
    else { colA = '#0e2f4e'; colB = '#2f6fae'; colC = veg; colD = '#9c8a54'; colE = '#eef6ff'; sea = 0.62 - (p.water / 100) * 0.32; cloudAmt = Math.min(0.7, p.water / 100 * 0.45 + a.H2O / 100 * 1.2); }
  }
  if (stripped) { type = 0; colA = '#3a3a3a'; colB = '#6e6e6e'; colC = '#7c7c7c'; colD = '#9a9a9a'; colE = '#bdbdbd'; sea = 1.0; cloudAmt = 0; rim = 0.15; }

  return {
    uSunColor: star.sunColor, uAmbient: 0.05, uNightAmbient: stripped ? 0.01 : 0.02,
    uSurfaceType: type, uYaw: 0.0, uCloudYaw: 0.6,
    uColA: colA, uColB: colB, uColC: colC, uColD: colD, uColE: colE,
    uCloudCol: cloudCol, uAtmoCol: atmoCol, uSeaLevel: sea, uCloudAmount: cloudAmt, uCloudSharp: 0.55,
    uBandFreq: band, uWarp: warp, uStorm: storm, uBumpStrength: 1.2, uRimStrength: rim, uRAtmo: 1.05,
    uLightDir: lightDir(112, 6),
  };
}

// ---- CUTAWAY shader uniforms (sliced anatomy: crust/mantle/core) ----
export function cutawayUniforms(p, d) {
  const star = STARS[p.star] || STARS.G;
  const stripped = d.retention === 'stripped';
  const key = selectArchetype(p, d);
  const density = p.mass / Math.pow(p.radius, 3);            // Earth = 1
  const coreFrac = Math.max(0.32, Math.min(0.6, 0.42 + (density - 1) * 0.06)); // denser → bigger core
  const [surfA, surfB] = tempColors(d.Tsurf, p.water, stripped);
  return {
    uRAtmo: 1.06, uRSurface: 1.0, uRCrustBase: 0.86, uRMantleBase: coreFrac, uRInnerCore: coreFrac * 0.5,
    uCrustA: '#5a4a3a', uCrustB: '#8a7256', uMantleA: '#7a3a22', uMantleB: '#b25a2e',
    uCoreCol: '#ff6a2a', uInnerCoreCol: '#ffe1a0', uSurfA: surfA, uSurfB: surfB,
    uAtmoCol: stripped ? '#20303a' : (RIM[key] || '#8ab8ff'),
    uCoreEmissive: 1.0 + Math.min(0.8, (p.mass - 1) * 0.05), uRimStrength: 0.5, uBoundaryGlow: 0.85,
    uNightAmbient: 0.02, uSunColor: star.sunColor, uAmbient: 0.14, uLightDir: lightDir(120, 10),
  };
}
