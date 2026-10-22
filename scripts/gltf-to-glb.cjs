/**
 * Packs a .gltf + its external .bin into a single self-contained .glb.
 *
 *   node scripts/gltf-to-glb.cjs "public/CX3 for PDI.gltf" "public/CX3 for PDI.glb"
 *
 * The .gltf is left untouched; the .glb can be dropped into /public and used
 * as the lander model (see MODEL_URL in src/components/Scene3D.tsx).
 */
const fs = require('fs')
const path = require('path')

const [, , gltfArg, glbArg] = process.argv
if (!gltfArg) {
  console.error('usage: node scripts/gltf-to-glb.cjs <file.gltf> [out.glb]')
  process.exit(1)
}

const gltfPath = path.resolve(gltfArg)
const glbPath = path.resolve(glbArg || gltfPath.replace(/\.gltf$/i, '') + '.glb')

const gltf = JSON.parse(fs.readFileSync(gltfPath, 'utf8'))
const buffers = gltf.buffers || []
if (buffers.length !== 1) {
  console.error(`expected exactly one buffer, found ${buffers.length}`)
  process.exit(1)
}

const buffer = buffers[0]
if (!buffer.uri) {
  console.error('buffer has no uri - the file is already packed')
  process.exit(1)
}

const binPath = path.resolve(path.dirname(gltfPath), decodeURIComponent(buffer.uri))
if (!fs.existsSync(binPath)) {
  console.error(`missing buffer file: ${binPath}`)
  process.exit(1)
}

const bin = fs.readFileSync(binPath)
if (buffer.byteLength && bin.length !== buffer.byteLength) {
  console.warn(`warning: buffer byteLength ${buffer.byteLength} != file size ${bin.length}`)
}

delete buffer.uri

const jsonText = JSON.stringify(gltf)
const jsonPadded = Buffer.concat([
  Buffer.from(jsonText, 'utf8'),
  Buffer.alloc((4 - (jsonText.length % 4)) % 4, 0x20),
])
const binPadded = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4, 0)])

const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0) // 'glTF'
header.writeUInt32LE(2, 4)
header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binPadded.length, 8)

const jsonHeader = Buffer.alloc(8)
jsonHeader.writeUInt32LE(jsonPadded.length, 0)
jsonHeader.writeUInt32LE(0x4e4f534a, 4) // 'JSON'

const binHeader = Buffer.alloc(8)
binHeader.writeUInt32LE(binPadded.length, 0)
binHeader.writeUInt32LE(0x004e4942, 4) // 'BIN\\0'

fs.writeFileSync(
  glbPath,
  Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binPadded]),
)
console.log(`wrote ${glbPath} (${(fs.statSync(glbPath).size / 1e6).toFixed(2)} MB)`)
