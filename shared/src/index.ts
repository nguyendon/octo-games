export type LevelId = "level-1";

export interface PlayerProfile {
  id: number;
  name: string;
  totalMoney: number;
}

export interface HealthResponse {
  status: "ok";
}
