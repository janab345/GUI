import Hud from './components/Hud'
import HealthStatus from './components/HealthStatus'
import MissionProfile from './components/MissionProfile'
import Scene3D from './components/Scene3D'
import SpacecraftControl from './components/SpacecraftControl'
import { useVehicle } from './sim/useVehicle'
import { headingDeg, horizontalSpeed, PHASES, thrustOf } from './sim/vehicle'

function App() {
  const { state, toggleArm, pressKey, releaseKey } = useVehicle()
  const thrust = thrustOf(state)
  const phase = PHASES[state.phaseIndex]

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>ORBITBeyond — LLV PDI Console</h1>
          <p className="app-subtitle">Day 1 · visualization mode · no gravity</p>
        </div>
        <span className={`status-indicator ${state.engineArmed ? '' : 'safe'}`}>
          {state.engineArmed ? 'ENGINE ARMED' : 'ENGINE SAFE'}
        </span>
      </header>
      <main className="app-main">
        <div className="scene-container">
          <Scene3D quaternion={state.quaternion} thrust={thrust} rcs={state.rcs} />
          <Hud state={state} thrust={thrust} heading={headingDeg(state.quaternion)} />
        </div>
        <aside className="sidebar">
          <MissionProfile
            currentPhase={state.phaseIndex}
            phaseRemaining={state.phaseRemaining}
            phases={PHASES}
          />
          <SpacecraftControl
            throttle={state.throttle}
            engineArmed={state.engineArmed}
            rcs={state.rcs}
            onToggleArm={toggleArm}
            onPressKey={pressKey}
            onReleaseKey={releaseKey}
          />
          <HealthStatus
            altitude={state.position[1]}
            horizontalSpeed={horizontalSpeed(state)}
            verticalSpeed={state.velocity[1]}
            thrust={thrust}
            fuel={state.fuel}
            engineArmed={state.engineArmed}
            phase={phase}
          />
        </aside>
      </main>
    </div>
  )
}

export default App
