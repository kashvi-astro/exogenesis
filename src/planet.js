/*
  planet.js — real-time shader planet engine (3 views).
  Holds three full-scene raytracing materials — atmosphere, surface, cutaway —
  and swaps between them. apply(view, vals) sets that view's uniforms from the
  material tokens. initPlanet(container) → { apply, setView }.
*/
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import atmosphereFrag from './engine/atmosphere.frag.glsl?raw';
import surfacesFrag from './engine/surfaces.frag.glsl?raw';
import cutawayFrag from './engine/cutaway.frag.glsl?raw';

const VERT = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const C = (h) => new THREE.Color(h);
const V3 = () => new THREE.Vector3();

// uniform objects per shader (correct THREE types so the generic setter works)
function common() {
  return {
    uResolution: { value: new THREE.Vector2() },
    uCamWorld: { value: new THREE.Matrix4() },
    uProjInv: { value: new THREE.Matrix4() },
    uLightDir: { value: V3() },
    uSunColor: { value: C('#ffffff') },
  };
}
const UNIFORMS = {
  atmosphere: () => ({ ...common(),
    uSunIntensity: { value: 16 }, uAtmoHeight: { value: 0.12 }, uHr: { value: 0.04 }, uHm: { value: 0.028 },
    uBetaR: { value: V3() }, uBetaM: { value: V3() }, uBetaA: { value: V3() }, uMieG: { value: 0.76 },
    uViewSteps: { value: 80 }, uLightSteps: { value: 10 }, uSurfaceMode: { value: 1 },
    uSurfColA: { value: C('#27405e') }, uSurfColB: { value: C('#b8cbe0') }, uNightAmbient: { value: 0.004 } }),
  surface: () => ({ ...common(),
    uAmbient: { value: 0.05 }, uNightAmbient: { value: 0.02 }, uSurfaceType: { value: 0 },
    uYaw: { value: 0 }, uCloudYaw: { value: 0.6 },
    uColA: { value: C('#0e2f4e') }, uColB: { value: C('#2f6fae') }, uColC: { value: C('#3f7a45') },
    uColD: { value: C('#9c8a54') }, uColE: { value: C('#eef6ff') }, uCloudCol: { value: C('#eef4ff') },
    uAtmoCol: { value: C('#8ab8ff') }, uSeaLevel: { value: 0.5 }, uCloudAmount: { value: 0.4 },
    uCloudSharp: { value: 0.55 }, uBandFreq: { value: 8 }, uWarp: { value: 0.5 }, uStorm: { value: 0 },
    uBumpStrength: { value: 1.2 }, uRimStrength: { value: 0.6 }, uRAtmo: { value: 1.05 } }),
  cutaway: () => ({ ...common(),
    uAmbient: { value: 0.14 }, uRAtmo: { value: 1.06 }, uRSurface: { value: 1.0 }, uRCrustBase: { value: 0.86 },
    uRMantleBase: { value: 0.45 }, uRInnerCore: { value: 0.22 },
    uCrustA: { value: C('#5a4a3a') }, uCrustB: { value: C('#8a7256') }, uMantleA: { value: C('#7a3a22') },
    uMantleB: { value: C('#b25a2e') }, uCoreCol: { value: C('#ff6a2a') }, uInnerCoreCol: { value: C('#ffe1a0') },
    uSurfA: { value: C('#3d3026') }, uSurfB: { value: C('#94704c') }, uAtmoCol: { value: C('#8ab8ff') },
    uCoreEmissive: { value: 1.0 }, uRimStrength: { value: 0.5 }, uBoundaryGlow: { value: 0.85 }, uNightAmbient: { value: 0.02 } }),
};
const FRAG = { atmosphere: atmosphereFrag, surface: surfacesFrag, cutaway: cutawayFrag };

export function initPlanet(container) {
  const W = () => container.clientWidth || window.innerWidth;
  const H = () => container.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 0.88;   // tamed so lit surfaces don't clip to white
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(38, W() / H(), 0.1, 100);
  camera.position.set(-0.55, 0.4, 3.2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.minDistance = 1.15; controls.maxDistance = 12;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.35;

  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));

  const materials = {};
  for (const name of ['atmosphere', 'surface', 'cutaway']) {
    materials[name] = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG[name], uniforms: UNIFORMS[name]() });
  }
  let active = 'surface';
  const quad = new THREE.Mesh(tri, materials[active]);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.0, 0.4, 1.6);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.setPixelRatio(renderer.getPixelRatio());

  // generic setter: matches JS value to the uniform's THREE type
  function setVals(mat, vals) {
    for (const k in vals) {
      const u = mat.uniforms[k];
      if (!u) continue;
      const v = vals[k];
      if (u.value && u.value.isColor) u.value.set(v);
      else if (u.value && u.value.isVector3) u.value.fromArray(v);
      else u.value = v;
    }
  }

  const onResize = () => {
    camera.aspect = W() / H(); camera.updateProjectionMatrix();
    renderer.setSize(W(), H()); composer.setSize(W(), H());
  };
  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(container);

  renderer.setAnimationLoop(() => {
    controls.update();
    const u = materials[active].uniforms;
    camera.updateMatrixWorld();
    u.uCamWorld.value.copy(camera.matrixWorld);
    u.uProjInv.value.copy(camera.projectionMatrixInverse);
    renderer.getDrawingBufferSize(u.uResolution.value);
    composer.render();
  });

  return {
    setView(name) {
      if (!materials[name]) return;
      active = name; quad.material = materials[name];
      controls.autoRotate = name !== 'cutaway';   // hold still for the anatomy view
      // bloom only on the atmosphere view; near-zero elsewhere → no white "fog"
      bloom.strength = name === 'atmosphere' ? 0.4 : 0.0;
      bloom.threshold = name === 'atmosphere' ? 1.0 : 1.6;
    },
    apply(view, vals) {
      if (view !== active) this.setView(view);
      setVals(materials[active], vals);
    },
  };
}
