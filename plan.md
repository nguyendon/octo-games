# Octo Games — Plan

A 2D top-down browser game: hide and run from an evil pizza with black tentacles while collecting ingredients to make a pizza in the kitchen before you get caught.

## Game design (MVP — level 1)

- **Perspective:** top-down 2D. Fits room-based hiding + chase better than side-scroller.
- **Map:** one house, 4–5 rooms connected by doorways. Kitchen is the goal room.
- **Player controls:** WASD / arrows to move, Space to interact (pick up / hide / cook).
- **Pizza enemy:** patrols room-to-room. When in your room, sight cone or proximity triggers chase. Hide in a hide-spot (closet, under table) to break line-of-sight.
- **Pickups:**
  - 5 ingredients scattered across rooms (dough, sauce, cheese, pepperoni, basil).
  - Money coins sprinkled around.
- **Win condition:** all ingredients in inventory → reach kitchen → hold Space to cook → level complete.
- **Caught:** modal with two choices:
  - `Restart level` — free, lose run progress.
  - `Pay fee` — costs money from persistent balance, resume in a safe room, drop all ingredients you were carrying.

Placeholder art first (colored rectangles + simple sprites), swap in real art later.

## Tech stack

- **Client:** TypeScript + Phaser 3, served by Vite in dev.
- **Server:** Node + Fastify + better-sqlite3.
- **Shared:** TypeScript types in a `shared/` workspace.
- **Local persistence:** SQLite file in `server/data/game.db`.
- **Deploy target:** Railway (single Node service serves API + built client).

## Repo layout

```
octo-games/
├── client/                 # Phaser game (Vite dev server)
│   ├── src/
│   │   ├── main.ts         # Phaser bootstrap
│   │   ├── scenes/
│   │   │   ├── Boot.ts
│   │   │   ├── MainMenu.ts
│   │   │   ├── Level1.ts
│   │   │   └── CaughtModal.ts
│   │   ├── entities/
│   │   │   ├── Player.ts
│   │   │   ├── PizzaEnemy.ts
│   │   │   ├── Ingredient.ts
│   │   │   └── HideSpot.ts
│   │   └── api.ts          # fetch wrappers to server
│   └── index.html
├── server/                 # Fastify + SQLite
│   ├── src/
│   │   ├── index.ts        # serves API + built client
│   │   ├── db.ts           # better-sqlite3 setup + migrations
│   │   └── routes/
│   │       ├── profile.ts  # GET/POST player profile
│   │       ├── save.ts     # GET/POST save slot
│   │       └── score.ts    # POST level completion
│   └── data/game.db        # local sqlite file (gitignored)
├── shared/
│   └── types.ts            # PlayerSave, LevelResult, etc
├── package.json            # root scripts (dev/build/start)
├── pnpm-workspace.yaml     # workspaces: client, server, shared
├── railway.json            # build/start config
├── plan.md
└── .env.example
```

## State split

**Client (in-memory during play, Phaser handles):**
- Player position, velocity, facing direction.
- Pizza position + AI state (patrol / chase / search).
- Current room id.
- Ingredients in hand for the current run.
- Money picked up this run.
- Hidden flag (in/out of a hide spot).

**Server (persisted in SQLite):**

```sql
player(
  id INTEGER PRIMARY KEY,
  name TEXT,
  total_money INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

save_slot(
  player_id INTEGER PRIMARY KEY REFERENCES player(id),
  level INTEGER NOT NULL,
  ingredients_collected TEXT NOT NULL,   -- JSON array
  money_this_run INTEGER NOT NULL,
  last_safe_room TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

level_result(
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES player(id),
  level INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  money_earned INTEGER NOT NULL
);
```

Save events (not every frame — too chatty):
- On level start.
- On level complete.
- On "pay fee" choice.
- On clean exit (best effort).

## Local dev + deploy story

- Package manager: **pnpm** (workspaces via `pnpm-workspace.yaml`).
- `pnpm install` — first-time setup.
- `pnpm dev` — Vite (client on :5173) + tsx watch (server on :3000) in parallel via `pnpm --parallel --filter`. Vite proxies `/api/*` to the server. SQLite file in `server/data/`.
- `pnpm build` — Vite builds the client into `server/public/`. The server runs from source via `tsx`, so no separate server compile step.
- `pnpm start` — runs the server with `NODE_ENV=production`; it serves `/api/*` and the built client at `/`.

### Railway deploy

The server is a single Node process that handles both the API and the static client, so this is a single Railway service.

1. Push the repo to GitHub (or use the Railway CLI from local).
2. In Railway, **New Project → Deploy from GitHub** and pick this repo. Nixpacks reads `packageManager` from `package.json` and uses pnpm automatically.
3. `railway.json` (in the repo root) pins:
   - `buildCommand`: `pnpm install --frozen-lockfile && pnpm build`
   - `startCommand`: `pnpm start`
   - `healthcheckPath`: `/api/health`
4. **Add a volume** so SQLite survives redeploys:
   - Mount path: `/data`
   - Service env var: `DATA_DIR=/data` (the server reads this in `db.ts`)
   Without a volume, every deploy wipes `game.db`.
5. `PORT` and `HOST` are set automatically by Railway; the server already binds `0.0.0.0:$PORT`.
6. After the first deploy, hit `https://<your-app>.up.railway.app/api/health` — should return `{"status":"ok"}`. Then load the root URL in a browser to play.

Swap to Postgres later by replacing `server/src/db.ts` if/when SQLite outgrows the use case.

## Milestones

Each milestone is one clean commit (or a small series). Stop after each so the user can run it and confirm before continuing.

1. **Scaffold** — repo layout, package.json workspaces, Vite + Phaser blank scene rendering "hello pizza", Fastify server with `/api/health`, dev script that runs both. Commit.
2. **Player movement** — one room with walls, WASD movement, collisions. Commit.
3. **Pizza enemy** — patrol + chase + simple line-of-sight. Commit.
4. **Pickups + hiding** — ingredient pickups, money coins, hide spots that break LoS, inventory HUD. Commit.
5. **Multi-room + win** — room transitions, kitchen room, cook interaction, win screen. Commit.
6. **Persistence + caught modal** — server endpoints, SQLite schema + migrations, persistent money, caught modal with restart / pay-fee. Commit.
7. **Deploy** — Railway config, volume for SQLite, smoke test on a public URL. Commit.

## Post-MVP work shipped

Once the seven core milestones were green the project picked up a layer of polish, content, and infra. In rough order:

- **Best-time leaderboard** — `MIN(time_seconds) GROUP BY level` per profile, plus `isNewBest` flag in the level-complete response. Win scene flashes a "★ new best ★" badge.
- **Win counts + difficulty scaling** — `COUNT(*) GROUP BY level` per profile. Pizza chase / search / sight scale up with each win, capped at tier 5; level configs add a `difficultyBonus` on top.
- **Sound effects** — synthesized via Web Audio (no asset files): pickup, coin, hide/unhide, spotted, caught, cook-complete, win. M toggles mute; persisted to localStorage.
- **Camera / particle feedback** — shake + red flash on caught; small pop bursts on every pickup tinted to the pickup's color.
- **Pause menu (ESC)** — Resume / Restart with the same physics-pause + isInputBlocked pattern as the caught modal.
- **First-run tutorial overlay** — one-shot, dismissed on SPACE; gated by a localStorage flag so it never shows twice.
- **Pizza AI gains a search state** — losing LoS during chase now sends the pizza to your last seen position before falling back to patrol; closes the "round a corner = safe" exploit.
- **Pizza idle animation + face** — sine tweens on angle and scale; pinprick eyes; tier indicator floats above each enemy.
- **Player facing direction** — asymmetric texture (chevron on the leading edge), rotates to atan2(vy, vx) when moving.
- **Visual polish** — subtle 40 px floor grid, doorway floor markers at the central intersection, fade-in transitions on Boot/Level/Win.
- **HUD** — live run timer with "best Xs" comparison (turns green when ahead of pace), money line shows `$run ($saved)`.
- **Multi-level scaffolding** — `LevelConfig` data drives layouts, room labels, pizza spawns, difficulty bonus. `LevelScene` is generic; `Level1Scene` / `Level2Scene` / `Level3Scene` are thin subclasses.
  - **Level 2 — Tighter Kitchen**: kitchen relocated to TL, two pizzas, fewer hide spots. Unlocked after first L1 win.
  - **Level 3 — Pizza Party**: three pizzas at +2 base difficulty, single hide spot. Unlocked after first L2 win.
- **Records scene** — Boot → R or [R] click; per-level wins + best, plus saved money.
- **Code-split Phaser** — vendor chunk via `manualChunks`. Game code drops to ~21 KB; Phaser caches independently across deploys.
- **Server tests** — vitest with Fastify `inject`, ephemeral `DATA_DIR` per test file, 12 tests covering profile / spend / level-complete invariants.
- **GitHub Actions CI** — typecheck + test + build on every push and PR. Currently green on `main`.

## Open questions / decisions to make later

- Art style: free asset pack (Kenney.nl etc) vs commission later. Placeholder shapes are still in use.
- Background music: ambient drone or short loop — not yet started.
- Auth: anonymous device-id "profile" for now; real accounts later if needed.
- Multiplayer: not in scope.
- Mobile / touch controls: not yet wired.
- Achievements: scaffold exists via win counts but no badge UI.
