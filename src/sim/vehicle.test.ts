import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  FIXED_STEP_S,
  GRAVITY_MPS2,
  massKg,
  stepState,
  thrustNewtons,
  type Controls,
} from './vehicle'

const IDLE: Controls = {
  throttleUp: false,
  throttleDown: false,
  rcsLeft: false,
  rcsRight: false,
}

function run(seconds: number, controls: Controls = IDLE) {
  const steps = Math.round(seconds / FIXED_STEP_S)
  let state = createInitialState()
  for (let i = 0; i < steps; i += 1) {
    state = stepState(state, FIXED_STEP_S, controls)
  }
  return state
}

describe('vehicle mass', () => {
  it('interpolates between dry mass and full propellant load', () => {
    expect(massKg(100)).toBe(15_000)
    expect(massKg(50)).toBe(8_600)
    expect(massKg(0)).toBe(2_200)
  })

  it('clamps out-of-range fuel', () => {
    expect(massKg(-10)).toBe(2_200)
    expect(massKg(120)).toBe(15_000)
  })
})

describe('gravity and translation', () => {
  it('free-falls at lunar gravity for 10 seconds', () => {
    const state = run(10)

    // v = g*t, then semi-implicit Euler adds one half-step of position error.
    expect(state.velocity[1]).toBeCloseTo(-GRAVITY_MPS2 * 10, 2)
    expect(state.position[1]).toBeCloseTo(15_000 - 81.08, 1)
    expect(state.velocity[0]).toBe(200)
    expect(state.velocity[2]).toBe(0)
  })

  it('translates horizontally while falling', () => {
    const state = run(10)

    expect(state.position[0]).toBeCloseTo(2_000, 6)
    expect(state.position[2]).toBe(0)
  })

  it('stops at the surface instead of integrating below it', () => {
    const initial = createInitialState()
    let state = {
      ...initial,
      position: [0, 1, 0] as [number, number, number],
      velocity: [0, -2, 0] as [number, number, number],
    }

    for (let i = 0; i < 100; i += 1) {
      state = stepState(state, FIXED_STEP_S, IDLE)
    }

    expect(state.position[1]).toBe(0)
    expect(state.velocity).toEqual([0, 0, 0])
  })
})

describe('thrust and fuel', () => {
  it('produces a full-throttle TWR of about 1.85 at 100 percent fuel', () => {
    const state = { ...createInitialState(), throttle: 1 }
    const thrust = thrustNewtons(state)
    const weight = massKg(state.fuel) * GRAVITY_MPS2

    expect(thrust).toBe(45_000)
    expect(thrust / weight).toBeCloseTo(1.8519, 3)
  })

  it('accelerates upward and burns propellant at full throttle', () => {
    const initial = { ...createInitialState(), throttle: 1 }
    let state = initial

    for (let i = 0; i < 100; i += 1) {
      state = stepState(state, FIXED_STEP_S, IDLE)
    }

    const netAcceleration = 45_000 / 15_000 - GRAVITY_MPS2
    expect(state.velocity[1]).toBeCloseTo(netAcceleration, 2)
    expect(state.position[1]).toBeGreaterThan(15_000)
    expect(state.fuel).toBeLessThan(100)
    expect(state.fuel).toBeGreaterThan(99.8)
  })
})
