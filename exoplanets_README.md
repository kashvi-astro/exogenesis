# Exoplanet Dataset

**Source:** NASA Exoplanet Archive — Planetary Systems Composite Parameters (`pscomppars`)
via the official TAP API (same data as the website you linked).
**Downloaded:** 2026-06-12 · **Planets:** 6,298 confirmed exoplanets (one row each).

The website's "PS" table stores several rows per planet (one per published study).
This file uses the **Composite Parameters** table instead, which merges those into a
single best-value row per planet — much easier to work with for a project.

## Columns

| Column | Meaning | Units |
|---|---|---|
| `pl_name` | Planet name | — |
| `hostname` | Host star name | — |
| `sy_snum` | Number of stars in the system | count |
| `sy_pnum` | Number of planets in the system | count |
| `discoverymethod` | How it was found (Transit, Radial Velocity, etc.) | — |
| `disc_year` | Year of discovery | — |
| `disc_facility` | Telescope / observatory | — |
| `pl_orbper` | Orbital period | days |
| `pl_orbsmax` | Semi-major axis (orbit size) | AU |
| `pl_rade` | Planet radius | Earth radii |
| `pl_bmasse` | Planet mass (best estimate) | Earth masses |
| `pl_dens` | Planet density | g/cm³ |
| `pl_eqt` | Equilibrium temperature | Kelvin |
| `pl_insol` | Insolation flux (starlight received) | Earth = 1 |
| `pl_orbeccen` | Orbital eccentricity (0 = circular) | — |
| `st_spectype` | Star spectral type | — |
| `st_teff` | Star surface temperature | Kelvin |
| `st_rad` | Star radius | Solar radii |
| `st_mass` | Star mass | Solar masses |
| `st_lum` | Star luminosity (log) | log(Solar) |
| `sy_dist` | Distance from Earth | parsecs |
| `ra` | Right ascension (sky position) | degrees |
| `dec` | Declination (sky position) | degrees |

**Note:** Blank cells mean that value has not been measured for that planet.
`pl_eqt`, `pl_insol`, and `st_lum` are especially useful for working out whether a
planet sits in its star's habitable zone.
