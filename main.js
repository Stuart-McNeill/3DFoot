import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('three-canvas');
const statusEl = document.getElementById('status');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

let currentModel = null;
const loader = new GLTFLoader();

function clearModel() {
  if (currentModel) {
    scene.remove(currentModel);
    currentModel.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    currentModel = null;
  }
}

async function loadModel(url) {
  statusEl.textContent = 'Loading model...';
  clearModel();

  try {
    const gltf = await loader.loadAsync(url);
    currentModel = gltf.scene;
    scene.add(currentModel);

    const box = new THREE.Box3().setFromObject(currentModel);
    const center = box.getCenter(new THREE.Vector3());
    currentModel.position.sub(center);

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 2) {
      const scale = 2 / maxDim;
      currentModel.scale.setScalar(scale);
    }

    statusEl.textContent = 'Model loaded.';
  } catch (error) {
    console.error('Error loading model:', error);
    statusEl.textContent = 'Error loading model.';
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Replace these with your actual hosted .glb URLs
const rightFootURL = 'https://yourdomain.com/models/right-foot.glb';
const leftFootURL = 'https://yourdomain.com/models/left-foot.glb';

loadModel(rightFootURL);

document.querySelectorAll('button.toggle-foot').forEach(btn => {
  btn.addEventListener('click', () => {
    const foot = btn.getAttribute('data-foot');
    statusEl.textContent = `Loading ${foot} Foot...`;

    if (foot === 'Right') {
      loadModel(rightFootURL);
    } else if (foot === 'Left') {
      loadModel(leftFootURL);
    }
  });
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
