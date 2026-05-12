// La Boulangerie 3D Food - main script
// three.js 0.160, importmap is in index.html
// maybe add a loading progress bar later
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// model info - description shows up in the card below the canvas
const modelDefinitions = [
  {
    id: 'burger',
    name: 'Cheeseburger',
    path: 'assets/models/burger.glb',
    color: 0xf2c94c,
    description: 'A five-part cheeseburger made from separate bun, cheese and patty objects for the La Boulangerie 3D food gallery. Use Animate to drop the layers into place with a short sound effect, or use Wireframe and camera views to inspect the separate parts. The cheese shape was prepared with a Blender cloth and collision workflow, and the food colours were baked for smooth Three.js display.'
  },
  {
    id: 'apple',
    name: 'Green Apple',
    path: 'assets/models/apple.glb',
    color: 0x61c95f,
    description: 'A green apple model built from a reshaped sphere with a separate stem and baked procedural green material. Rotate it, switch to Wireframe, or change the lighting presets to inspect the mottled surface. The material was created in Blender with procedural nodes and baked so it appears consistently in the browser.'
  },
  {
    id: 'bread',
    name: 'Bread Basket',
    path: 'assets/models/bread.glb',
    color: 0x9a6335,
    description: 'A bakery bread basket with three bread pieces and curve-based woven basket detail. Use Rotate and the camera buttons to view the basket from different angles, or compare the model under Warm, Studio and Oven Glow lighting. The original basket was optimised with Decimate so the detailed shape loads more smoothly in Three.js.'
  }
];

// burger layers bottom to top - names must match the object names in Blender exactly
// first export had cheese spelled "cheeze", took me ages to spot
const burgerLayerOrder = [
  'burger_bun_bottom',
  'burger_cheese_bottom',
  'burger_patty',
  'burger_cheese_top',
  'burger_bun_top'
];

const container = document.getElementById('canvas-container');
const modelName = document.getElementById('modelName');
const modelDescription = document.getElementById('modelDescription');
const modelButtons = document.querySelectorAll('.model-select');
const wireframeBtn = document.getElementById('wireframeBtn');
const rotateBtn = document.getElementById('rotateBtn');
const animateBtn = document.getElementById('animateBtn');
const lightBtn = document.getElementById('lightBtn');
const resetCameraBtn = document.getElementById('resetCameraBtn');
const bgmBtn = document.getElementById('bgmBtn');
const bgmAudio = document.getElementById('bgmAudio');
const burgerLayerSfx = document.getElementById('burgerLayerSfx');
const cameraViewButtons = document.querySelectorAll('.camera-view-button');
const lightPresetButtons = document.querySelectorAll('.light-preset');
const lightIntensityRange = document.getElementById('lightIntensityRange');
const lightIntensityValue = document.getElementById('lightIntensityValue');

// 3 lighting presets - tweaked colours and intensity quite a few times
// oven-glow was too dark at first, had to push spot up to 3.4 to feel "oven-y"
const lightingPresets = {
  warm: {
    ambientColor: 0xfff1d2,
    ambientIntensity: 0.55,
    directionalColor: 0xffdf9c,
    directionalIntensity: 1.05,
    directionalPosition: [3.2, 4.8, 3.6],
    spotColor: 0xffc875,
    spotIntensity: 2.25,
    spotPosition: [-2.8, 4.6, 3.1],
    background: 0xf7ebd6,
    ground: 0xe3c489
  },
  studio: {
    ambientColor: 0xffffff,
    ambientIntensity: 0.7,
    directionalColor: 0xffffff,
    directionalIntensity: 1.15,
    directionalPosition: [2.8, 5.2, 4.2],
    spotColor: 0xffffff,
    spotIntensity: 1.65,
    spotPosition: [-2.2, 4.2, 3.2],
    background: 0xf2ede5,
    ground: 0xd9d0c2
  },
  'oven-glow': {
    ambientColor: 0xffc27a,
    ambientIntensity: 0.28,
    directionalColor: 0xff9a3d,
    directionalIntensity: 0.85,
    directionalPosition: [3.8, 2.4, -2.8],
    spotColor: 0xff7a1a,
    spotIntensity: 3.4,
    spotPosition: [-3.2, 3.4, 3.6],
    background: 0x2b150c,
    ground: 0x4a2514
  }
};

const cameraPresets = {
  front: {
    position: new THREE.Vector3(0, 1.35, 5),
    target: new THREE.Vector3(0, 0.45, 0)
  },
  side: {
    position: new THREE.Vector3(5, 1.35, 0),
    target: new THREE.Vector3(0, 0.45, 0)
  },
  top: {
    position: new THREE.Vector3(0, 6, 0.08),
    target: new THREE.Vector3(0, 0, 0)
  },
  detail: {
    position: new THREE.Vector3(0, 1.05, 3.05),
    target: new THREE.Vector3(0, 0.45, 0)
  }
};

let scene;
let camera;
let renderer;
let controls;
let loader;
let ambientLight;
let directionalLight;
let spotLight;
let currentModel = null;
let currentModelIndex = 0;
let isRotating = false;
let wireframeEnabled = false;
let lightEnabled = true;
let bgmPlaying = false;
let activeLightPreset = 'warm';
let lightIntensity = 1;

const tweens = [];

init();
switchModel(0);
renderer.setAnimationLoop(renderLoop);

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a); // placeholder, applyLightingPreset overrides this

  camera = new THREE.PerspectiveCamera(45, getAspect(), 0.1, 100);
  // tried fov 50 and 60, anything wider made the model look small. 45 felt right
  camera.position.set(0, 2.2, 6);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // without this dragging feels really stiff
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.75, 0);

  loader = new GLTFLoader();

  wireframeBtn.addEventListener('click', toggleWireframe);
  rotateBtn.addEventListener('click', toggleRotation);
  animateBtn.addEventListener('click', handleAnimateButton);
  lightBtn.addEventListener('click', toggleSpotLight);
  resetCameraBtn.addEventListener('click', resetCamera);
  bgmBtn.addEventListener('click', toggleBgm);
  bgmAudio.volume = 0.45;
  cameraViewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      moveCameraToPreset(button.dataset.cameraView);
    });
  });
  lightPresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyLightingPreset(button.dataset.lightPreset);
    });
  });
  lightIntensityRange.addEventListener('input', () => {
    lightIntensity = Number(lightIntensityRange.value);
    updateLightIntensityDisplay();
    applyLightingPreset(activeLightPreset);
  });
  window.addEventListener('resize', handleResize);

  modelButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.modelIndex);
      switchModel(index);
    });
  });
}

function switchModel(index) {
  console.log('switching to model', index);
  currentModelIndex = index;
  const definition = modelDefinitions[index];

  clearSceneForModel();
  createLights();
  createGround();
  updateModelInfo(definition);
  updateActiveModelButton(index);

  loader.load(definition.path, (gltf) => {
    currentModel = gltf.scene;
    prepareLoadedModel(currentModel);
    // apple sits a tiny bit too low otherwise, just nudge it up
    if (definition.id === 'apple') {
      currentModel.position.y += 0.16;
    }
    scene.add(currentModel);
    applyWireframeToObject(currentModel, wireframeEnabled);
  }, undefined, (err) => {
    console.log('failed to load', definition.path, err);
  });
}

function clearSceneForModel() {
  cancelTweens();
  currentModel = null;

  // TODO: should probably dispose materials/geometry properly,
  // come back to this if memory becomes a problem
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
}

function createLights() {
  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(1024, 1024);
  scene.add(directionalLight);

  spotLight = new THREE.SpotLight(0xfff1c7, 2, 12, Math.PI / 7, 0.35, 1.1);
  spotLight.castShadow = true;
  scene.add(spotLight);

  const target = new THREE.Object3D();
  target.position.set(0, 0.6, 0);
  scene.add(target);
  spotLight.target = target;

  applyLightingPreset(activeLightPreset);
}

function createGround() {
  // little disc under the model - used a square plane before but it dominated the frame
  // radius 0.5 took a few tries, anything bigger steals attention from the model
  const geometry = new THREE.CircleGeometry(0.5, 64);
  const material = new THREE.MeshStandardMaterial({
    color: 0x262626,
    roughness: 0.82,
    metalness: 0.08
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.82;
  ground.receiveShadow = true;
  ground.name = 'display-ground';
  scene.add(ground);
  applyLightingPreset(activeLightPreset);
}

function prepareLoadedModel(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      // clone the material so wireframe toggle on one model
      // doesn't bleed into the next one when we switch
      if (child.material) {
        child.material = child.material.clone();
      }
    }
  });

  normalizeObject(object, 2.4);
}

function animateBurger() {
  if (!currentModel) {
    return;
  }

  // grab the named layers from the loaded glb
  const layers = burgerLayerOrder
    .map((name) => currentModel.getObjectByName(name))
    .filter(Boolean);

  if (layers.length < 2) {
    // safety net - if names dont match just spin it
    rotateOneTurn(currentModel);
    return;
  }

  animateRealBurgerLayers(layers);
}

function animateRealBurgerLayers(layers) {
  cancelTweens();

  const modelScaleY = Math.max(currentModel?.scale?.y || 1, 0.0001);
  const dropHeight = 3.8 / modelScaleY;
  const sideDrift = 0.28 / modelScaleY;

  layers.forEach((layer, index) => {
    if (!layer.userData.finalPosition) {
      layer.userData.finalPosition = layer.position.clone();
    }

    if (!layer.userData.finalRotation) {
      layer.userData.finalRotation = layer.rotation.clone();
    }

    const targetPosition = layer.userData.finalPosition.clone();
    const targetRotation = layer.userData.finalRotation.clone();
    const driftDirection = index % 2 === 0 ? -1 : 1;
    const startX = targetPosition.x + driftDirection * sideDrift;
    const startY = targetPosition.y + dropHeight + index * (0.16 / modelScaleY);
    const startZ = targetPosition.z + (index % 3 - 1) * (sideDrift * 0.35);
    const startRotationX = targetRotation.x + 0.18;
    const startRotationZ = targetRotation.z - driftDirection * 0.16;
    const duration = 860;
    const delay = index * 260;

    layer.position.set(startX, startY, startZ);
    layer.rotation.set(startRotationX, targetRotation.y, startRotationZ);

    addTween({
      duration,
      delay,
      easing: easeOutBounce,
      onUpdate: (progress) => {
        const settleProgress = easeOutCubic(progress);
        layer.position.x = THREE.MathUtils.lerp(startX, targetPosition.x, settleProgress);
        layer.position.y = THREE.MathUtils.lerp(startY, targetPosition.y, progress);
        layer.position.z = THREE.MathUtils.lerp(startZ, targetPosition.z, settleProgress);
        layer.rotation.x = THREE.MathUtils.lerp(startRotationX, targetRotation.x, settleProgress);
        layer.rotation.z = THREE.MathUtils.lerp(startRotationZ, targetRotation.z, settleProgress);
      },
      onComplete: () => {
        layer.position.copy(targetPosition);
        layer.rotation.copy(targetRotation);
      }
    });

    addBurgerLayerSound(delay + duration * 0.47);
  });
}

function rotateOneTurn(object) {
  if (!object) {
    return;
  }

  const startRotation = object.rotation.y;
  const endRotation = startRotation + Math.PI * 2;

  addTween({
    duration: 1000,
    delay: 0,
    easing: easeInOutCubic,
    onUpdate: (progress) => {
      object.rotation.y = THREE.MathUtils.lerp(startRotation, endRotation, progress);
    }
  });
}

function handleAnimateButton() {
  const definition = modelDefinitions[currentModelIndex];

  if (definition.id === 'burger') {
    animateBurger();
    return;
  }

  if (definition.id === 'apple') {
    animateAppleRoll();
    return;
  }

  rotateOneTurn(currentModel);
}

// apple rocks side to side - tried a full spin first but it looked weird because of the stem
// rocking actually felt more natural, like an apple wobbling on a table
function animateAppleRoll() {
  if (!currentModel) {
    return;
  }

  cancelTweens();

  if (!currentModel.userData.finalPosition) {
    currentModel.userData.finalPosition = currentModel.position.clone();
  }

  if (!currentModel.userData.finalRotation) {
    currentModel.userData.finalRotation = currentModel.rotation.clone();
  }

  const startPosition = currentModel.userData.finalPosition.clone();
  const startRotation = currentModel.userData.finalRotation.clone();
  const rightDistance = 0.34;
  const leftDistance = -0.24;
  const rightRoll = Math.PI * 0.38;
  const leftRoll = Math.PI * 0.28;
  const stepDuration = 520;

  currentModel.position.copy(startPosition);
  currentModel.rotation.copy(startRotation);

  animateAppleStep(
    startPosition.x,
    startPosition.x + rightDistance,
    startRotation.z,
    startRotation.z - rightRoll,
    stepDuration,
    () => {
      animateAppleStep(
        startPosition.x + rightDistance,
        startPosition.x + leftDistance,
        startRotation.z - rightRoll,
        startRotation.z + leftRoll,
        stepDuration + 120,
        () => {
          animateAppleStep(
            startPosition.x + leftDistance,
            startPosition.x,
            startRotation.z + leftRoll,
            startRotation.z,
            stepDuration,
            () => {
              currentModel.position.copy(startPosition);
              currentModel.rotation.copy(startRotation);
            }
          );
        }
      );
    }
  );
}

function animateAppleStep(fromX, toX, fromRotationZ, toRotationZ, duration, onComplete) {
  addTween({
    duration,
    delay: 0,
    easing: easeInOutCubic,
    onUpdate: (progress) => {
      currentModel.position.x = THREE.MathUtils.lerp(fromX, toX, progress);
      currentModel.rotation.z = THREE.MathUtils.lerp(fromRotationZ, toRotationZ, progress);
    },
    onComplete
  });
}

function toggleRotation() {
  isRotating = !isRotating;
  rotateBtn.classList.toggle('active', isRotating);
  rotateBtn.innerHTML = isRotating
    ? 'Stop'
    : 'Rotate';
}

function toggleWireframe() {
  wireframeEnabled = !wireframeEnabled;
  applyWireframeToObject(scene, wireframeEnabled);
  wireframeBtn.classList.toggle('active', wireframeEnabled);
}

function toggleSpotLight() {
  lightEnabled = !lightEnabled;

  applyLightingPreset(activeLightPreset);

  lightBtn.classList.toggle('active', lightEnabled);
  lightBtn.innerHTML = lightEnabled
    ? 'Light Off'
    : 'Light On';
}

function applyLightingPreset(presetName) {
  const preset = lightingPresets[presetName] || lightingPresets.warm;
  activeLightPreset = presetName in lightingPresets ? presetName : 'warm';

  if (scene) {
    scene.background = new THREE.Color(preset.background);
  }

  if (ambientLight) {
    ambientLight.color.setHex(preset.ambientColor);
    ambientLight.intensity = preset.ambientIntensity * lightIntensity;
  }

  if (directionalLight) {
    directionalLight.color.setHex(preset.directionalColor);
    directionalLight.intensity = lightEnabled ? preset.directionalIntensity * lightIntensity : 0;
    directionalLight.position.set(...preset.directionalPosition);
  }

  if (spotLight) {
    spotLight.color.setHex(preset.spotColor);
    spotLight.intensity = lightEnabled ? preset.spotIntensity * lightIntensity : 0;
    spotLight.position.set(...preset.spotPosition);
    spotLight.visible = lightEnabled;
  }

  const ground = scene?.getObjectByName('display-ground');
  if (ground?.material) {
    ground.material.color.setHex(preset.ground);
    ground.material.needsUpdate = true;
  }

  updateLightPresetButtons();
  updateLightIntensityDisplay();
}

function updateLightPresetButtons() {
  lightPresetButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.lightPreset === activeLightPreset);
  });
}

function updateLightIntensityDisplay() {
  if (lightIntensityValue) {
    lightIntensityValue.textContent = `${lightIntensity.toFixed(2)}x`;
  }
}

function resetCamera() {
  cancelTweens();
  camera.position.set(0, 2.2, 6);
  controls.target.set(0, 0.75, 0);
  updateCameraViewButtons(null);
  controls.update();
}

// smooth tween between camera presets - snapping straight there feels jarring
function moveCameraToPreset(presetName) {
  const preset = cameraPresets[presetName];

  if (!preset) {
    return;
  }

  cancelTweens(); // stop any previous camera move

  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPosition = preset.position.clone();
  const endTarget = preset.target.clone();

  updateCameraViewButtons(presetName);

  addTween({
    duration: 680,
    delay: 0,
    easing: easeInOutCubic,
    onUpdate: (progress) => {
      camera.position.copy(startPosition).lerp(endPosition, progress);
      controls.target.copy(startTarget).lerp(endTarget, progress);
      controls.update();
    },
    onComplete: () => {
      camera.position.copy(endPosition);
      controls.target.copy(endTarget);
      controls.update();
    }
  });
}

function updateCameraViewButtons(activeView) {
  cameraViewButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.cameraView === activeView);
  });
}

function toggleBgm() {
  if (bgmPlaying) {
    bgmAudio.pause();
    bgmPlaying = false;
    updateBgmButton();
    return;
  }

  bgmAudio.play()
    .then(() => {
      bgmPlaying = true;
      updateBgmButton();
    })
    .catch(() => {
      bgmPlaying = false;
      updateBgmButton();
    });
}

function updateBgmButton() {
  bgmBtn.classList.toggle('active', bgmPlaying);
  bgmBtn.innerHTML = bgmPlaying
    ? 'Pause Music'
    : 'Play Music';
}

function updateModelInfo(definition) {
  modelName.textContent = definition.name;
  modelDescription.textContent = definition.description;
}

function updateActiveModelButton(index) {
  modelButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.modelIndex) === index);
  });
}

// scale every model to roughly the same size
// otherwise the apple is tiny and the bread basket is huge, switching feels jarring
function normalizeObject(obj, targetSize) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const c = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(c);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    obj.scale.multiplyScalar(targetSize / maxDim);
  }

  // bbox changed after scaling so recompute the center
  const scaledBox = new THREE.Box3().setFromObject(obj);
  scaledBox.getCenter(c);
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= scaledBox.min.y + 0.75; // 0.75 lifts the model just above the disc
}

function applyWireframeToObject(object, enabled) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if ('wireframe' in material) {
        material.wireframe = enabled;
        material.needsUpdate = true;
      }
    });
  });
}

function addTween({ duration, delay, easing, onUpdate, onComplete }) {
  tweens.push({
    startTime: performance.now() + delay,
    duration,
    easing,
    onUpdate,
    onComplete
  });
}

function addBurgerLayerSound(delay) {
  if (!burgerLayerSfx) {
    return;
  }

  addTween({
    duration: 1,
    delay,
    easing: (value) => value,
    onUpdate: () => {},
    onComplete: playBurgerLayerSfx
  });
}

function playBurgerLayerSfx() {
  if (!burgerLayerSfx) {
    return;
  }

  // tried reusing a single audio element first but the sound kept cutting itself off
  // cloneNode gives a fresh one each time, browser handles cleanup. crude but works
  const sfx = burgerLayerSfx.cloneNode(true);
  sfx.volume = 0.64;
  // console.log('burger pop');
  sfx.play().catch(() => {});
}

function updateTweens(now) {
  for (let index = tweens.length - 1; index >= 0; index -= 1) {
    const tween = tweens[index];

    if (now < tween.startTime) {
      continue;
    }

    const elapsed = now - tween.startTime;
    const rawProgress = Math.min(elapsed / tween.duration, 1);
    const progress = tween.easing(rawProgress);
    tween.onUpdate(progress);

    if (rawProgress >= 1) {
      if (typeof tween.onComplete === 'function') {
        tween.onComplete();
      }
      tweens.splice(index, 1);
    }
  }
}

function cancelTweens() {
  tweens.length = 0;
}

function renderLoop(now) {
  updateTweens(now);

  // 0.012 just felt right after a few tries, anything faster makes me dizzy
  if (currentModel && isRotating) {
    currentModel.rotation.y += 0.012;
  }

  controls.update();
  renderer.render(scene, camera);
}

function handleResize() {
  camera.aspect = getAspect();
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function getAspect() {
  return container.clientWidth / container.clientHeight;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

// copied from easings.net - gives the burger layers that satisfying bounce
// when they land, way better than plain cubic
function easeOutBounce(value) {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (value < 1 / d1) {
    return n1 * value * value;
  }

  if (value < 2 / d1) {
    const adjusted = value - 1.5 / d1;
    return n1 * adjusted * adjusted + 0.75;
  }

  if (value < 2.5 / d1) {
    const adjusted = value - 2.25 / d1;
    return n1 * adjusted * adjusted + 0.9375;
  }

  const adjusted = value - 2.625 / d1;
  return n1 * adjusted * adjusted + 0.984375;
}
