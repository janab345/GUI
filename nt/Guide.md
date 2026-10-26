# PDI GUI — Day 1 Development Guide

## What Was Built

A frontend-only MVP for the Lunar Landing Vehicle (LLV) PDI console. Four modules delivered:

| Module | File | What It Does |
|---|---|---|
| 3D Scene | `src/components/Scene3D.tsx` | Three.js canvas with lander model, stars, grid, orbit controls. Rotates on attitude input, shows thrust flame. |
| Mission Profile | `src/components/MissionProfile.tsx` | 5-phase timeline with active/complete states. |
| Spacecraft Control | `src/components/SpacecraftControl.tsx` | Engine arm, throttle readout, keyboard/hold-button flight controls. |
| Health & Status | `src/components/HealthStatus.tsx` | Telemetry derived from the shared vehicle state. |
| Navigation | `src/components/NavigationPanel.tsx` | Always-visible nav values and sensor status below Spacecraft Control. |
| Raw State | `src/components/RawStatePanel.tsx` | Debug JSON overlay, opened only with Enter. |

## Project Structure

```
pdi-gui/
├── index.html
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Layout; wires the shared vehicle state to panels
│   ├── index.css             # Dark mission-control theme
│   ├── sim/
│   │   ├── vehicle.ts        # State type, pure fixed-step physics, derived math
│   │   ├── nav.ts            # Range, bearing, flight-path angle, sensor status
│   │   └── useVehicle.ts     # Keyboard input, fixed-step rAF loop, ~30 Hz snapshots
│   └── components/
│       ├── Scene3D.tsx       # 3D canvas + lander, driven by the quaternion
│       ├── NavigationPanel.tsx  # always-visible right-rail nav panel
│       ├── RawStatePanel.tsx    # Enter-only JSON overlay
│       ├── MissionProfile.tsx
│       ├── SpacecraftControl.tsx
│       ├── HealthStatus.tsx
│       └── Hud.tsx           # legacy, currently unused
└── public/                   # Drop GLB files here when ready
```

## How to Run

```bash
cd pdi-gui
npm run dev
```

## Key Concepts to Learn

### 1. Shared Vehicle State
- `src/sim/vehicle.ts` defines one `VehicleState`: position, velocity, quaternion, throttle, RCS flags, phase, target
- `useVehicle()` owns the state and advances it in fixed 10 ms steps via the pure `stepState()`
- Panels never simulate; they render the same state message (the future Python/WebSocket seam)

### 2. Three.js via React Three Fiber
- `<Canvas>` replaces the WebGL renderer
- `<mesh>`, `<cylinderGeometry>`, `<sphereGeometry>` are declarative Three.js objects
- `useFrame()` runs every animation frame — used to slerp the lander toward the state quaternion
- `<OrbitControls>` lets you drag to rotate the camera
- `<Stars>` and `<Grid>` are helpers from `@react-three/drei`

### 3. Component Communication
- `SpacecraftControl` reports engine-arm and held keys (buttons mirror the keyboard)
- `App.tsx` reads the state → passes new props → `Scene3D` renders the new attitude/thrust
- `HealthStatus` receives derived values as props; it holds no state of its own

### 4. Keyboard Flight
- `↑ / ↓` ramp throttle up/down; thrust and gravity now change position and velocity
- `← / →` fire the RCS jets and tilt the vehicle; tilt is read from the quaternion
- `Enter` toggles the raw-state JSON overlay; navigation is always visible
- The phase clock is 3:00 per phase and advances on its own; Braking starts at 15 km

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

### Replace the TS Kinematics
- `stepState()` in `sim/vehicle.ts` is the only place physics advances; replace it with a WebSocket adapter
- The UI doesn't care what computes the state — that's the `SimAdapter` seam

### Add Keyboard Controls
- Done: `useVehicle()` listens for arrow keys and `Enter`, and the on-screen hold buttons share the same key set

## Learning Path

| Week | Focus |
|---|---|
| 1 | React props/state, component composition |
| 2 | Three.js scene graph, geometry, materials, lights |
| 3 | R3F hooks (`useFrame`, `useThree`), drei helpers |
| 4 | WebSocket integration, real telemetry |

## Space Concepts Used in This MVP

- **Attitude:** quaternion, rendered directly — no Euler angles in the state
- **Descent profile:** 5 phases of 3:00 each (Braking → Terminal)
- **Telemetry:** Altitude, horizontal/vertical speed, fuel, thrust, tilt — standard mission control readouts
- **PDI:** Powered Descent Ignition — the 15 km to 0 km landing burn

These are simplified for the Day 1 visualization. Real GNC adds Moon-fixed frames, gravity, and translation.


