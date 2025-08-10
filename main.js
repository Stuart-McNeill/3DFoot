import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 3);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const loader = new GLTFLoader();
let currentModel = null;

// 🎨 Create paintable canvas texture
const paintCanvas = document.createElement('canvas');
paintCanvas.width = 1024;
paintCanvas.height = 1024;
const paintCtx = paintCanvas.getContext('2d');
paintCtx.fillStyle = 'rgba(0,0,0,0)';
paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);

const paintTexture = new THREE.CanvasTexture(paintCanvas);
paintTexture.needsUpdate = true;

// 🦶 Load foot model and apply paint texture
function loadFoot(side) {
  const fileName = side === 'left' ? 'LeftFoot.glb' : 'RightFoot.glb';
  loader.load(
    fileName,
    gltf => {
      if (currentModel) scene.remove(currentModel);
      currentModel = gltf.scene;

      currentModel.traverse(child => {
        if (child.isMesh) {
          child.material = new THREE.MeshBasicMaterial({
            map: paintTexture,
            transparent: true
          });
          child.material.needsUpdate = true;
        }
      });

      currentModel.rotation.y = Math.PI;
      scene.add(currentModel);
    },
    undefined,
    error => {
      console.error(`❌ Failed to load ${fileName}:`, error);
    }
  );
}

// 🖱 Paint on click
canvas.addEventListener('pointerdown', event => {
  if (!currentModel) return;

  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(currentModel, true);

  if (intersects.length > 0) {
    const uv = intersects[0].uv;
    if (uv) {
      const x = uv.x * paintCanvas.width;
      const y = (1 - uv.y) * paintCanvas.height;

      paintCtx.fillStyle = 'rgba(255,0,0,0.6)';
      paintCtx.beginPath();
      paintCtx.arc(x, y, 20, 0, Math.PI * 2);
      paintCtx.fill();

      paintTexture.needsUpdate = true;
    }
  }
});

// 🧼 Clear paint
document.getElementById('clearBtn').addEventListener('click', () => {
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  paintTexture.needsUpdate = true;
});

// 🦶 Foot switching
document.getElementById('leftBtn').addEventListener('click', () => loadFoot('left'));
document.getElementById('rightBtn').addEventListener('click', () => loadFoot('right'));

// 📦 Initial load
loadFoot('right');

// 🎞 Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// 📐 Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
