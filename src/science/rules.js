/*
  rules.js — physics → biology reasoning (ES module).
  Every conclusion is a POSSIBILITY, never a claim that life exists.
  Returns { level, summary, findings[], ecosystem }.
*/
export function generateBiosphere(c) {
  const a = c.atmosphere;
  const hasAtm = c.retention !== 'stripped';
  const liquid = hasAtm && c.Tsurf >= 273 && c.Tsurf <= 373 && c.water > 0;
  const oxygenRich = a.O2 >= 10;
  const reducing = (a.CH4 + a.H2) >= 20 && a.O2 < 5;
  const tooHot = c.Tsurf > 373;
  const tooCold = c.Tsurf < 245;
  const temperate = c.Tsurf >= 255 && c.Tsurf <= 330;
  const highRad = c.radiation >= 6;
  const highG = c.gravity > 1.5;
  const lowG = c.gravity < 0.5;
  const tidalLock = c.star === 'M' && c.rotation >= 500;

  const findings = [];

  if (!hasAtm || tooHot) {
    findings.push({ cat: 'Energy source', conclusion: 'Chemosynthesis, not photosynthesis',
      reason: 'With no stable atmosphere or a scorching surface, sunlight-based life is unlikely; energy would more plausibly come from chemical reactions, such as those near geothermal vents.' });
  } else if (oxygenRich && liquid && temperate) {
    findings.push({ cat: 'Energy source', conclusion: 'Oxygen-based photosynthesis is plausible',
      reason: "Free oxygen together with liquid water and mild temperatures mirrors the conditions that let Earth's plants and algae thrive." });
  } else if (reducing) {
    findings.push({ cat: 'Energy source', conclusion: 'Anoxygenic or chemosynthetic life is more likely',
      reason: 'An oxygen-poor, methane/hydrogen-rich atmosphere favours microbes that neither use nor produce oxygen — much like early-Earth and deep-sea life.' });
  } else {
    findings.push({ cat: 'Energy source', conclusion: 'Limited, simple light-harvesting life may be possible',
      reason: 'Some light and moderate conditions could support basic photosynthesis, though not necessarily the oxygen-producing kind.' });
  }

  if (hasAtm && !tooHot) {
    if (c.star === 'M') {
      findings.push({ cat: 'Light & pigments', conclusion: 'Dark red or black photosynthetic pigments',
        reason: 'A red dwarf emits mostly dim red and infrared light, so surface plants would likely be dark-coloured to absorb it — not green.' });
    } else if (c.star === 'A' || c.star === 'F') {
      findings.push({ cat: 'Light & radiation', conclusion: 'Strong UV defences or shelter would be needed',
        reason: 'Hot stars flood the surface with ultraviolet light, so life would need UV-screening pigments or would shelter underwater or underground.' });
    } else {
      findings.push({ cat: 'Light & pigments', conclusion: 'Green-type photosynthesis is feasible',
        reason: "This star's light is similar to our Sun's, so Earth-like green pigments could capture it efficiently." });
    }
  }

  if (!hasAtm || highRad) {
    findings.push({ cat: 'Likely habitat', conclusion: 'Underground or sheltered refuges',
      reason: 'High radiation or a missing atmosphere would make the open surface lethal, pushing life below ground or beneath ice and water.' });
  } else if (tidalLock) {
    findings.push({ cat: 'Likely habitat', conclusion: "The twilight 'terminator' ring",
      reason: 'A tidally-locked world has a permanent day side and night side, so life would cluster in the mild twilight band between them.' });
  } else if (liquid && c.water >= 50) {
    findings.push({ cat: 'Likely habitat', conclusion: 'Oceans and coastlines',
      reason: 'Abundant liquid water makes aquatic and shoreline environments the most promising places for life.' });
  } else if (liquid) {
    findings.push({ cat: 'Likely habitat', conclusion: 'Land clustered around water',
      reason: 'Patches of liquid water amid land would concentrate life around lakes, rivers and their shores.' });
  } else {
    findings.push({ cat: 'Likely habitat', conclusion: 'Sparse, hardy surface niches',
      reason: 'With little liquid water, any life would be sparse and gathered wherever moisture or warmth collects.' });
  }

  if (highG) {
    findings.push({ cat: 'Likely body plans', conclusion: 'Short, squat, strongly-built forms',
      reason: `Gravity of ${c.gravity.toFixed(1)} g is punishing, favouring low, sturdy bodies with thick limbs over tall ones.` });
  } else if (lowG) {
    findings.push({ cat: 'Likely body plans', conclusion: 'Tall, large, or airborne forms',
      reason: `Weak gravity of ${c.gravity.toFixed(1)} g lets organisms grow tall or large, and makes flight or floating far easier.` });
  } else {
    findings.push({ cat: 'Likely body plans', conclusion: 'An Earth-like range of body forms',
      reason: `Gravity near ${c.gravity.toFixed(1)} g is comparable to Earth's, so a familiar variety of body shapes could work.` });
  }

  if (tooCold && hasAtm) {
    findings.push({ cat: 'Adaptations', conclusion: 'Cold-adapted (psychrophile) life only',
      reason: 'Sub-freezing surface temperatures would restrict life to cold-tolerant microbes — perhaps using biological antifreeze and living beneath ice.' });
  } else if (tooHot) {
    findings.push({ cat: 'Adaptations', conclusion: 'Only heat-loving extremophiles, if anything',
      reason: "Temperatures above water's boiling point would limit life to heat-tolerant chemistry, if life is possible at all." });
  }

  let level, summary;
  if (c.score >= 60 && liquid && hasAtm) {
    level = 'promising';
    summary = 'These conditions could support a genuine biosphere — liquid water, a stable atmosphere and a workable energy source all appear possible.';
  } else if (c.score >= 30 || (hasAtm && (liquid || reducing))) {
    level = 'limited';
    summary = 'Conditions are challenging, but certain hardy life could still find niches here.';
  } else {
    level = 'hostile';
    summary = 'Conditions appear hostile to life as we know it; any biology would be marginal at best, and possibly absent.';
  }

  const aspect = highG ? 'squat' : lowG ? 'upright' : 'balanced';
  let producer;
  const chemoBase = !hasAtm || tooHot || (reducing && !liquid);
  if (chemoBase) {
    producer = { kind: 'microbe', color: '#5fb0a0', label: 'Chemosynthetic microbes', role: 'Producers' };
  } else {
    let pcol = '#3fae6b';
    if (c.star === 'M') pcol = '#b03a3a';
    else if (c.star === 'A' || c.star === 'F') pcol = '#9b6dd0';
    producer = { kind: 'plant', color: pcol, label: 'Photosynthesisers', role: 'Producers' };
  }
  const grazer = { kind: 'animal', aspect, color: '#9c8e6a', label: 'Grazers', role: 'Primary consumers' };
  const predator = { kind: 'animal', aspect, color: '#7a6a55', label: 'Predators', role: 'Apex consumers' };
  const decomposer = { kind: 'microbe', color: '#6a7d8a', label: 'Decomposers', role: 'Recyclers' };

  let chain;
  if (level === 'promising') chain = [producer, grazer, predator, decomposer];
  else if (level === 'limited') chain = [producer, grazer, decomposer];
  else chain = [producer];

  return { level, summary, findings, ecosystem: { chain } };
}
