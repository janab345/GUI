import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, OrbitControls, Stars, useGLTF } from '@react-three/drei'
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { BufferGeometry, Group, Matrix3, Mesh, Quaternion, Vector3 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Quat, RcsFlags } from '../sim/vehicle'

/**
 * CAD export of the CX-3 lander. The .gltf is a JSON file that references an
 * external buffer (`CX3 for PDI.bin`) that must sit next to it in /public.
 */
const MODEL_URL =
  new URLSearchParams(window.location.search).get('model') || '/CX3 for PDI.gltf'

/** Height of the rendered lander in scene units. */
const MODEL_HEIGHT = 2.6

interface LanderProps {
  quaternion: Quat
  thrust: number
  rcs: RcsFlags
}

/** Shows the placeholder if the GLTF cannot be fetched (e.g. missing .bin). */
class ModelBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * The CAD export arrives as hundreds of small meshes. They are merged into one
 * geometry (all share a single material) and scaled so the lander sits on the
 * origin with its engine bell at the bottom.
 */
function GltfModel() {
  const { scene } = useGLTF(MODEL_URL)

  const geometry = useMemo(() => {
    const parts: BufferGeometry[] = []
    scene.updateMatrixWorld(true)

    scene.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return

      const source = mesh.geometry.index
        ? mesh.geometry.toNonIndexed()
        : mesh.geometry.clone()
      const baked = new BufferGeometry()
      baked.setAttribute(
        'position',
        source.getAttribute('position').clone().applyMatrix4(mesh.matrixWorld),
      )
      const normal = source.getAttribute('normal')
      if (normal) {
        baked.setAttribute(
          'normal',
          normal
            .clone()
            .applyNormalMatrix(new Matrix3().getNormalMatrix(mesh.matrixWorld)),
        )
      }
      parts.push(baked)
      source.dispose()
    })

    const merged = mergeGeometries(parts, false)
    parts.forEach((part) => part.dispose())
    return merged
  }, [scene])

  const placement = useMemo(() => {
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (!box) return { scale: 1, offset: new Vector3() }

    const size = new Vector3()
    box.getSize(size)
    const center = new Vector3()
    box.getCenter(center)
    const scale = MODEL_HEIGHT / Math.max(size.y, 0.0001)

    return {
      scale,
      offset: new Vector3(
        -center.x * scale,
        -MODEL_HEIGHT / 2 - box.min.y * scale,
        -center.z * scale,
      ),
    }
  }, [geometry])

  return (
    <mesh geometry={geometry} position={placement.offset} scale={placement.scale}>
      <meshStandardMaterial
        color="#535353"
        metalness={0.2}
        roughness={0.55}
        emissive="#535353"
        emissiveIntensity={0.35}
        side={2}
      />
    </mesh>
  )
}

/** Primitive lander, used until the GLTF is available. */
function PlaceholderModel() {
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1.2, 16]} />
        <meshStandardMaterial color="#535353" metalness={0.2} roughness={0.55} emissive="#535353" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#535353" metalness={0.2} roughness={0.45} emissive="#535353" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, -0.8, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.4, 0.6, 16, 1, true]} />
        <meshStandardMaterial color="#535353" metalness={0.2} roughness={0.6} emissive="#535353" emissiveIntensity={0.3} side={2} />
      </mesh>

      {/* Nose boom: makes the tilt direction visible on screen. */}
      <mesh position={[0, 0.25, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.9, 8]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.25, 1.22]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>

      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI * 2) / 4
        const x = Math.cos(angle) * 0.6
        const z = Math.sin(angle) * 0.6
        return (
          <group
            key={i}
            position={[x, -0.6, z]}
            rotation={[Math.sin(angle) * 0.3, 0, -Math.cos(angle) * 0.3]}
          >
            <mesh position={[0, -0.4, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
              <meshStandardMaterial color="#535353" metalness={0.2} roughness={0.55} emissive="#535353" emissiveIntensity={0.35} />
            </mesh>
            <mesh position={[0, -0.8, 0]}>
              <cylinderGeometry args={[0.08, 0.12, 0.05, 8]} />
              <meshStandardMaterial color="#535353" metalness={0.2} roughness={0.7} emissive="#535353" emissiveIntensity={0.25} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

function Lander({ quaternion, thrust, rcs }: LanderProps) {
  const group = useRef<Group>(null)
  const flame = useRef<Mesh>(null)
  const target = useMemo(() => new Quaternion(...quaternion), [quaternion])
  const three = useThree()
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__llvScene = three.scene
  }, [three.scene])

  useFrame((_, delta) => {
    if (group.current) {
      // Render-loop smoothing: state arrives at ~30 Hz, the cone still turns smoothly.
      group.current.quaternion.slerp(target, 1 - Math.exp(-14 * delta))
    }
    if (flame.current) {
      flame.current.visible = thrust > 0.01
      const spread = 0.65 + 0.45 * thrust
      flame.current.scale.set(spread, 0.35 + 1.15 * thrust, spread)
    }
  })

  return (
    <group ref={group}>
      <ModelBoundary fallback={<PlaceholderModel />}>
        <Suspense fallback={<PlaceholderModel />}>
          <GltfModel />
        </Suspense>
      </ModelBoundary>

      <mesh ref={flame} position={[0, -1.7, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.3, 0.8, 16]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.85} />
      </mesh>

      {/* Two RCS jets: left fires on ArrowLeft, right on ArrowRight. */}
      {rcs.left && (
        <mesh position={[-0.8, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.4, 10]} />
          <meshBasicMaterial color="#66aaff" transparent opacity={0.8} />
        </mesh>
      )}
      {rcs.right && (
        <mesh position={[0.8, 0.3, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.4, 10]} />
          <meshBasicMaterial color="#66aaff" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}

interface Scene3DProps {
  quaternion: Quat
  thrust: number
  rcs: RcsFlags
}

export default function Scene3D({ quaternion, thrust, rcs }: Scene3DProps) {
  return (
    <Canvas camera={{ position: [4, 3, 4], fov: 50 }}>
      <color attach="background" args={['#171717']} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 8, 5]} intensity={2.2} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#4488ff" />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      <Grid args={[20, 20]} position={[0, -2, 0]} cellColor="#333333" sectionColor="#555555" />
      <Lander quaternion={quaternion} thrust={thrust} rcs={rcs} />
      <OrbitControls enableDamping dampingFactor={0.05} />
    </Canvas>
  )
}
