import type { IngredientId, LevelId } from "@octo/shared";

export type RoomKey = "TL" | "TR" | "BL" | "BR";

export interface LevelConfig {
  id: LevelId;
  title: string;
  ingredientLayout: Array<[IngredientId, number, number]>;
  coinLayout: Array<[number, number]>;
  hideSpotLayout: Array<[number, number]>;
  stove: { x: number; y: number };
  playerSpawn: { x: number; y: number };
  pizzaSpawnRoom: RoomKey;
  pizzaResetRoom: RoomKey;
  difficultyBonus: number;
  roomLabels: Record<RoomKey, string>;
}

export const LEVELS: Record<LevelId, LevelConfig> = {
  "level-1": {
    id: "level-1",
    title: "Level 1 — The Hungry Cook",
    ingredientLayout: [
      ["basil", 200, 250],
      ["dough", 540, 130],
      ["cheese", 660, 240],
      ["sauce", 130, 470],
      ["pepperoni", 320, 420],
    ],
    coinLayout: [
      [130, 200],
      [520, 100],
      [650, 100],
      [200, 470],
      [130, 380],
      [560, 360],
      [660, 510],
      [480, 460],
    ],
    hideSpotLayout: [
      [330, 110],
      [430, 250],
      [110, 350],
      [430, 510],
    ],
    stove: { x: 620, y: 460 },
    playerSpawn: { x: 140, y: 140 },
    pizzaSpawnRoom: "TR",
    pizzaResetRoom: "BR",
    difficultyBonus: 0,
    roomLabels: {
      TL: "LIVING ROOM",
      TR: "PANTRY",
      BL: "BATHROOM",
      BR: "KITCHEN",
    },
  },
  "level-2": {
    id: "level-2",
    title: "Level 2 — Tighter Kitchen",
    ingredientLayout: [
      ["basil", 570, 130],
      ["dough", 660, 230],
      ["cheese", 200, 470],
      ["sauce", 140, 380],
      ["pepperoni", 130, 230],
    ],
    coinLayout: [
      [560, 200],
      [650, 130],
      [560, 110],
      [200, 380],
      [110, 470],
      [330, 470],
      [560, 360],
      [660, 510],
    ],
    hideSpotLayout: [
      [110, 350],
      [560, 250],
    ],
    stove: { x: 130, y: 110 },
    playerSpawn: { x: 660, y: 460 },
    pizzaSpawnRoom: "BL",
    pizzaResetRoom: "TR",
    difficultyBonus: 3,
    roomLabels: {
      TL: "KITCHEN",
      TR: "STUDY",
      BL: "BATHROOM",
      BR: "GARAGE",
    },
  },
};
