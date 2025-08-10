import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('three-canvas');
const statusEl = document.getElementById('status');
const toggleButtons = document.querySelectorAll('button.toggle-foot');
const downloadCSVBtn = document.getElementById('download-csv');
const tbody = document.querySelector('#score-table tbody');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f4f6);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 100);
camera.position.set(0, 0.8, 2);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.1);
hemi.position.set(0, 1, 0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(1, 1.2, 0.5);
scene.add(dir);

const loader = new GLTFLoader();

const base = 'https://raw.githubusercontent.com/Stuart-McNeill/3DFoot/a73385a2686e49b9618aeb82bebed3a5254ac1e9/';
const footModels = {
  Right: { url: base + 'RightFoot.glb', name: 'Right Foot' },
  Left:  { url: base + 'LeftFoot.glb',  name: 'Left Foot' }
};

let currentFoot = null;
let currentMeshGroup = null;

function centerAndScale(object, size = 0.9) {
  const box = new THREE.Box3().setFromObject(object);
  const sz = new THREE.Vector3();
  box.getSize(sz);
  const maxDim = Math.max(sz.x, sz.y, sz.z);
  if (maxDim > 0) object.scale.setScalar(size / maxDim);
  const ctr = box.getCenter(new THREE.Vector3());
  object.position.x -= ctr.x * (object.scale.x || 1);
  object.position.y -= ctr.y * (object.scale.y || 1);
  object.position.z -= ctr.z * (object.scale.z || 1);
}

function loadFoot(side) {
  if (currentMeshGroup) {
    scene.remove(currentMeshGroup);
    currentMeshGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    currentMeshGroup = null;
  }

  const { url, name } = footModels[side];
  statusEl.textContent = `Loading ${name}...`;

  loader.load(
    url,
    (gltf) => {
      const group = gltf.scene;
      group.name = side;
      centerAndScale(group);
      scene.add(group);
      currentMeshGroup = group;
      currentFoot = side;
      statusEl.textContent = `${name} loaded. You can paint when enabled.`;
    },
    undefined,
    (err) => {
      console.error('Load error:', err);
      statusEl.textContent = `Error loading ${name}. Check console.`;
    }
  );
}

toggleButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const foot = btn.getAttribute('data-foot');
    if (foot !== currentFoot) loadFoot(foot);
  });
});

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

function updateTable() {
  tbody.innerHTML = '';
  locations.forEach((desc, i) => {
    tbody.insertAdjacentHTML('beforeend',
      `<tr><td>${i+1}</td><td>${desc}</td><td>${scores[i]}</td></tr>`);
  });
}
updateTable();

downloadCSVBtn.addEventListener('click', () => {
  let csv = 'Location Number,Description,Marked\n';
  locations.forEach((desc, i) => {
    csv += `${i+1},"${desc.replace(/"/g,'""')}",${scores[i]}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'foot_pain_map.csv'; a.click();
  URL.revokeObjectURL(url);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Load right foot initially
loadFoot('Right');
