import type { NavData, SensorStatus } from '../sim/nav'

interface NavigationPanelProps {
  nav: NavData
}

function signed(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}`
}

function distance(value: number): string {
  return value >= 1_000 ? `${(value / 1_000).toFixed(2)} km` : `${value.toFixed(0)} m`
}

function bearing(value: number | null): string {
  if (value === null) return '—'
  return `${Math.round(value).toString().padStart(3, '0')}°`
}

function statusLabel(status: SensorStatus): string {
  switch (status) {
    case 'ok':
      return 'OK'
    case 'degraded':
      return 'DEGRADED'
    case 'stale':
      return 'STALE'
    case 'fault':
      return 'FAULT'
    case 'sim':
      return 'SIM'
    case 'notFitted':
      return '—'
  }
}

export default function NavigationPanel({ nav }: NavigationPanelProps) {
  return (
    <div className="panel navigation-panel">
      <h3>Navigation</h3>
      <div className="nav-mode">
        <span>NAV MODE</span>
        <strong>{nav.navMode}</strong>
      </div>

      <div className="nav-grid">
        <div className="nav-item">
          <span className="label">ALT AGL</span>
          <span className="value">{(nav.altitudeM / 1_000).toFixed(2)} km</span>
        </div>
        <div className="nav-item">
          <span className="label">V-SPD</span>
          <span className="value">{signed(nav.verticalSpeedMps)} m/s</span>
        </div>
        <div className="nav-item">
          <span className="label">H-SPD</span>
          <span className="value">{nav.horizontalSpeedMps.toFixed(1)} m/s</span>
        </div>
        <div className="nav-item">
          <span className="label">TILT</span>
          <span className="value">{signed(nav.tiltDeg)}°</span>
        </div>
        <div className="nav-item">
          <span className="label">RANGE TO PAD</span>
          <span className="value">{distance(nav.rangeToPadM)}</span>
        </div>
        <div className="nav-item">
          <span className="label">BEARING</span>
          <span className="value">{bearing(nav.bearingDeg)}</span>
        </div>
        <div className="nav-item">
          <span className="label">FLIGHT PATH</span>
          <span className="value">{signed(nav.flightPathAngleDeg)}°</span>
        </div>
        <div className="nav-item">
          <span className="label">TOTAL SPEED</span>
          <span className="value">{nav.totalSpeedMps.toFixed(1)} m/s</span>
        </div>
      </div>

      <div className="nav-section-label">SENSOR STATUS</div>
      <div className="sensor-grid">
        {nav.sensors.map((sensor) => (
          <div
            key={sensor.id}
            className={`sensor-chip ${sensor.status}`}
            title={sensor.detail}
          >
            <span className="sensor-label">{sensor.label}</span>
            <span className="sensor-state">{statusLabel(sensor.status)}</span>
          </div>
        ))}
      </div>

      <p className="nav-note">SIMULATED STATE · SENSORS NOT MODELLED</p>
    </div>
  )
}
