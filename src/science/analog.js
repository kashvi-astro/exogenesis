/*
  analog.js — nearest real exoplanet (ES module).
  Matches on MEASURED physical properties (size, mass, orbit, star) over the
  full NASA Exoplanet Archive set — NOT atmosphere (real atmospheres are
  mostly unmeasured). Honest by construction.
*/
import EXOPLANETS from './exoplanets.json';

const ORD = { M: 0, K: 1, G: 2, F: 3, A: 4 };

export function nearestExoplanet(p) {
  const lr = Math.log10(p.radius), lm = Math.log10(p.mass), la = Math.log10(p.distance);
  let best = null, bestD = Infinity;
  for (const e of EXOPLANETS) {
    const dr = Math.log10(e.radius) - lr;
    const dm = Math.log10(e.mass) - lm;
    const da = Math.log10(e.distance) - la;
    const ds = (ORD[e.star] - ORD[p.star]) / 4;
    const d = dr * dr + dm * dm + 1.2 * da * da + 0.8 * ds * ds;
    if (d < bestD) { bestD = d; best = e; }
  }
  return { planet: best, similarity: Math.round(100 * Math.exp(-bestD)), count: EXOPLANETS.length };
}
