import type { PointerEvent } from 'react'
import type { RcsFlags, ThrottleFlags } from '../sim/vehicle'

export type HoldKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

interface SpacecraftControlProps {
  throttle: number
  throttleKeys: ThrottleFlags
  engineArmed: boolean
  rcs: RcsFlags
  onToggleArm: () => void
  onPressKey: (key: HoldKey) => void
  onReleaseKey: (key: HoldKey) => void
  onReset: () => void
}

export default function SpacecraftControl({
  throttle,
  throttleKeys,
  engineArmed,
  rcs,
  onToggleArm,
  onPressKey,
  onReleaseKey,
  onReset,
}: SpacecraftControlProps) {
  const holdProps = (key: HoldKey) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      onPressKey(key)
    },
    onPointerUp: () => onReleaseKey(key),
    onPointerCancel: () => onReleaseKey(key),
    onPointerLeave: () => onReleaseKey(key),
  })

  return (
    <div className="panel spacecraft-control">
      <h3>Spacecraft Control</h3>

      <div className="control-section">
        <h4>Main Engine</h4>
        <button className={`ignition-btn ${engineArmed ? 'on' : ''}`} onClick={onToggleArm}>
          {engineArmed ? 'ENGINE ARMED' : 'ENGINE SAFE'}
        </button>
        <div className="throttle-bar" aria-label={`Throttle ${Math.round(throttle * 100)} percent`}>
          <div className="throttle-fill" style={{ width: `${throttle * 100}%` }} />
        </div>
        <div className="throttle-caption">THROTTLE {Math.round(throttle * 100)}%</div>
      </div>

      <div className="control-section">
        <div className="hold-grid">
          <button className={`hold-btn ${throttleKeys.up ? 'active' : ''}`} {...holdProps('ArrowUp')}>
            ▲ <span>THR</span>
          </button>
          <button className={`hold-btn ${throttleKeys.down ? 'active' : ''}`} {...holdProps('ArrowDown')}>
            ▼ <span>THR</span>
          </button>
          <button className={`hold-btn ${rcs.left ? 'active' : ''}`} {...holdProps('ArrowLeft')}>
            ◀ <span>RCS</span>
          </button>
          <button className={`hold-btn ${rcs.right ? 'active' : ''}`} {...holdProps('ArrowRight')}>
            ▶ <span>RCS</span>
          </button>
        </div>
      </div>

      <div className="control-section">
        <button className="reset-btn" onClick={onReset}>
          RESET MISSION
        </button>
      </div>
    </div>
  )
}
