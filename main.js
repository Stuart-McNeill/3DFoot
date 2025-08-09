import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js'

const canvas = document.querySelector('#canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf0f0f0)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 1, 3)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = false

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1)
scene.add(light)

const loader = new GLTFLoader()
let footModel
let currentFoot = 'right'
let drawMode = false
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const decals = []

function loadFoot(side) {
  if (footModel) scene.remove(footModel)
  loader.load(`${side}_foot.glb`, gltf => {
    footModel = gltf.scene
    footModel.rotation.y = Math.PI // adjust orientation if needed
    scene.add(footModel)
    decals.length = 0
  })
}

function drawDecal(intersect) {
  const decal = new THREE.Mesh(
    new DecalGeometry(
      intersect.object,
      intersect.point,
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0.05, 0.05, 0.05)
    ),
    new THREE.MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 })
  )
  scene.add(decal)
  decals.push(decal)
}

canvas.addEventListener('pointerdown', e => {
  if (!drawMode || !footModel) return
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObject(footModel, true)
  if (intersects.length > 0) drawDecal(intersects[0])
})

document.getElementById('leftBtn').onclick = () => {
  currentFoot = 'left'
  loadFoot('left')
}
document.getElementById('rightBtn').onclick = () => {
  currentFoot = 'right'
  loadFoot('right')
}
document.getElementById('rotateBtn').onclick = () => {
  controls.autoRotate = !controls.autoRotate
}
document.getElementById('drawBtn').onclick = () => {
  drawMode = !drawMode
  document.getElementById('drawBtn').style.background = drawMode ? '#cfc' : ''
}
document.getElementById('undoBtn').onclick = () => {
  const last = decals.pop()
  if (last) scene.remove(last)
}
document.getElementById('clearBtn').onclick = () => {
  decals.forEach(d => scene.remove(d))
  decals.length = 0
}
document.getElementById('submitBtn').onclick = () => {
  const points = decals.map(d => d.position)
  const regions = identifyRegions(points)
  console.log({
    foot: currentFoot,
    regions
  })
}

function identifyRegions(points) {
  // Stub: Replace with bounding boxes or zones
  return points.map(p => `Region near (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`)
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()

loadFoot(currentFoot)
