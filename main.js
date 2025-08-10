// main.js (replace your existing file with this)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('three-canvas');
const statusEl = document.getElementById('status');

// --- scene, camera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f4f6);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, 0.8, 2);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// --- controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// --- lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.1);
hemi.position.set(0, 1, 0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(1, 1.2, 0.5);
scene.add(dir);

// --- helpers
function centerAndScale(object, desiredSize = 1.0) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scale = desiredSize / maxDim;
    object.scale.setScalar(scale);
  }
  // center
  const center = new THREE.Vector3();
  box.getCenter(center);
  object.position.x -= center.x * (object.scale.x || 1);
  object.position.y -= center.y * (object.scale.y || 1);
  object.position.z -= center.z * (object.scale.z || 1);
}

// --- loader & model URLs (pinned to your commit)
const base = 'https://raw.githubusercontent.com/Stuart-McNeill/3DFoot/a73385a2686e49b9618aeb82bebed3a5254ac1e9/';
const models = [
  { url: base + 'LeftFoot.glb', x: -0.85, name: 'LeftFoot' },
  { url: base + 'RightFoot.glb', x:  0.85, name: 'RightFoot' }
];

const loader = new GLTFLoader();
let loadedCount = 0;

models.forEach((m) => {
  loader.load(
    m.url,
    (gltf) => {
      console.log('Loaded:', m.url);
      const root = gltf.scene;
      // Optional: convert indexed geometry -> non-indexed for painting later.
      root.traverse((child) => {
        if (child.isMesh && child.geometry) {
          // keep geometry as-is for now; painting code will convert when needed
          child.castShadow = child.receiveShadow = true;
        }
      });

      // position, scale and add
      root.position.x = m.x;
      centerAndScale(root, 0.9);
      scene.add(root);

      loadedCount++;
      statusEl.textContent = `Loaded ${loadedCount} / ${models.length} model(s).`;
      if (loadedCount === models.length) {
        statusEl.textContent = `All models loaded. Use mouse to orbit / zoom.`;
      }
    },
    (xhr) => {
      // progress (xhr.loaded / xhr.total) may be NaN sometimes
      // console.log(`${m.name} ${ (xhr.loaded/xhr.total*100).toFixed(1) }% loaded`);
    },
    (err) => {
      console.error('Error loading', m.url, err);
      statusEl.textContent = `Error loading model: ${m.name} — check console (CORS/404).`;
    }
  );
});

// --- minimal table scaffolding (your full list)
const locations = [
  "Dorsal Toe 1","Dorsal Toe 2","Dorsal Toe 3","Dorsal Toe 4","Dorsal Toe 5",
  "Dorsal MTP 1","Dorsal MTP 2","Dorsal MTP 3","Dorsal MTP 4","Dorsal MTP 5",
  "Dorsal Midfoot","Dorsal Ankle","Plantar Toe 1","Plantar Toe 2","Plantar Toe 3",
  "Plantar Toe 4","Plantar Toe 5","Plantar MTP 1","Plantar MTP 2","Plantar MTP 3",
  "Plantar MTP 4","Plantar MTP 5","Medial Arch","Plantar lateral","Plantar Heel",
  "Posterior Heel","Posterior Insertion","Posterior Midportion","Posterior Leg",
  "Medial MTP","Medial Midfoot","Posterior Medial","Medial Leg","Lateral Midfoot",
  "Posterior Lateral","Lateral Leg"
];
let scores = new Array(locations.length).fill(0);
const tbody = document.querySelector('#score-table tbody');

function updateTable() {
  tbody.innerHTML = '';
  locations.forEach((desc, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td><td>${desc}</td><td>${scores[idx]}</td>`;
    tbody.appendChild(tr);
  });
}
updateTable();

document.getElementById('download-csv').addEventListener('click', () => {
  let csv = 'Location Number,Description,Marked\n';
  locations.forEach((desc, i) => csv += `${i+1},"${desc.replace(/"/g,'""')}",${scores[i]}\n`);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'foot_pain_map.csv'; a.click();
  URL.revokeObjectURL(url);
});

// --- animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- debug tip: show source-of-main.js in console
console.log('main.js loaded (module). Check network tab if imports fail.');
