import { useEffect, useState } from 'react'
import HealthStatus from './components/HealthStatus'
import MissionProfile from './components/MissionProfile'
import NavigationPanel from './components/NavigationPanel'
import RawStatePanel from './components/RawStatePanel'
import Scene3D from './components/Scene3D'
import SpacecraftControl from './components/SpacecraftControl'
import SpeedControl from './components/SpeedControl'
import TrajectoryView from './components/TrajectoryView'
import { deriveNav } from './sim/nav'
import { useVehicle } from './sim/useVehicle'
import { tiltDeg, PHASES, thrustOf } from './sim/vehicle'

function App() {
  const { state, toggleArm, pressKey, releaseKey, reset, setTimeScale } = useVehicle()
  const [screen, setScreen] = useState<'b' | 'a'>('b')
  const [rawOpen, setRawOpen] = useState(false)
  const nav = deriveNav(state)

  useEffect(() => {
    if (screen !== 'b') return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      if (event.key === 'Enter') {
        event.preventDefault()
        setRawOpen((open) => !open)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [screen])

  const thrust = thrustOf(state)
  const phaseSpec = PHASES[state.phaseIndex]
  const phase = phaseSpec.name

  const alerts: string[] = []
  if (state.fuel < 20) alerts.push('LOW FUEL')

  const isScreenB = screen === 'b'
  const isScreenA = screen === 'a'

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left header-nav">
          {isScreenB ? (
            <span className="nav-current">3D STATE</span>
          ) : (
            <button className="nav-btn" onClick={() => setScreen('b')}>
              3D STATE
            </button>
          )}
          {isScreenA ? (
            <span className="nav-current">PDI CONSOLE</span>
          ) : (
            <button className="nav-btn" onClick={() => setScreen('a')}>
              PDI CONSOLE
            </button>
          )}
          <span className="nav-divider">|</span>
          <span className="nav-subtitle">OBI PDI SIMULATOR</span>
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
        {isScreenB && (
          <div className="scene-container">
            <Scene3D
              quaternion={state.quaternion}
              thrust={thrust}
              rcs={state.rcs}
              engines={phaseSpec.engines}
            />

            <div className="top-left-stack">
              <MissionProfile
                currentPhase={state.phaseIndex}
                phaseRemaining={state.phaseRemaining}
                phases={PHASES}
              />
              <SpeedControl timeScale={state.timeScale} onChange={setTimeScale} />
            </div>
            <div className="right-rail">
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
              <NavigationPanel nav={nav} />
              <HealthStatus
                thrust={thrust}
                fuel={state.fuel}
                engines={phaseSpec.engines}
                rcs={phaseSpec.rcs}
                phase={phase}
                tilt={tiltDeg(state.quaternion)}
              />
            </div>
            {rawOpen && (
              <RawStatePanel state={state} onClose={() => setRawOpen(false)} />
            )}
          </div>
        )}

        {isScreenA && (
          <div className="traj-container">
            <TrajectoryView
              state={state}
              thrust={thrust}
              phase={phase}
              phaseIndex={state.phaseIndex}
              phaseSpec={phaseSpec}
              tilt={tiltDeg(state.quaternion)}
            />
            <div className="traj-bottom-bar">
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
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
