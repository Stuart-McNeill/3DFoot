import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

// Foot pain locations
const locations = [
  "Dorsal Toe 1", "Dorsal Toe 2", "Dorsal Toe 3", "Dorsal Toe 4", "Dorsal Toe 5",
  "Dorsal MTP 1", "Dorsal MTP 2", "Dorsal MTP 3", "Dorsal MTP 4", "Dorsal MTP 5",
  "Dorsal Midfoot", "Dorsal Ankle", "Plantar Toe 1", "Plantar Toe 2", "Plantar Toe 3",
  "Plantar Toe 4", "Plantar Toe 5", "Plantar MTP 1", "Plantar MTP 2", "Plantar MTP 3",
  "Plantar MTP 4", "Plantar MTP 5", "Medial Arch", "Plantar lateral", "Plantar Heel",
  "Posterior Heel", "Posterior Insertion", "Posterior Midportion", "Posterior Leg",
  "Medial MTP", "Medial Midfoot", "Posterior Medial", "Medial Leg", "Lateral Midfoot",
  "Posterior Lateral", "Lateral Leg"
];

let scores = locations.map(() => 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('three-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 1, 2);
controls.update();

const light = new THREE.HemisphereLight(0xffffff, 0x444444);
light.position.set(0, 1, 0);
scene.add(light);

const loader = new GLTFLoader();
loader.load(
  'https://raw.githubusercontent.com/Stuart-McNeill/3DFoot/main/LeftFoot.glb',
  (gltf) => {
    scene.add(gltf.scene);
  },
  undefined,
  (err) => console.error('Error loading model:', err)
);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Table rendering
const tbody = document.querySelector("#score-table tbody");
function renderTable() {
  tbody.innerHTML = '';
  locations.forEach((desc, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${desc}</td><td>${scores[i]}</td>`;
    tbody.appendChild(tr);
  });
}
renderTable();

// CSV Download
document.getElementById("download-csv").addEventListener("click", () => {
  let csv = "Location Number,Description,Marked\n";
  locations.forEach((desc, i) => {
    csv += `${i+1},${desc},${scores[i]}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "foot_pain_map.csv";
  a.click();
  URL.revokeObjectURL(url);
});
