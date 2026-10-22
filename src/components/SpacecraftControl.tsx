import type { PointerEvent } from 'react'
import type { RcsFlags } from '../sim/vehicle'

export type HoldKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

interface SpacecraftControlProps {
  throttle: number
  engineArmed: boolean
  rcs: RcsFlags
  onToggleArm: () => void
  onPressKey: (key: HoldKey) => void
  onReleaseKey: (key: HoldKey) => void
}

export default function SpacecraftControl({
  throttle,
  engineArmed,
  rcs,
  onToggleArm,
  onPressKey,
  onReleaseKey,
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
        <h4>Hand Controller</h4>
        <div className="key-grid">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> throttle
          </span>
          <span>
            <kbd>←</kbd> <kbd>→</kbd> RCS pitch
          </span>
          <span>
            <kbd>Enter</kbd> raw state
          </span>
        </div>
        <div className="hold-grid">
          <button className="hold-btn" {...holdProps('ArrowUp')}>
            ▲ <span>THR</span>
          </button>
          <button className="hold-btn" {...holdProps('ArrowDown')}>
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
        <h4>Mode</h4>
        <p className="control-note">
          Day 1 visualization: no gravity, no translation. Tilt redirects the thrust vector;
          attitude is a quaternion.
        </p>
      </div>
    </div>
  )
}
