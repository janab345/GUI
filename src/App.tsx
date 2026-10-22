import Hud from './components/Hud'
import HealthStatus from './components/HealthStatus'
import MissionProfile from './components/MissionProfile'
import Scene3D from './components/Scene3D'
import SpacecraftControl from './components/SpacecraftControl'
import SpeedControl from './components/SpeedControl'
import { useVehicle } from './sim/useVehicle'
import { tiltDeg, horizontalSpeed, PHASES, thrustOf } from './sim/vehicle'

function App() {
  const { state, toggleArm, pressKey, releaseKey, reset, setTimeScale } = useVehicle()
  const thrust = thrustOf(state)
  const phaseSpec = PHASES[state.phaseIndex]
  const phase = phaseSpec.name

  const alerts: string[] = []
  if (state.fuel < 20) alerts.push('LOW FUEL')

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>LLV PDI Console</h1>
        </div>
        <div className="header-alerts">
          {alerts.map((alert) => (
            <span key={alert} className="warning">
              {alert}
            </span>
          ))}
        </div>
        <div className="header-right">
          <span className={`status-indicator ${state.engineArmed ? '' : 'safe'}`}>
            {state.engineArmed ? 'ENGINE ARMED' : 'ENGINE SAFE'}
          </span>
        </div>
      </header>
      <main className="app-main">
        <div className="scene-container">
          <Scene3D quaternion={state.quaternion} thrust={thrust} rcs={state.rcs} />
          <div className="left-overlay">
            <MissionProfile
              currentPhase={state.phaseIndex}
              phaseRemaining={state.phaseRemaining}
              phases={PHASES}
            />
            <SpeedControl timeScale={state.timeScale} onChange={setTimeScale} />
          </div>
          <Hud state={state} thrust={thrust} tilt={tiltDeg(state.quaternion)} />
          <SpacecraftControl
            throttle={state.throttle}
            throttleKeys={state.throttleKeys}
            engineArmed={state.engineArmed}
            rcs={state.rcs}
            onToggleArm={toggleArm}
            onPressKey={pressKey}
            onReleaseKey={releaseKey}
            onReset={reset}
          />
          <HealthStatus
            altitude={state.position[1]}
            horizontalSpeed={horizontalSpeed(state)}
            verticalSpeed={state.velocity[1]}
            thrust={thrust}
            fuel={state.fuel}
            engines={phaseSpec.engines}
            rcs={phaseSpec.rcs}
            phase={phase}
          />
        </div>
      </main>
    </div>
  )
}

export default App
