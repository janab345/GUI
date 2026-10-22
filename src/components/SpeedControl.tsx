import { TIME_SCALES } from '../sim/vehicle'

interface SpeedControlProps {
  timeScale: number
  onChange: (timeScale: number) => void
}

export default function SpeedControl({ timeScale, onChange }: SpeedControlProps) {
  return (
    <div className="speed-control">
      <h3>Sim Speed</h3>
      <div className="speed-grid">
        {TIME_SCALES.map((scale) => (
          <button
            key={scale}
            className={`speed-btn ${scale === timeScale ? 'active' : ''}`}
            onClick={() => onChange(scale)}
          >
            {scale}x
          </button>
        ))}
      </div>
    </div>
  )
}
