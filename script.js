// script.js (module)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';

const MODEL_RAW_BASE = 'https://raw.githubusercontent.com/Stuart-McNeill/3DFoot/0adeb78b5222fba98f120691101f627f153bf482/';
const RIGHT_MODEL = MODEL_RAW_BASE + 'RightFoot.glb';
const LEFT_MODEL  = MODEL_RAW_BASE + 'LeftFoot.glb';

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

const canvas = document.getElementById('footCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth * 0.9, window.innerHeight * 0.7);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f5f9);

const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(0, 0.9, 2.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 7);
scene.add(dir);

let currentMesh = null;
let vertexPositions = null;
let painAttr = null;
let clusterOfVertex = null;
let locationMarked = new Array(36).fill(0);
let pointsObject = null;
let vertexCount = 0;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let isDown = false;

document.getElementById('downloadBtn').addEventListener('click', downloadCSV);
document.getElementById('clearBtn').addEventListener('click', clearAllMarks);
document.getElementById('footSelect').addEventListener('change', (e) => {
  loadModel(e.target.value === 'right' ? RIGHT_MODEL : LEFT_MODEL);
});

renderer.domElement.addEventListener('pointerdown', (e) => { isDown = true; handlePointerEvent(e); });
window.addEventListener('pointerup', () => { isDown = false; });
renderer.domElement.addEventListener('pointermove', (e) => { if (isDown) handlePointerEvent(e); });
renderer.domElement.addEventListener('click', handlePointerEvent);

window.addEventListener('resize', onWindowResize);

loadModel(RIGHT_MODEL);
animate();

function onWindowResize() {
  const w = window.innerWidth * 0.9;
  const h = window.innerHeight * 0.7;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

async function loadModel(url) {
  if (currentMesh) {
    scene.remove(currentMesh);
    if (pointsObject) scene.remove(pointsObject);
  }
  vertexPositions = null;
  painAttr = null;
  clusterOfVertex = null;
  locationMarked.fill(0);

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);

  let mesh = null;
  gltf.scene.traverse((child) => {
    if (!mesh && child.isMesh) mesh = child;
  });
  if (!mesh) return;

  let geom = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  mesh = new THREE.Mesh(geom, mesh.material.clone());

  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxSide = Math.max(size.x, size.y, size.z);
  const scale = 1.6 / maxSide;
  mesh.scale.setScalar(scale);
  box.setFromObject(mesh);
  const center = new THREE.Vector3();
  box.getCenter(center);
  mesh.position.sub(center.multiplyScalar(scale));

  scene.add(mesh);
  currentMesh = mesh;

  const posAttr = geom.getAttribute('position');
  vertexCount = posAttr.count;
  vertexPositions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount * 3; i++) vertexPositions[i] = posAttr.array[i];

  let painAttribute = geom.getAttribute('pain_level');
  if (!painAttribute) {
    painAttribute = new THREE.BufferAttribute(new Float32Array(vertexCount), 1);
    geom.setAttribute('pain_level', painAttribute);
  }
  painAttr = painAttribute.array;

  const pointsGeom = new THREE.BufferGeometry();
  pointsGeom.setAttribute('position', new THREE.BufferAttribute(vertexPositions, 3));
  const pointColors = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    pointColors[i*3] = 0.1; pointColors[i*3+1] = 0.1; pointColors[i*3+2] = 0.1;
  }
  pointsGeom.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));
  pointsObject = new THREE.Points(pointsGeom, new THREE.PointsMaterial({ size: 0.01, vertexColors: true }));
  scene.add(pointsObject);

  await computeKMeansClusters(vertexPositions, 36);
  fitCameraToObject(mesh);
}

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
}

async function computeKMeansClusters(arr, k=36, iter=12) {
  const N = arr.length / 3;
  const points = [];
  for (let i=0;i<N;i++) points.push([arr[i*3], arr[i*3+1], arr[i*3+2]]);

  const centroids = [];
  for (let i=0;i<k;i++) centroids.push(points[Math.floor(Math.random()*N)].slice());
  const assignments = new Int32Array(N);

  for (let it=0; it<iter; it++) {
    for (let i=0;i<N;i++) {
      let best = 0, bestDist = Infinity;
      for (let c=0;c<k;c++) {
        const dx = points[i][0]-centroids[c][0];
        const dy = points[i][1]-centroids[c][1];
        const dz = points[i][2]-centroids[c][2];
        const d = dx*dx + dy*dy + dz*dz;
        if (d < bestDist) { bestDist = d; best = c; }
      }
      assignments[i] = best;
    }
    const sums = Array.from({length:k}, () => [0,0,0,0]);
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
      }
    }
  }
  clusterOfVertex = assignments;
}

function handlePointerEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  if (!currentMesh) return;
  const intersects = raycaster.intersectObject(currentMesh, false);
  if (intersects.length === 0) return;
  const point = intersects[0].point;

  let bestIdx = -1, bestDist = Infinity;
  for (let i=0;i<vertexCount;i++) {
    const dx = vertexPositions[i*3] - point.x;
    const dy = vertexPositions[i*3+1] - point.y;
    const dz = vertexPositions[i*3+2] - point.z;
    const d = dx*dx + dy*dy + dz*dz;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  if (bestIdx >= 0) markVertex(bestIdx);
}

function markVertex(vIndex) {
  if (painAttr[vIndex] === 1) return;
  painAttr[vIndex] = 1;

  const colors = pointsObject.geometry.getAttribute('color').array;
  colors[vIndex*3] = 0.9; colors[vIndex*3+1] = 0.1; colors[vIndex*3+2] = 0.1;
  pointsObject.geometry.getAttribute('color').needsUpdate = true;

  if (clusterOfVertex) {
    const clusterId = clusterOfVertex[vIndex];
    if (clusterId >=0 && clusterId < locationMarked.length) locationMarked[clusterId] = 1;
  }
}

function clearAllMarks() {
  if (!vertexCount) return;
  for (let i=0;i<vertexCount;i++) painAttr[i] = 0;
  const colors = pointsObject.geometry.getAttribute('color').array;
  for (let i=0;i<vertexCount;i++) {
    colors[i*3] = 0.1; colors[i*3+1] = 0.1; colors[i*3+2] = 0.1;
  }
  pointsObject.geometry.getAttribute('color').needsUpdate = true;
  locationMarked.fill(0);
}

function downloadCSV() {
  const headers = ['Location Number','Description','Marked'];
  const rows = [headers.join(',')];
  for (let i=0;i<36;i++) {
    const desc = LOCATION_DESCRIPTIONS[i] || `Location ${i+1}`;
    const mark = locationMarked[i] === 1 ? 1 : 0;
    rows.push(`${i+1},"${desc}",${mark}`);
  }
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'foot_pain_marks.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
