import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ✅ DOM elements
const canvas = document.getElementById('canvas');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const clearBtn = document.getElementById('clearBtn');

// ✅ Renderer setup
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// ✅ Scene and camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ✅ Lighting
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// ✅ Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ✅ Paint canvas texture
const paintCanvas = document.createElement('canvas');
paintCanvas.width = 1024;
paintCanvas.height = 1024;
const paintCtx = paintCanvas.getContext('2d');
paintCtx.fillStyle = 'rgba(0,0,0,0)';
paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);

const paintTexture = new THREE.CanvasTexture(paintCanvas);
paintTexture.needsUpdate = true;

// ✅ GLTF loader and model
const loader = new GLTFLoader();
let currentModel = null;

function loadFoot(side) {
  const fileName = side === 'left' ? 'LeftFoot.glb' : 'RightFoot.glb';
  loader.load(
    fileName,
    gltf => {
      if (currentModel) scene.remove(currentModel);
      currentModel = gltf.scene;

      // ✅ Apply paintable material
      currentModel.traverse(child => {
        if (child.isMesh) {
          child.material = new THREE.MeshBasicMaterial({
            map: paintTexture,
            transparent: true
          });
          child.material.needsUpdate = true;
        }
      });

      // ✅ Center and scale model
      const box = new THREE.Box3().setFromObject(currentModel);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      currentModel.position.sub(center); // Center it
      if (maxDim > 2) {
        const scale = 2 / maxDim;
        currentModel.scale.setScalar(scale);
      }

      scene.add(currentModel);

      // ✅ Optional: visualize bounding box
      // const helper = new THREE.BoxHelper(currentModel, 0xff00ff);
      // scene.add(helper);
    },
    undefined,
    error => {
      console.error(`❌ Failed to load ${fileName}:`, error);
    }
  );
}

// ✅ Paint on click
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

// ✅ Clear paint
clearBtn.addEventListener('click', () => {
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  paintTexture.needsUpdate = true;
});

// ✅ Foot switching
leftBtn.addEventListener('click', () => loadFoot('left'));
rightBtn.addEventListener('click', () => loadFoot('right'));

// ✅ Initial load
loadFoot('right');

// ✅ Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ✅ Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
