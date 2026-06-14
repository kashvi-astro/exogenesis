// Distills the full NASA Exoplanet Archive CSV into a compact dataset:
// { name, radius (R⊕), mass (M⊕), distance (AU), star (M/K/G/F/A) }.
// Run: node tools/build-exoplanets.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('exoplanets.csv', 'utf8').split(/\r?\n/).filter(Boolean);
const header = parseLine(raw[0]);
const col = (name) => header.indexOf(name);
const iName = col('pl_name'), iRad = col('pl_rade'), iMass = col('pl_bmasse');
const iDist = col('pl_orbsmax'), iTeff = col('st_teff'), iSpec = col('st_spectype');

// Quote-aware CSV line parser (fields may contain commas inside quotes)
function parseLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') q = !q;
    else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function starClass(teff, spec) {
  const t = parseFloat(teff);
  if (!Number.isNaN(t) && t > 0) {
    if (t < 3900) return 'M';
    if (t < 5300) return 'K';
    if (t < 6000) return 'G';
    if (t < 7300) return 'F';
    return 'A';
  }
  const s = (spec || '').trim().toUpperCase()[0];
  return 'OBAFGKM'.includes(s) ? (s === 'O' || s === 'B' ? 'A' : s) : 'G';
}

const rows = [];
const seen = new Set();
for (let r = 1; r < raw.length; r++) {
  const f = parseLine(raw[r]);
  const name = f[iName];
  const radius = parseFloat(f[iRad]);
  const mass = parseFloat(f[iMass]);
  const distance = parseFloat(f[iDist]);
  if (!name || seen.has(name)) continue;
  if (!(radius > 0) || !(mass > 0) || !(distance > 0)) continue;
  seen.add(name);
  rows.push({
    name,
    radius: +radius.toFixed(2),
    mass: +mass.toFixed(2),
    distance: +distance.toFixed(4),
    star: starClass(f[iTeff], f[iSpec]),
  });
}

writeFileSync('src/science/exoplanets.json', JSON.stringify(rows));
console.log(`wrote ${rows.length} exoplanets to src/science/exoplanets.json`);
