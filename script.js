// script.js (module)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';

const MODEL_RAW_BASE = 'https://raw.githubusercontent.com/Stuart-McNeill/3DFoot/0adeb78b5222fba98f120691101f627f153bf482/';
const RIGHT_MODEL = MODEL_RAW_BASE + 'RightFoot.glb';
const LEFT_MODEL  = MODEL_RAW_BASE + 'LeftFoot.glb';

// The 36 location descriptions you gave (preserve exact wording)
const LOCATION_DESCRIPTIONS = [
  'Dorsal Toe 1','Dorsal Toe 2','Dorsal Toe 3','Dorsal Toe 4','Dorsal Toe 5',
  'Dorsal MTP 1','Dorsal MTP 2','Dorsal MTP 3','Dorsal MTP 4','Dorsal MTP 5',
  'Dorsal Midfoot','Dorsal Ankle','Plantar Toe 1','Plantar Toe 2','Plantar Toe 3',
  'Plantar Toe 4','Plantar Toe 5','Plantar MTP 1','Plantar MTP 2','Plantar MTP 3',
  'Plantar MTP 4','Plantar MTP 5','Medial Arch','Plantar lateral','Plantar Heel',
  'Posterior Heel','Posterior Insertion','Posterior Midportion','Posterior Leg',
  'Medial MTP','Medial Midfoot','Posterior Medial','Medial Leg','Lateral Midfoot',
  'Posterior Lateral','Lateral Leg'
];

if (LOCATION_DESCRIPTIONS.length !== 36) {
  console.warn('Expecting 36 descriptions, found:', LOCATION_DESCRIPTIONS.length);
}

// Core three.js setup
const canvas = document.getElementById('footCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f5f9);

const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(0, 0.9, 2.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
scene.add(light);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 7);
scene.add(dir);

// Globals state
let currentMesh = null;
let vertexPositions = null;    // Float32Array (flat x,y,z)
let painAttr = null;           // Float32Array per-vertex pain levels (0/1)
let clusterOfVertex = null;    // Int array mapping vertex => cluster (0..35)
let locationMarked = new Array(36).fill(0); // final region marks
let pointsObject = null;       // THREE.Points showing per-vertex marks
let vertexCount = 0;
let vertexToIndexMap = null;   // helper

// Raycaster & pointer
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let isDown = false;

// UI elements
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const footSelect = document.getElementById('footSelect');

// Initialize: load right foot by default
loadModel(RIGHT_MODEL);

// Handle foot selection
footSelect.addEventListener('change', () => {
  const val = footSelect.value;
  const url = val === 'right' ? RIGHT_MODEL : LEFT_MODEL;
  loadModel(url);
});

// Download CSV
downloadBtn.addEventListener('click', downloadCSV);

// Clear marks
clearBtn.addEventListener('click', clearAllMarks);

// Pointer events
renderer.domElement.addEventListener('pointerdown', (e) => { isDown = true; handlePointerEvent(e); });
window.addEventListener('pointerup', () => { isDown = false; });
renderer.domElement.addEventListener('pointermove', (e) => { if (isDown) handlePointerEvent(e); });
renderer.domElement.addEventListener('click', handlePointerEvent);

// Resize handling
window.addEventListener('resize', onWindowResize, false);

animate();

function onWindowResize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || Math.round(window.innerHeight * 0.7);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// --- Loading model and preparing per-vertex data ---
async function loadModel(url) {
  // Clear previous
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
    currentMesh = null;
  }
  if (pointsObject) {
    scene.remove(pointsObject);
    pointsObject.geometry.dispose();
    pointsObject.material.dispose();
    pointsObject = null;
  }
  vertexPositions = null;
  painAttr = null;
  clusterOfVertex = null;
  locationMarked.fill(0);

  // Loader
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(url);
    // find first mesh
    let mesh = null;
    gltf.scene.traverse((child) => {
      if (!mesh && child.isMesh) mesh = child;
    });
    if (!mesh) throw new Error('No mesh found in GLB');

    // ensure BufferGeometry is non-indexed for per-vertex operations
    let geom = mesh.geometry;
    if (geom.index) {
      geom = geom.toNonIndexed();
    } else {
      geom = geom.clone();
    }

    // Ensure a single material that is visible
    mesh = new THREE.Mesh(geom, mesh.material.clone());
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    // center & scale
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxSide = Math.max(size.x, size.y, size.z);
    const scale = 1.0 / maxSide * 1.6;
    mesh.scale.setScalar(scale);
    box.setFromObject(mesh);
    const center = new THREE.Vector3();
    box.getCenter(center);
    mesh.position.sub(center.multiplyScalar(scale)); // center it

    scene.add(mesh);
    currentMesh = mesh;

    // Acquire position attribute
    const posAttr = geom.getAttribute('position');
    vertexCount = posAttr.count;
    vertexPositions = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount * 3; i++) vertexPositions[i] = posAttr.array[i];

    // Try to find existing pain_level attribute, else create it
    let painAttribute = geom.getAttribute('pain_level');
    if (!painAttribute) {
      // create new pain_level attribute (Float32Array zeros)
      const arr = new Float32Array(vertexCount);
      const painBuffer = new THREE.BufferAttribute(arr, 1);
      geom.setAttribute('pain_level', painBuffer);
      painAttribute = painBuffer;
    }
    painAttr = painAttribute.array;

    // Create color attribute for point cloud visualization (r,g,b each vertex)
    let colorAttr = geom.getAttribute('color');
    if (!colorAttr) {
      const colors = new Float32Array(vertexCount * 3);
      for (let i = 0; i < vertexCount; i++) {
        colors[i*3+0] = 0.6; // base grey
        colors[i*3+1] = 0.6;
        colors[i*3+2] = 0.6;
      }
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      colorAttr = geom.getAttribute('color');
    }

    // Build a Points object to show per-vertex marks (initially invisible markers; we will color points red for pain)
    const pointsGeom = new THREE.BufferGeometry();
    pointsGeom.setAttribute('position', new THREE.BufferAttribute(vertexPositions, 3));
    const pointColors = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      // color depends on painAttr (0 -> transparent small grey; 1 -> bright red)
      const p = painAttr[i] || 0;
      if (p > 0.5) { pointColors[i*3+0] = 0.9; pointColors[i*3+1] = 0.1; pointColors[i*3+2] = 0.1; }
      else { pointColors[i*3+0] = 0.1; pointColors[i*3+1] = 0.1; pointColors[i*3+2] = 0.1; }
    }
    pointsGeom.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));
    const pointsMat = new THREE.PointsMaterial({ size: 0.01, vertexColors: true, sizeAttenuation: true });
    pointsObject = new THREE.Points(pointsGeom, pointsMat);
    scene.add(pointsObject);

    // Create helper mapping from vertex index to array index (simple identity here)
    vertexToIndexMap = new Array(vertexCount);
    for (let i=0;i<vertexCount;i++) vertexToIndexMap[i] = i;

    // Cluster vertices into 36 regions (k-means)
    await computeKMeansClusters(vertexPositions, 36);

    // Position camera to view
    fitCameraToObject(mesh);

    console.log('Model loaded. Vertices:', vertexCount);

  } catch (err) {
    console.error('Error loading model:', err);
    alert('Error loading 3D model. Check console for details.');
  }
}

// Fit camera nicely to loaded mesh
function fitCameraToObject(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI/180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.3;
  camera.position.set(center.x, center.y + 0.05, cameraZ + 0.2);
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}

// Simple k-means clustering implemented in JS (vertexPositions is Float32Array length N*3)
async function computeKMeansClusters(vertexPositionsArray, k=36, iter=12) {
  const N = vertexPositionsArray.length/3;
  const points = new Array(N);
  for (let i=0;i<N;i++) points[i] = [ vertexPositionsArray[i*3], vertexPositionsArray[i*3+1], vertexPositionsArray[i*3+2] ];

  // initialize centroids by sampling
  const centroids = [];
  for (let i=0;i<k;i++) {
    const idx = Math.floor(Math.random() * N);
    centroids.push(points[idx].slice());
  }

  const assignments = new Int32Array(N);

  for (let it=0; it<iter; it++) {
    // assign
    for (let i=0;i<N;i++) {
      let best = 0;
      let bestDist = Infinity;
      const p = points[i];
      for (let c=0;c<k;c++) {
        const dx = p[0]-centroids[c][0];
        const dy = p[1]-centroids[c][1];
        const dz = p[2]-centroids[c][2];
        const d = dx*dx + dy*dy + dz*dz;
        if (d < bestDist) { bestDist = d; best = c; }
      }
      assignments[i] = best;
    }
    // recompute centroids
    const sums = new Array(k).fill(0).map(()=>[0,0,0,0]); // x,y,z,count
    for (let i=0;i<N;i++) {
      const a = assignments[i];
      sums[a][0] += points[i][0];
      sums[a][1] += points[i][1];
      sums[a][2] += points[i][2];
      sums[a][3] += 1;
    }
    for (let c=0;c<k;c++) {
      if (sums[c][3] > 0) {
        centroids[c][0] = sums[c][0] / sums[c][3];
        centroids[c][1] = sums[c][1] / sums[c][3];
        centroids[c][2] = sums[c][2] / sums[c][3];
      } else {
        // re-seed empty cluster
        const idx = Math.floor(Math.random()*N);
        centroids[c] = points[idx].slice();
      }
    }
  }

  clusterOfVertex = new Int32Array(N);
  for (let i=0;i<N;i++) clusterOfVertex[i] = assignments[i];

  // locationMarked already defined; keep it zeroed
  locationMarked = new Array(k).fill(0);

  console.log('K-means done; clusters:', k);
}

// pointer coords and intersection handling
function handlePointerEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  if (!currentMesh) return;
  const intersects = raycaster.intersectObject(currentMesh, false);
  if (intersects.length === 0) return;
  const intr = intersects[0];
  const point = intr.point;

  // find nearest vertex to the intersection point
  const nearestVertexIndex = findNearestVertex(point);
  if (nearestVertexIndex !== -1) {
    markVertex(nearestVertexIndex);
  }
}

// brute-force find nearest vertex index (acceptable for medium-sized meshes)
// returns index or -1
function findNearestVertex(point) {
  if (!vertexPositions) return -1;
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i=0;i<vertexCount;i++) {
    const x = vertexPositions[i*3+0];
    const y = vertexPositions[i*3+1];
    const z = vertexPositions[i*3+2];
    const dx = x - point.x;
    const dy = y - point.y;
    const dz = z - point.z;
    const d = dx*dx + dy*dy + dz*dz;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

// mark a vertex (set pain to 1) and update visualization and location group
function markVertex(vIndex) {
  if (!painAttr) return;
  if (painAttr[vIndex] === 1) return; // already marked
  painAttr[vIndex] = 1;

  // update points color attribute
  const colors = pointsObject.geometry.getAttribute('color').array;
  colors[vIndex*3+0] = 0.9;
  colors[vIndex*3+1] = 0.1;
