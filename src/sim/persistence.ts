import {
  createInitialState,
  phaseDuration,
  PHASES,
  TIME_SCALES,
  type Quat,
  type VehicleState,
} from './vehicle'

const STORAGE_KEY = 'llv-pdi.vehicle.v2'

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const asTimeScale = (value: unknown): number | null =>
  TIME_SCALES.includes(value as (typeof TIME_SCALES)[number]) ? (value as number) : null

const asVector = (value: unknown, length: number): number[] | null =>
  Array.isArray(value) && value.length === length && value.every(isNumber)
    ? (value as number[])
    : null

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Restore the last vehicle state from localStorage.
 *
 * The clock is restored as-is: time spent with the page closed does not count.
 * Stored data is validated field by field so an old or hand-edited value cannot
 * crash the console.
 */
export function loadVehicleState(): VehicleState {
  const base = createInitialState()
  if (typeof window === 'undefined') return base

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return base

    const stored = JSON.parse(raw) as Partial<VehicleState>
    const position = asVector(stored.position, 3)
    const velocity = asVector(stored.velocity, 3)
    const target = asVector(stored.target, 3)
    const quaternion = asVector(stored.quaternion, 4)
    const phaseIndex = isNumber(stored.phaseIndex)
      ? clamp(Math.round(stored.phaseIndex), 0, PHASES.length - 1)
      : base.phaseIndex

    return {
      ...base,
      position: position ? [position[0], position[1], position[2]] : base.position,
      velocity: velocity ? [velocity[0], velocity[1], velocity[2]] : base.velocity,
      target: target ? [target[0], target[1], target[2]] : base.target,
      quaternion: quaternion ? (quaternion as Quat) : base.quaternion,
      throttle: isNumber(stored.throttle) ? clamp(stored.throttle, 0, 1) : base.throttle,
      timeScale: asTimeScale(stored.timeScale) ?? base.timeScale,
      engineArmed:
        typeof stored.engineArmed === 'boolean' ? stored.engineArmed : base.engineArmed,
      rcs: {
        left: typeof stored.rcs?.left === 'boolean' ? stored.rcs.left : base.rcs.left,
        right: typeof stored.rcs?.right === 'boolean' ? stored.rcs.right : base.rcs.right,
      },
      phaseIndex,
      phaseRemaining: isNumber(stored.phaseRemaining)
        ? clamp(stored.phaseRemaining, 0, phaseDuration(phaseIndex))
        : phaseDuration(phaseIndex),
      fuel: isNumber(stored.fuel) ? clamp(stored.fuel, 0, 100) : base.fuel,
    }
  } catch {
    return base
  }
}

export function saveVehicleState(state: VehicleState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be full or blocked; persistence is best-effort.
  }
}

export function clearVehicleState(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
