export type LevelId = "level-1" | "level-2";

export const LEVEL_IDS: readonly LevelId[] = ["level-1", "level-2"] as const;

export type IngredientId = "dough" | "sauce" | "cheese" | "pepperoni" | "basil";

export const INGREDIENT_IDS: readonly IngredientId[] = [
  "dough",
  "sauce",
  "cheese",
  "pepperoni",
  "basil",
] as const;

export interface PlayerProfile {
  id: number;
  name: string;
  totalMoney: number;
  bestTimes: Record<string, number>;
  winCounts: Record<string, number>;
}

export interface LevelCompleteResult extends PlayerProfile {
  isNewBest: boolean;
}

export interface HealthResponse {
  status: "ok";
}

export interface ProfileRequest {
  deviceId: string;
}

export interface SpendRequest {
  deviceId: string;
  amount: number;
}

export interface LevelCompleteRequest {
  deviceId: string;
  level: LevelId;
  timeSeconds: number;
  moneyEarned: number;
}

export interface InsufficientFundsResponse {
  error: "insufficient_funds";
  totalMoney: number;
}
