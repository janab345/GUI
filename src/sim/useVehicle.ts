import { useCallback, useEffect, useRef, useState } from 'react'
import { clearVehicleState, loadVehicleState, saveVehicleState } from './persistence'
import {
  createInitialState,
  FIXED_STEP_S,
  stepState,
  type Controls,
  type VehicleState,
} from './vehicle'

const RENDER_INTERVAL_MS = 33 // HUD ~30 Hz; the 3D scene smooths its own attitude
const SAVE_INTERVAL_MS = 500

function controlsFromKeys(keys: Set<string>): Controls {
  return {
    throttleUp: keys.has('ArrowUp'),
    throttleDown: keys.has('ArrowDown'),
    rcsLeft: keys.has('ArrowLeft'),
    rcsRight: keys.has('ArrowRight'),
  }
}

export function useVehicle() {
  const [state, setState] = useState<VehicleState>(loadVehicleState)
  const stateRef = useRef(state)
  const keys = useRef(new Set<string>())

  const commit = useCallback((next: VehicleState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const toggleArm = useCallback(() => {
    commit({ ...stateRef.current, engineArmed: !stateRef.current.engineArmed })
  }, [commit])

  const pressKey = useCallback((key: string) => {
    keys.current.add(key)
  }, [])

  const releaseKey = useCallback((key: string) => {
    keys.current.delete(key)
  }, [])

  const reset = useCallback(() => {
    keys.current.clear()
    clearVehicleState()
    commit(createInitialState())
  }, [commit])

  const setTimeScale = useCallback(
    (timeScale: number) => {
      commit({ ...stateRef.current, timeScale })
    },
    [commit],
  )

  useEffect(() => {
    const heldKeys = keys.current
    const onKeyDown = (event: KeyboardEvent) => {
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
  }, [])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let lastRender = 0
    let lastSave = 0
    let accumulator = 0

    const tick = (now: number) => {
      const frameDt = Math.min((now - last) / 1000, 0.1)
      last = now
      accumulator += frameDt

      // Fixed-step integration keeps the plant deterministic and testable.
      // The cap prevents a long tab stall from freezing the UI in a catch-up loop.
      let next = stateRef.current
      let steps = 0
      while (accumulator >= FIXED_STEP_S && steps < 100) {
        next = stepState(next, FIXED_STEP_S, controlsFromKeys(keys.current))
        accumulator -= FIXED_STEP_S
        steps += 1
      }
      if (steps === 100) accumulator = 0

      stateRef.current = next
      if (now - lastRender >= RENDER_INTERVAL_MS) {
        lastRender = now
        setState(next)
      }
      if (now - lastSave >= SAVE_INTERVAL_MS) {
        lastSave = now
        saveVehicleState(next)
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const flush = () => saveVehicleState(stateRef.current)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flush()
    }
  }, [])

  return {
    state,
    toggleArm,
    pressKey,
    releaseKey,
    reset,
    setTimeScale,
  }
}
