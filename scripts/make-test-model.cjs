// Generates a tiny 3-mesh glTF (external .bin) to validate the loader pipeline.
const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '..', 'public')
const verts = [
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
  [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
]
const norms = [
  [0, 0, -1], [0, 0, -1], [0, 0, 1], [0, 0, 1],
  [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0],
]
const indices = [
  0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7,
  0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2,
  0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
]

const posBuf = Buffer.alloc(verts.length * 12)
verts.forEach((v, i) => posBuf.writeFloatLE(v[0], i * 12) || posBuf.writeFloatLE(v[1], i * 12 + 4) || posBuf.writeFloatLE(v[2], i * 12 + 8))
const normBuf = Buffer.alloc(norms.length * 12)
norms.forEach((v, i) => normBuf.writeFloatLE(v[0], i * 12) || normBuf.writeFloatLE(v[1], i * 12 + 4) || normBuf.writeFloatLE(v[2], i * 12 + 8))
const idxBuf = Buffer.alloc(indices.length * 2)
indices.forEach((v, i) => idxBuf.writeUInt16LE(v, i * 2))

const posOffset = 0
const normOffset = posBuf.length
const idxOffset = normOffset + normBuf.length
const total = idxOffset + idxBuf.length

fs.writeFileSync(path.join(outDir, 'test-model.bin'), Buffer.concat([posBuf, normBuf, idxBuf]))

const gltf = {
  asset: { version: '2.0', generator: 'test' },
  scene: 0,
  scenes: [{ nodes: [0, 1, 2] }],
  nodes: [
    { mesh: 0, translation: [0, 0.8, 0] },
    { mesh: 0, translation: [0.6, 0.2, 0], rotation: [0, 0, 0.3826834, 0.9238795] },
    { mesh: 0, translation: [-0.6, 0.2, 0], scale: [0.7, 0.7, 0.7] },
  ],
  meshes: [
    {
      name: 'box',
      primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }],
    },
  ],
  materials: [{ name: 'mat', pbrMetallicRoughness: { baseColorFactor: [0.59, 0.64, 0.85, 1] } }],
  buffers: [{ uri: 'test-model.bin', byteLength: total }],
  bufferViews: [
    { buffer: 0, byteOffset: posOffset, byteLength: posBuf.length, target: 34962 },
    { buffer: 0, byteOffset: normOffset, byteLength: normBuf.length, target: 34962 },
    { buffer: 0, byteOffset: idxOffset, byteLength: idxBuf.length, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: verts.length, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
    { bufferView: 1, componentType: 5126, count: norms.length, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: indices.length, type: 'SCALAR' },
  ],
}

fs.writeFileSync(path.join(outDir, 'test-model.gltf'), JSON.stringify(gltf, null, 2))
console.log('wrote test-model.gltf + test-model.bin', total, 'bytes')
