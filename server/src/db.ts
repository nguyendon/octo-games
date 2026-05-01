import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ?? path.resolve(__dirname, "../data");
mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "game.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS player (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT 'Player',
    total_money INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS level_result (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES player(id) ON DELETE CASCADE,
    level TEXT NOT NULL,
    completed_at INTEGER NOT NULL,
    time_seconds INTEGER NOT NULL,
    money_earned INTEGER NOT NULL
  );
`);

interface PlayerRow {
  id: number;
  device_id: string;
  name: string;
  total_money: number;
  created_at: number;
}

const findByDeviceStmt = db.prepare("SELECT * FROM player WHERE device_id = ?");
const findByIdStmt = db.prepare("SELECT * FROM player WHERE id = ?");
const insertStmt = db.prepare("INSERT INTO player (device_id, created_at) VALUES (?, ?)");
const adjustStmt = db.prepare("UPDATE player SET total_money = total_money + ? WHERE id = ?");
const insertResultStmt = db.prepare(
  "INSERT INTO level_result (player_id, level, completed_at, time_seconds, money_earned) VALUES (?, ?, ?, ?, ?)",
);
const bestTimesStmt = db.prepare(
  "SELECT level, MIN(time_seconds) AS best FROM level_result WHERE player_id = ? GROUP BY level",
);

export interface PlayerDto {
  id: number;
  name: string;
  totalMoney: number;
  bestTimes: Record<string, number>;
}

export function getBestTimes(playerId: number): Record<string, number> {
  const rows = bestTimesStmt.all(playerId) as { level: string; best: number }[];
  const map: Record<string, number> = {};
  for (const r of rows) map[r.level] = r.best;
  return map;
}

function toDto(row: PlayerRow): PlayerDto {
  return {
    id: row.id,
    name: row.name,
    totalMoney: row.total_money,
    bestTimes: getBestTimes(row.id),
  };
}

export function upsertPlayer(deviceId: string): PlayerDto {
  const existing = findByDeviceStmt.get(deviceId) as PlayerRow | undefined;
  if (existing) return toDto(existing);
  insertStmt.run(deviceId, Date.now());
  const created = findByDeviceStmt.get(deviceId) as PlayerRow | undefined;
  if (!created) throw new Error("player insert failed");
  return toDto(created);
}

export function adjustMoney(playerId: number, delta: number): PlayerDto {
  adjustStmt.run(delta, playerId);
  const row = findByIdStmt.get(playerId) as PlayerRow | undefined;
  if (!row) throw new Error("player not found");
  return toDto(row);
}

export function recordLevelResult(
  playerId: number,
  level: string,
  timeSeconds: number,
  moneyEarned: number,
) {
  // SQLite has dynamic typing; the column is declared INTEGER but accepts the
  // raw float so best-time tracking keeps sub-second precision.
  insertResultStmt.run(playerId, level, Date.now(), timeSeconds, moneyEarned);
}
