import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Grid } from '@react-three/drei'
import { useRef } from 'react'
import { Group } from 'three'

interface LanderProps {
  attitude: { roll: number; pitch: number; yaw: number }
  thrust: number
}

function Lander({ attitude, thrust }: LanderProps) {
  const group = useRef<Group>(null)

  useFrame(() => {
    if (group.current) {
      group.current.rotation.x = (attitude.pitch * Math.PI) / 180
      group.current.rotation.z = (attitude.roll * Math.PI) / 180
      group.current.rotation.y = (attitude.yaw * Math.PI) / 180
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
      {thrust > 0 && (
        <mesh position={[0, -1.4, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.3, 0.8, 16]} />
          <meshBasicMaterial color="#ff6600" transparent opacity={0.8} />
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
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color="#999999" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

interface Scene3DProps {
  attitude: { roll: number; pitch: number; yaw: number }
  thrust: number
}

export default function Scene3D({ attitude, thrust }: Scene3DProps) {
  return (
    <Canvas camera={{ position: [4, 3, 4], fov: 50 }}>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#4488ff" />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      <Grid args={[20, 20]} position={[0, -2, 0]} cellColor="#333333" sectionColor="#555555" />
      <Lander attitude={attitude} thrust={thrust} />
      <OrbitControls enableDamping dampingFactor={0.05} />
    </Canvas>
  )
}
