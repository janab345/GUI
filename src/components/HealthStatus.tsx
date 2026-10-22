interface HealthStatusProps {
  altitude: number
  horizontalSpeed: number
  verticalSpeed: number
  thrust: number
  fuel: number
  engines: number
  rcs: number
  phase: string
}

export default function HealthStatus({
  altitude,
  horizontalSpeed,
  verticalSpeed,
  thrust,
  fuel,
  engines,
  rcs,
  phase,
}: HealthStatusProps) {
  return (
    <div className="panel health-status">
      <h3>Health &amp; Status</h3>
      <div className="telemetry-grid">
        <div className="telemetry-item">
          <span className="label">ALT</span>
          <span className="value">{(altitude / 1000).toFixed(2)} km</span>
        </div>
        <div className="telemetry-item">
          <span className="label">H-SPD</span>
          <span className="value">{horizontalSpeed.toFixed(0)} m/s</span>
        </div>
        <div className="telemetry-item">
          <span className="label">V-SPD</span>
          <span className="value">{verticalSpeed.toFixed(1)} m/s</span>
        </div>
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
      </div>
    </div>
  )
}
