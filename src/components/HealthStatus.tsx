import { useEffect, useState } from 'react'

interface Telemetry {
  altitude: number
  velocity: number
  fuel: number
  thrust: number
  mode: string
  link: string
  warnings: string[]
}

interface HealthStatusProps {
  throttle: number
  ignitionOn: boolean
}

export default function HealthStatus({ throttle, ignitionOn }: HealthStatusProps) {
  const [telemetry, setTelemetry] = useState<Telemetry>({
    altitude: 15000,
    velocity: -1680,
    fuel: 100,
    thrust: 0,
    mode: 'STANDBY',
    link: 'X-BAND',
    warnings: [],
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        altitude: Math.max(0, prev.altitude + (ignitionOn ? -throttle * 50 : 10)),
        velocity: ignitionOn ? -throttle * 100 : prev.velocity * 0.99,
        fuel: Math.max(0, prev.fuel - (ignitionOn ? throttle * 0.5 : 0)),
        thrust: ignitionOn ? throttle * 100 : 0,
        mode: ignitionOn ? 'DESCENT' : 'STANDBY',
        link: 'X-BAND',
        warnings: prev.fuel < 20 ? ['LOW FUEL'] : [],
      }))
    }, 100)
    return () => clearInterval(interval)
  }, [throttle, ignitionOn])

  return (
    <div className="panel health-status">
      <h3>Health & Status</h3>
      <div className="telemetry-grid">
        <div className="telemetry-item">
          <span className="label">ALT</span>
          <span className="value">{(telemetry.altitude / 1000).toFixed(2)} km</span>
        </div>
        <div className="telemetry-item">
          <span className="label">VEL</span>
          <span className="value">{telemetry.velocity.toFixed(1)} m/s</span>
        </div>
        <div className="telemetry-item">
          <span className="label">FUEL</span>
          <span className="value">{telemetry.fuel.toFixed(1)}%</span>
        </div>
        <div className="telemetry-item">
          <span className="label">THRUST</span>
          <span className="value">{telemetry.thrust.toFixed(0)}%</span>
        </div>
        <div className="telemetry-item">
          <span className="label">MODE</span>
          <span className="value">{telemetry.mode}</span>
        </div>
        <div className="telemetry-item">
          <span className="label">LINK</span>
          <span className="value">{telemetry.link}</span>
        </div>
      </div>
      {telemetry.warnings.length > 0 && (
        <div className="warnings">
          {telemetry.warnings.map((w) => (
            <span key={w} className="warning">
              {w}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
