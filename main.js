import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';

const footRegions = [
  "Dorsal Toe 1", "Dorsal Toe 2", "Dorsal Toe 3", "Dorsal Toe 4", "Dorsal Toe 5",
  "Dorsal MTP 1", "Dorsal MTP 2", "Dorsal MTP 3", "Dorsal MTP 4", "Dorsal MTP 5",
  "Dorsal Midfoot", "Dorsal Ankle",
  "Plantar Toe 1", "Plantar Toe 2", "Plantar Toe 3", "Plantar Toe 4", "Plantar Toe 5",
  "Plantar MTP 1", "Plantar MTP 2", "Plantar MTP 3", "Plantar MTP 4", "Plantar MTP 5",
  "Medial Arch", "Plantar lateral", "Plantar Heel",
  "Posterior Heel", "Posterior Insertion", "Posterior Midportion", "Posterior Leg",
  "Medial MTP", "Medial Midfoot", "Posterior Medial", "Medial Leg",
  "Lateral Midfoot", "Posterior Lateral", "Lateral Leg"
];

const regionScores = footRegions.map((desc, i) => ({
  location: i + 1,
  description: desc,
  marked: 0
}));

function markRegion(regionName) {
  const entry = regionScores.find(r => r.description === regionName);
  if (entry) entry.marked = 1;
}

function exportCSV() {
  const header = "Location Number,Description,Marked\n";
  const rows = regionScores.map(r => `${r.location},${r.description},${r.marked}`).join("\n");
  const csv = header + rows;

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "foot_pain_map.csv";
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("exportBtn").addEventListener("click", exportCSV);

// --- Three.js Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0x404040));
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7);
scene.add(light);

// --- Load Foot Models ---
const loader = new GLTFLoader();
const footMeshes = [];

function loadFootModel(url, offsetX) {
  loader.load(url, gltf => {
    const model = gltf.scene;
    model.position.x = offsetX;

    model.traverse(child => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        footMeshes.push(child);
      }
    });

    scene.add(model);
  }, undefined, err => {
    console.error("Failed to load model:", err);
  });
}

loadFootModel('https://github.com/Stuart-McNeill/3DFoot/raw/6fc8c912950a05159294764d7a7f70146e56883a/LeftFoot.glb', -1.5);
loadFootModel('https://github.com/Stuart-McNeill/3DFoot/raw/6fc8c912950a05159294764d7a7f70146e56883a/RightFoot.glb', 1.5);

// --- Raycaster for Interaction ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(footMeshes);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    mesh.material.color.set(0xff4444); // Marked color
    markRegion(mesh.name);
  }
}

window.addEventListener("click", onClick);

// --- Animate ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
