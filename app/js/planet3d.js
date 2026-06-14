/*
  planet3d.js — REAL-TIME 3D PLANET (Three.js / WebGL)  🪐
  --------------------------------------------------------------------
  This draws a true 3D sphere lit by the star, with a glowing atmospheric
  rim and live rotation — all updated from the physics.

  Three.js does the heavy 3D maths for us. The two tricky bits are:
    • a procedural "rocky" texture we paint onto a hidden canvas, and
    • a small SHADER (GPU code) for the atmospheric rim glow.
  Both are commented so you can explain them.
*/

let p3d = { inited: false, spin: 0.005 };

// Star-light tint (warm red dwarf → cool white A-star)
const STAR_LIGHT_3D = { M: 0xffd3b0, K: 0xffe7c4, G: 0xfff4ea, F: 0xeef2ff, A: 0xdde7ff };

// Atmosphere rim colour by the dominant gas (N₂/O₂ → the cyan in the refs)
const GAS_GLOW_3D = {
  N2: 0x4fd0e0, O2: 0x4fd0e0, CO2: 0xe8d696,
  CH4: 0xe0964a, H2: 0xd2b4d2, H2O: 0xb4c8ff,
};

// ---- Procedural rocky surface: greyscale noise we later TINT by colour ----
function makeSurfaceTexture() {
  const cv = document.createElement("canvas");
  cv.width = 1024; cv.height = 512;
  const x = cv.getContext("2d");
  x.fillStyle = "#bcbcbc";
  x.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 2600; i++) {           // scatter many soft blotches
    const px = Math.random() * 1024, py = Math.random() * 512;
    const r = Math.pow(Math.random(), 2) * 40 + 2;
    const g = Math.floor(120 + Math.random() * 130);
    x.globalAlpha = Math.random() * 0.18 + 0.04;
    x.fillStyle = `rgb(${g},${g},${g})`;
    x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---- Procedural clouds: soft white blobs on a transparent canvas ----
function makeCloudTexture() {
  const cv = document.createElement("canvas");
  cv.width = 1024; cv.height = 512;
  const x = cv.getContext("2d");
  for (let i = 0; i < 240; i++) {
    const px = Math.random() * 1024, py = Math.random() * 512;
    const r = Math.pow(Math.random(), 1.5) * 60 + 10;
    x.globalAlpha = Math.random() * 0.5 + 0.2;
    x.fillStyle = "#ffffff";
    x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function initPlanet3D() {
  const container = document.getElementById("planet3d");
  if (!container || typeof THREE === "undefined") {
    console.warn("Three.js not available — 3D planet skipped.");
    return;
  }
  const w = container.clientWidth || 300, h = container.clientHeight || 300;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.z = 3.0;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // The planet itself: a sphere with our noise as colour + bump (relief)
  const surfaceTex = makeSurfaceTexture();
  const planetMat = new THREE.MeshStandardMaterial({
    map: surfaceTex, bumpMap: surfaceTex, bumpScale: 0.025,
    roughness: 1, metalness: 0,
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), planetMat);
  scene.add(planet);

  // A thin cloud shell just above the surface
  const cloudMat = new THREE.MeshStandardMaterial({
    map: makeCloudTexture(), transparent: true, opacity: 0, depthWrite: false, roughness: 1,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 48, 48), cloudMat);
  scene.add(clouds);

  // The atmospheric rim glow — a slightly bigger sphere with a Fresnel shader.
  // "Fresnel" = edges glow more than the centre (like a real atmosphere limb).
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0x4fd0e0) },
      intensity: { value: 1.4 },
    },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 glowColor; uniform float intensity;
      varying vec3 vNormal; varying vec3 vPos;
      void main() {
        vec3 viewDir = normalize(-vPos);
        float rim = 1.0 - abs(dot(viewDir, vNormal));
        rim = pow(rim, 3.0);
        gl_FragColor = vec4(glowColor, 1.0) * rim * intensity;
      }`,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.16, 64, 64), atmoMat);
  scene.add(atmosphere);

  // The star: a directional light from upper-left for a nice terminator
  const starLight = new THREE.DirectionalLight(0xffffff, 2.2);
  starLight.position.set(3.5, 1.2, 2.0);
  scene.add(starLight);
  scene.add(new THREE.AmbientLight(0x1a2436, 0.35)); // faint fill so night isn't pure black

  // Save references so updatePlanet3D() can change them later
  p3d = {
    inited: true, spin: 0.005,
    scene, camera, renderer, planet, planetMat, clouds, cloudMat, atmoMat, starLight, container,
  };

  // Animation loop: spin a little every frame
  function animate() {
    requestAnimationFrame(animate);
    planet.rotation.y += p3d.spin;
    clouds.rotation.y += p3d.spin * 1.15;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    const nw = container.clientWidth || 300, nh = container.clientHeight || 300;
    camera.aspect = nw / nh; camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });
}

// Update the 3D planet's look from the physics conditions.
function updatePlanet3D(c) {
  if (!p3d.inited) return;
  const T = c.Tsurf;

  // 1) Surface tint + glow-from-heat, by temperature (and water/retention)
  let color = 0x808080, emissive = 0x000000, emInt = 0;
  if (c.retention === "stripped" && T < 700) {
    color = 0x808080;                                  // airless grey rock
  } else if (T >= 700) {
    color = 0xff5a2a; emissive = 0xff2a00; emInt = 0.9; // molten
  } else if (T >= 400) {
    color = 0x9c4a25;                                  // scorched rock
  } else if (T >= 320) {
    color = 0xc28a4e;                                  // hot desert
  } else if (T >= 273) {
    color = c.water >= 25 ? 0x2f6fae : 0x8a6a44;       // ocean vs temperate rock
  } else if (T >= 235) {
    color = 0x9ab6cc;                                  // cold
  } else {
    color = 0xd6e6f2;                                  // frozen
  }
  p3d.planetMat.color.setHex(color);
  p3d.planetMat.emissive.setHex(emissive);
  p3d.planetMat.emissiveIntensity = emInt;

  // 2) Atmosphere rim — colour from dominant gas, off when stripped
  if (c.retention === "stripped") {
    p3d.atmoMat.uniforms.intensity.value = 0;
  } else {
    const dom = dominantGas3D(c.atmosphere);
    p3d.atmoMat.uniforms.glowColor.value.setHex(GAS_GLOW_3D[dom] || 0x4fd0e0);
    p3d.atmoMat.uniforms.intensity.value = c.retention === "marginal" ? 0.7 : 1.4;
  }

  // 3) Clouds — more water vapour / surface water → thicker cloud
  p3d.cloudMat.opacity = c.retention === "stripped" ? 0
    : Math.min(0.85, c.atmosphere.H2O / 100 * 1.8 + c.water / 100 * 0.4);

  // 4) Star light tint
  p3d.starLight.color.setHex(STAR_LIGHT_3D[c.star] || 0xffffff);

  // 5) Rotation speed — shorter day → faster spin
  const durSec = Math.min(120, Math.max(8, c.rotation * 0.6));
  p3d.spin = (2 * Math.PI) / (durSec * 60); // full turn over durSec at ~60fps

  // 6) A short honest caption
  let tempWord;
  if (c.retention === "stripped" && T < 700) tempWord = T < 273 ? "frozen rock" : "bare rock";
  else if (T >= 700) tempWord = "molten";
  else if (T >= 400) tempWord = "scorched rock";
  else if (T >= 320) tempWord = "hot desert";
  else if (T >= 273) tempWord = c.water >= 25 ? "temperate ocean" : "temperate rock";
  else if (T >= 235) tempWord = "cold";
  else tempWord = "frozen";

  let atmoWord = "no atmosphere";
  if (c.retention !== "stripped") {
    const names = { N2: "nitrogen atmosphere", O2: "oxygen-rich air", CO2: "CO₂ atmosphere",
                    CH4: "methane haze", H2: "hydrogen envelope", H2O: "steam atmosphere" };
    atmoWord = (c.retention === "marginal" ? "thin " : "") + (names[dominantGas3D(c.atmosphere)] || "atmosphere");
  }
  const cap = document.getElementById("planetCaption");
  if (cap) cap.textContent = tempWord + " · " + atmoWord;
}

function dominantGas3D(atmo) {
  let best = "N2", val = -1;
  for (const g in atmo) { if (atmo[g] > val) { val = atmo[g]; best = g; } }
  return best;
}
