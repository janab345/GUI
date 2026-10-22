# Design — LLV PDI Console

**Status:** Day-1 vertical slice built; dynamics not yet real
**Owner:** GNC trainee
**Date:** 2026-10-22
**Related:** [../nt/DECISIONS.md](../nt/DECISIONS.md) · [../nt/ESSENTIALS.md](../nt/ESSENTIALS.md) · [../nt/LLV_GUI_Master_Plan.md](../nt/LLV_GUI_Master_Plan.md)

---

## 1. Purpose

A mission-control-style console for hand-flying a lunar lander through powered
descent (PDI), from 15 km to a chosen landing point. One vehicle state drives two
views: a 3D attitude scene and a trajectory/telemetry view. It is a **training
and UI/UX tool**, not a flight-certified simulator.

## 2. Goals and non-goals

**Goals (MVP)**

- One shared state message, rendered by every panel.
- Keyboard flight: throttle and attitude, with a visible response.
- Believable lunar motion: constant gravity, propulsive braking, fuel.
- Five-phase mission clock and honest telemetry.
- A clean seam so Python, MATLAB, or RL can replace the plant later.

**Non-goals (MVP)**

- Orbital mechanics, atmosphere, perturbations, terrain collision mesh.
- Photoreal graphics, real CAD model, 6DOF inertia, control-law design.
- Backend, login, database, multiplayer, cloud.
- RL and MATLAB integration.

## 3. System context

```
        Operator
     (keyboard / buttons)
            │
            ▼
   ┌──────────────────┐        ┌────────────────────┐
   │  Browser client  │        │  Future: Python    │
   │  React + R3F     │◄──────►│  FastAPI + WS      │
   │  plant + views   │  state │  plant (same       │
   └──────────────────┘  /cmd  │  contract)         │
                               └────────────────────┘
```

The client is self-contained today. The dashed future link replaces the local
plant without changing any view.

## 4. The five boxes

```
[1 INPUT]          [2 PLANT]            [3 STATE]           [4 VIEWS]
 keyboard    ──►   step(state, dt,  ──►  VehicleState   ──►   Scene3D
 hold buttons       command)             (the contract)       Hud
 (later: pad,           │                                      MissionProfile
  replay, policy)       │                                      SpacecraftControl
                        ▼                                      HealthStatus
                  [5 TIME / TRANSPORT]
                  fixed dt · sim clock · command log · later WebSocket
```

| Box | Responsibility | Must never do |
|---|---|---|
| 1 Input | Translate keys/buttons into a `Command` | mutate state directly |
| 2 Plant | Integrate dynamics, burn fuel, advance phases | touch DOM, React, or rendering |
| 3 State | Carry one timestamped snapshot of the vehicle | contain rendering concerns |
| 4 Views | Draw the snapshot | integrate physics or keep a second copy |
| 5 Time | Own the clock, stepping, logging, transport | be hidden inside a view |

## 5. Contract (target v1)

Frames: local **ENU** at the pad (`x` East, `y` North, `z` Up), origin at target.
Units: m, s, rad, kg, N. Quaternion scalar-first on the wire: `(w, x, y, z)`.
The renderer converts to Three.js Y-up `(x, y, z, w)` in one adapter.

```ts
interface VehicleState {
  t_s: number
  pos_enu_m: [number, number, number]
  vel_enu_mps: [number, number, number]
  q_body_to_enu: [number, number, number, number]  // scalar-first
  omega_body_rps: [number, number, number]
  throttle_cmd: number        // 0..1 operator input
  thrust_n: number            // actual, after arming and fuel
  mass_kg: number
  propellant_kg: number
  rcs: { pitch: number; yaw: number; roll: number } // -1..1
  phase: Phase
  phaseRemaining_s: number
  target_enu_m: [number, number, number]
  status: 'nominal' | 'lowFuel' | 'landed' | 'crashed' | 'linkLost'
}

interface Command {
  throttle: number
  rcs: { pitch: number; yaw: number; roll: number }
}

interface SimAdapter {
  reset(): void
  step(dt_s: number, cmd: Command): VehicleState
  snapshot(): VehicleState
}
```

**As-built differences (Day 1):** Three.js Y-up, altitude on `y`; quaternion
`(x,y,z,w)`; the only attitude command is a lateral tilt about `+Z`, surfaced as
`tiltDeg()` (`R`/`L`); throttle 0–1; fuel in percent; no mass, thrust in newtons,
`t_s`, status, or `SimAdapter` yet. See D-003 … D-007 in the decisions log.

## 6. Timing model

```
requestAnimationFrame (display rate)
  ├─ accumulate real dt (cap 0.25 s to survive tab switches)
  ├─ while acc >= FIXED_DT: state = step(state, 0.01, command); acc -= 0.01
  ├─ publish snapshot to views at ~30 Hz
  └─ render: slerp attitude toward the latest state
```

- Plant is deterministic: same commands + same number of steps = same state.
- `t_s` comes from the plant, never from `Date.now()` in a view.
- Pause stops stepping, not rendering. Time scale changes the accumulator rate,
  not `FIXED_DT`.
- The future WebSocket client receives states tagged with `t_s` and interpolates
  between the last two; it still never integrates.

## 7. Module map

```
src/
  sim/
    vehicle.ts        state type, constants, pure stepState(), derived math
    useVehicle.ts     rAF loop, keyboard → Command, publish snapshots
  components/
    Scene3D.tsx       Three.js canvas: model, flame, RCS, camera
    Hud.tsx           overlay telemetry + raw-state panel
    MissionProfile.tsx  phase timeline
    SpacecraftControl.tsx  arm, throttle, on-screen hold buttons
    HealthStatus.tsx  derived telemetry and warnings
  App.tsx             layout, wires state to panels
  index.css           mission-control theme
public/               future GLB assets
```

Target additions: `contract/`, `sim/dynamics.ts`, `transport/localAdapter.ts`,
`transport/wsAdapter.ts`, `components/TrajectoryPlot.tsx`, `sim/recorder.ts`.

## 8. Mission phases

| # | Phase | Duration | Intent |
|---|---|---|---|
| 1 | Braking | 180 s | kill horizontal velocity |
| 2 | Approach | 180 s | close on the pad |
| 3 | Sensor Nav | 180 s | fly on instruments (nav error later) |
| 4 | Hover | 180 s | hold a low gate |
| 5 | Terminal | 180 s | final vertical descent |

The clock is a teaching device shaped like Apollo P63–P67, not Apollo's real
gates. Phase gating belongs in the plant; the UI may display limits but not
enforce them.

## 9. Failure modes and handling

| Failure | Handling |
|---|---|
| Tab hidden / long frame | cap accumulated `dt`, do not fast-forward physics |
| Lost keyboard focus | clear held keys on `blur` |
| Fuel exhausted | thrust = 0, warning shown; vehicle keeps falling |
| Engine safe | thrust = 0; arming is explicit |
| Touchdown | compare velocity/tilt/position against thresholds; set status |
| WebSocket lost (later) | freeze display, show `LINK LOST`; do not simulate locally |
| Renderer error | keep HUD alive; a blank canvas must not blank telemetry |

## 10. Acceptance criteria

**Day 1 (met by the current slice)**

- Refresh shows Braking at 15 km and 3:00.
- → tilts the vehicle and the `TILT` readout together (currently about `+Z`).
- ↑ raises the flame to 100%, ↓ lowers it without translating the ship.
- The phase highlight advances when the timer reaches zero.
- Enter toggles the raw state.

**MVP (next milestone)**

- Gravity + translation with a passing free-fall test.
- Fixed timestep; identical replay from an identical command log.
- 2D trajectory plot agrees with the 3D scene.
- Fuel/mass/TWR are physically consistent.
- Phase gating changes what the controls can do.
- Landed vs. crashed is decided from state, with a reason shown.
- One-command run, fullscreen, reset, pause, time scale.

## 11. Evolution path

1. **Now:** local TS plant, placeholder model, one screen.
2. **Post-demo:** extract `SimAdapter`; add FastAPI + WebSocket plant; add
   recorder/replay and SQLite telemetry.
3. **Later:** MATLAB/Simulink reference path drawn as a ghost; RL policy sends
   the same `Command`; Electron kiosk packaging.

The seam is the only part that must be architecturally clean. Everything else can
be replaced.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Frame/unit mismatch when Python arrives | single conversion adapter + round-trip test |
| Quaternion order mismatch | scalar-first wire type, tested conversion |
| Axis naming (`+Z` tilt vs `+X` pitch/roll) | settle before 3-axis controls and CAD import; one test with a known angle |
| Variable `dt` makes replay impossible | fixed-step accumulator |
| Scope creep into physics fidelity | master plan guardrails; ship the UI proof |
| AI-generated code nobody understands | explain-one-file-per-day, decisions log, tests |
| Demo machine failure | recorded replay + video backup |

## 13. Open questions

Tracked in [../nt/DECISIONS.md](../nt/DECISIONS.md#c-open-questions-for-the-team):
frame convention, gimbaled vs. fixed engine, mass/inertia data, CAD up-axis,
phase gates, acceptance criteria, export-control constraints.
