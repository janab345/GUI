import {
  formatClock,
  horizontalSpeed,
  PHASES,
  type VehicleState,
} from '../sim/vehicle'

interface HudProps {
  state: VehicleState
  thrust: number
  heading: number
}

export default function Hud({ state, thrust, heading }: HudProps) {
  const altitudeKm = state.position[1] / 1000
  const normalizedHeading = (heading + 360) % 360
  const raw = {
    position: state.position.map((value) => Number(value.toFixed(1))),
    velocity: state.velocity.map((value) => Number(value.toFixed(1))),
    quaternion: state.quaternion.map((value) => Number(value.toFixed(4))),
    throttle: Number(state.throttle.toFixed(2)),
    rcs: state.rcs,
    phase: PHASES[state.phaseIndex],
    target: state.target,
  }

  return (
    <>
      <div className="hud">
        <div className="hud-top">
          <span className="hud-phase">{PHASES[state.phaseIndex]}</span>
          <span className="hud-clock">T-{formatClock(state.phaseRemaining)}</span>
        </div>
        <div className="hud-grid">
          <span>ALT</span>
          <strong>{altitudeKm.toFixed(2)} km</strong>
          <span>H-SPD</span>
          <strong>{horizontalSpeed(state).toFixed(0)} m/s</strong>
          <span>V-SPD</span>
          <strong>{state.velocity[1].toFixed(1)} m/s</strong>
          <span>THR</span>
          <strong>{Math.round(thrust * 100)}%</strong>
          <span>HDG</span>
          <strong>{normalizedHeading.toFixed(0).padStart(3, '0')}°</strong>
        </div>
        <div className="hud-hint">↑↓ throttle · ←→ RCS · ENTER raw state</div>
      </div>

      {state.rawVisible && (
        <pre className="raw-state">{JSON.stringify(raw, null, 2)}</pre>
      )}
    </>
  )
}
