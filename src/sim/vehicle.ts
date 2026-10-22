import { Quaternion, Vector3 } from 'three'

/**
 * Shared vehicle state for the PDI console.
 *
 * Day 1 ("visualization mode"): no gravity, no translation. Throttle and RCS
 * change the vehicle state only. This object is the shape the future Python
 * plant will send over the socket:
 *
 *   position, velocity, quaternion, throttle, RCS flags, phase, target
 */

/**
 * Phase timings, engine counts, and RCS counts from
 * `nt/PDI Realization.md` — "Accurate phase timing and constraints".
 *
 * The note leaves the last two phases open-ended; the trainer gives them
 * 120 s and 30 s so the full run is 15:00.
 */
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
const FUEL_BURN_RATE = 1.00// percent per second at full throttle

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
  engineArmed: boolean
  rcs: RcsFlags
  phaseIndex: number
  phaseRemaining: number
  fuel: number
  target: [number, number, number]
  rawVisible: boolean
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
    velocity: [0, 0, START_HORIZONTAL_SPEED],
    quaternion: [0, 0, 0, 1],
    throttle: 0,
    throttleKeys: { up: false, down: false },
    engineArmed: true,
    rcs: { left: false, right: false },
    phaseIndex: 0,
    phaseRemaining: phaseDuration(0),
    fuel: 100,
    target: [0, 0, 0],
    rawVisible: false,
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Advance the plant by dt seconds. Pure function, ready to move behind SimAdapter. */
export function stepState(state: VehicleState, dt: number, controls: Controls): VehicleState {
  const throttleDelta =
    (Number(controls.throttleUp) - Number(controls.throttleDown)) * THROTTLE_RATE * dt
  const throttle = clamp(state.throttle + throttleDelta, 0, 1)

  // Pitch about the screen-normal axis. On a lander, tilting points the engine
  // off-vertical, which is what produces lateral motion. Yaw would not.
  // Right key -> negative rotation about +Z -> nose leans right.
  const pitchRate = (Number(controls.rcsLeft) - Number(controls.rcsRight)) * RCS_RATE
  let quaternion = state.quaternion
  if (pitchRate !== 0) {
    const bodyRate = new Quaternion().setFromAxisAngle(Z_AXIS, pitchRate * dt)
    const next = new Quaternion(...state.quaternion).multiply(bodyRate).normalize()
    quaternion = [next.x, next.y, next.z, next.w]
  }

  let phaseRemaining = state.phaseRemaining - dt
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
  const fuel = Math.max(0, state.fuel - thrust * FUEL_BURN_RATE * dt)

  return {
    ...state,
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
