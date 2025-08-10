// ==================== CONFIG ====================
const locations = [
  { id: 1, name: "Dorsal Toe 1", marked: 0 },
  { id: 2, name: "Dorsal Toe 2", marked: 0 },
  { id: 3, name: "Dorsal Toe 3", marked: 0 },
  { id: 4, name: "Dorsal Toe 4", marked: 0 },
  { id: 5, name: "Dorsal Toe 5", marked: 0 },
  { id: 6, name: "Dorsal MTP 1", marked: 0 },
  { id: 7, name: "Dorsal MTP 2", marked: 0 },
  { id: 8, name: "Dorsal MTP 3", marked: 0 },
  { id: 9, name: "Dorsal MTP 4", marked: 0 },
  { id: 10, name: "Dorsal MTP 5", marked: 0 },
  { id: 11, name: "Dorsal Midfoot", marked: 0 },
  { id: 12, name: "Dorsal Ankle", marked: 0 },
  { id: 13, name: "Plantar Toe 1", marked: 0 },
  { id: 14, name: "Plantar Toe 2", marked: 0 },
  { id: 15, name: "Plantar Toe 3", marked: 0 },
  { id: 16, name: "Plantar Toe 4", marked: 0 },
  { id: 17, name: "Plantar Toe 5", marked: 0 },
  { id: 18, name: "Plantar MTP 1", marked: 0 },
  { id: 19, name: "Plantar MTP 2", marked: 0 },
  { id: 20, name: "Plantar MTP 3", marked: 0 },
  { id: 21, name: "Plantar MTP 4", marked: 0 },
  { id: 22, name: "Plantar MTP 5", marked: 0 },
  { id: 23, name: "Medial Arch", marked: 0 },
  { id: 24, name: "Plantar lateral", marked: 0 },
  { id: 25, name: "Plantar Heel", marked: 0 },
  { id: 26, name: "Posterior Heel", marked: 0 },
  { id: 27, name: "Posterior Insertion", marked: 0 },
  { id: 28, name: "Posterior Midportion", marked: 0 },
  { id: 29, name: "Posterior Leg", marked: 0 },
  { id: 30, name: "Medial MTP", marked: 0 },
  { id: 31, name: "Medial Midfoot", marked: 0 },
  { id: 32, name: "Posterior Medial", marked: 0 },
  { id: 33, name: "Medial Leg", marked: 0 },
  { id: 34, name: "Lateral Midfoot", marked: 0 },
  { id: 35, name: "Posterior Lateral", marked: 0 },
  { id: 36, name: "Lateral Leg", marked: 0 },
];

// ==================== SCENE ====================
let scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

let camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 0.5, 2);

let renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("three-canvas"), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

let controls = new THREE.OrbitControls(camera, renderer.domElement);

let light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
scene.add(light);

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let painting = false;

// ==================== LOAD MODELS ====================
let loader = new THREE.GLTFLoader();
const models = [
  "https://raw.githubusercontent.com/Stuart-McNeill/3DFoot/a73385a2686e49b9618aeb82bebed3a5254ac1e9/LeftFoot.glb",
  "https://raw.githubusercontent.com/Stuart-McNeill/3DFoot/a73385a2686e49b9618aeb82bebed3a5254ac1e9/RightFoot.glb"
];

models.forEach((url, i) => {
  loader.load(url, gltf => {
    let model = gltf.scene;
    model.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry = obj.geometry.toNonIndexed();
        obj.geometry.attributes.color = obj.geometry.attributes.color.clone();
        obj.material.vertexColors = true;
      }
    });
    model.position.x = i === 0 ? -0.8 : 0.8;
    scene.add(model);
  });
});

// ==================== PAINTING ====================
function onMouseMove(event) {
  if (!painting) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  let intersects = raycaster.intersectObjects(scene.children, true);
  
  if (intersects.length > 0) {
    let mesh = intersects[0].object;
    let face = intersects[0].face;
    let colors = mesh.geometry.attributes.color;

    // Paint red (or any highlight color)
    [face.a, face.b, face.c].forEach(idx => {
      colors.setX(idx, 1);
      colors.setY(idx, 0);
      colors.setZ(idx, 0);
    });
    colors.needsUpdate = true;

    // TODO: map original vertex color to location ID
    // and update locations array
  }
}

window.addEventListener("mousedown", () => painting = true);
window.addEventListener("mouseup", () => painting = false);
window.addEventListener("mousemove", onMouseMove);

// ==================== TABLE & CSV ====================
function updateTable() {
  let tbody = document.querySelector("#score-table tbody");
  tbody.innerHTML = "";
  locations.forEach(loc => {
    let tr = document.createElement("tr");
    tr.innerHTML = `<td>${loc.id}</td><td>${loc.name}</td><td>${loc.marked}</td>`;
    tbody.appendChild(tr);
  });
}
updateTable();

document.getElementById("download-csv").addEventListener("click", () => {
  let csv = "Location Number,Description,Marked\n";
  locations.forEach(loc => {
    csv += `${loc.id},${loc.name},${loc.marked}\n`;
  });
  let blob = new Blob([csv], { type: "text/csv" });
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = "foot_pain_map.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// ==================== ANIMATE ====================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
