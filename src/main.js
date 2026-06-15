import './style.css';
import { initPlanet } from './planet.js';
import { computePhysics, kelvinToCelsius, radiationLevel, waterState } from './science/physics.js';
import { generateBiosphere } from './science/rules.js';
import { buildFieldReport } from './science/report.js';
import { nearestExoplanet } from './science/analog.js';
import { atmosphereUniforms, surfaceUniforms, cutawayUniforms } from './tokens/materials.js';

const $ = (id) => document.getElementById(id);
const GAS_TOKEN = { N2: '--gas-n2', O2: '--gas-o2', CO2: '--gas-co2', CH4: '--gas-ch4', H2: '--gas-h2', H2O: '--gas-h2o' };
const STAR_NAMES = { M: 'M — Red dwarf', K: 'K — Orange dwarf', G: 'G — Sun-like', F: 'F — Yellow-white', A: 'A — White' };

const planet = initPlanet($('scene'));
$('status').textContent = 'engine online · real-time render';

let currentView = 'surface';
const VIEW_UNIFORMS = { surface: surfaceUniforms, atmosphere: atmosphereUniforms, cutaway: cutawayUniforms };
let latest = null, reportShown = false;

function readInputs() {
  return {
    star: $('star').value,
    mass: parseFloat($('mass').value), radius: parseFloat($('radius').value),
    distance: parseFloat($('dist').value), rotation: parseFloat($('rotation').value),
    water: parseFloat($('water').value),
    atmosphere: {
      N2: +$('gasN2').value, O2: +$('gasO2').value, CO2: +$('gasCO2').value,
      CH4: +$('gasCH4').value, H2: +$('gasH2').value, H2O: +$('gasH2O').value,
    },
  };
}

function paintSliders() {
  document.querySelectorAll('input[type="range"]').forEach((el) => {
    const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.background = `linear-gradient(90deg, var(--cyan) ${pct}%, rgba(120,150,200,0.18) ${pct}%)`;
  });
}

// --- food-chain creature glyphs (SVG, physics-driven) ---
function glyph(node) {
  const c = node.color;
  if (node.kind === 'plant') return `<svg viewBox="0 0 60 60" width="52" height="52"><line x1="30" y1="56" x2="30" y2="24" stroke="${c}" stroke-width="3"/><path d="M30 32 Q17 24 13 32" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M30 27 Q43 19 47 27" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M30 23 Q24 12 31 7" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  if (node.kind === 'microbe') { const cells = [[24,28,7],[36,26,6],[30,38,8],[40,39,5],[22,40,4]]; return `<svg viewBox="0 0 60 60" width="52" height="52">${cells.map((k) => `<circle cx="${k[0]}" cy="${k[1]}" r="${k[2]}" fill="${c}" opacity="0.85"/>`).join('')}</svg>`; }
  let rx, ry, leg, by;
  if (node.aspect === 'squat') { rx = 16; ry = 9; leg = 8; by = 30; }
  else if (node.aspect === 'upright') { rx = 8; ry = 16; leg = 16; by = 24; }
  else { rx = 13; ry = 12; leg = 11; by = 28; }
  const legs = [-0.6, -0.2, 0.2, 0.6].map((o) => `<line x1="${30 + rx * o}" y1="${by + ry - 2}" x2="${30 + rx * o}" y2="${by + ry - 2 + leg}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`).join('');
  return `<svg viewBox="0 0 60 60" width="52" height="52"><ellipse cx="30" cy="${by}" rx="${rx}" ry="${ry}" fill="${c}"/><circle cx="${30 + rx * 0.7}" cy="${by - ry * 0.4}" r="3.6" fill="${c}"/>${legs}</svg>`;
}

// Short honest descriptor under the globe (e.g. "temperate ocean · nitrogen atmosphere")
function captionFor(p, d) {
  const T = d.Tsurf, stripped = d.retention === 'stripped';
  let tw;
  if (stripped && T < 700) tw = T < 273 ? 'frozen rock' : 'bare rock';
  else if (T >= 700) tw = 'molten';
  else if (T >= 400) tw = 'scorched rock';
  else if (T >= 320) tw = 'hot desert';
  else if (T >= 273) tw = p.water >= 25 ? 'temperate ocean' : 'temperate rock';
  else if (T >= 235) tw = 'cold';
  else tw = 'frozen';
  let aw = 'no atmosphere';
  if (!stripped) {
    let dom = 'N2', mv = -1;
    for (const g in p.atmosphere) if (p.atmosphere[g] > mv) { mv = p.atmosphere[g]; dom = g; }
    aw = { N2: 'nitrogen atmosphere', O2: 'oxygen-rich air', CO2: 'CO₂ atmosphere',
           CH4: 'methane haze', H2: 'hydrogen envelope', H2O: 'steam atmosphere' }[dom];
  }
  return tw + ' · ' + aw;
}

function update() {
  const p = readInputs();

  // slider labels
  $('massV').textContent = p.mass.toFixed(1); $('radiusV').textContent = p.radius.toFixed(1);
  $('distV').textContent = p.distance.toFixed(2); $('rotationV').textContent = p.rotation;
  $('waterV').textContent = p.water;
  for (const g of ['N2', 'O2', 'CO2', 'CH4', 'H2', 'H2O']) $(`gas${g}V`).textContent = p.atmosphere[g];
  const total = Object.values(p.atmosphere).reduce((a, b) => a + b, 0);
  $('atmoTotal').textContent = total;
  $('atmoTotalBox').className = 'atmo-total ' + (total === 100 ? 'ok' : 'warn');

  // science
  const d = computePhysics(p);
  const bio = generateBiosphere({ ...p, ...d });
  const analog = nearestExoplanet(p);

  // drive the planet from material tokens, for the current view
  planet.apply(currentView, VIEW_UNIFORMS[currentView](p, d));
  planet.setSpin(Math.min(0.6, Math.max(0.02, 0.12 * 24 / p.rotation))); // rotation period → spin
  $('planetCap').textContent = captionFor(p, d);

  // planet data card
  const designation = 'EBG-' + p.star + Math.round(p.mass * 10) + '-' + Math.round(p.radius * 10);
  const dots = Object.keys(p.atmosphere).filter((g) => p.atmosphere[g] > 0)
    .map((g) => `<i class="pcdot" style="--d:var(${GAS_TOKEN[g]})"></i>`).join('');
  $('planetCard').innerHTML = `<div class="pc-head"><span class="pc-name">${designation}</span><span class="pc-tag">auto-generated</span></div>
    <div class="pc-stats"><div><span class="k">Radius</span><span class="vv">${p.radius.toFixed(1)} R⊕</span></div>
    <div><span class="k">Mass</span><span class="vv">${p.mass.toFixed(1)} M⊕</span></div>
    <div><span class="k">Surface T</span><span class="vv">${Math.round(d.Tsurf)} K</span></div>
    <div><span class="k">Gravity</span><span class="vv">${d.gravity.toFixed(2)} g</span></div></div>
    <div class="pc-atmo"><span class="k">Atmosphere</span><span class="pc-dots">${dots || '<span class="none">none</span>'}</span></div>`;

  // habitability gauge
  const v = d.verdict;
  $('habitability').innerHTML = `<div class="score-card"><div class="score-ring" style="--p:${d.score}; --col:var(--${v.cls})"><div class="score-inner"><div class="score-num">${d.score}</div><div class="score-max">/100</div></div></div>
    <div class="score-text"><div class="score-verdict ${v.cls}">${v.word}</div><div class="score-desc">Habitability index · estimate</div></div></div>`;

  // metrics
  const retCls = d.retention === 'retained' ? 'ok' : d.retention === 'marginal' ? 'warn' : 'bad';
  const metrics = [
    ['Surface gravity', 'rigorous', d.gravity.toFixed(2) + ' g', (d.gravity * 9.81).toFixed(1) + ' m/s²', ''],
    ['Escape velocity', 'rigorous', d.escapeVelocity.toFixed(1) + ' km/s', 'Earth = 11.2', ''],
    ['Radiation', 'estimate', d.radiation.toFixed(1) + ' ×⊕', radiationLevel(d.radiation), ''],
    ['Atmosphere', 'estimate', d.retention, 'cosmic shoreline', retCls],
    ['Equilibrium T', 'rigorous', Math.round(d.Teq) + ' K', Math.round(kelvinToCelsius(d.Teq)) + ' °C', ''],
    ['Surface T', 'estimate', Math.round(d.Tsurf) + ' K', '+' + Math.round(d.greenhouse) + ' K greenhouse', ''],
    ['Liquid water', 'estimate', waterState(d.Tsurf), 'at ~1 atm pressure', ''],
  ];
  $('metrics').innerHTML = metrics.map((m) => `<div class="metric"><div class="m-label">${m[0]}<span class="tier ${m[1]}">${m[1]}</span></div><div class="m-value ${m[4]}">${m[2]}</div><div class="m-sub">${m[3]}</div></div>`).join('');

  // nearest analog
  const e = analog.planet;
  $('analogCard').innerHTML = `<div class="ac-head"><span class="ac-label">Closest known analog</span><span class="ac-sim">${analog.similarity}% match</span></div>
    <div class="ac-name">${e.name}</div><div class="ac-stats">${e.radius} R⊕ · ${e.mass} M⊕ · ${e.distance} AU · ${e.star}-type</div>
    <div class="ac-note">Matched on size, mass, orbit &amp; star across ${analog.count.toLocaleString()} NASA worlds — not atmosphere.</div>`;

  // biosphere
  const lvl = bio.level === 'promising' ? 'ok' : bio.level === 'limited' ? 'warn' : 'bad';
  $('bioSummary').innerHTML = `<span class="bio-level ${lvl}">${bio.level}</span> ${bio.summary}`;
  $('bioFindings').innerHTML = bio.findings.map((f) => `<div class="bio-finding"><div class="bio-cat">${f.cat}</div><div class="bio-concl">${f.conclusion}</div><div class="bio-reason">${f.reason}</div></div>`).join('');
  $('ecosystem').innerHTML = bio.ecosystem.chain.map((n, i) => (i ? '<span class="eco-arrow">→</span>' : '') + `<div class="eco-node"><div class="eco-glyph">${glyph(n)}</div><div class="eco-name">${n.label}</div><div class="eco-role">${n.role}</div></div>`).join('');

  latest = { p, d, bio };
  if (reportShown) renderReport();
  paintSliders();
}

function renderReport() {
  const r = buildFieldReport(latest.p, latest.d, latest.bio);
  $('fieldReport').innerHTML = `<div class="fr-head"><span class="fr-name">${r.designation}</span><span class="fr-tag">field report · draft</span></div>` +
    r.paragraphs.map((t) => `<p>${t}</p>`).join('') + `<p class="fr-disc">${r.disclaimer}</p>`;
}

['star', 'mass', 'radius', 'dist', 'rotation', 'water', 'gasN2', 'gasO2', 'gasCO2', 'gasCH4', 'gasH2', 'gasH2O']
  .forEach((id) => $(id).addEventListener('input', update));

$('reportBtn').addEventListener('click', () => {
  reportShown = true;
  $('reportBtn').textContent = 'Regenerate field report';
  renderReport();
});

// view switcher: Surface · Atmosphere · Cutaway
document.querySelectorAll('.view-toggle button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.view-toggle button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  currentView = b.dataset.view;
  update();
}));

// full-screen toggle for the planet view
$('fsBtn').addEventListener('click', () => {
  const el = $('planetFs');
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (!fsEl) (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
});

update();
