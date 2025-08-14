import * as THREE from 'https://cdn.skypack.dev/three';
import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader();
let regionCounts = {};

loader.load(
  'https://raw.githubusercontent.com/Stuart-McNeill/3DFoot/46cfa33a3c38eb7680002f2b759296b24800c0a6/Leftfoot.gltf',
  function (gltf) {
    const mesh = gltf.scene.children[0];
    scene.add(mesh);
    regionCounts = processVertexColors(mesh);
  },
  undefined,
  function (error) {
    console.error('Error loading model:', error);
  }
);

function processVertexColors(mesh) {
  const colors = mesh.geometry.attributes.color.array;
  const regionMap = {
    '255,0,0': 'Medial Heel',
    '0,255,0': 'Lateral Heel',
    '0,0,255': 'Arch',
    '255,255,0': 'Forefoot',
  };

  const counts = {};
  for (let i = 0; i < colors.length; i += 3) {
    const r = Math.round(colors[i] * 255);
    const g = Math.round(colors[i + 1] * 255);
    const b = Math.round(colors[i + 2] * 255);
    const key = `${r},${g},${b}`;
    const region = regionMap[key] || 'Unknown';
    counts[region] = (counts[region] || 0) + 1;
  }

  console.log('Region counts:', counts);
  return counts;
}

function exportCSV(data) {
  let csv = 'Region,VertexCount\n';
  for (const [region, count] of Object.entries(data)) {
    csv += `${region},${count}\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'region_scores.csv';
  a.click();
}

document.getElementById('exportBtn').addEventListener('click', () => {
  exportCSV(regionCounts);
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
