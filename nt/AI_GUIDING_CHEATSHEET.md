# AI-Guiding Cheat Sheet — R3F + TypeScript

> Purpose: learn just enough to *direct* AI, not to *replace* it. The job here is (a) prompt well, (b) spot bad AI output, (c) debug silent failures, (d) defend the code in an interview.

---

## 0. The one rule

AI is great at scaffolding. AI is bad at knowing *your* versions, *your* scene, and *your* deadline. Your job is to be the domain expert on the parts that are wrong.

**You must be able to answer: "Is this output correct, or does it just look correct?"**

---

## 1. Version lock (do this FIRST, before any prompt)

R3F/Three.js break across versions. AI has stale training data.

| Package | Check |
|---|---|
| `three` | current stable is ~r16x/r17x |
| `@react-three/fiber` | v8 (React 18) vs v9 (React 19) — APIs differ |
| `@react-three/drei` | version must match your R3F major |

**Action:** pin versions in `package.json` and tell AI explicitly: *"Use R3F v9 API. Do not suggest v8 patterns."*

**Red flag:** AI suggests `<Canvas frameloop="always">` with old drei helpers, or imports that no longer exist (`extend` misuse, `useGLTF` prop drift). If you don't know the current API, you won't catch it.

---

## 2. Minimal mental model (the parts you actually need)

You do NOT need to learn all of Three.js. Learn these 5 concepts:

### a. Scene graph
Everything is a node in a tree. A `<mesh>` is a node. If a node isn't in the tree, it doesn't render. **Most "nothing shows up" bugs = node not mounted / wrong parent.**

### b. The render loop
R3F runs a loop every frame. `useFrame((state, delta) => { ... })` is where motion lives. **If something should move but doesn't, the bug is almost always inside `useFrame`.**

### c. Coordinates & units
Three.js is Y-up by default. Your lander model may be Z-up (from CAD/STEP). **Mismatch = model invisible or rotated wrong.** This is your #1 MVP risk. Check the GLB's up-axis.

### d. Cameras
- `OrbitControls` — user orbits around a target.
- `chase` camera — follows an object (you'll fake this by lerping camera position toward the lander each frame in `useFrame`).

### e. Geometry / material / mesh
A mesh = geometry (shape) + material (look). If it renders but looks flat/black, it's a **lighting** or **material** problem, not a geometry problem.

---

## 3. The "silent failure" checklist

When the app compiles but renders nothing/wrong, check in this order:

1. **Is the component inside `<Canvas>`?** Anything 3D must be a child of Canvas.
2. **Is the mesh positioned inside the camera frustum?** Check `position` values — a mesh at `y=1000` is off-screen.
3. **Is the camera looking at it?** `camera.lookAt()` or `OrbitControls target`.
4. **Is there a light?** No light = black objects. Add `<ambientLight />` + `<directionalLight />`.
5. **Is the GLB actually loaded?** `useGLTF` is async. Log `scene` to confirm it's not null. **Most common MVP bug.**
6. **Up-axis mismatch?** Model faces sideways/invisible.
7. **Scale?** GLB might be 1000x too big or tiny. Check `scene.scale`.
8. **Is `useFrame` running?** Add a `console.log` inside it. If it never logs, `frameloop` or mount is wrong.

**Prompt pattern for AI:** *"The canvas is blank. Here's my component tree and the GLB. Walk me through the checklist: is the mesh mounted, in frustum, lit, loaded?"*

---

## 4. TypeScript — learn the error language, not the theory

You do NOT need generics mastery. You need to read errors.

| Error shape | What it means | Fix direction |
|---|---|---|
| `Property 'x' does not exist on type 'Y'` | wrong prop name / wrong version API | check docs for current prop |
| `Type 'Z' is not assignable to type 'W'` | shape mismatch | check what the component expects |
| `Object is possibly 'undefined'` | null check missing | guard with `if (!x) return` |
| `Argument of type ... is not assignable` | passing wrong thing to a function | check the function signature |

**Prompt pattern for AI:** *"Here's the exact TS error and the line. What does it mean, and what's the current correct API?"*

**Red flag:** AI "fixes" a type error by adding `as any` or `@ts-ignore`. That hides the real bug. Reject it — ask for the actual type fix.

---

## 5. Prompting patterns that work

- **Always give context:** versions, the exact component, what you expect vs what happens.
- **Ask for the seam, not the feature:** *"Give me the `SimAdapter` interface and a mock implementation. I'll wire the UI to it."*
- **Ask AI to review its own output:** *"Now check this for R3F v9 correctness and list anything that would silently fail."*
- **Chunk it:** one component per prompt. Don't ask for the whole app in one shot.
- **Say "no" to scope creep:** *"Do not add shaders/postprocessing. Grid + plane only."*

---

## 6. What to learn by hand vs delegate

| Learn yourself (double-dip with GNC) | Delegate to AI |
|---|---|
| Quaternion / attitude math | Boilerplate, config, styling |
| The render-loop mental model | Repeated component patterns |
| Reading TS errors | Type definitions for you |
| Debugging "nothing renders" | File scaffolding |
| The `SimAdapter` seam design | README / comments |

---

## 7. Interview defense — the real test

For each thing AI wrote that you'll show, be able to answer:
- What does this component do?
- Why this approach over the alternative?
- What broke, and how did you fix it?
- What would you change next?

**If you can't answer these, you don't own the code — AI does, and the interview will expose it.**

---

## 8. Quick reference — the MVP's critical path

1. Pin versions → 2. Get a GLB loading (or placeholder box) → 3. Get it lit and in-frame → 4. Add `useFrame` motion → 5. Wire `SimAdapter` mock → 6. HUD overlay (React, not 3D) → 7. Polish.

**The HUD (altitude, velocity, fuel, warnings) is plain React DOM over the canvas — don't build it in Three.js.** That's the fastest path and easiest to defend.

---

_Remember: the MVP is a UI/UX proof, not an engineering simulator. The seam (`SimAdapter`) is the only part that must be architecturally clean._
