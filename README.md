# LLV PDI Console

A browser-based training console for a Lunar Landing Vehicle (LLV) powered descent
(PDI): a live 3D attitude panel plus mission, control, and telemetry panels, all
driven by one shared vehicle state. Built as a UI/UX proof first; real dynamics
come later.

**Current status: Day 1 — visualization mode.** The vehicle does not translate and
there is no gravity. Throttle and RCS change attitude/engine state only.

## Quick start

Requires Node 20.19+ (or 22.12+).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle
npm run lint
npm run preview
```

## Controls

| Key | Action |
|---|---|
| `↑` / `↓` | Ramp main-engine throttle up/down. Does not move the ship. |
| `←` / `→` | Fire the RCS jets and pitch/tilt the nose. |
| `Enter` | Toggle the raw vehicle-state panel. |

On-screen hold buttons mirror the arrow keys. The phase clock runs on its own:
five phases of **3:00** each, starting at **Braking, 15 km, 3:00**.

## What is implemented

- Quaternion attitude state (no Euler angles in the model), rendered directly by Three.js
- Keyboard flight: throttle ramp, RCS pitch, engine arm/safe
- Five-phase mission clock with automatic phase advance
- Corner HUD: phase, phase clock, altitude, horizontal/vertical speed, thrust, tilt
- Raw-state panel with the same message shape intended for the future backend
- Health/status telemetry derived from the shared state (no panel-side simulation)

## Architecture

One state object flows through the whole UI:

```
position, velocity, quaternion, throttle, RCS flags, phase, target
```

- `src/sim/vehicle.ts` — state type, initial state, pure `stepState()`, HUD math
- `src/sim/useVehicle.ts` — keyboard input, `requestAnimationFrame` loop, ~30 Hz snapshots
- `src/components/` — render-only panels; `Scene3D` slerps toward the state quaternion
- `App.tsx` — wires the state to the panels; owns no physics of its own

`stepState()` is the **SimAdapter seam**. The post-demo plan replaces it with a
Python/FastAPI + WebSocket plant without touching the UI. MATLAB truth models and RL
policies plug in behind the same message shape.

**Why tilt, not yaw?** In powered descent, attitude points the engine. Tilting the
vehicle off-vertical gives the thrust vector a horizontal component; that is what
moves the lander sideways. Yaw alone would not translate it.

## Project structure

```
src/
├── main.tsx
├── App.tsx
├── index.css
├── components/
│   ├── Scene3D.tsx           # Canvas, lander, thrust flame, RCS plumes
│   ├── Hud.tsx               # Corner readouts + raw state
│   ├── MissionProfile.tsx    # 5-phase timeline
│   ├── SpacecraftControl.tsx # Engine arm, throttle, key legend/hold buttons
│   └── HealthStatus.tsx      # Telemetry grid and warnings
└── sim/
    ├── vehicle.ts            # State, pure step function, helpers
    └── useVehicle.ts         # Input + frame loop
```

## Stack

- React 19 + TypeScript + Vite
- Three.js via `@react-three/fiber` and `@react-three/drei`

## Scope and roadmap

**MVP scope:** simplified kinematics, no backend, no login, no database, no
photoreal terrain.

Next steps, in order:

1. Manual target placement, predicted trajectory line, impact/miss marker
2. Lateral translation, lunar gravity, fuel, landing/crash scoring
3. Mission profile and health polish; rehearse the 3-minute demo
4. Python/FastAPI + WebSocket plant behind `stepState()`
5. Record/replay and telemetry logging
6. MATLAB reference path, then RL policies sending the same commands as the keys
7. Electron/Chromium kiosk packaging

## Documentation

- `nt/LLV_GUI_Master_Plan.md` — authoritative MVP/post-demo plan
- `LUNAR_LANDER_PLAN.md` — trainer mission, phases, Day 1 acceptance criteria
- `nt/PDI Realization.md` — original requirements and open questions
- `nt/Guide.md` — Day 1 code walkthrough
- `nt/AI_GUIDING_CHEATSHEET.md` — R3F version/debugging checklist
