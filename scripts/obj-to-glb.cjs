/**
 * Converts a large OBJ mesh into a single self-contained GLB for the 3D scene.
 *
 *   node scripts/obj-to-glb.cjs "public/V4_CX3_LANDER (Meshed).obj" public/cx3-pdi.glb [--grid 320]
 *
 * - Triangulates polygons, drops the per-face normals and rebuilds smooth
 *   (area-weighted) normals instead.
 * - Optional `--grid N` merges vertices inside an N-cell spatial grid, which
 *   shrinks a CAD export by a large factor before it reaches the browser.
 */
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const gridIndex = args.indexOf('--grid')
const gridSize = gridIndex >= 0 ? Number(args[gridIndex + 1]) : 0
const positional = args.filter((a, i) => i !== gridIndex && i !== gridIndex + 1)

const objPath = path.resolve(positional[0])
const glbPath = path.resolve(positional[1] || objPath.replace(/\.obj$/i, '') + '.glb')

/* ---------------------------------------------------------------- parse --- */

const positions = []
const faces = []

const readFile = fs.readFileSync(objPath, 'utf8')
let cursor = 0
const lineCount = readFile.length

while (cursor < lineCount) {
  let end = readFile.indexOf('\n', cursor)
  if (end === -1) end = lineCount
  const line = readFile.slice(cursor, end)
  cursor = end + 1

  if (line.charCodeAt(0) === 118 /* v */ && line.charCodeAt(1) === 32) {
    // v x y z [r g b]
    const parts = line.split(' ')
    positions.push(+parts[1], +parts[2], +parts[3])
  } else if (line.charCodeAt(0) === 102 /* f */ && line.charCodeAt(1) === 32) {
    // f a b c [d ...] (positions only; normals/uvs are ignored)
    const parts = line.trim().split(/\s+/)
    const idx = []
    for (let i = 1; i < parts.length; i++) idx.push(+parts[i].split('/')[0] - 1)
    for (let i = 1; i + 1 < idx.length; i++) faces.push(idx[0], idx[i], idx[i + 1])
  }
}

const vertexCount = positions.length / 3
console.log(`parsed ${vertexCount} vertices, ${faces.length / 3} triangles`)

/* ------------------------------------------------------------- cluster --- */

let outPositions = positions
let outFaces = faces

if (gridSize > 0) {
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (let i = 0; i < positions.length; i += 3) {
    if (positions[i] < minX) minX = positions[i]
    if (positions[i] > maxX) maxX = positions[i]
    if (positions[i + 1] < minY) minY = positions[i + 1]
    if (positions[i + 1] > maxY) maxY = positions[i + 1]
    if (positions[i + 2] < minZ) minZ = positions[i + 2]
    if (positions[i + 2] > maxZ) maxZ = positions[i + 2]
  }
  const sx = gridSize / Math.max(maxX - minX, 1e-6)
  const sy = gridSize / Math.max(maxY - minY, 1e-6)
  const sz = gridSize / Math.max(maxZ - minZ, 1e-6)

  const map = new Map()
  const clusterOf = new Int32Array(vertexCount)
  const sums = []
  const counts = []

  for (let v = 0; v < vertexCount; v++) {
    const x = positions[v * 3]
    const y = positions[v * 3 + 1]
    const z = positions[v * 3 + 2]
    const key = `${Math.floor((x - minX) * sx)},${Math.floor((y - minY) * sy)},${Math.floor((z - minZ) * sz)}`
    let id = map.get(key)
    if (id === undefined) {
      id = sums.length / 3
      map.set(key, id)
      sums.push(0, 0, 0)
      counts.push(0)
    }
    sums[id * 3] += x
    sums[id * 3 + 1] += y
    sums[id * 3 + 2] += z
    counts[id] += 1
    clusterOf[v] = id
  }

  const clustered = new Float32Array(sums.length)
  for (let i = 0; i < counts.length; i++) {
    clustered[i * 3] = sums[i * 3] / counts[i]
    clustered[i * 3 + 1] = sums[i * 3 + 1] / counts[i]
    clustered[i * 3 + 2] = sums[i * 3 + 2] / counts[i]
  }

  const keptFaces = []
  for (let i = 0; i < faces.length; i += 3) {
    const a = clusterOf[faces[i]]
    const b = clusterOf[faces[i + 1]]
    const c = clusterOf[faces[i + 2]]
    if (a === b || b === c || a === c) continue // collapsed by clustering
    keptFaces.push(a, b, c)
  }

  outPositions = Array.from(clustered)
  outFaces = keptFaces
  console.log(
    `clustered ${gridSize}^3 grid: ${vertexCount} -> ${counts.length} vertices, ` +
      `${faces.length / 3} -> ${keptFaces.length / 3} triangles`,
  )
}

/* -------------------------------------------------------------- normals --- */

const positionArray = Float32Array.from(outPositions)
const faceArray = Uint32Array.from(outFaces)
const normalArray = new Float32Array(positionArray.length)

const bboxMin = [Infinity, Infinity, Infinity]
const bboxMax = [-Infinity, -Infinity, -Infinity]
for (let i = 0; i < positionArray.length; i += 3) {
  for (let c = 0; c < 3; c++) {
    const v = positionArray[i + c]
    if (v < bboxMin[c]) bboxMin[c] = v
    if (v > bboxMax[c]) bboxMax[c] = v
  }
}

const abx = new Float32Array(3)
const acx = new Float32Array(3)
for (let i = 0; i < faceArray.length; i += 3) {
  const a = faceArray[i] * 3
  const b = faceArray[i + 1] * 3
  const c = faceArray[i + 2] * 3

  abx[0] = positionArray[b] - positionArray[a]
  abx[1] = positionArray[b + 1] - positionArray[a + 1]
  abx[2] = positionArray[b + 2] - positionArray[a + 2]
  acx[0] = positionArray[c] - positionArray[a]
  acx[1] = positionArray[c + 1] - positionArray[a + 1]
  acx[2] = positionArray[c + 2] - positionArray[a + 2]

  // cross product = 2 * area * normal, so it weights by face area
  const nx = abx[1] * acx[2] - abx[2] * acx[1]
  const ny = abx[2] * acx[0] - abx[0] * acx[2]
  const nz = abx[0] * acx[1] - abx[1] * acx[0]

  normalArray[a] += nx
  normalArray[a + 1] += ny
  normalArray[a + 2] += nz
  normalArray[b] += nx
  normalArray[b + 1] += ny
  normalArray[b + 2] += nz
  normalArray[c] += nx
  normalArray[c + 1] += ny
  normalArray[c + 2] += nz
}

for (let i = 0; i < normalArray.length; i += 3) {
  const len = Math.hypot(normalArray[i], normalArray[i + 1], normalArray[i + 2])
  if (len > 0) {
    normalArray[i] /= len
    normalArray[i + 1] /= len
    normalArray[i + 2] /= len
  } else {
    normalArray[i + 1] = 1
  }
}

/* ------------------------------------------------------------- write glb --- */

const vertexCountOut = positionArray.length / 3
const triangleCount = faceArray.length / 3

const positionBytes = Buffer.from(positionArray.buffer)
const normalBytes = Buffer.from(normalArray.buffer)
const indexBytes = Buffer.from(faceArray.buffer)

const pad4 = (n) => (4 - (n % 4)) % 4
const positionOffset = 0
const normalOffset = positionBytes.length + pad4(positionBytes.length)
const indexOffset = normalOffset + normalBytes.length + pad4(normalBytes.length)
const binLength = indexOffset + indexBytes.length

const gltf = {
  asset: { version: '2.0', generator: 'obj-to-glb' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'lander' }],
  meshes: [
    {
      name: 'lander',
      primitives: [
        {
          attributes: { POSITION: 0, NORMAL: 1 },
          indices: 2,
          material: 0,
          mode: 4,
        },
      ],
    },
  ],
  materials: [
    {
      name: 'lander',
      doubleSided: false,
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, 1],
        metallicFactor: 0.2,
        roughnessFactor: 0.55,
      },
    },
  ],
  buffers: [{ byteLength: binLength }],
  bufferViews: [
    { buffer: 0, byteOffset: positionOffset, byteLength: positionBytes.length, target: 34962 },
    { buffer: 0, byteOffset: normalOffset, byteLength: normalBytes.length, target: 34962 },
    { buffer: 0, byteOffset: indexOffset, byteLength: indexBytes.length, target: 34963 },
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: vertexCountOut,
      type: 'VEC3',
      min: bboxMin,
      max: bboxMax,
    },
    { bufferView: 1, componentType: 5126, count: vertexCountOut, type: 'VEC3' },
    { bufferView: 2, componentType: 5125, count: faceArray.length, type: 'SCALAR' },
  ],
}

const jsonText = JSON.stringify(gltf)
const jsonPadded = Buffer.concat([
  Buffer.from(jsonText, 'utf8'),
  Buffer.alloc(pad4(jsonText.length), 0x20),
])
const bin = Buffer.concat([
  positionBytes,
  Buffer.alloc(pad4(positionBytes.length), 0),
  normalBytes,
  Buffer.alloc(pad4(normalBytes.length), 0),
  indexBytes,
])

const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0)
header.writeUInt32LE(2, 4)
header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + bin.length, 8)

const jsonHeader = Buffer.alloc(8)
jsonHeader.writeUInt32LE(jsonPadded.length, 0)
jsonHeader.writeUInt32LE(0x4e4f534a, 4)

const binHeader = Buffer.alloc(8)
binHeader.writeUInt32LE(bin.length, 0)
binHeader.writeUInt32LE(0x004e4942, 4)

fs.writeFileSync(glbPath, Buffer.concat([header, jsonHeader, jsonPadded, binHeader, bin]))
console.log(
  `wrote ${glbPath}: ${vertexCountOut} vertices, ${triangleCount} triangles, ` +
    `${(fs.statSync(glbPath).size / 1e6).toFixed(1)} MB`,
)
