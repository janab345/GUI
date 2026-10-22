# PDI GUI — Day 1 Development Guide

## What Was Built

A frontend-only MVP for the Lunar Landing Vehicle (LLV) PDI console. Four modules delivered:

| Module | File | What It Does |
|---|---|---|
| 3D Scene | `src/components/Scene3D.tsx` | Three.js canvas with lander model, stars, grid, orbit controls. Rotates on attitude input, shows thrust flame. |
| Mission Profile | `src/components/MissionProfile.tsx` | 5-phase timeline with active/complete states. |
| Spacecraft Control | `src/components/SpacecraftControl.tsx` | Ignition toggle, throttle slider, roll/pitch/yaw sliders, phase buttons. |
| Health & Status | `src/components/HealthStatus.tsx` | Live telemetry grid with simulated data that responds to throttle/ignition. |

## Project Structure

```
pdi-gui/
├── index.html
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Layout + state (attitude, ignition, throttle, phase)
│   ├── index.css             # Dark mission-control theme
│   └── components/
│       ├── Scene3D.tsx       # 3D canvas + lander model
│       ├── MissionProfile.tsx
│       ├── SpacecraftControl.tsx
│       └── HealthStatus.tsx
└── public/                   # Drop GLB files here when ready
```

## How to Run

```bash
cd pdi-gui
npm run dev
```

## Key Concepts to Learn

### 1. React State Management
- `App.tsx` holds all state: `attitude`, `ignitionOn`, `throttle`, `currentPhase`
- State is passed down to components as props
- No external state library — just `useState`

### 2. Three.js via React Three Fiber
- `<Canvas>` replaces the WebGL renderer
- `<mesh>`, `<cylinderGeometry>`, `<sphereGeometry>` are declarative Three.js objects
- `useFrame()` runs every animation frame — used to update lander rotation
- `<OrbitControls>` lets you drag to rotate the camera
- `<Stars>` and `<Grid>` are helpers from `@react-three/drei`

### 3. Component Communication
- `SpacecraftControl` calls `onIgnitionToggle()`, `onThrottleChange()`, etc.
- `App.tsx` updates state → passes new props → `Scene3D` re-renders with new attitude/thrust
- `HealthStatus` receives `throttle` and `ignitionOn` as props and simulates telemetry

### 4. Simulated Telemetry
- `HealthStatus` uses `useEffect` + `setInterval` to update values every 100ms
- When ignition is on: altitude decreases, fuel burns, thrust increases
- When off: altitude slowly increases (drift), velocity decays

## How to Extend

### Swap Placeholder Lander for Real STEP Model
1. Convert STEP → GLB (FreeCAD or Blender)
2. Drop `.glb` file in `public/`
3. In `Scene3D.tsx`, replace the `<group>` with:
```tsx
import { useGLTF } from '@react-three/drei'

function LanderModel() {
  const { scene } = useGLTF('/lander.glb')
  return <primitive object={scene} />
}
```

### Add Real Physics
- Replace the `useEffect` simulation in `HealthStatus` with a WebSocket connection to a Python/MATLAB backend
- The UI doesn't care what computes the state — that's the `SimAdapter` seam

### Add Keyboard Controls
- Add a `useEffect` in `App.tsx` that listens for arrow keys
- Update `attitude` state on keypress — `Scene3D` will respond automatically

## Learning Path

| Week | Focus |
|---|---|
| 1 | React props/state, component composition |
| 2 | Three.js scene graph, geometry, materials, lights |
| 3 | R3F hooks (`useFrame`, `useThree`), drei helpers |
| 4 | WebSocket integration, real telemetry |

## Space Concepts Used in This MVP

- **Coordinate frames:** Roll (X), Pitch (Y), Zaw (Z) — simplified, not real aerospace convention
- **Descent profile:** 5 phases from approach to landing
- **Telemetry:** Altitude, velocity, fuel, thrust, mode, link — standard mission control readouts
- **PDI:** Powered Descent Ignition — the 15km to 0km landing burn

These are simplified for the MVP. Real GNC uses quaternions, not Euler angles, and Moon-fixed frames, not body-fixed.


