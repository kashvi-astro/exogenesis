/*
  physics.js — THE PHYSICS ENGINE  🧮
  --------------------------------------------------------------------
  These are PURE FUNCTIONS: you give them numbers, they return numbers.
  There is NO page/HTML code in here on purpose — keeping the science
  separate makes it easy to read, check, and even reuse.

  All planet sizes are in "Earth units":
    mass   in M⊕  (Earth masses)   → Earth = 1
    radius in R⊕  (Earth radii)    → Earth = 1
  Temperatures are in Kelvin (K).  0 °C = 273.15 K.
*/

// Representative brightness (luminosity) of each star type, relative to our Sun.
// Real stars vary a lot; these are sensible textbook values for the model.
const STAR_LUMINOSITY = { M: 0.02, K: 0.3, G: 1.0, F: 3.5, A: 20 };

// A few reference constants
const EARTH_ESCAPE = 11.186; // km/s — Earth's escape velocity
const T_CONST = 278.5;       // K — equilibrium-temp constant (at 1 AU, L=1, A=0)


// 1) SURFACE GRAVITY (in Earth g's).   g = Mass ÷ Radius²
//    More mass pulls harder; a bigger radius puts you farther from the
//    centre, which weakens gravity at the surface.
function surfaceGravity(massE, radiusE) {
  return massE / (radiusE * radiusE);
}

// 2) ESCAPE VELOCITY (km/s).   v = 11.186 × √(Mass ÷ Radius)
//    The speed needed to break free of the planet. A high value means
//    the planet grips its atmosphere tightly (we'll use this on Day 4).
function escapeVelocity(massE, radiusE) {
  return EARTH_ESCAPE * Math.sqrt(massE / radiusE);
}

// 3) EQUILIBRIUM TEMPERATURE (K) — the rigorous, textbook value.
//    T = 278.5 × L^(1/4) × distance^(−1/2) × (1 − albedo)^(1/4)
//    It balances the starlight a planet absorbs against the heat it
//    radiates back to space. (albedo = how reflective the planet is, 0–1.)
function equilibriumTemp(starType, distanceAU, albedo) {
  const L = STAR_LUMINOSITY[starType] ?? 1;
  return T_CONST * Math.pow(L, 0.25) * Math.pow(distanceAU, -0.5) * Math.pow(1 - albedo, 0.25);
}

// 4) GREENHOUSE WARMING (K) — a SIMPLIFIED estimate (clearly labelled).
//    Greenhouse gases (CO₂, CH₄, H₂O) trap heat, warming the surface
//    above the equilibrium value. We weight each gas by roughly how
//    strongly it traps heat, then use a curve that levels off so a
//    very thick atmosphere doesn't give a silly, infinite temperature.
function greenhouseWarming(atmo) {
  const potency = atmo.CO2 * 2.0 + atmo.CH4 * 3.0 + atmo.H2O * 2.5; // weighted %
  return 500 * (1 - Math.exp(-potency / 40)); // saturating curve, max ~500 K
}


// ---- Small helpers ----

// Kelvin → Celsius
function kelvinToCelsius(k) {
  return k - 273.15;
}

// Rough state of water at a given temperature (at ~1 atm pressure)
function waterState(tempK) {
  if (tempK < 273) return "frozen";
  if (tempK <= 373) return "liquid possible";
  return "vapour";
}


// Stellar high-energy activity (XUV light + flares) relative to the Sun.
// Red dwarfs (M) flare fiercely; hot stars (A, F) pour out UV; the Sun ≈ 1.
const STAR_ACTIVITY = { M: 8, K: 2, G: 1, F: 2, A: 4 };

// 5) RADIATION INDEX (Earth = 1) — a PROXY for the high-energy radiation
//    hitting the planet. It combines ordinary flux (brightness ÷ distance²)
//    with how flare-active the star is. Bigger = harsher environment.
function radiationIndex(starType, distanceAU) {
  const L = STAR_LUMINOSITY[starType] ?? 1;
  const activity = STAR_ACTIVITY[starType] ?? 1;
  const flux = L / (distanceAU * distanceAU); // relative to Earth's sunlight
  return flux * activity;
}

// A plain-word label for a radiation index
function radiationLevel(index) {
  if (index < 1.5) return "low";
  if (index < 6)   return "moderate";
  if (index < 25)  return "high";
  return "extreme";
}

// 6) ATMOSPHERE RETENTION — the "Cosmic Shoreline".
//    A planet keeps its air if its gravity (escape velocity) wins against
//    the radiation trying to strip it away. The shoreline rises very
//    steeply with escape velocity (~v⁴), so small, blasted worlds lose
//    their atmospheres while big or sheltered ones keep them.
//    Returns a ratio (<1 = safe, >1 = stripped) and a word for the state.
function atmosphereRetention(escapeKmS, radIndex) {
  const vRatio = escapeKmS / EARTH_ESCAPE;       // escape velocity vs Earth
  const threshold = 5 * Math.pow(vRatio, 4);     // the shoreline, Earth-normalised
  const ratio = radIndex / threshold;            // how far past the line we are
  let state;
  if (ratio < 0.8)      state = "retained";
  else if (ratio < 1.5) state = "marginal";
  else                  state = "stripped";
  return { ratio, state };
}

// 7) HABITABILITY INDEX (0–100) — an ESTIMATE that blends everything.
//    Each factor scores 0..1 for "how Earth-friendly is this?":
//      • temperature — best near 288 K (Earth's average); a bell curve
//      • water       — more surface water helps, up to a point
//      • gravity     — best near 1 g; very high/low is harsh
//      • radiation   — less is better
//    We average those, THEN multiply by an atmosphere factor: a world that
//    can't keep its air can't be habitable as we know it, whatever else
//    is true. So a stripped atmosphere caps the score near the floor.
function habitabilityScore(d) {
  const tempScore  = Math.exp(-Math.pow((d.Tsurf - 288) / 40, 2));
  const waterScore = Math.min(1, d.water / 60);
  const gravScore  = Math.exp(-Math.pow((d.gravity - 1) / 1.5, 2));
  const radScore   = Math.exp(-d.radiation / 8);

  const base = 0.4 * tempScore + 0.2 * waterScore + 0.2 * gravScore + 0.2 * radScore;

  const retFactor = d.retention === "retained" ? 1.0
                  : d.retention === "marginal" ? 0.6 : 0.15;

  return Math.round(base * retFactor * 100);
}
