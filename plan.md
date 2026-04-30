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
├── package.json            # workspaces: client, server, shared
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

- `npm run dev` — Vite (client on :5173) + tsx watch (server on :3000) concurrently. Vite proxies `/api/*` to the server. SQLite file in `server/data/`.
- `npm run build` — build client into `server/public/`, compile server to `server/dist/`.
- `npm start` — run the compiled server, which serves the API and the built client.
- **Railway:** single service. `npm run build && npm start`. Mount a Railway volume at `server/data/` so the SQLite file survives deploys. Swap to Postgres later by replacing `server/src/db.ts` if/when needed.

## Milestones

Each milestone is one clean commit (or a small series). Stop after each so the user can run it and confirm before continuing.

1. **Scaffold** — repo layout, package.json workspaces, Vite + Phaser blank scene rendering "hello pizza", Fastify server with `/api/health`, dev script that runs both. Commit.
2. **Player movement** — one room with walls, WASD movement, collisions. Commit.
3. **Pizza enemy** — patrol + chase + simple line-of-sight. Commit.
4. **Pickups + hiding** — ingredient pickups, money coins, hide spots that break LoS, inventory HUD. Commit.
5. **Multi-room + win** — room transitions, kitchen room, cook interaction, win screen. Commit.
6. **Persistence + caught modal** — server endpoints, SQLite schema + migrations, persistent money, caught modal with restart / pay-fee. Commit.
7. **Deploy** — Railway config, volume for SQLite, smoke test on a public URL. Commit.

## Open questions / decisions to make later

- Art style: free asset pack (Kenney.nl etc) vs commission later.
- Sound: music + SFX layer once gameplay is solid.
- Multiple levels: scope after level 1 plays well.
- Auth: anonymous device-id "profile" for now; real accounts later if needed.
- Multiplayer: not in scope for MVP.
