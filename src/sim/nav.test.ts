import { describe, expect, it } from 'vitest'
import {
  bearingDeg,
  deriveNav,
  flightPathAngleDeg,
  horizontalRangeM,
  slantRangeM,
} from './nav'
import { createInitialState } from './vehicle'

describe('nav geometry', () => {
  it('measures horizontal range in the XZ plane', () => {
    expect(horizontalRangeM([0, 0, 0], [3, 100, 4])).toBeCloseTo(5)
  })

  it('measures slant range in 3D', () => {
    expect(slantRangeM([0, 0, 0], [3, 4, 0])).toBeCloseTo(5)
  })

  it('uses 0 deg at +Z and 90 deg at +X', () => {
    expect(bearingDeg([0, 0, 0], [0, 0, 10])).toBeCloseTo(0)
    expect(bearingDeg([0, 0, 0], [10, 0, 0])).toBeCloseTo(90)
    expect(bearingDeg([0, 0, 0], [0, 0, -10])).toBeCloseTo(180)
    expect(bearingDeg([0, 0, 0], [-10, 0, 0])).toBeCloseTo(270)
  })

  it('returns null when there is no horizontal direction', () => {
    expect(bearingDeg([0, 10, 0], [0, 0, 0])).toBeNull()
    expect(bearingDeg([0, 10, 0], [0.5, 0, 0.5])).toBeNull()
  })

  it('reports flight-path angle relative to the horizon', () => {
    expect(flightPathAngleDeg([10, 0, 0])).toBeCloseTo(0)
    expect(flightPathAngleDeg([10, -10, 0])).toBeCloseTo(-45)
    expect(flightPathAngleDeg([0, -10, 0])).toBeCloseTo(-90)
  })
})

describe('deriveNav', () => {
  it('derives the initial display values from vehicle state', () => {
    const nav = deriveNav(createInitialState())

    expect(nav.altitudeM).toBe(15_000)
    expect(nav.verticalSpeedMps).toBe(0)
    expect(nav.horizontalSpeedMps).toBe(200)
    expect(nav.totalSpeedMps).toBe(200)
    expect(nav.tiltDeg).toBe(0)
    expect(nav.rangeToPadM).toBe(0)
    expect(nav.bearingDeg).toBeNull()
    expect(nav.dataAgeS).toBeNull()
  })

  it('marks every sensor as simulated rather than real', () => {
    const nav = deriveNav(createInitialState())

    expect(nav.sensors).toHaveLength(6)
    expect(nav.sensors.map((sensor) => sensor.id)).toEqual([
      'imu',
      'star',
      'sun',
      'ndl',
      'vdm',
      'sars',
    ])
    expect(nav.sensors.every((sensor) => sensor.status === 'sim')).toBe(true)
    expect(nav.navMode).toContain('SIM')
  })
})
