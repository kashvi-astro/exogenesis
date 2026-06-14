/*
  planet.js — the real-time shader planet engine (module).
  initPlanet(container) sets up the whole raytraced scene and returns
  { apply(uniformSet) } so the app can drive the planet from material tokens.
*/
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import fragmentShader from './engine/atmosphere.frag.glsl?raw';

const vertexShader = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function initPlanet(container) {
  const state = {
    atmoHeight: 0.12, Hr: 0.040, Hm: 0.028,
    betaR: [3.2, 7.4, 18.2], betaM: [2.0, 2.0, 2.0], betaA: [0, 0, 0],
    mieG: 0.76, surfaceMode: 1, surfColA: '#27405e', surfColB: '#b8cbe0',
    sunColor: '#fff4ea', sunIntensity: 16, nightAmbient: 0.004,
    sunAzimuth: 112, sunElevation: 6,
    exposure: 1.0, bloomStrength: 0.55, bloomRadius: 0.65, bloomThreshold: 1.0,
    viewSteps: 64, lightSteps: 8,
  };

  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.AgXToneMapping;
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(-0.55, 0.4, 3.2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 1.15;
  controls.maxDistance = 12;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  const uniforms = {
    uResolution: { value: new THREE.Vector2() },
    uCamWorld: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() },
    uLightDir: { value: new THREE.Vector3(1, 0, 0) }, uSunColor: { value: new THREE.Color() },
    uSunIntensity: { value: 15 }, uAtmoHeight: { value: 0.1 }, uHr: { value: 0.03 }, uHm: { value: 0.02 },
    uBetaR: { value: new THREE.Vector3() }, uBetaM: { value: new THREE.Vector3() }, uBetaA: { value: new THREE.Vector3() },
    uMieG: { value: 0.76 }, uViewSteps: { value: 64 }, uLightSteps: { value: 8 },
    uSurfaceMode: { value: 1 }, uSurfColA: { value: new THREE.Color() }, uSurfColB: { value: new THREE.Color() },
    uNightAmbient: { value: 0.004 },
  };

  const scene = new THREE.Scene();
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new THREE.Mesh(tri, new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms }));
  quad.frustumCulled = false;
  scene.add(quad);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight),
    state.bloomStrength, state.bloomRadius, state.bloomThreshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.setPixelRatio(renderer.getPixelRatio());

  function sync() {
    const az = THREE.MathUtils.degToRad(state.sunAzimuth), el = THREE.MathUtils.degToRad(state.sunElevation);
    uniforms.uLightDir.value.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
    uniforms.uSunColor.value.set(state.sunColor);
    uniforms.uSunIntensity.value = state.sunIntensity;
    uniforms.uAtmoHeight.value = state.atmoHeight;
    uniforms.uHr.value = state.Hr; uniforms.uHm.value = state.Hm;
    uniforms.uBetaR.value.fromArray(state.betaR);
    uniforms.uBetaM.value.fromArray(state.betaM);
    uniforms.uBetaA.value.fromArray(state.betaA);
    uniforms.uMieG.value = state.mieG;
    uniforms.uViewSteps.value = Math.round(state.viewSteps);
    uniforms.uLightSteps.value = Math.round(state.lightSteps);
    uniforms.uSurfaceMode.value = state.surfaceMode;
    uniforms.uSurfColA.value.set(state.surfColA);
    uniforms.uSurfColB.value.set(state.surfColB);
    uniforms.uNightAmbient.value = state.nightAmbient;
    renderer.toneMappingExposure = state.exposure;
    bloom.strength = state.bloomStrength;
    camera.updateMatrixWorld();
    uniforms.uCamWorld.value.copy(camera.matrixWorld);
    uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
    renderer.getDrawingBufferSize(uniforms.uResolution.value);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => { controls.update(); sync(); composer.render(); });

  return {
    apply(u) { Object.assign(state, u); },
  };
}
