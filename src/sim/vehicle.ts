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

export const PHASES = ['Braking', 'Approach', 'Sensor Nav', 'Hover', 'Terminal'] as const
export type Phase = (typeof PHASES)[number]

export const PHASE_SECONDS = 180
export const START_ALTITUDE_M = 15_000
export const START_HORIZONTAL_SPEED = 200
const FUEL_BURN_RATE = 0.35 // percent per second at full throttle

const THROTTLE_RATE = 1 // full travel in one second while held
const RCS_RATE = Math.PI / 9 // 20 deg/s
const Y_AXIS = new Vector3(0, 1, 0)

export type Quat = [number, number, number, number]

export interface RcsFlags {
  left: boolean
  right: boolean
}

export interface VehicleState {
  position: [number, number, number]
  velocity: [number, number, number]
  quaternion: Quat
  throttle: number
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
    engineArmed: true,
    rcs: { left: false, right: false },
    phaseIndex: 0,
    phaseRemaining: PHASE_SECONDS,
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

  const yawRate = (Number(controls.rcsRight) - Number(controls.rcsLeft)) * RCS_RATE
  let quaternion = state.quaternion
  if (yawRate !== 0) {
    const bodyRate = new Quaternion().setFromAxisAngle(Y_AXIS, yawRate * dt)
    const next = new Quaternion(...state.quaternion).multiply(bodyRate).normalize()
    quaternion = [next.x, next.y, next.z, next.w]
  }

  let phaseRemaining = state.phaseRemaining - dt
  let phaseIndex = state.phaseIndex
  if (phaseRemaining <= 0) {
    if (phaseIndex < PHASES.length - 1) {
      phaseIndex += 1
      phaseRemaining += PHASE_SECONDS
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
    fuel,
    phaseIndex,
    phaseRemaining,
    rcs: { left: controls.rcsLeft, right: controls.rcsRight },
  }
}

export function thrustOf(state: VehicleState): number {
  return state.engineArmed && state.fuel > 0 ? state.throttle : 0
}

/** Heading from the quaternion, not from Euler angles. */
export function headingDeg(quaternion: Quat): number {
  const forward = new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...quaternion))
  return (Math.atan2(forward.x, forward.z) * 180) / Math.PI
}

export function horizontalSpeed(state: VehicleState): number {
  return Math.hypot(state.velocity[0], state.velocity[2])
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
