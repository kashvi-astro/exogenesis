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

// Map inputs + physics → a full shader uniform set the planet engine consumes.
export function inputsToEngine(inputs, physics) {
  const key = selectArchetype(inputs, physics);
  const atm = ATMOSPHERES[key];
  const star = STARS[inputs.star] || STARS.G;
  const stripped = physics.retention === 'stripped';

  // gas giants keep their banded archetype palette; rocky/ice worlds tint by temp
  let surfA, surfB;
  if (key === 'h2he') { surfA = '#27405e'; surfB = '#b8cbe0'; }
  else { [surfA, surfB] = tempColors(physics.Tsurf, inputs.water, stripped); }

  const scale = (arr, s) => arr.map((v) => v * s);
  return {
    archetypeKey: key,
    atmoHeight: stripped ? 0.012 : atm.atmoHeight,
    Hr: atm.Hr, Hm: atm.Hm,
    betaR: scale(atm.betaR, atm.betaRScale),
    betaM: scale(atm.betaM, atm.betaMScale),
    betaA: scale(atm.betaA, atm.betaAScale),
    mieG: atm.mieG,
    surfaceMode: atm.surfaceMode,
    surfColA: surfA, surfColB: surfB,
    sunColor: star.sunColor,
    sunIntensity: stripped ? star.sunIntensity * 0.85 : star.sunIntensity,
    nightAmbient: 0.004,
    sunAzimuth: 112, sunElevation: 6,
  };
}
