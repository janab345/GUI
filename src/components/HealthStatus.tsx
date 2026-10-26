interface HealthStatusProps {
  thrust: number
  fuel: number
  engines: number
  rcs: number
  phase: string
  tilt: number
}

export default function HealthStatus({
  thrust,
  fuel,
  engines,
  rcs,
  phase,
  tilt,
}: HealthStatusProps) {
  return (
    <div className="panel health-status">
      <h3>Health &amp; Status</h3>
      <div className="telemetry-grid">
        <div className="telemetry-item">
          <span className="label">THRUST</span>
          <span className="value">{Math.round(thrust * 100)}%</span>
        </div>
        <div className="telemetry-item">
          <span className="label">ENGINES</span>
          <span className="value">{engines}</span>
        </div>
        <div className="telemetry-item">
          <span className="label">RCS JETS</span>
          <span className="value">{rcs}</span>
        </div>
        <div className="telemetry-item">
          <span className="label">PHASE</span>
          <span className="value">{phase}</span>
        </div>
        <div className="telemetry-item">
          <span className="label">FUEL</span>
          <span className="value">{fuel.toFixed(1)}%</span>
        </div>
        <div className="telemetry-item">
          <span className="label">TILT</span>
          <span className="value">{tilt >= 0 ? '+' : ''}{tilt.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  )
}
