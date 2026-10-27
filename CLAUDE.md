# Project Architecture & Vibe Coding Rules

## 1. Tech Stack

- **Language:** TypeScript (strict mode)
- **Bundler:** Vite
- **Renderer:** PixiJS v8 (WebGL 2D)
- **Testing:** Vitest (Unit & Simulation Integration Tests)

## 2. Strict Separation of Concerns (Model-View Separation)

- **Simulation Core (`src/core/`):** Pure TypeScript classes/functions. ZERO imports from `pixi.js` or `window`/`document`. The entire city simulation must be able to run headlessly inside Vitest at 10,000 ticks per second.
- **PixiJS Renderer (`src/render/`):** Reads state from `src/core/` and draws/updates `PIXI.Container` and `PIXI.Graphics` objects. Never mutates game rules directly.
- **UI Layer (`src/ui/`):** HTML/CSS overlay positioned above the PixiJS canvas for crisp buttons, budgets, and toolbars.

## 3. Procedural Graphics Only

- Do NOT load external PNG/JPG sprite sheets.
- Use `PIXI.Graphics` to draw crisp procedural shapes, roofs, lane markings, cars, and trees, or bake `PIXI.Graphics` into `PIXI.Texture` via `renderer.generateTexture()` for high-performance sprite batching.

## 4. Mandatory Automated Testing Protocol

- Every phase MUST include a test file in `tests/phase_XX.test.ts`.
- After writing code for any phase, you MUST run `npx vitest run` in the terminal.
- A phase is NOT complete until all previous tests and the new phase's tests pass 100%.

## 5. File Size Limit

- Never let a single file exceed 350 lines of code. Split systems into modular files inside `src/core/`, `src/render/`, and `src/ui/`.
