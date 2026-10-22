import { useCallback, useEffect, useRef, useState } from 'react'
import { createInitialState, stepState, type Controls, type VehicleState } from './vehicle'

const RENDER_INTERVAL_MS = 33 // HUD ~30 Hz; the 3D scene smooths its own attitude

function controlsFromKeys(keys: Set<string>): Controls {
  return {
    throttleUp: keys.has('ArrowUp'),
    throttleDown: keys.has('ArrowDown'),
    rcsLeft: keys.has('ArrowLeft'),
    rcsRight: keys.has('ArrowRight'),
  }
}

export function useVehicle() {
  const [state, setState] = useState<VehicleState>(createInitialState)
  const stateRef = useRef(state)
  const keys = useRef(new Set<string>())

  const commit = useCallback((next: VehicleState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const toggleRaw = useCallback(() => {
    commit({ ...stateRef.current, rawVisible: !stateRef.current.rawVisible })
  }, [commit])

  const toggleArm = useCallback(() => {
    commit({ ...stateRef.current, engineArmed: !stateRef.current.engineArmed })
  }, [commit])

  const pressKey = useCallback((key: string) => {
    keys.current.add(key)
  }, [])

  const releaseKey = useCallback((key: string) => {
    keys.current.delete(key)
  }, [])

  useEffect(() => {
    const heldKeys = keys.current
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        toggleRaw()
        return
      }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault()
        heldKeys.add(event.key)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      heldKeys.delete(event.key)
    }
    const onBlur = () => heldKeys.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      heldKeys.clear()
    }
  }, [toggleRaw])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let lastRender = 0

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now

      const next = stepState(stateRef.current, dt, controlsFromKeys(keys.current))
      stateRef.current = next
      if (now - lastRender >= RENDER_INTERVAL_MS) {
        lastRender = now
        setState(next)
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return {
    state,
    toggleRaw,
    toggleArm,
    pressKey,
    releaseKey,
  }
}
