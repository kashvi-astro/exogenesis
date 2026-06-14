/*
  main.js — the BEHAVIOUR of your app (what it DOES).
  JavaScript is the "brain": it can react, calculate, and change the page.
  Later, this file will hold all the real physics (gravity, temperature…).
  For Day 1, it does two small things to prove everything is wired together.
*/

// 1) A friendly message in the title bar.
//    "document" means the web page. We find the element with id="status"
//    and change the text inside it.
const statusEl = document.getElementById("status");
statusEl.textContent = "model online · biosphere assessed · field report ready";

// 2) A simple twinkling starfield drawn on the <canvas>.
//    Don't worry about understanding every line yet — we'll revisit it.
//    The big idea: JavaScript can draw and animate things.
const canvas = document.getElementById("stars");
const ctx = canvas.getContext("2d");
let stars = [];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Make a sparse, faint star layer (kept subtle for a serious look)
  stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.0 + 0.15,
    twinkle: Math.random() * 0.02 + 0.005,
    phase: Math.random() * Math.PI * 2,
  }));
}
window.addEventListener("resize", resize);
resize();

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const s of stars) {
    s.phase += s.twinkle;
    ctx.globalAlpha = 0.22 + Math.sin(s.phase) * 0.18; // faint fade in and out
    ctx.fillStyle = "#aebfdd";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(draw); // run again on the next frame = animation
}
draw();

// This message appears in the browser's "Console" (a place for developers).
// We'll use it a lot for checking our work later.
console.log("Day 1 complete — welcome to your project, Kashvi! 🚀");


/* =====================================================================
   DAY 2 — READING THE PLANET CONTROLS
   ---------------------------------------------------------------------
   Below we read every slider and the dropdown, and update the screen
   whenever the user changes something. No physics yet — just listening.
   ===================================================================== */

// A tiny helper so we don't keep typing document.getElementById(...)
const get = (id) => document.getElementById(id);

// Friendly names for each star letter (used in the live preview)
const STAR_NAMES = {
  M: "M — Red dwarf",
  K: "K — Orange dwarf",
  G: "G — Sun-like",
  F: "F — Yellow-white",
  A: "A — White",
};

// readInputs() gathers the current value of every control into one object.
// This single object is what Day 3's physics will use.
function readInputs() {
  return {
    star: get("star").value,                       // a letter like "G"
    mass: parseFloat(get("mass").value),           // parseFloat = text → number
    radius: parseFloat(get("radius").value),
    distance: parseFloat(get("dist").value),
    rotation: parseFloat(get("rotation").value),
    water: parseFloat(get("water").value),
    atmosphere: {
      N2:  parseFloat(get("gasN2").value),
      O2:  parseFloat(get("gasO2").value),
      CO2: parseFloat(get("gasCO2").value),
      CH4: parseFloat(get("gasCH4").value),
      H2:  parseFloat(get("gasH2").value),
      H2O: parseFloat(get("gasH2O").value),
    },
  };
}

// updateUI() refreshes everything on screen to match the controls.
function updateUI() {
  const p = readInputs();

  // 1) Update the little number shown next to each slider
  get("massVal").textContent = p.mass.toFixed(1);
  get("radiusVal").textContent = p.radius.toFixed(1);
  get("distVal").textContent = p.distance.toFixed(2);
  get("rotationVal").textContent = p.rotation;
  get("waterVal").textContent = p.water;
  get("gasN2Val").textContent = p.atmosphere.N2;
  get("gasO2Val").textContent = p.atmosphere.O2;
  get("gasCO2Val").textContent = p.atmosphere.CO2;
  get("gasCH4Val").textContent = p.atmosphere.CH4;
  get("gasH2Val").textContent = p.atmosphere.H2;
  get("gasH2OVal").textContent = p.atmosphere.H2O;

  // 2) Add up the gases and show the total (green if ~100%, amber if not)
  const total =
    p.atmosphere.N2 + p.atmosphere.O2 + p.atmosphere.CO2 +
    p.atmosphere.CH4 + p.atmosphere.H2 + p.atmosphere.H2O;
  get("atmoTotal").textContent = total;
  const box = get("atmoTotalBox");
  if (total === 100) {
    box.classList.add("ok"); box.classList.remove("warn");
  } else {
    box.classList.add("warn"); box.classList.remove("ok");
  }

  // 3) Run the PHYSICS ENGINE on these inputs and show the results
  renderPhysics(p);

  // 4) Paint each slider's accent "fill" up to its current value
  paintSliders();
}

// Bond albedo (reflectivity). Earth ≈ 0.30. Fixed for now and stated openly
// as a model assumption; we may make it respond to clouds/ice later.
const ALBEDO = 0.30;
const REF_MASS = 60; // kg — a relatable person, for the "weight" readout

// Turns a 0–100 score into a plain-language verdict + a colour class.
function habVerdict(score) {
  if (score >= 75) return { word: "Potentially habitable", cls: "ok" };
  if (score >= 50) return { word: "Marginally habitable", cls: "warn" };
  if (score >= 25) return { word: "Hostile", cls: "bad" };
  return { word: "Uninhabitable", cls: "bad" };
}

// Which palette colour each gas uses (matches the design-system tokens)
const GAS_TOKEN = {
  N2: "--gas-n2", O2: "--gas-o2", CO2: "--gas-co2",
  CH4: "--gas-ch4", H2: "--gas-h2", H2O: "--gas-h2o",
};

// Builds the planet "data card" under the 3D planet (design-system style).
function renderPlanetCard(p, d) {
  // A catalogue-style designation derived from the inputs
  const designation = "EBG-" + p.star + Math.round(p.mass * 10) + "-" + Math.round(p.radius * 10);

  // One coloured dot per gas that's actually present
  const dots = Object.keys(p.atmosphere)
    .filter((g) => p.atmosphere[g] > 0)
    .map((g) => `<i class="pc-dot" style="--d:var(${GAS_TOKEN[g]})" title="${g} ${p.atmosphere[g]}%"></i>`)
    .join("");

  get("planetCard").innerHTML = `
    <div class="pc-head">
      <span class="pc-name">${designation}</span>
      <span class="pc-tag">auto-generated</span>
    </div>
    <div class="pc-stats">
      <div><span class="pc-k">Radius</span><span class="pc-v">${p.radius.toFixed(1)} R⊕</span></div>
      <div><span class="pc-k">Mass</span><span class="pc-v">${p.mass.toFixed(1)} M⊕</span></div>
      <div><span class="pc-k">Surface T</span><span class="pc-v">${Math.round(d.Tsurf)} K</span></div>
      <div><span class="pc-k">Gravity</span><span class="pc-v">${d.gravity.toFixed(2)} g</span></div>
    </div>
    <div class="pc-atmo">
      <span class="pc-k">Atmosphere</span>
      <span class="pc-dots">${dots || '<span class="pc-none">none</span>'}</span>
    </div>`;
}

// Shows the closest real exoplanet to the user's world (from NASA data).
function renderAnalog(p) {
  const r = nearestExoplanet({ radius: p.radius, mass: p.mass, distance: p.distance, star: p.star });
  const e = r.planet;
  get("analogCard").innerHTML = `
    <div class="ac-head">
      <span class="ac-label">Closest known analog</span>
      <span class="ac-sim">${r.similarity}% match</span>
    </div>
    <div class="ac-name">${e.name}</div>
    <div class="ac-stats">${e.radius} R⊕ · ${e.mass} M⊕ · ${e.distance} AU · ${e.star}-type</div>
    <div class="ac-note">Matched on size, mass, orbit &amp; star — not atmosphere (real exoplanets' atmospheres are mostly unmeasured). From ${r.count} NASA-catalogued worlds.</div>`;
}

// renderPhysics() calls the equations in physics.js and builds the readout.
function renderPhysics(p) {
  const g     = surfaceGravity(p.mass, p.radius);
  const esc   = escapeVelocity(p.mass, p.radius);
  const rad   = radiationIndex(p.star, p.distance);
  const ret   = atmosphereRetention(esc, rad);     // Cosmic Shoreline result
  const Teq   = equilibriumTemp(p.star, p.distance, ALBEDO);
  const dT    = greenhouseWarming(p.atmosphere);
  const Tsurf = Teq + dT;

  // Colour the retention word: green/amber/red
  const retClass = ret.state === "retained" ? "ok"
                 : ret.state === "marginal" ? "warn" : "bad";

  // The headline: blend everything into a 0–100 habitability index
  const score = habitabilityScore({
    Tsurf: Tsurf, water: p.water, gravity: g, radiation: rad, retention: ret.state,
  });
  const v = habVerdict(score);
  get("habitability").innerHTML = `
    <div class="score-card">
      <div class="score-ring" style="--p:${score}; --col:var(--${v.cls})">
        <div class="score-inner">
          <div class="score-num">${score}</div>
          <div class="score-max">/ 100</div>
        </div>
      </div>
      <div class="score-text">
        <div class="score-verdict ${v.cls}">${v.word}</div>
        <div class="score-desc">Habitability index</div>
        <span class="tier est">estimate</span>
      </div>
    </div>`;

  // Grouped logically: structure → air → temperature → water
  const metrics = [
    {
      label: "Surface gravity", tier: "solid",
      value: g.toFixed(2), unit: "g",
      sub: (g * 9.81).toFixed(1) + " m/s² · a " + REF_MASS + " kg person → " +
           Math.round(REF_MASS * g) + " kgf",
    },
    {
      label: "Escape velocity", tier: "solid",
      value: esc.toFixed(1), unit: "km/s",
      sub: "Earth = 11.2 km/s · higher = holds onto gas better",
    },
    {
      label: "Radiation level", tier: "est",
      value: rad.toFixed(1), unit: "× Earth",
      sub: radiationLevel(rad) + " · XUV / flare proxy from star + distance",
    },
    {
      label: "Atmosphere retention", tier: "est",
      value: ret.state, unit: "", vclass: retClass,
      sub: "Cosmic Shoreline · gravity vs radiation (ratio " + ret.ratio.toFixed(2) + ")",
    },
    {
      label: "Equilibrium temperature", tier: "solid",
      value: Math.round(Teq), unit: "K",
      sub: Math.round(kelvinToCelsius(Teq)) + " °C · bare-rock value, before greenhouse",
    },
    {
      label: "Surface temperature (est.)", tier: "est",
      value: Math.round(Tsurf), unit: "K",
      sub: Math.round(kelvinToCelsius(Tsurf)) + " °C · includes +" + Math.round(dT) + " K greenhouse",
    },
    {
      label: "Liquid water", tier: "est",
      value: waterState(Tsurf), unit: "",
      sub: "based on surface temperature at ~1 atm",
    },
  ];

  get("metrics").innerHTML = metrics.map((m) => `
    <div class="metric">
      <div class="m-label">${m.label}<span class="tier ${m.tier}">${m.tier === "solid" ? "rigorous" : "estimate"}</span></div>
      <div class="m-value${m.vclass ? " " + m.vclass : ""}">${m.value}${m.unit ? ' <span class="m-unit">' + m.unit + "</span>" : ""}</div>
      <div class="m-sub">${m.sub}</div>
    </div>`).join("");

  // Update the 3D planet from these same conditions
  updatePlanet3D({
    Tsurf: Tsurf, water: p.water, atmosphere: p.atmosphere,
    retention: ret.state, star: p.star, rotation: p.rotation,
  });

  // Update the planet data card (design-system component)
  renderPlanetCard(p, { gravity: g, Tsurf: Tsurf });

  // Find & show the closest real exoplanet (NASA data)
  renderAnalog(p);

  // Run the rules engine (physics → biology) and show its findings
  const bio = generateBiosphere({
    Tsurf: Tsurf, water: p.water, atmosphere: p.atmosphere, retention: ret.state,
    star: p.star, rotation: p.rotation, gravity: g, radiation: rad, score: score,
  });
  renderBiosphere(bio);

  // Remember everything the field report needs, and refresh it if it's open
  latestState = {
    p: p,
    d: { gravity: g, Tsurf: Tsurf, Teq: Teq, retention: ret.state,
         radiation: rad, score: score, verdict: v.word, esc: esc },
    bio: bio,
  };
  if (reportShown) get("fieldReport").innerHTML =
    buildFieldReport(latestState.p, latestState.d, latestState.bio);
}

// Holds the most recent computed state so the report button can use it.
let latestState = null;
let reportShown = false;

// Draws the rules engine's output into the Biosphere Assessment panel.
function renderBiosphere(bio) {
  const lvlClass = bio.level === "promising" ? "ok"
                 : bio.level === "limited" ? "warn" : "bad";

  get("bioSummary").innerHTML =
    `<span class="bio-level ${lvlClass}">${bio.level}</span> ${bio.summary}`;

  get("bioFindings").innerHTML = bio.findings.map((f) => `
    <div class="bio-finding">
      <div class="bio-cat">${f.cat}</div>
      <div class="bio-concl">${f.conclusion}</div>
      <div class="bio-reason">${f.reason}</div>
    </div>`).join("");

  // Draw the procedural food-chain visual
  renderEcosystem(bio.ecosystem);
}

// Gives sliders an instrument look: filled accent up to the knob, dim after.
function paintSliders() {
  document.querySelectorAll('input[type="range"]').forEach((el) => {
    const min = parseFloat(el.min), max = parseFloat(el.max);
    const pct = ((parseFloat(el.value) - min) / (max - min)) * 100;
    el.style.background =
      "linear-gradient(90deg, var(--accent) 0%, var(--accent) " + pct +
      "%, rgba(125,150,200,0.18) " + pct + "%, rgba(125,150,200,0.18) 100%)";
  });
}

// Listen for changes on EVERY control. "input" fires while you drag/type.
const controlIds = [
  "star", "mass", "radius", "dist", "rotation", "water",
  "gasN2", "gasO2", "gasCO2", "gasCH4", "gasH2", "gasH2O",
];
controlIds.forEach((id) => get(id).addEventListener("input", updateUI));

// The "Generate field report" button. Once generated, it stays in sync as
// you tweak the planet (the future AI version will re-run only on click).
get("reportBtn").addEventListener("click", () => {
  if (!latestState) return;
  reportShown = true;
  get("reportBtn").textContent = "Regenerate field report";
  get("fieldReport").innerHTML =
    buildFieldReport(latestState.p, latestState.d, latestState.bio);
  get("fieldReport").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

// NOTE: AI organism illustrations (via Hugging Face) need a server-side proxy
// to keep the token safe and get past browser security (CORS), so they're
// deferred until the project is deployed. The procedural food chain above is
// the working visual until then. images.js stays ready to plug into the
// serverless function at deploy time.

// Start the 3D planet engine, then run once so the screen matches the defaults.
initPlanet3D();
updateUI();
