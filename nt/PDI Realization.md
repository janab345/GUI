---
created: 2026-10-17
tags:
  - Space
---
### Two UIs for Lunar Landing Vehicle 

1. One Visualizing and manipulating the 3D orientation of the space craft 
2. Visualizing of landing trajectory (Synchronized with orientation of space craft of 1st UI)

	1. Orientation visualizer's cmds
		- Dsiplay current position and velocity 
		- ignition on command 
		- pre-defined phase 1 (attitude) 
		- pre-defined phase 2 
		- pre-defined phase 3 
	  Delegated tasks:
		- uncertain about 6 direction demonstration 
		- working .step file
	2. Landing trajecyory UI 
		- display landing trajectory of space craft 
		- three types of simulation /testing 
			1. manual control using arrow keys to land in the desired point/position 
			2. automated moves based on ML training 
			3. A piece of code to ensure landing in desired point 

For this what software tool might be the right one and how one should approach this.

## Decisions 

For now RL and MATLAB are hard to implement. 

## Space Concepts 

- [ ] Orbital Mechnics 
- [ ] Gravitational Model [Earth, Moon, Mars]
- [ ] Landing Descent Profile
- [ ] PDI (15km to 0km)
- [ ] Telemetry & Health [Mission Control center]

## 20/10/26

- **Frontend:** React + TypeScript + Vite  + Three.js via @react-three/fiber
- **Backend**:  Python + FastAPI + WebSocket + Numpy/Scipy
- **Runtime:** start in Chrome, package in Electron/Chromium kiosk at the end
- **CAD pipeline:** STEP -> FreeCAD/Blender -> GLB -> Three.js
- **Logging:** SQLite for MVP, Postgres later if needed

#### Questions 

1. Is this attitude-only, or full 6DOF translation plus attitude?
2. Is the goal a visual/engineering demo, or must it match a Simulink truth model?
3. Can I get mass, inertia tensor, CoM, thruster positions, max thrust and ISP?
4. Which frame does GNC use: body, local ENU, or Moon-fixed? Is CAD Z-up?
5. Does "desired landing point" mean manual target display, or should the GUI compute guidance?
6. What are the acceptance criteria and the demo date?
7. Are there ITAR/export-control constraints on the model or code? Can I use open-source dependencies?
8. Can I get a simplified STEP with named parts and a decimated version?

Learn C++ in parallel — one hour a day — but do not put it on the MVP critical path. Ship the GUI first. Then, if the team needs higher fidelity, replace the Python plant with C++ or Simulink behind the same WebSocket protocol. The UI should not care what computes the state.


