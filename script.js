import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('footCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(canvas.clientWidth, canvas.clientHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(0, 0.5, 2);

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

const loader = new GLTFLoader();
let footMesh, painLevels = [], locationMap = [];

const locationDescriptions = [
  "Dorsal Toe 1", "Dorsal Toe 2", "Dorsal Toe 3", "Dorsal Toe 4", "Dorsal Toe 5",
  "Dorsal MTP 1", "Dorsal MTP 2", "Dorsal MTP 3", "Dorsal MTP 4", "Dorsal MTP 5",
  "Dorsal Midfoot", "Dorsal Ankle", "Plantar Toe 1", "Plantar Toe 2", "Plantar Toe 3",
  "Plantar Toe 4", "Plantar Toe 5", "Plantar MTP 1", "Plantar MTP 2", "Plantar MTP 3",
  "Plantar MTP 4", "Plantar MTP 5", "Medial Arch", "Plantar lateral", "Plantar Heel",
  "Posterior Heel", "Posterior Insertion", "Posterior Midportion", "Posterior Leg",
  "Medial MTP", "Medial Midfoot", "Posterior Medial", "Medial Leg", "Lateral Midfoot",
  "Posterior Lateral", "Lateral Leg"
];

loader.load(
  'https://github.com/Stuart-McNeill/3DFoot/raw/0adeb78b5222fba98f120691101f627f153bf482/RightFoot.glb',
  gltf => {
    footMesh = gltf.scene.children[0];
    footMesh.geometry = footMesh.geometry.toNonIndexed();
    const positionAttr = footMesh.geometry.attributes.position;
    const vertexCount = positionAttr.count;

    for (let i = 0; i < vertexCount; i++) {
      painLevels[i] = 0;
      locationMap[i] = Math.floor(i / (vertexCount / locationDescriptions.length));
    }

    const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    footMesh.material = material;
    scene.add(footMesh);
  }
);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('click', event => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(footMesh);

  if (intersects.length > 0) {
    const face = intersects[0].face;
    [face.a, face.b, face.c].forEach(i => {
      painLevels[i] = 1;
    });

    footMesh.geometry.attributes.color = new THREE.BufferAttribute(
      new Float32Array(painLevels.flatMap(p => p ? [1, 0, 0] : [0.8, 0.8, 0.8])),
      3
    );
    footMesh.material.vertexColors = true;
    footMesh.geometry.attributes.color.needsUpdate = true;
  }
});

function generateCSV() {
  let csv = "Location Number,Description,Marked\n";
  const marked = new Array(locationDescriptions.length).fill(0);

  painLevels.forEach((val, i) => {
    if (val === 1) marked[locationMap[i]] = 1;
  });

  locationDescriptions.forEach((desc, i) => {
    csv += `${i + 1},${desc},${marked[i]}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'foot_pain_assessment.csv';
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('downloadBtn').addEventListener('click', generateCSV);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
