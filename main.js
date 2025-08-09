import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 3);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
scene.add(light);

const loader = new GLTFLoader();
let currentModel = null;
let autoRotate = false;

function loadFoot(side) {
  const fileName = side === 'left' ? 'LeftFoot.glb' : 'RightFoot.glb';

  loader.load(
    fileName,
    gltf => {
      if (currentModel) scene.remove(currentModel);
      currentModel = gltf.scene;
      currentModel.rotation.y = Math.PI; // Optional: orient model
      scene.add(currentModel);
    },
    undefined,
    error => {
      console.error(`❌ Failed to load ${fileName}:`, error);
    }
  );
}

// Initial load
loadFoot('right');

// Button handlers
document.getElementById('leftBtn').addEventListener('click', () => loadFoot('left'));
document.getElementById('rightBtn').addEventListener('click', () => loadFoot('right'));
document.getElementById('rotateBtn').addEventListener('click', () => {
  autoRotate = !autoRotate;
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  if (autoRotate && currentModel) {
    currentModel.rotation.y += 0.01;
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
