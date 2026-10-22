import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, OrbitControls, Stars } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { Group, Mesh, Quaternion } from 'three'
import type { Quat, RcsFlags } from '../sim/vehicle'

interface LanderProps {
  quaternion: Quat
  thrust: number
  rcs: RcsFlags
}

function Lander({ quaternion, thrust, rcs }: LanderProps) {
  const group = useRef<Group>(null)
  const flame = useRef<Mesh>(null)
  const target = useMemo(() => new Quaternion(...quaternion), [quaternion])

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
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1.2, 16]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, -0.8, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.4, 0.6, 16, 1, true]} />
        <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} side={2} />
      </mesh>

      {/* Nose boom: makes yaw (heading) visible on screen. */}
      <mesh position={[0, 0.25, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.9, 8]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.25, 1.22]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>

      <mesh ref={flame} position={[0, -1.35, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.3, 0.8, 16]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.85} />
      </mesh>

      {/* Two RCS jets: left fires on ArrowLeft, right on ArrowRight. */}
      {rcs.left && (
        <mesh position={[-0.72, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.4, 10]} />
          <meshBasicMaterial color="#66aaff" transparent opacity={0.8} />
        </mesh>
      )}
      {rcs.right && (
        <mesh position={[0.72, 0.3, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.4, 10]} />
          <meshBasicMaterial color="#66aaff" transparent opacity={0.8} />
        </mesh>
      )}

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
              <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.8, 0]}>
              <cylinderGeometry args={[0.08, 0.12, 0.05, 8]} />
              <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        )
      })}
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
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#4488ff" />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      <Grid args={[20, 20]} position={[0, -2, 0]} cellColor="#333333" sectionColor="#555555" />
      <Lander quaternion={quaternion} thrust={thrust} rcs={rcs} />
      <OrbitControls enableDamping dampingFactor={0.05} />
    </Canvas>
  )
}
