import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, OrbitControls, Stars, useGLTF } from '@react-three/drei'
import {
  useEffect,
  useMemo,
  useRef,
  Component,
  Suspense,
  type ReactNode,
} from 'react'
import {
  BufferGeometry,
  ConeGeometry,
  Group,
  Matrix3,
  Mesh,
  Quaternion,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Quat, RcsFlags } from '../sim/vehicle'

/**
 * Lander model in /public.
 *
 * `cx3-pdi.glb` is built from the FreeCAD OBJ export
 * (`V4_CX3_LANDER (Meshed).obj`) with `scripts/obj-to-glb.cjs`: one merged
 * mesh, smooth normals, spatially clustered to keep it small.
 */
const MODEL_URL =
  new URLSearchParams(window.location.search).get('model') || '/cx3-pdi.glb'

/** Height of the rendered lander in scene units. */
const MODEL_HEIGHT = 2.6

/**
 * Bounds of the CAD export (OBJ units, Y up). `GltfModel` fits the mesh to
 * MODEL_HEIGHT using these, and the nozzle positions below use the same fit.
 */
const MODEL_MIN = new Vector3(-1700.41, -1150.0, -1700.63)
const MODEL_MAX = new Vector3(1700.63, 3710.7, 1700.41)
const MODEL_SIZE = MODEL_MAX.clone().sub(MODEL_MIN)
const MODEL_CENTER = MODEL_MAX.clone().add(MODEL_MIN).multiplyScalar(0.5)
const MODEL_SCALE = MODEL_HEIGHT / MODEL_SIZE.y
const MODEL_OFFSET = new Vector3(
  -MODEL_CENTER.x * MODEL_SCALE,
  -MODEL_HEIGHT / 2 - MODEL_MIN.y * MODEL_SCALE,
  -MODEL_CENTER.z * MODEL_SCALE,
)

/** CAD coordinates -> lander-local scene coordinates. */
function toScene(x: number, y: number, z: number): [number, number, number] {
  return [
    x * MODEL_SCALE + MODEL_OFFSET.x,
    y * MODEL_SCALE + MODEL_OFFSET.y,
    z * MODEL_SCALE + MODEL_OFFSET.z,
  ]
}

/**
 * The five engine bells in the CAD mesh: one centre bell plus four in a cross.
 * Measured from the bell-exit rims (r ≈ 217 CAD units ≈ 0.116 scene units).
 */
type EngineId = 'C' | 'PX' | 'MX' | 'PZ' | 'MZ'

interface EngineBell {
  id: EngineId
  position: [number, number, number]
}

const ENGINE_BELLS: readonly EngineBell[] = [
  { id: 'C', position: toScene(12.1, -1077.0, 4.3) },
  { id: 'PX', position: toScene(845.0, -1072.4, 8.8) },
  { id: 'MX', position: toScene(-832.4, -1072.4, 14.0) },
  { id: 'PZ', position: toScene(18.6, -1072.4, 859.1) },
  { id: 'MZ', position: toScene(21.4, -1072.4, -857.2) },
]

/**
 * Which bells fire for the engine count of the current phase (see PHASES in
 * sim/vehicle.ts). Shutdowns stay symmetric: the centre bell drops out for the
 * four-outer-engine phase, and only the centre runs for the final hover.
 */
const ALL_BELLS: ReadonlySet<EngineId> = new Set(ENGINE_BELLS.map((b) => b.id))
const OUTER_BELLS: ReadonlySet<EngineId> = new Set(['PX', 'MX', 'PZ', 'MZ'])
const THREE_BELLS: ReadonlySet<EngineId> = new Set(['C', 'PX', 'MX'])
const CENTRE_BELL: ReadonlySet<EngineId> = new Set(['C'])

function enginesFor(count: number): ReadonlySet<EngineId> {
  if (count >= 5) return ALL_BELLS
  if (count === 4) return OUTER_BELLS
  if (count === 3) return THREE_BELLS
  return CENTRE_BELL
}

/** Unit plume: base at the origin, apex one unit below. */
const FLAME_GEOMETRY = (() => {
  const geometry = new ConeGeometry(1, 1, 20, 1, true)
  geometry.rotateX(Math.PI)
  geometry.translate(0, -0.5, 0)
  return geometry
})()

/** Slight per-bell trim so the five plumes do not look stamped out. */
const FLAME_TRIM = [1, 0.94, 0.97, 0.92, 0.95]

/**
 * Lateral RCS nozzles: the two thruster pods closest to each side of the upper
 * outrigger (the outer pair of the corner pods). Left/right arrows pitch the
 * vehicle, so only these two pairs are used.
 */
interface RcsNozzle {
  id: string
  side: 'left' | 'right'
  position: [number, number, number]
}

const RCS_NOZZLES: readonly RcsNozzle[] = [
  { id: 'R1', side: 'right', position: toScene(916.0, 2214.0, 671.0) },
  { id: 'R2', side: 'right', position: toScene(916.0, 2213.0, -700.0) },
  { id: 'L1', side: 'left', position: toScene(-916.0, 2213.0, 672.0) },
  { id: 'L2', side: 'left', position: toScene(-916.0, 2214.0, -700.0) },
]

/** Unit RCS jet: base at the origin, apex one unit along +Y (rotated per side). */
const RCS_GEOMETRY = (() => {
  const geometry = new ConeGeometry(1, 1, 12, 1, true)
  geometry.translate(0, 0.5, 0)
  return geometry
})()

interface LanderProps {
  quaternion: Quat
  thrust: number
  rcs: RcsFlags
  engines: number
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

  componentDidCatch(error: Error) {
    console.warn(
      '[Scene3D] Lander model failed to load. Is the companion buffer ' +
        '`CX3 for PDI.bin` present in /public?',
      error,
    )
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

function Lander({ quaternion, thrust, rcs, engines }: LanderProps) {
  const group = useRef<Group>(null)
  const flames = useRef<(Group | null)[]>([])
  const power = useRef<number[]>(ENGINE_BELLS.map(() => 0))
  const rcsPlumes = useRef<(Group | null)[]>([])
  const rcsPower = useRef<{ left: number; right: number }>({ left: 0, right: 0 })
  const lit = useMemo(() => enginesFor(engines), [engines])
  const litRef = useRef(lit)
  const target = useMemo(() => new Quaternion(...quaternion), [quaternion])

  useEffect(() => {
    litRef.current = lit
  }, [lit])

  useFrame(({ clock }, delta) => {
    if (group.current) {
      // Render-loop smoothing: state arrives at ~30 Hz, the cone still turns smoothly.
      group.current.quaternion.slerp(target, 1 - Math.exp(-14 * delta))
    }

    const t = clock.elapsedTime
    ENGINE_BELLS.forEach((bell, i) => {
      const plume = flames.current[i]
      if (!plume) return

      // Fade each bell in/out so shutdowns read as a spool-down, not a pop.
      const wanted = thrust > 0.01 && litRef.current.has(bell.id) ? 1 : 0
      const level = power.current[i] + (wanted - power.current[i]) * (1 - Math.exp(-9 * delta))
      power.current[i] = level

      plume.visible = level > 0.02
      if (!plume.visible) return

      const flicker =
        1 + 0.05 * Math.sin(t * 47 + i * 2.1) + 0.03 * Math.sin(t * 29 + i * 1.3)
      const trim = FLAME_TRIM[i]
      const radius = (0.095 + 0.025 * thrust) * level * flicker * trim
      const length = (0.26 + 0.95 * thrust) * level * flicker * trim
      plume.scale.set(radius, length, radius)
    })

    // RCS spool the same way; each side has its own pair of lateral nozzles.
    RCS_NOZZLES.forEach((nozzle, i) => {
      const plume = rcsPlumes.current[i]
      if (!plume) return

      const wanted = (nozzle.side === 'right' ? rcs.right : rcs.left) ? 1 : 0
      const current = rcsPower.current[nozzle.side]
      const level = current + (wanted - current) * (1 - Math.exp(-16 * delta))
      rcsPower.current[nozzle.side] = level

      plume.visible = level > 0.03
      if (!plume.visible) return

      const flicker = 1 + 0.08 * Math.sin(t * 61 + i * 1.7)
      const radius = (0.05 + 0.02 * level) * flicker
      const length = (0.26 + 0.16 * level) * level * flicker
      plume.scale.set(radius, length, radius)
    })
  })

  return (
    <group ref={group}>
      <ModelBoundary fallback={<PlaceholderModel />}>
        <Suspense fallback={<PlaceholderModel />}>
          <GltfModel />
        </Suspense>
      </ModelBoundary>

      {/* One plume per engine bell: a dim orange envelope and a hot core. */}
      {ENGINE_BELLS.map((bell, i) => (
        <group
          key={bell.id}
          position={bell.position}
          ref={(node) => {
            flames.current[i] = node
          }}
          visible={false}
        >
          <mesh geometry={FLAME_GEOMETRY}>
            <meshBasicMaterial
              color="#ff5a00"
              transparent
              opacity={0.55}
              depthWrite={false}
              side={2}
            />
          </mesh>
          <mesh geometry={FLAME_GEOMETRY} scale={[0.5, 0.8, 0.5]}>
            <meshBasicMaterial
              color="#ffcf8a"
              transparent
              opacity={0.85}
              depthWrite={false}
              side={2}
            />
          </mesh>
        </group>
      ))}

      {/* Engine-bay glow on the underside of the lander. */}
      <pointLight
        position={[0, -1.5, 0]}
        color="#ff7a1a"
        intensity={thrust * 2.5}
        distance={3.5}
        decay={2}
      />

      {/* Lateral RCS: the two thruster pods on each side of the upper outrigger. */}
      {RCS_NOZZLES.map((nozzle, i) => (
        <group
          key={nozzle.id}
          position={nozzle.position}
          rotation={[0, 0, nozzle.side === 'right' ? -Math.PI / 2 : Math.PI / 2]}
          ref={(node) => {
            rcsPlumes.current[i] = node
          }}
          visible={false}
        >
          <mesh geometry={RCS_GEOMETRY}>
            <meshBasicMaterial
              color="#5aa6ff"
              transparent
              opacity={0.5}
              depthWrite={false}
              side={2}
            />
          </mesh>
          <mesh geometry={RCS_GEOMETRY} scale={[0.45, 0.72, 0.45]}>
            <meshBasicMaterial
              color="#dceeff"
              transparent
              opacity={0.85}
              depthWrite={false}
              side={2}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

interface Scene3DProps {
  quaternion: Quat
  thrust: number
  rcs: RcsFlags
  engines: number
}

export default function Scene3D({ quaternion, thrust, rcs, engines }: Scene3DProps) {
  return (
    <Canvas camera={{ position: [5.26, 2.7, 2.45], fov: 50 }}>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 8, 5]} intensity={2.2} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#4488ff" />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      <Grid args={[20, 20]} position={[0, -2, 0]} cellColor="#333333" sectionColor="#555555" />
      <Lander quaternion={quaternion} thrust={thrust} rcs={rcs} engines={engines} />
      <OrbitControls enableDamping dampingFactor={0.05} />
    </Canvas>
  )
}
