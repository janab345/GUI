import { horizontalSpeed, PHASES } from '../sim/vehicle'
import type { VehicleState } from '../sim/vehicle'

interface PdiConsoleProps {
  state: VehicleState
  thrust: number
  phase: string
  phaseIndex: number
  phaseSpec: (typeof PHASES)[number]
  tilt: number
}

function fmt(num: number, decimals = 1) {
  return num.toFixed(decimals)
}

function fmtInt(num: number) {
  return Math.round(num).toString()
}

export default function PdiConsole({
  state,
  thrust,
  phase,
  phaseIndex,
  phaseSpec,
  tilt,
}: PdiConsoleProps) {
  const alt = state.position[1]
  const vVert = state.velocity[1]
  const vHorz = horizontalSpeed(state)
  const rangeToPad = Math.hypot(state.position[0], state.position[2])
  const timeLeft = state.phaseRemaining

  const targetAlt = phaseIndex <= 1 ? 1500 : phaseIndex === 2 ? 800 : phaseIndex === 3 ? 150 : 40
  const targetVVert = phaseIndex >= 3 ? -2.5 : -25
  const targetVHorz = rangeToPad > 50 ? 15 : 5

  const altErr = alt - targetAlt
  const vVertErr = vVert - targetVVert
  const vHorzErr = vHorz - targetVHorz

  const guidanceGo =
    alt < 2500 &&
    state.fuel > 10 &&
    state.engineArmed &&
    Math.abs(tilt) < 12 &&
    vVert > -40

  return (
    <div className="pdi-console">
      <div className="pdi-console-header">
        <div>
          <div className="pdi-console-title">PDI CONSOLE - SCREEN A</div>
          <div className="pdi-console-subtitle">GUIDANCE | NAVIGATION | CONTROL</div>
        </div>
        <div className="pdi-console-meta">
          <span>PHASE: {phase.toUpperCase()}</span>
          <span>PHASE REMAINING: {fmt(timeLeft, 0)} s</span>
          <span>TIME SCALE: {state.timeScale}x</span>
        </div>
      </div>

      <div className="pdi-grid">
        <section className="pdi-card">
          <header className="pdi-card-header">
            <h3>GUIDANCE</h3>
            <span className={`pdi-pill ${guidanceGo ? 'ok' : 'warn'}`}>
              {guidanceGo ? 'GO FOR PDI' : 'HOLD / CHECK'}
            </span>
          </header>
          <div className="pdi-card-body">
            <div className="pdi-section-label">TARGET / DESIRED POINT TO LAND</div>
            <div className="pdi-kv-grid">
              <div className="pdi-kv">
                <span className="label">LANDING SITE</span>
                <span className="value">PAD-01 (DESIGNATED)</span>
              </div>
              <div className="pdi-kv">
                <span className="label">RANGE TO PAD</span>
                <span className="value">{fmt(rangeToPad, 0)} m</span>
              </div>
              <div className="pdi-kv">
                <span className="label">DESIRED ALTITUDE</span>
                <span className="value">{fmtInt(targetAlt)} m</span>
              </div>
              <div className="pdi-kv">
                <span className="label">DESIRED VERTICAL</span>
                <span className="value">{targetVVert} m/s</span>
              </div>
              <div className="pdi-kv">
                <span className="label">DESIRED HORIZONTAL</span>
                <span className="value">{targetVHorz} m/s</span>
              </div>
              <div className="pdi-kv">
                <span className="label">LANDING CORRIDOR</span>
                <span className="value">CLEAR</span>
              </div>
            </div>
            <div className="pdi-section-label">DEVIATION FROM PROFILE</div>
            <div className="pdi-kv-grid">
              <div className="pdi-kv">
                <span className="label">ALT ERR</span>
                <span className={`value ${Math.abs(altErr) > 150 ? 'warn' : ''}`}>
                  {altErr >= 0 ? '+' : ''}
                  {fmt(altErr, 0)} m
                </span>
              </div>
              <div className="pdi-kv">
                <span className="label">VVERT ERR</span>
                <span className={`value ${Math.abs(vVertErr) > 5 ? 'warn' : ''}`}>
                  {vVertErr >= 0 ? '+' : ''}
                  {fmt(vVertErr, 1)} m/s
                </span>
              </div>
              <div className="pdi-kv">
                <span className="label">VHOR ERR</span>
                <span className={`value ${Math.abs(vHorzErr) > 4 ? 'warn' : ''}`}>
                  {vHorzErr >= 0 ? '+' : ''}
                  {fmt(vHorzErr, 1)} m/s
                </span>
              </div>
              <div className="pdi-kv">
                <span className="label">TILT</span>
                <span className={`value ${Math.abs(tilt) > 10 ? 'warn' : ''}`}>
                  {tilt >= 0 ? '+' : ''}
                  {fmt(tilt, 1)} °
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="pdi-card">
          <header className="pdi-card-header">
            <h3>NAVIGATION</h3>
            <span className="pdi-pill subtle">CURRENT STATE FROM SENSORS</span>
          </header>
          <div className="pdi-card-body">
            <div className="pdi-section-label">POSITION / VELOCITY</div>
            <div className="pdi-kv-grid">
              <div className="pdi-kv">
                <span className="label">ALTITUDE (RADAR/IMU)</span>
                <span className="value">{fmt(alt, 1)} m</span>
              </div>
              <div className="pdi-kv">
                <span className="label">RANGE TO PAD</span>
                <span className="value">{fmt(rangeToPad, 1)} m</span>
              </div>
              <div className="pdi-kv">
                <span className="label">VERTICAL SPEED</span>
                <span className="value">{fmt(vVert, 2)} m/s</span>
              </div>
              <div className="pdi-kv">
                <span className="label">HORIZONTAL SPEED</span>
                <span className="value">{fmt(vHorz, 2)} m/s</span>
              </div>
              <div className="pdi-kv">
                <span className="label">X / Z</span>
                <span className="value">
                  {fmt(state.position[0], 1)} / {fmt(state.position[2], 1)} m
                </span>
              </div>
              <div className="pdi-kv">
                <span className="label">VELOCITY (X/Y/Z)</span>
                <span className="value">
                  {fmt(state.velocity[0], 2)} / {fmt(state.velocity[1], 2)} / {fmt(state.velocity[2], 2)}
                </span>
              </div>
            </div>
            <div className="pdi-section-label">ATTITUDE / SENSORS</div>
            <div className="pdi-kv-grid">
              <div className="pdi-kv">
                <span className="label">TILT (ABOUT Z)</span>
                <span className="value">{tilt >= 0 ? '+' : ''}
                  {fmt(tilt, 2)} °</span>
              </div>
              <div className="pdi-kv">
                <span className="label">QUAT (W,X,Y,Z)</span>
                <span className="value mono-small">
                  {state.quaternion.map((q) => q.toFixed(3)).join(' / ')}
                </span>
              </div>
              <div className="pdi-kv">
                <span className="label">IMU</span>
                <span className="value ok-text">NOMINAL</span>
              </div>
              <div className="pdi-kv">
                <span className="label">ALTIMETER</span>
                <span className="value ok-text">TRACKING</span>
              </div>
              <div className="pdi-kv">
                <span className="label">STAR TRACKER</span>
                <span className="value ok-text">ACQUIRED</span>
              </div>
              <div className="pdi-kv">
                <span className="label">RADAR</span>
                <span className="value ok-text">LOCKED</span>
              </div>
            </div>
          </div>
        </section>

        <section className="pdi-card">
          <header className="pdi-card-header">
            <h3>CONTROL</h3>
            <span className="pdi-pill subtle">SYNCHRONOUS WITH 3D STATE</span>
          </header>
          <div className="pdi-card-body">
            <div className="pdi-section-label">THROTTLE / PROPULSION</div>
            <div className="pdi-kv-grid">
              <div className="pdi-kv">
                <span className="label">THROTTLE CMD</span>
                <span className="value">{Math.round(state.throttle * 100)} %</span>
              </div>
              <div className="pdi-kv">
                <span className="label">EFFECTIVE THRUST</span>
                <span className="value">{Math.round(thrust * 100)} %</span>
              </div>
              <div className="pdi-kv">
                <span className="label">MAIN ENGINES</span>
                <span className="value">{phaseSpec.engines} ENG</span>
              </div>
              <div className="pdi-kv">
                <span className="label">RCS SET</span>
                <span className="value">{phaseSpec.rcs} RCS</span>
              </div>
              <div className="pdi-kv">
                <span className="label">ENGINE STATE</span>
                <span className={`value ${state.engineArmed ? 'ok-text' : 'warn-text'}`}>
                  {state.engineArmed ? 'ARMED' : 'SAFE'}
                </span>
              </div>
              <div className="pdi-kv">
                <span className="label">FUEL</span>
                <span className={`value ${state.fuel < 20 ? 'warn-text' : ''}`}>
                  {Math.round(state.fuel)} %
                </span>
              </div>
            </div>
            <div className="pdi-section-label">RCS / ATTITUDE COMMANDS</div>
            <div className="pdi-kv-grid">
              <div className="pdi-kv">
                <span className="label">RCS LEFT (←)</span>
                <span className={`value ${state.rcs.left ? 'cmd-active' : ''}`}>
                  {state.rcs.left ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="pdi-kv">
                <span className="label">RCS RIGHT (→)</span>
                <span className={`value ${state.rcs.right ? 'cmd-active' : ''}`}>
                  {state.rcs.right ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="pdi-kv">
                <span className="label">THROTTLE UP (↑)</span>
                <span className={`value ${state.throttleKeys.up ? 'cmd-active' : ''}`}>
                  {state.throttleKeys.up ? 'HELD' : 'IDLE'}
                </span>
              </div>
              <div className="pdi-kv">
                <span className="label">THROTTLE DOWN (↓)</span>
                <span className={`value ${state.throttleKeys.down ? 'cmd-active' : ''}`}>
                  {state.throttleKeys.down ? 'HELD' : 'IDLE'}
                </span>
              </div>
              <div className="pdi-kv">
                <span className="label">CONTROL MODE</span>
                <span className="value">MANUAL (KEYBOARD)</span>
              </div>
              <div className="pdi-kv">
                <span className="label">CMD ARBITRATION</span>
                <span className="value ok-text">SINGLE PATH</span>
              </div>
            </div>
            <div className="pdi-note">
              Commands from the bottom bar, on-screen keys, or keyboard are applied to the same vehicle model.
              Guidance/NAV/CTL update synchronously with Screen B (3D STATE).
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
