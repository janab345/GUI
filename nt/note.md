- **RF3/Three.js:** Canvas, useFrame, scene graph, GLB Loading, and how to debug "nothing renders" Enough to read the official docs and spot AI hallucinations. 
- **TypeScript:** how to read errors and the shapes you're passing around - not generics
- **The render-loop mental model + Quaternion/attitude math**- this overlaps with GNC, so it's double-dip learning. High value. 
- Skip: advanced R3F patterns, shaders, drei deep-dive, TS generics.


A lander has 6 DOF, and the console currently has only throttle + one tilt axis. Missing:
- Translation: lateral left/right drift, fore/aft motion, and vertical descent (altitude actually changing)
- Rotation: full pitch (fore/aft tilt), roll (left/right tilt), and yaw (heading) — currently one tilt axis only
- RCS translation: firing jets to slide without rotating
- Secondary: attitude rate/damping, engine gimbal, fuel-based thrust limits

- no need for other engines only 1 main Engine Thrust and 2 RCS for tilting right and left is what required for now. 