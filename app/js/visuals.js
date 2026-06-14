/*
  visuals.js — PROCEDURAL BIOSPHERE VISUALS  👾
  --------------------------------------------------------------------
  Draws the food chain as little creature silhouettes, built with SVG
  (Scalable Vector Graphics — shapes described by code). Each glyph
  changes with the physics: body shape from gravity, colour from the
  star/energy source. It's our own generative art — honest and free.
*/

// Build one creature glyph (an SVG string) from a food-chain node.
function creatureGlyph(node) {
  const col = node.color;

  // PRODUCERS that photosynthesise → a little plant (stem + fronds)
  if (node.kind === "plant") {
    return `
      <svg viewBox="0 0 60 60" width="58" height="58" aria-hidden="true">
        <line x1="30" y1="56" x2="30" y2="24" stroke="${col}" stroke-width="3"/>
        <path d="M30 32 Q17 24 13 32" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M30 27 Q43 19 47 27" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M30 23 Q24 12 31 7"  stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <ellipse cx="30" cy="57" rx="11" ry="2.5" fill="${col}" opacity="0.35"/>
      </svg>`;
  }

  // MICROBES (chemosynthesisers, decomposers) → a cluster of cells
  if (node.kind === "microbe") {
    const cells = [[24,28,7],[36,26,6],[30,38,8],[40,39,5],[22,40,4]];
    return `
      <svg viewBox="0 0 60 60" width="58" height="58" aria-hidden="true">
        ${cells.map(c => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="${col}" opacity="0.85"/>`).join("")}
      </svg>`;
  }

  // ANIMALS → a body + legs whose proportions come from gravity
  let rx, ry, legLen, bodyY;
  if (node.aspect === "squat")        { rx = 16; ry = 9;  legLen = 8;  bodyY = 30; } // high gravity
  else if (node.aspect === "upright") { rx = 8;  ry = 16; legLen = 16; bodyY = 24; } // low gravity
  else                                { rx = 13; ry = 12; legLen = 11; bodyY = 28; } // Earth-like
  const legY = bodyY + ry;
  const legs = [-0.6, -0.2, 0.2, 0.6].map((o) =>
    `<line x1="${30 + rx * o}" y1="${legY - 2}" x2="${30 + rx * o}" y2="${legY - 2 + legLen}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>`
  ).join("");
  return `
    <svg viewBox="0 0 60 60" width="58" height="58" aria-hidden="true">
      <ellipse cx="30" cy="${bodyY}" rx="${rx}" ry="${ry}" fill="${col}"/>
      <circle cx="${30 + rx * 0.7}" cy="${bodyY - ry * 0.4}" r="3.6" fill="${col}"/>
      ${legs}
    </svg>`;
}

// Render the whole food chain (nodes joined by arrows) into #ecosystem.
function renderEcosystem(eco) {
  const el = document.getElementById("ecosystem");
  if (!eco || !eco.chain || eco.chain.length === 0) { el.innerHTML = ""; return; }

  const parts = [];
  eco.chain.forEach((node, i) => {
    if (i > 0) parts.push('<div class="eco-arrow">→</div>');
    parts.push(`
      <div class="eco-node">
        <div class="eco-glyph">${creatureGlyph(node)}</div>
        <div class="eco-name">${node.label}</div>
        <div class="eco-role">${node.role}</div>
      </div>`);
  });
  el.innerHTML = parts.join("");
}
