import { horizontalSpeed, tiltDeg, type VehicleState } from './vehicle'

export type SensorId = 'imu' | 'star' | 'sun' | 'ndl' | 'vdm' | 'sars'

/**
 * `sim` and `notFitted` are intentionally distinct from `ok`: the current plant
 * has no sensor models, and the UI must not imply hardware that is not there.
 */
export type SensorStatus = 'ok' | 'degraded' | 'stale' | 'fault' | 'sim' | 'notFitted'

export interface SensorReading {
  id: SensorId
  label: string
  status: SensorStatus
  detail: string
}

export interface NavData {
  altitudeM: number
  verticalSpeedMps: number
  horizontalSpeedMps: number
  totalSpeedMps: number
  tiltDeg: number
  rangeToPadM: number
  slantRangeM: number
  bearingDeg: number | null
  flightPathAngleDeg: number
  navMode: string
  dataAgeS: number | null
  sensors: SensorReading[]
}

type Vec3 = readonly [number, number, number]

/** Horizontal distance in the XZ plane. */
export function horizontalRangeM(from: Vec3, to: Vec3): number {
  return Math.hypot(to[0] - from[0], to[2] - from[2])
}

/** Straight-line distance in 3D. */
export function slantRangeM(from: Vec3, to: Vec3): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2])
}

/**
 * Compass bearing from `from` to `to`, in degrees clockwise from +Z.
 * Returns null when the horizontal offset is too small to define a direction.
 */
export function bearingDeg(from: Vec3, to: Vec3, epsilonM = 1): number | null {
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]
  if (Math.hypot(dx, dz) < epsilonM) return null
  return ((Math.atan2(dx, dz) * 180) / Math.PI + 360) % 360
}

/** Positive above the horizon, negative while descending. */
export function flightPathAngleDeg(velocity: Vec3): number {
  return (Math.atan2(velocity[1], Math.hypot(velocity[0], velocity[2])) * 180) / Math.PI
}

const SENSOR_LABELS: ReadonlyArray<readonly [SensorId, string, string]> = [
  ['imu', 'IMU', 'specific force + body rate'],
  ['star', 'STAR', 'inertial attitude fix'],
  ['sun', 'SUN', 'coarse sun vector'],
  ['ndl', 'NDL', 'range + line-of-sight velocity'],
  ['vdm', 'VDM', 'velocity + range'],
  ['sars', 'SARS', 'backup attitude / heading'],
]

/**
 * The current plant is a deterministic simulator, not a sensor suite. Every
 * reading is therefore marked `sim`; when a real or simulated sensor model is
 * added it should replace this list, not be mixed into the view.
 */
function sensorPlaceholders(): SensorReading[] {
  return SENSOR_LABELS.map(([id, label, detail]) => ({
    id,
    label,
    status: 'sim',
    detail: `${detail} — not modelled`,
  }))
}

/** Derive everything the Navigation panel displays from one vehicle state. */
export function deriveNav(state: VehicleState): NavData {
  const rangeToPadM = horizontalRangeM(state.position, state.target)
  const verticalSpeedMps = state.velocity[1]
  const horizontalSpeedMps = horizontalSpeed(state)

  return {
    altitudeM: state.position[1],
    verticalSpeedMps,
    horizontalSpeedMps,
    totalSpeedMps: Math.hypot(horizontalSpeedMps, verticalSpeedMps),
    tiltDeg: tiltDeg(state.quaternion),
    rangeToPadM,
    slantRangeM: slantRangeM(state.position, state.target),
    bearingDeg: bearingDeg(state.position, state.target),
    flightPathAngleDeg: flightPathAngleDeg(state.velocity),
    navMode: 'SIM / NO SENSOR MODEL',
    dataAgeS: null,
    sensors: sensorPlaceholders(),
  }
}
