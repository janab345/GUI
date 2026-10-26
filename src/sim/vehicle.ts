import { Quaternion, Vector3 } from 'three'


export interface PhaseSpec {
  name: string
  start: number
  end: number
  engines: number
  rcs: number
}

export const PHASES: readonly PhaseSpec[] = [
  { name: 'Rough Braking', start: 0, end: 200, engines: 5, rcs: 0 },
  { name: 'Fine Braking', start: 200, end: 400, engines: 4, rcs: 0 },
  { name: 'Approach & Terminal', start: 400, end: 750, engines: 3, rcs: 4 },
  { name: 'Hover / Touchdown Prep', start: 750, end: 870, engines: 1, rcs: 4 },
  { name: 'Soft Touchdown', start: 870, end: 900, engines: 1, rcs: 2 },
]

export function phaseDuration(index: number): number {
  const phase = PHASES[index] ?? PHASES[0]
  return phase.end - phase.start
}

export const START_ALTITUDE_M = 15_000
export const START_HORIZONTAL_SPEED = 200

/** Discrete physics step. Rendering stays at display rate. */
export const FIXED_STEP_S = 0.01

/** Lunar surface gravity, m/s². */
export const GRAVITY_MPS2 = 1.62

/** Apollo-LM-like mass budget. Fuel is a percentage of propellant remaining. */
export const DRY_MASS_KG = 2_200
export const PROPELLANT_MASS_KG = 12_800
export const MAX_THRUST_N = 45_000
export const ENGINE_ISP_S = 300
const STANDARD_GRAVITY = 9.80665

/** Sim-time multipliers the trainer can select. 1x is real time. */
export const TIME_SCALES = [1, 2, 5, 10] as const
export type TimeScale = (typeof TIME_SCALES)[number]

const THROTTLE_RATE = 1 // full travel in one second while held
const RCS_RATE = Math.PI / 9 // 20 deg/s
const Z_AXIS = new Vector3(0, 0, 1)

export type Quat = [number, number, number, number]

export interface RcsFlags {
  left: boolean
  right: boolean
}

export interface ThrottleFlags {
  up: boolean
  down: boolean
}

export interface VehicleState {
  position: [number, number, number]
  velocity: [number, number, number]
  quaternion: Quat
  throttle: number
  throttleKeys: ThrottleFlags
  timeScale: number
  engineArmed: boolean
  rcs: RcsFlags
  phaseIndex: number
  phaseRemaining: number
  fuel: number
  target: [number, number, number]
}

export interface Controls {
  throttleUp: boolean
  throttleDown: boolean
  rcsLeft: boolean
  rcsRight: boolean
}

export function createInitialState(): VehicleState {
  return {
    position: [0, START_ALTITUDE_M, 0],
    // Lateral RCS tilts about +Z, which produces thrust along ±X. Keep the
    // initial horizontal velocity on the axis the pilot can actually brake.
    velocity: [START_HORIZONTAL_SPEED, 0, 0],
    quaternion: [0, 0, 0, 1],
    throttle: 0,
    throttleKeys: { up: false, down: false },
    timeScale: 1,
    engineArmed: true,
    rcs: { left: false, right: false },
    phaseIndex: 0,
    phaseRemaining: phaseDuration(0),
    fuel: 100,
    target: [0, 0, 0],
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Current vehicle mass. Dry mass plus the propellant still on board. */
export function massKg(fuelPercent: number): number {
  return DRY_MASS_KG + (PROPELLANT_MASS_KG * clamp(fuelPercent, 0, 100)) / 100
}

/** Actual engine thrust in newtons after arming and fuel checks. */
export function thrustNewtons(state: VehicleState): number {
  return thrustOf(state) * MAX_THRUST_N
}

/** Advance the plant by dt seconds. Pure function, ready to move behind SimAdapter. */
export function stepState(state: VehicleState, dt: number, controls: Controls): VehicleState {
  // Time warp: everything in the plant (clock, throttle ramp, attitude, fuel)
  // advances at the selected multiple of real time.
  const simDt = dt * state.timeScale

  const throttleDelta =
    (Number(controls.throttleUp) - Number(controls.throttleDown)) * THROTTLE_RATE * simDt
  const throttle = clamp(state.throttle + throttleDelta, 0, 1)

  // Lateral tilt about the screen-normal axis. On a lander, leaning the body
  // points the engine off-vertical, which is what produces lateral motion.
  // Right key -> negative rotation about +Z -> body-up tips toward +X.
  const pitchRate = (Number(controls.rcsLeft) - Number(controls.rcsRight)) * RCS_RATE
  let quaternion = state.quaternion
  if (pitchRate !== 0) {
    const bodyRate = new Quaternion().setFromAxisAngle(Z_AXIS, pitchRate * simDt)
    const next = new Quaternion(...state.quaternion).multiply(bodyRate).normalize()
    quaternion = [next.x, next.y, next.z, next.w]
  }

  let phaseRemaining = state.phaseRemaining - simDt
  let phaseIndex = state.phaseIndex
  if (phaseRemaining <= 0) {
    if (phaseIndex < PHASES.length - 1) {
      phaseIndex += 1
      phaseRemaining += phaseDuration(phaseIndex)
    } else {
      phaseRemaining = 0
    }
  }

  const thrust = state.engineArmed && state.fuel > 0 ? throttle : 0
  const mass = massKg(state.fuel)

  // Thrust acts along the body +Y axis; gravity always points along world -Y.
  const acceleration = new Vector3(0, 1, 0)
    .applyQuaternion(new Quaternion(...quaternion))
    .multiplyScalar((thrust * MAX_THRUST_N) / mass)
  acceleration.y -= GRAVITY_MPS2

  const velocity: [number, number, number] = [
    state.velocity[0] + acceleration.x * simDt,
    state.velocity[1] + acceleration.y * simDt,
    state.velocity[2] + acceleration.z * simDt,
  ]
  const position: [number, number, number] = [
    state.position[0] + velocity[0] * simDt,
    state.position[1] + velocity[1] * simDt,
    state.position[2] + velocity[2] * simDt,
  ]

  // Stop at the surface until the landed/crashed rules exist. Without this the
  // vehicle would keep integrating below the ground forever.
  if (position[1] <= 0) {
    position[1] = 0
    velocity[0] = 0
    velocity[1] = 0
    velocity[2] = 0
  }

  const propellantFlowKgS = (thrust * MAX_THRUST_N) / (ENGINE_ISP_S * STANDARD_GRAVITY)
  const fuel = clamp(
    state.fuel - ((propellantFlowKgS * simDt) / PROPELLANT_MASS_KG) * 100,
    0,
    100,
  )

  return {
    ...state,
    position,
    velocity,
    quaternion,
    throttle,
    throttleKeys: { up: controls.throttleUp, down: controls.throttleDown },
    fuel,
    phaseIndex,
    phaseRemaining,
    rcs: { left: controls.rcsLeft, right: controls.rcsRight },
  }
}

export function thrustOf(state: VehicleState): number {
  return state.engineArmed && state.fuel > 0 ? state.throttle : 0
}

/** Tilt of the body axis away from vertical, +right / -left. */
export function tiltDeg(quaternion: Quat): number {
  const up = new Vector3(0, 1, 0).applyQuaternion(new Quaternion(...quaternion))
  return (Math.atan2(up.x, up.y) * 180) / Math.PI
}

export function horizontalSpeed(state: VehicleState): number {
  return Math.hypot(state.velocity[0], state.velocity[2])
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
