import { useState } from 'react'
import Scene3D from './components/Scene3D'
import MissionProfile from './components/MissionProfile'
import SpacecraftControl from './components/SpacecraftControl'
import HealthStatus from './components/HealthStatus'

const PHASES = ['Approach', 'Braking', 'Descent', 'Terminal', 'Landed']

function App() {
  const [attitude, setAttitude] = useState({ roll: 0, pitch: 0, yaw: 0 })
  const [ignitionOn, setIgnitionOn] = useState(false)
  const [throttle, setThrottle] = useState(0.5)
  const [currentPhase, setCurrentPhase] = useState(0)

  const handleAttitudeChange = (axis: 'roll' | 'pitch' | 'yaw', value: number) => {
    setAttitude((prev) => ({ ...prev, [axis]: value }))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>ORBITBeyond — LLV PDI Console</h1>
        <span className="status-indicator">LIVE</span>
      </header>
      <main className="app-main">
        <div className="scene-container">
          <Scene3D attitude={attitude} thrust={ignitionOn ? throttle : 0} />
        </div>
        <aside className="sidebar">
          <MissionProfile currentPhase={currentPhase} phases={PHASES} />
          <SpacecraftControl
            ignitionOn={ignitionOn}
            throttle={throttle}
            attitude={attitude}
            currentPhase={currentPhase}
            onIgnitionToggle={() => setIgnitionOn(!ignitionOn)}
            onThrottleChange={setThrottle}
            onAttitudeChange={handleAttitudeChange}
            onPhaseSelect={setCurrentPhase}
          />
          <HealthStatus throttle={throttle} ignitionOn={ignitionOn} />
        </aside>
      </main>
    </div>
  )
}

export default App
