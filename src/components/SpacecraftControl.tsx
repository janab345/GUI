interface SpacecraftControlProps {
  ignitionOn: boolean
  throttle: number
  attitude: { roll: number; pitch: number; yaw: number }
  currentPhase: number
  onIgnitionToggle: () => void
  onThrottleChange: (value: number) => void
  onAttitudeChange: (axis: 'roll' | 'pitch' | 'yaw', value: number) => void
  onPhaseSelect: (phase: number) => void
}

const PHASE_NAMES = ['Approach', 'Braking', 'Descent', 'Terminal', 'Landed']

export default function SpacecraftControl({
  ignitionOn,
  throttle,
  attitude,
  currentPhase,
  onIgnitionToggle,
  onThrottleChange,
  onAttitudeChange,
  onPhaseSelect,
}: SpacecraftControlProps) {
  return (
    <div className="panel spacecraft-control">
      <h3>Spacecraft Control</h3>

      <div className="control-section">
        <h4>Ignition</h4>
        <button className={`ignition-btn ${ignitionOn ? 'on' : ''}`} onClick={onIgnitionToggle}>
          {ignitionOn ? 'IGNITION ON' : 'IGNITION OFF'}
        </button>
      </div>

      <div className="control-section">
        <h4>Throttle: {Math.round(throttle * 100)}%</h4>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={throttle}
          onChange={(e) => onThrottleChange(parseFloat(e.target.value))}
        />
      </div>

      <div className="control-section">
        <h4>Attitude</h4>
        <div className="attitude-controls">
          <label>
            Roll
            <input
              type="range"
              min="-30"
              max="30"
              value={attitude.roll}
              onChange={(e) => onAttitudeChange('roll', parseFloat(e.target.value))}
            />
            <span>{attitude.roll.toFixed(1)}°</span>
          </label>
          <label>
            Pitch
            <input
              type="range"
              min="-30"
              max="30"
              value={attitude.pitch}
              onChange={(e) => onAttitudeChange('pitch', parseFloat(e.target.value))}
            />
            <span>{attitude.pitch.toFixed(1)}°</span>
          </label>
          <label>
            Yaw
            <input
              type="range"
              min="-180"
              max="180"
              value={attitude.yaw}
              onChange={(e) => onAttitudeChange('yaw', parseFloat(e.target.value))}
            />
            <span>{attitude.yaw.toFixed(1)}°</span>
          </label>
        </div>
      </div>

      <div className="control-section">
        <h4>Mission Phase</h4>
        <div className="phase-buttons">
          {PHASE_NAMES.map((phase, i) => (
            <button
              key={i}
              className={`phase-btn ${i === currentPhase ? 'active' : ''}`}
              onClick={() => onPhaseSelect(i)}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
