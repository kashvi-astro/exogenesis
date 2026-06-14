/*
  report.js — honest written field report (ES module).
  Composed from the physics + rules; possibility-framed; designation-named.
  Swappable for a Claude API call later (same function signature).
*/
export function buildFieldReport(p, d, bio) {
  const designation = 'EBG-' + p.star + Math.round(p.mass * 10) + '-' + Math.round(p.radius * 10);
  const TsurfC = Math.round(d.Tsurf - 273.15);

  const sizeWord = p.radius < 0.8 ? 'small, compact' : p.radius <= 1.25 ? 'Earth-sized'
    : p.radius <= 2 ? 'super-Earth-sized' : 'large';
  const starWord = { M: 'a cool red dwarf', K: 'an orange dwarf', G: 'a Sun-like star',
    F: 'a hot yellow-white star', A: 'a hot white star' }[p.star] || 'its star';

  let domGas = 'N2', domVal = -1;
  for (const g in p.atmosphere) if (p.atmosphere[g] > domVal) { domVal = p.atmosphere[g]; domGas = g; }
  const gasName = { N2: 'nitrogen', O2: 'oxygen', CO2: 'carbon dioxide', CH4: 'methane',
    H2: 'hydrogen', H2O: 'water vapour' }[domGas];

  const atmoPhrase = d.retention === 'stripped' ? 'Stripped of its atmosphere by stellar radiation, it is a bare, airless rock'
    : d.retention === 'marginal' ? `It clings to a thin, mostly ${gasName} atmosphere`
    : `It holds a ${gasName}-dominated atmosphere`;
  const waterPhrase = d.Tsurf < 273 ? 'any water is locked away as ice'
    : d.Tsurf > 373 ? 'any water exists only as vapour'
    : p.water > 0 ? 'liquid water is possible on its surface' : 'it is largely dry';

  const para1 = `${designation} is a ${sizeWord} world of ${p.mass.toFixed(1)} Earth masses, ` +
    `orbiting ${starWord} at ${p.distance.toFixed(2)} AU. Its surface gravity is ${d.gravity.toFixed(2)} g ` +
    `and its surface sits near ${TsurfC} °C. ${atmoPhrase}, and ${waterPhrase}.`;
  const para2 = `Overall habitability is assessed at ${d.score} / 100 — ${d.verdict.word.toLowerCase()}. ${bio.summary}`;

  const bits = bio.findings.map((f) => f.conclusion.charAt(0).toLowerCase() + f.conclusion.slice(1));
  let para3;
  if (bio.level === 'hostile') {
    para3 = `If life exists here at all, it could only be sparse and highly specialised. The conditions point toward ${bits.slice(0, 2).join(', and ')}.`;
  } else {
    const chain = bio.ecosystem.chain.map((n) => n.label.toLowerCase());
    para3 = `Given these conditions, the world could support life characterised by ${bits.slice(0, 3).join('; ')}. ` +
      (chain.length > 1 ? `A simple food chain could run from ${chain.join(' → ')}.`
        : `Any ecosystem would likely be limited to ${chain[0]}.`);
  }

  return { designation, paragraphs: [para1, para2, para3],
    disclaimer: 'Speculative — inferred from physical conditions, not an observation.' };
}
