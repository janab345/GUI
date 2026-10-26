---
created: 2026-10-22
tags:
  - Space
  - PDI
  - Decisions
---

# DECISIONS — LLV PDI Console

> Lightweight architecture decision log (ADR-style). One entry per decision.
> This file records **what the code does today**, not what it should do. Anything
> proposed is clearly marked.
>
> Status legend:
> - **LOCKED** — matches the current code; do not change without updating this file.
> - **IMPLEMENTED** — a former proposal now in the local TS code, possibly not
>   yet in the wire contract.
> - **PROPOSED** — recommendation, not yet implemented. Needs review before coding.
> - **OPEN** — needs an owner (you / GNC lead / CAD) to decide.
>
> Related: [ESSENTIALS.md](./ESSENTIALS.md), [../docs/DESIGN.md](../docs/DESIGN.md),
> [LLV_GUI_Master_Plan.md](./LLV_GUI_Master_Plan.md).

---

## A. As-built decisions

### D-001 — Stack: React + TypeScript + Vite + R3F

**Status:** LOCKED

- React 19, TypeScript ~6.0, Vite 8.
- `three` 0.186, `@react-three/fiber` 9, `@react-three/drei` 10.
- Build: `tsc -b && vite build`. Dev: `npm run dev`.

**Why:** the master plan supersedes the original plain-JS/HTML/CSS choice. R3F
v9 is required for React 19; do not accept v8-era API suggestions from AI.

**Consequence:** ~1.1 MB JS bundle. Accepted for a kiosk/demo; do not optimize
until the dynamics are correct.

---

### D-002 — One shared state message; views are read-only

**Status:** LOCKED

`VehicleState` is the single source of truth. `App.tsx` reads it once and passes
props down. No view keeps its own physics or a divergent copy.

```
position, velocity, quaternion, throttle, throttleKeys, timeScale,
engineArmed, rcs, phaseIndex, phaseRemaining, fuel, target
```

Panel visibility is UI state in `App.tsx`, **not** part of `VehicleState`.

**Why:** both panels must render the same state. This is the future
Python/WebSocket seam.

---

### D-003 — World frame: de facto Three.js Y-up (no formal frame yet)

**Status:** LOCKED, with a known risk

- Altitude is `position[1]` (Y axis), in meters.
- The horizontal plane is `(x, z)`.
- Initial position: `[0, 15000, 0]` (15 km directly above the target).
- Initial velocity: `[200, 0, 0]` (200 m/s toward `+X`, the axis the lateral RCS
  can brake; the nose boom is `+Z`).
- Target: `[0, 0, 0]` — the pad, directly below the start point.
- Gravity `[0, -1.62, 0] m/s²` is applied and `position` is integrated. This is
  still Three.js Y-up, not the target ENU wire frame (P-001).

**Why:** Three.js is Y-up by default, so this is the path of least resistance for
the renderer. It is fine for the MVP **only if it is explicit**.

**Risk:** GNC and Python normally use ENU (Z-up) or NED. Altitude on a different
axis than the plant expects is the classic "lander falls sideways" bug.

**Action:** keep the conversion in one function when the plant is formalized
(see P-001). Do not scatter axis remapping through components.

---

### D-004 — Attitude is a quaternion in Three.js order `(x, y, z, w)`

**Status:** LOCKED (axis naming under review — see P-005)

- Type: `type Quat = [number, number, number, number]`.
- Order: `[x, y, z, w]`, matching `new THREE.Quaternion(...)`.
- Unit length; normalized after each body-rate integration.
- Attitude integration:
  `q_next = q * delta_q`, where `delta_q` is a rotation about the world `+Z`
  axis by `pitchRate * dt` — **post-multiplication = body-frame rate**.
- Sign convention: `pitchRate = (left − right) * 20°/s`. Right leans the body
  toward `+X`; left leans toward `−X`.
- Tilt is derived from the quaternion, never from Euler angles:
  `tilt = atan2(up.x, up.y)`, where `up = (0,1,0)` rotated by `q`.
  Positive = right lean, negative = left lean. The HUD shows `R nn°` / `L nn°`.
- Rendering smooths with `slerp(target, 1 - exp(-14 * dt))`, so a 30 Hz state
  stream still looks smooth.

**Terminology note.** With the model's long axis on `+Y` and the nose boom on
`+Z`, a rotation about `+Z` is technically **roll**, not pitch. In the current
camera view it reads as a lateral lean and is the axis that will redirect thrust
sideways, which is the behaviour the trainer needs. The code comments and UI
call it "pitch". Settle the proper axis (and label) when real 3D attitude and a
CAD model arrive. Do not build 3-axis controls on top of an unresolved naming.

**Why:** Euler angles flip near the poles and interpolate badly; the plan
explicitly forbids them in state.

**Trap:** most GNC/Python/MATLAB code uses `(w, x, y, z)`. The two orders are the
same numbers rearranged. Convert at the boundary, once, with a test.

---

### D-005 — Units and ranges

**Status:** LOCKED

| Quantity | Representation | Unit |
|---|---|---|
| Position | `number[3]` | meters |
| Velocity | `number[3]` | m/s |
| Quaternion | `number[4]` | unitless, `(x,y,z,w)` |
| Throttle | `number` | 0–1 (displayed ×100) |
| Fuel | `number` | percent, 0–100 |
| Phase remaining | `number` | seconds |
| RCS rate | internal | radians |
| Heading | — | replaced by tilt (see below) |
| Tilt | `number` | degrees, signed: + right, − left |
| Mass | derived from `fuel` | kg (`DRY_MASS_KG` + propellant) |
| Thrust | derived from `throttle` | N (`throttle * 45 000`) |
| Gravity | constant | `1.62 m/s²` |

**Why:** mass and thrust are no longer cosmetic. `massKg()` and
`thrustNewtons()` keep the conversion in one place; fuel remains a percentage
for display.

**Consequence:** acceleration depends on fuel state. At 100% fuel and full
throttle, TWR ≈ 1.85; as propellant burns, TWR rises. P-004 is implemented in
the TypeScript plant (not yet on the wire contract).

---

### D-006 — Time: fixed 10 ms step, no sim clock `t_s`

**Status:** IMPLEMENTED, still no mission clock

- `useVehicle.ts` accumulates frame time and calls `stepState()` in fixed
  `FIXED_STEP_S = 0.01` increments.
- Frame time is clamped to **0.1 s**; at most 100 steps are run per frame to
  avoid a catch-up spiral after a tab stall.
- React state is published at most every **33 ms** (~30 Hz).
- `timeScale` (1×/2×/5×/10×) is applied **inside** `stepState`; the accumulator
  itself stays in real time.
- Physics is deterministic for the same command sequence and step count.
- There is still no `t_s` in `VehicleState`, no pause, and no replay log.

**Why:** deterministic steps make tests and later replay possible without
changing the plant API.

**Consequence:** `phaseRemaining` is still advanced by the plant, but there is
no absolute mission time to tag snapshots. See P-002.

---

### D-007 — Plant is a pure function

**Status:** LOCKED

```ts
stepState(state: VehicleState, dt: number, controls: Controls): VehicleState
```

- Returns a new object; never mutates the input.
- No React, no DOM, no `performance.now()` inside.
- Behavior today: throttle ramp, tilt integration, mass/thrust/gravity,
  translation, ISP-based fuel burn, phase clock, surface clamp.
- Still missing: `t_s`, landed/crashed status, attitude-rate state.

**Why:** this is the seam. It can be replaced by a Python function or a
WebSocket adapter without touching the UI.

---

### D-008 — Input mapping

**Status:** LOCKED

| Input | Effect |
|---|---|
| `ArrowUp` | throttle `+1.0 / s` (full travel in 1 s) |
| `ArrowDown` | throttle `-1.0 / s` |
| `ArrowLeft` | tilt `−20°/s` (left RCS); body leans left |
| `ArrowRight` | tilt `+20°/s` (right RCS); body leans right |
| `Enter` | toggle the raw-state JSON overlay (screen B) |
| Navigation | always visible below Spacecraft Control; not part of `VehicleState` |
| On-screen hold buttons | inject the same key names into the same key set |
| Reset | on-screen button; keyboard `R` **not implemented** |
| Time scale | on-screen 1×/2×/5×/10×; pause **not implemented** |

**Why:** keyboard and on-screen buttons must share one command path.

**Consequence:** RCS is **1-DOF lateral tilt only** (rotation about `+Z`),
despite comments referring to 6DOF. Do not claim 6DOF in a demo until pitch,
roll, and yaw are separately defined.

---

### D-009 — Mission phases

**Status:** LOCKED

- Five phases: Braking, Approach, Sensor Nav, Hover, Terminal.
- 180 s each; advance automatically when the remaining time hits 0.
- Terminal clamps at 0 and does not loop.
- Phases do **not** clamp throttle or arm/disarm jets yet; they are labels only.

**Why:** a 3-minute-per-phase teaching clock shaped like Apollo P63–P67, not
Apollo's real gates.

---

### D-010 — Fuel and engine arming

**Status:** LOCKED

- Fuel starts at 100 (%) of `PROPELLANT_MASS_KG = 12 800 kg`.
- At full throttle, propellant flow is `F / (Isp * g0)` ≈ **15.3 kg/s** with
  `Isp = 300 s`, i.e. about **0.12 %/s** of the tank.
- `thrustOf(state)` returns 0 if the engine is safe or fuel is empty.
- Arming is a manual toggle; there is no auto-disarm at touchdown.
- `massKg(fuel)` is coupled to thrust and acceleration; fuel remains a
  display percentage.

---

### D-011 — Rendering rules

**Status:** LOCKED

- `Scene3D.tsx` contains **no physics**; it only maps state to transforms.
- Placeholder primitives: cylinder body, sphere capsule, cone engine, nose boom,
  flame cone, two RCS cones, four legs. Dark green-grey palette (`#2c363e`),
  background `#171717`.
- Body model: long axis `+Y` (up), nose boom `+Z`, thrust `−Y` (flame below).
  The only animated attitude axis is `+Z`.
- `Scene3D.tsx` still contains a stale comment calling the nose boom a "yaw
  (heading)" indicator. Fix it when touching the file; it no longer matches
  `tiltDeg()`.
- Camera: perspective, `[4, 3, 4]`, 50° FOV, `OrbitControls` with damping.
- Grid and Stars are drei helpers; no terrain. The lander loads
  `public/cx3-pdi.glb`, with the primitive lander as a load-failure fallback.
- HUD and panels are plain React DOM over the canvas, not Three.js sprites.

**Why:** fastest path and easiest to defend in review.

---

### D-012 — Status: no backend, no persistence

**Status:** LOCKED (intentional)

- No Python service, no WebSocket, no database, no logging.
- `SimAdapter` is **not yet extracted**; `stepState()` is the de facto seam.

---

## B. Proposed decisions (before real dynamics)

> These are recommendations. Discuss with the GNC lead, then promote to LOCKED
> with the code change.

### P-001 — Formal world frame: local ENU at the pad, converted once

**Status:** PROPOSED

- Contract uses ENU: `x = East`, `y = North`, `z = Up`, origin at target pad.
- Altitude = `z` (meters). Gravity = `[0, 0, -1.62]`.
- Renderer converts ENU → Three Y-up in exactly one adapter:
  `three = [east, up, -north]` (right-handed).
- Quaternion conversion is **not** just reordering: a basis change also
  transforms the rotation. Implement `q_enu_to_three`, and test with a known
  90° yaw where the nose should point in a predictable direction.
- Add a unit test with a hard-coded expected vector.

**Why:** matches the domain, survives the Python swap, keeps the renderer dumb.

### P-002 — Fixed timestep and sim clock

**Status:** PROPOSED

- `FIXED_DT = 0.01` s; accumulator loop with a 0.25 s cap per frame.
- Add `t_s` to `VehicleState`; derive the phase clock from it.
- Keep rendering at display rate; interpolate between the last two states if
  needed.

**Why:** determinism, replay, regression tests, monitor independence.

### P-003 — Quaternion wire format at the Python boundary

**Status:** PROPOSED

- Wire format: scalar-first `(w, x, y, z)` (Python/NumPy convention).
- TS wire type: `{ w, x, y, z }`, converted to Three order in `wsAdapter.ts`.
- Test: identity, 90° yaw, 90° pitch round-trip through the adapter.

**Why:** prevents the most common silent integration bug.

### P-004 — Real mass, thrust, and propellant

**Status:** IMPLEMENTED in the TS plant; still absent from the wire contract

- `massKg()`, `thrustNewtons()`, `GRAVITY_MPS2`, `MAX_THRUST_N`, `ENGINE_ISP_S`
  now drive acceleration and fuel burn in `vehicle.ts`.
- Still to do: expose `mass_kg`, `thrust_n`, `isp_s`, `propellant_kg` in the
  future `VehicleState` wire shape.
- `thrust_n = throttle * max_thrust_n`.
- `dm/dt = -thrust_n / (isp_s * 9.81)`.
- Keep `fuel` as a **display-only** percentage derived from propellant.
- Acceleration: `a = thrust_vector / mass + gravity`.

**Why:** without mass, "TWR < 1" and "fuel is low" are cosmetic, not meaningful.

### P-005 — Thrust and RCS command semantics

**Status:** PROPOSED

- Thrust along body `−Y` (matches the current model).
- RCS command = **body rate** (`omega_body_rps`), not attitude setpoint, for the
  manual trainer. Autopilot can be added later behind the same command.
- **Axis convention must be settled first.** The manual control currently rotates
  about `+Z`, which is roll for a `+Y`-long-axis body, but behaves as lateral
  tilt in the current view. For real 3D attitude, decide whether lateral
  translation is produced by pitch (about `+X`) or roll (about `+Z`), name it
  consistently in code and UI, and write a unit test with a known 20° input.
- Expand `RcsFlags` to `{ pitch, yaw, roll }` only after that decision, not
  before.

**Why:** rate control is what a hand-flown trainer needs; setpoints imply a
controller you do not have yet. Inconsistent axis names create invisible bugs
that survive code review.

### P-006 — Phase gating table

**Status:** PROPOSED

| Phase | Throttle | RCS | Notes |
|---|---|---|---|
| Braking | 0.2–1.0 | yaw only | kill horizontal velocity |
| Approach | 0–1.0 | yaw only | align with pad |
| Sensor Nav | 0–1.0 | yaw only | simulated nav error later |
| Hover | 0–0.7 | yaw only | hold altitude |
| Terminal | 0–1.0 | yaw only | final descent, low gate |

Gating belongs in the plant, not in the UI. The UI may *display* the limit but
must not enforce it.

### P-007 — Landed vs. crashed

**Status:** PROPOSED, needs mission input

Suggested MVP rule at touchdown (`z <= 0`):

- **Landed:** `|v_vertical| < 1.5 m/s`, `|v_horizontal| < 1.0 m/s`,
  tilt `< 10°`, within `5 m` of target.
- **Crashed:** anything else, or fuel exhausted above 50 m.

Show the reason on the HUD. Keep thresholds in one constants file so the GNC
lead can tune them without touching components.

### P-008 — Telemetry recording and replay

**Status:** PROPOSED

- Record `{ t_s, command, state }` at 30 Hz to JSON (or SQLite later).
- Replay by feeding commands into a fresh plant at `FIXED_DT`.
- Acceptance: replay reproduces the final state within 1 cm / 1 mm·s⁻¹.

**Why:** gives you a safe demo recording and a regression corpus.

### P-009 — Test floor

**Status:** PROPOSED

Minimum tests before the Python swap:

1. Free fall: from rest, 10 s → `v ≈ -16.2 m/s`, drop ≈ `81 m`.
2. Quaternion stays unit length after 10,000 random steps.
3. Identity heading is 0°; 90° yaw gives the expected heading.
4. Same command sequence + same `dt` → identical final state.
5. ENU ↔ Three conversion round-trips a known vector.

Use Vitest. Tests run headless, no browser, no renderer.

### P-010 — Python swap protocol

**Status:** PROPOSED

- FastAPI + WebSocket. Server owns the plant and the clock.
- Client → server: `Command` at input rate (edge-triggered + periodic heartbeat).
- Server → client: `VehicleState` at 30–60 Hz, tagged with `t_s`.
- Client keeps the last two states for interpolation; it never integrates.
- On disconnect: freeze the display, show `LINK LOST`; do not silently keep
  simulating locally.

**Why:** the UI must not care what computes the state.

---

## C. Open questions for the team

| # | Question | Owner | Why it matters |
|---|---|---|---|
| 1 | Which frame does GNC use: ENU, NED, or Moon-fixed? | GNC lead | fixes P-001 and every sign convention |
| 2 | Is the engine fixed or gimbaled? | GNC / CAD | determines whether yaw is enough to steer |
| 3 | Do we have mass, inertia, CoM, max thrust, ISP? | GNC | decides 3DOF vs 6DOF and fuel realism |
| 4 | Is CAD Z-up? What are the units and CoM origin? | CAD | blocks GLB import |
| 5 | What are the phase gates for the trainer? | Mission/trainer | P-006, P-007 |
| 6 | Acceptance criteria and demo date? | Lead | scope control |
| 7 | Any ITAR/export-control constraint on model or code? | Lead | dependency and asset choices |
| 8 | Which axis should manual lateral control use: `+Z` (current) or `+X`? | GNC lead | naming, thrust vectoring, 3D attitude model |

---

## D. Change log

| Date | Change | By |
|---|---|---|
| 2026-10-22 | Initial log created from as-built Day-1 code. | Trainee + AI |
| 2026-10-22 | Attitude command changed from yaw about `+Y` to lateral tilt about `+Z`; HUD `HDG` → `TILT`; `headingDeg()` → `tiltDeg()`. Axis naming flagged in D-004 / P-005. | Trainee |
| 2026-10-26 | Fixed 10 ms step, gravity/translation, mass/ISP fuel burn, `nav.ts`. Navigation is always visible below Spacecraft Control; Enter opens only the raw JSON. Panel visibility moved out of `VehicleState`. | Trainee + AI |

---

## E. Rules for this file

1. If code and this file disagree, **the file is wrong** — fix the file or fix the
   code, in the same commit.
2. One decision per entry. Do not rewrite history; append a superseding entry.
3. Promote PROPOSED → LOCKED only when the code and a test exist.
4. Keep it short. If an entry needs a diagram, put the diagram in
   [../docs/DESIGN.md](../docs/DESIGN.md) and link it.
