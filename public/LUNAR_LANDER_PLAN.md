# Lunar Lander Descent Simulator — Build Plan

A 24-day training tool: one tracker panel and one live 3D orientation panel, both
driven by the same vehicle state. You hand-fly the descent from 15 km to a chosen
point. MATLAB and reinforcement learning come **after** a person can land it.

---

## The mission

- 15 km is where **powered descent** starts, not where lunar gravity starts.
- Gravity is about **1.62 m/s²** at the surface and acts the whole way. There is no air.
- Start the trainer at roughly **150–250 m/s sideways**, not the real ~1.7 km/s orbital speed.

## Controls

- **Up / Down** only change main-engine throttle. Down does not reverse the ship;
  speed drops only when the engine points against the velocity.
- **Left / Right** fire the two RCS jets and **tilt** the nose (pitch). Tilting points
  the engine off-vertical; that is what produces sideways motion. Yaw would not.
- **Enter** toggles a raw-state panel.
- Altitude, speeds, throttle, heading, phase, and time-left stay visible in the corner.

## Two screens, one plant

Neither panel simulates. Both render one state message:

```
position, velocity, quaternion, throttle, RCS flags, phase, target
```

- Keyboard, a later RL policy, and replay all send the **same command**.
- Attitude is a **quaternion**, not Euler angles (Euler angles flip at the poles).
- The browser draws; a **Python service** will own the equations.
- **Node only serves the page and forwards the socket.** It never integrates physics.

## Stack

- **Plain JavaScript, HTML, CSS** was the original call. **Superseded:** the master
  plan and the existing scaffold are React + TypeScript + Vite. Stay in TypeScript.
- Node/Express on day 1; **WebSocket** once the plant moves to Python.
- **Three.js** for the lander, after a box on a canvas proves the panel works.
- Convert the `.step` file **once** to glTF — browsers cannot load STEP.
- **Gymnasium** for RL. **MATLAB runs offline** and writes a reference path the
  tracker draws as a ghost.

## Five phases, 3 minutes each

Same keys every phase. The phase only clamps throttle and arms jets:

1. Braking
2. Approach
3. Sensor nav
4. Hover
5. Terminal

That is a teaching clock shaped like Apollo P63–P67, **not** Apollo's real gates.

## Day 1 — one page, two panels, fake motion

No gravity, no STEP, no MATLAB, no RL.

**Done when:**

1. Refresh shows **Braking at 15 km and 3:00**.
2. **Right** tilts the cone right and the **TILT** readout follows.
3. **Up** grows the flame to 100 and **Down** brings it back **without sliding the ship**.
4. The highlighted phase box advances when the timer hits zero.

## After that

Split the drawing, add the target, move state into Python, add real lunar gravity and
fuel, drive the CAD mesh from the same attitude, score landed vs crashed, load a MATLAB
reference file, then train a policy that sends the same commands as the keys.

---

**If time slips, slip the policy. Do not slip the manual landing.**
