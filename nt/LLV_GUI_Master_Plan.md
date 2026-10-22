---
created: 2026-10-22
tags:
  - Space
---

# LLV GUI — Master Plan (Single Source of Truth)

> This note supersedes the scattered plan fragments. One place for the MVP, the post-demo roadmap, and the deferred items.

## Combined from

- `LLV_GUI_5Day_MVP.md` — 5-day plan, acceptance criteria, scope guardrails (authoritative for the MVP)
- `PDI Realization.md` — final architecture decisions (Python backend), deferred RL/MATLAB decision
- `AI_GUIDING_CHEATSHEET.md` — R3F version pinning + silent-failure checklist (still applies during build)
- `gap-filling-plan.md` — pre-Day-1 learning (React → TS → Vite → R3F)

`MVP.md` was a stale duplicate of `LLV_GUI_5Day_MVP.md` and has been deleted.

## Architecture: two phases, one seam

| Phase | Dynamics | Backend | Status |
|---|---|---|---|
| **MVP (5-day demo)** | Simplified TS kinematics | **None** | Ship this |
| **Post-demo (by 14 Nov)** | Python/FastAPI + NumPy/SciPy plant | WebSocket replaces the adapter | Then this |
| **Later** | MATLAB/Simulink truth model, RL training | Same WebSocket protocol | Deferred, **not excluded** |

**Correction to old note:** "RL and MATLAB are hard to implement for now" means *deferred*, not excluded. The `SimAdapter` seam exists precisely so they can plug in later without touching the UI. The UI must never care what computes the state.

## Confirmed stack

- **Frontend:** React + TypeScript + Vite + Three.js (@react-three/fiber, drei)
- **MVP dynamics:** 6DOF simplified kinematics in TS, labeled "visualization mode"
- **Backend (post-demo):** Python + FastAPI + WebSocket + NumPy/SciPy
- **CAD:** STEP → FreeCAD/Blender → GLB → Three.js (ask for units, up-axis, CoM origin early)
- **Logging:** SQLite for MVP → Postgres later if needed
- **Runtime:** Chrome now, Electron/Chromium kiosk at the end

## 5-day MVP plan (unchanged)

| Day | Build |
|---|---|
| 1 | Scaffold. GLB or placeholder lander. Scene, grid, orbit/chase cameras, body axes, HUD shell. |
| 2 | Keyboard + gamepad. Quaternion attitude integration, translation, thrust. Reset/deadman. |
| 3 | Manual target placement. Predicted ballistic trajectory line, impact marker, miss distance. |
| 4 | Mission profile timeline, health/status panel, warnings, polish. |
| 5 | Rehearse 3-min demo. Record video. Send lead feedback list. |

## Scope guardrails (MVP)

- No real physics — simplified kinematics only
- No backend, no login, no cloud, no DB, no multi-vehicle
- No photoreal terrain — grid + lunar plane + target reticle
- RL/MATLAB explicitly deferred behind the `SimAdapter` seam

## Post-demo (by 14 Nov)

1. Replace TS kinematics with Python/MATLAB plant behind WebSocket
2. Record/replay + telemetry logging
3. Modular panels for RL hooks
4. Quaternion/frame tests; package in Electron kiosk
5. Portfolio case study + 60-sec video

## One rule

The 5-day demo is a **UI/UX proof, not an engineering simulator**. Build the interface, mock the dynamics, keep the adapter seam clean.
