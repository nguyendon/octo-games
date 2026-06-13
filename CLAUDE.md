# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (workspace at the root). Node >= 20.

- `pnpm dev` — runs server (`tsx watch`) and client (`vite`) in parallel. Client at `:5173` proxies `/api/*` to server at `:3000`.
- `pnpm build` — builds client into `server/public/`, then "builds" the server (server runs from source via `tsx`, so this is just the client bundle).
- `pnpm start` — production server (serves API + static client from `server/public`). Requires `pnpm build` first.
- `pnpm test` — vitest run for the server (the only package with tests).
- `pnpm typecheck` — `tsc --noEmit` for both client and server. No package has a separate lint command; typecheck is the only static check.

Single-test run: `pnpm --filter @octo/server exec vitest run path/to/file.test.ts -t "test name"`.

CI (`.github/workflows/ci.yml`) runs `typecheck`, `test`, `build` on push/PR to `main`. Match that locally before committing.

## Architecture

Three pnpm workspaces: `client/`, `server/`, `shared/`.

**`shared/`** is type-only (`@octo/shared`, no build). Both client and server import the same `LevelId`, `IngredientId`, `PlayerProfile`, and request/response shapes from `shared/src/index.ts`. When adding a new API contract, define both request and response types there first.

**`server/`** (`@octo/server`) is a Fastify app backed by `better-sqlite3`. Entry point `server/src/index.ts` registers `/api/health` and the profile routes, then — only in `NODE_ENV=production` — mounts `@fastify/static` to serve the built client from `../public`. In dev there is no static serving; Vite handles that side.

- `server/src/db.ts` owns the SQLite connection, schema (`player`, `level_result`), and prepared statements. Schema is applied via `CREATE TABLE IF NOT EXISTS` at import time — there is no migration framework. `DATA_DIR` env var controls where `game.db` lives (defaults to `server/data/`); on Railway, mount a volume and set `DATA_DIR=/data`.
- `server/src/routes/profile.ts` exposes `POST /api/profile` (upsert by `deviceId`), `POST /api/profile/spend` (deduct, returns 402 `insufficient_funds` if balance too low), and `POST /api/profile/level-complete` (records a run, returns updated profile with `isNewBest`). Players are keyed by client-generated `deviceId` (UUID in `localStorage`) — there is no auth.
- Best times and win counts are derived on read by aggregating over `level_result`, not stored on `player`. The `time_seconds` column is declared INTEGER but SQLite's dynamic typing lets it hold sub-second floats — keep that in mind before adding strict typing.
- Tests in `server/test/` use `setupFiles: ["./test/setup.ts"]` which sets `DATA_DIR` to a fresh tmpdir per test process. `vitest.config.ts` forces `pool: "forks"` with `singleFork: true` because `better-sqlite3` opens a single file handle at module import — concurrent workers would race on the same DB.

**`client/`** (`@octo/client`) is a Phaser 3 game built by Vite. Vite's `build.outDir` is set to `../server/public` so `pnpm build` produces the bundle in the place the server expects.

- `client/src/main.ts` constructs the `Phaser.Game` and registers all scenes. Levels share a single `LevelScene` class in `scenes/Level1.ts`; `Level1Scene`/`Level2Scene`/`Level3Scene` are subclasses that just set `levelId`.
- `client/src/levels.ts` is the per-level data table (ingredient/coin/hide-spot/stove/spawn positions, pizza spawn+reset rooms, difficulty bonus, room labels). Adding a level means: add the `LevelId` to `shared/`, add an entry here, add a `LevelXScene extends LevelScene` subclass, register it in `main.ts`.
- The map is hard-coded in `LevelScene` as a 2x2 room grid (`ROOM_TL/TR/BL/BR`) with a single 4-way doorway at the center; `levels.ts` only positions things within that frame. Pizza enemy AI patrols/chases/searches across these rooms.
- All art is procedurally generated pixel art. `client/src/pixel.ts` provides `paintGrid`/`generatePixelTexture` helpers; entities (`Player`, `PizzaEnemy`, ingredients, coin, stove, hide-spot) each define a `PixelGrid` + palette and call `ensureTexture(scene)` in their scene's `create()` or `BootScene`. No asset files are loaded.
- `client/src/api.ts` is the only place that touches `fetch`. It auto-generates and caches the `deviceId` in `localStorage` under `octo-games:device-id`. The Vite dev proxy makes `/api/*` work in both dev and prod with the same code.
- Cross-scene state lives on `this.registry` (e.g., `registry.set("profile", profile)` in `BootScene`, read by levels and the win screen). Scene-to-scene results are passed via `scene.start("Key", data)` and modal results via one-shot `events.once("choice", ...)` (see `CaughtModal` and `PauseMenu` flows in `Level1.ts`).

## Deploy

Railway uses `railway.json` (Nixpacks builder): `pnpm install --frozen-lockfile && pnpm build` then `pnpm start`. Healthcheck hits `/api/health`. The SQLite file is the only persistent state — point `DATA_DIR` at a mounted volume in any environment that needs data to survive restarts.
