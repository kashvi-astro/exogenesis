/*
  exoplanets.js — REAL EXOPLANET DATASET + NEAREST-ANALOG MATCH  🛰️
  --------------------------------------------------------------------
  Data courtesy of the NASA Exoplanet Archive, operated by Caltech/IPAC
  under contract with NASA. Pulled from the 'pscomppars' table.
  Each entry: name, radius (R⊕), mass (M⊕), orbital distance (AU),
  and star type derived from the star's temperature.

  HONESTY: real exoplanets mostly have only size/mass/orbit/star measured,
  NOT atmospheric composition. So the match below is on those PHYSICAL
  properties only -- never on atmosphere.
*/

const EXOPLANETS = [
  { name: "GJ 674 b", radius: 3.33, mass: 11.09, distance: 0.039, star: "M" },
  { name: "GJ 876 b", radius: 13.3, mass: 723.22, distance: 0.2083, star: "M" },
  { name: "GJ 876 d", radius: 2.51, mass: 6.83, distance: 0.0208, star: "M" },
  { name: "GJ 876 e", radius: 3.92, mass: 14.6, distance: 0.3343, star: "M" },
  { name: "GJ 179 b", radius: 13.8, mass: 301.94, distance: 2.41, star: "M" },
  { name: "HIP 79431 b", radius: 13.4, mass: 667.41, distance: 0.36, star: "M" },
  { name: "HD 21749 c", radius: 0.89, mass: 3.7, distance: 0.0695, star: "K" },
  { name: "HN Peg b", radius: 11.78, mass: 6991.57, distance: 773.0, star: "F" },
  { name: "HD 90156 b", radius: 4.43, mass: 17.98, distance: 0.25, star: "G" },
  { name: "HD 19994 b", radius: 13.6, mass: 435.41, distance: 1.305, star: "F" },
  { name: "HD 16417 b", radius: 5.0, mass: 22.1, distance: 0.14, star: "G" },
  { name: "HD 134987 c", radius: 13.9, mass: 260.0, distance: 5.8, star: "G" },
  { name: "HD 22781 b", radius: 12.3, mass: 4338.2, distance: 1.167, star: "K" },
  { name: "HD 45652 b", radius: 14.3, mass: 137.62, distance: 0.237, star: "K" },
  { name: "HD 47186 c", radius: 13.0, mass: 111.42, distance: 2.395, star: "G" },
  { name: "HD 18599 b", radius: 2.6, mass: 24.1, distance: 0.048, star: "K" },
  { name: "gam1 Leo b", radius: 12.5, mass: 2790.43, distance: 1.19, star: "K" },
  { name: "HD 168746 b", radius: 11.1, mass: 85.81, distance: 0.07, star: "G" },
  { name: "HD 86226 c", radius: 2.16, mass: 7.25, distance: 0.049, star: "G" },
  { name: "HD 86226 b", radius: 14.3, mass: 143.02, distance: 2.73, star: "G" },
  { name: "HD 37605 b", radius: 13.2, mass: 854.96, distance: 0.277, star: "G" },
  { name: "HD 37605 c", radius: 13.1, mass: 1013.88, distance: 3.74, star: "G" },
  { name: "HD 45350 b", radius: 13.5, mass: 568.89, distance: 1.92, star: "G" },
  { name: "HD 79498 b", radius: 13.6, mass: 425.89, distance: 2.98, star: "G" },
  { name: "HD 107148 b", radius: 9.6, mass: 66.74, distance: 0.269, star: "G" },
  { name: "HD 9446 b", radius: 14.0, mass: 222.47, distance: 0.189, star: "G" },
  { name: "HIP 14810 c", radius: 13.6, mass: 416.36, distance: 0.549, star: "G" },
  { name: "HIP 14810 b", radius: 13.0, mass: 1239.54, distance: 0.0696, star: "G" },
  { name: "TOI-2406 b", radius: 2.86, mass: 15.6, distance: 0.0227, star: "M" },
  { name: "HD 8535 b", radius: 14.0, mass: 216.12, distance: 2.45, star: "F" },
  { name: "HD 156411 b", radius: 14.0, mass: 235.18, distance: 1.88, star: "G" },
  { name: "HD 148156 b", radius: 13.9, mass: 270.14, distance: 2.45, star: "F" },
  { name: "HD 177830 c", radius: 7.87, mass: 47.67, distance: 0.5137, star: "K" },
  { name: "24 Sex c", radius: 13.9, mass: 273.32, distance: 2.08, star: "K" },
  { name: "HD 148164 b", radius: 13.7, mass: 390.93, distance: 0.993, star: "F" },
  { name: "HD 148164 c", radius: 12.8, mass: 1640.0, distance: 6.15, star: "F" },
  { name: "HD 55696 b", radius: 12.9, mass: 1357.13, distance: 3.18, star: "F" },
  { name: "HD 1605 c", radius: 13.0, mass: 1150.54, distance: 3.584, star: "K" },
  { name: "HD 33283 b", radius: 12.5, mass: 104.57, distance: 0.1508, star: "G" },
  { name: "HD 205739 b", radius: 13.6, mass: 435.41, distance: 0.896, star: "F" },
  { name: "HD 224693 b", radius: 14.0, mass: 222.48, distance: 0.191, star: "G" },
  { name: "HD 110014 b", radius: 12.4, mass: 3524.59, distance: 2.14, star: "K" },
  { name: "HD 132563 b", radius: 13.6, mass: 473.55, distance: 2.62, star: "F" },
  { name: "Kepler-560 b", radius: 1.72, mass: 3.61, distance: 0.0899, star: "M" },
  { name: "K2-62 c", radius: 1.99, mass: 4.62, distance: 0.1148, star: "K" },
  { name: "2MASS J04414489+2301513 b", radius: 12.6, mass: 2383.6, distance: 15.0, star: "M" },
  { name: "TOI-2374 b", radius: 7.49, mass: 61.66, distance: 0.0482, star: "K" },
  { name: "GQ Lup b", radius: 33.6, mass: 6356.0, distance: 100.0, star: "K" },
  { name: "WASP-23 b", radius: 10.78, mass: 280.95, distance: 0.0376, star: "K" },
  { name: "K2-10 b", radius: 3.77, mass: 25.2, distance: 0.137, star: "G" },
  { name: "HD 240210 b", radius: 12.8, mass: 1655.82, distance: 1.16, star: "K" },
  { name: "Kepler-45 b", radius: 10.76, mass: 160.5, distance: 0.03, star: "M" },
  { name: "Kepler-221 d", radius: 2.73, mass: 3.61, distance: 0.087, star: "K" },
  { name: "Kepler-128 b", radius: 1.42, mass: 3.79, distance: 0.1255, star: "F" },
  { name: "Kepler-152 c", radius: 2.39, mass: 6.3, distance: 0.356, star: "K" },
  { name: "Kepler-1581 b", radius: 0.8, mass: 0.44, distance: 0.0687, star: "F" },
  { name: "Kepler-1458 b", radius: 2.76, mass: 8.05, distance: 0.2487, star: "G" },
  { name: "Kepler-626 b", radius: 2.29, mass: 5.86, distance: 0.1091, star: "G" },
  { name: "Kepler-595 c", radius: 1.01, mass: 3.3, distance: 0.0983, star: "K" },
  { name: "Kepler-595 b", radius: 3.71, mass: 17.4, distance: 0.1582, star: "K" },
  { name: "CoRoT-11 b", radius: 16.03, mass: 740.51, distance: 0.0436, star: "F" },
  { name: "Kepler-571 b", radius: 2.64, mass: 7.46, distance: 0.0546, star: "G" },
  { name: "Kepler-1101 b", radius: 2.47, mass: 6.66, distance: 0.3483, star: "G" },
  { name: "Kepler-263 c", radius: 2.47, mass: 6.66, distance: 0.242, star: "K" },
  { name: "CoRoT-18 b", radius: 14.68, mass: 1102.82, distance: 0.0295, star: "G" },
  { name: "CoRoT-3 b", radius: 11.32, mass: 6883.91, distance: 0.0578, star: "F" },
  { name: "Lupus-TR-3 b", radius: 9.98, mass: 257.43, distance: 0.0464, star: "K" },
  { name: "Kepler-280 c", radius: 2.01, mass: 4.7, distance: 0.056, star: "G" },
  { name: "Kepler-1549 b", radius: 2.57, mass: 7.13, distance: 0.6687, star: "G" },
  { name: "Kepler-1245 b", radius: 1.44, mass: 2.67, distance: 0.0484, star: "G" },
  { name: "Kepler-1288 b", radius: 1.12, mass: 1.46, distance: 0.0413, star: "F" },
  { name: "Kepler-1167 b", radius: 1.71, mass: 3.57, distance: 0.0175, star: "K" },
  { name: "Kepler-1208 b", radius: 2.32, mass: 5.99, distance: 0.0901, star: "K" },
  { name: "Kepler-272 c", radius: 1.79, mass: 97.8, distance: 0.061, star: "K" },
  { name: "Kepler-150 d", radius: 2.79, mass: 8.2, distance: 0.104, star: "G" },
  { name: "Kepler-150 e", radius: 3.12, mass: 9.91, distance: 0.189, star: "G" },
  { name: "Kepler-498 b", radius: 3.03, mass: 9.43, distance: 0.0897, star: "G" },
  { name: "Kepler-1752 b", radius: 4.54, mass: 18.7, distance: 0.2698, star: "G" },
  { name: "Kepler-1600 c", radius: 1.94, mass: 4.43, distance: 0.0696, star: "K" },
  { name: "Kepler-1740 b", radius: 3.32, mass: 11.0, distance: 0.0779, star: "G" },
  { name: "OGLE-TR-111 b", radius: 11.42, mass: 174.8, distance: 0.0473, star: "K" },
  { name: "CoRoT-17 b", radius: 11.43, mass: 772.29, distance: 0.0461, star: "G" },
  { name: "Kepler-1149 b", radius: 1.44, mass: 2.67, distance: 0.0473, star: "G" },
  { name: "Kepler-644 b", radius: 3.15, mass: 10.1, distance: 0.0464, star: "F" },
  { name: "Kepler-1068 b", radius: 3.63, mass: 12.8, distance: 0.1304, star: "G" },
  { name: "Kepler-817 b", radius: 9.03, mass: 60.2, distance: 0.0493, star: "G" },
  { name: "OGLE-TR-211 b", radius: 15.24, mass: 327.35, distance: 0.051, star: "F" },
  { name: "BD+20 2457 b", radius: 12.1, mass: 6807.63, distance: 1.45, star: "K" },
  { name: "Kepler-937 b", radius: 3.72, mass: 13.4, distance: 0.3214, star: "F" },
  { name: "Kepler-1506 b", radius: 1.32, mass: 2.3, distance: 0.1168, star: "G" },
];

// Find the real exoplanet most similar to the user's world.
// We compare on a log scale (sizes span huge ranges) plus star type.
function nearestExoplanet(p) {
  const ord = { M: 0, K: 1, G: 2, F: 3, A: 4 };
  const lr = Math.log10(p.radius), lm = Math.log10(p.mass), la = Math.log10(p.distance);
  let best = null, bestD = Infinity;
  for (const e of EXOPLANETS) {
    const dr = Math.log10(e.radius) - lr;
    const dm = Math.log10(e.mass) - lm;
    const da = Math.log10(e.distance) - la;
    const ds = (ord[e.star] - ord[p.star]) / 4;
    const d = dr*dr + dm*dm + 1.2*da*da + 0.8*ds*ds;
    if (d < bestD) { bestD = d; best = e; }
  }
  return { planet: best, similarity: Math.round(100 * Math.exp(-bestD)), count: EXOPLANETS.length };
}
