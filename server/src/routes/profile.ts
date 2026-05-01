import type { FastifyInstance } from "fastify";
import { adjustMoney, getBestTimes, recordLevelResult, upsertPlayer } from "../db";

interface IdentifiedBody {
  deviceId?: string;
}

interface SpendBody extends IdentifiedBody {
  amount?: number;
}

interface LevelCompleteBody extends IdentifiedBody {
  level?: string;
  timeSeconds?: number;
  moneyEarned?: number;
}

export function registerProfileRoutes(app: FastifyInstance) {
  app.post<{ Body: IdentifiedBody }>("/api/profile", async (req, reply) => {
    const deviceId = req.body?.deviceId?.trim();
    if (!deviceId) return reply.code(400).send({ error: "deviceId required" });
    return upsertPlayer(deviceId);
  });

  app.post<{ Body: SpendBody }>("/api/profile/spend", async (req, reply) => {
    const deviceId = req.body?.deviceId?.trim();
    const amount = req.body?.amount;
    if (!deviceId || !Number.isInteger(amount) || (amount as number) <= 0) {
      return reply.code(400).send({ error: "deviceId and positive integer amount required" });
    }
    const player = upsertPlayer(deviceId);
    if (player.totalMoney < (amount as number)) {
      return reply
        .code(402)
        .send({ error: "insufficient_funds", totalMoney: player.totalMoney });
    }
    return adjustMoney(player.id, -(amount as number));
  });

  app.post<{ Body: LevelCompleteBody }>("/api/profile/level-complete", async (req, reply) => {
    const deviceId = req.body?.deviceId?.trim();
    const level = req.body?.level?.trim();
    const timeSeconds = req.body?.timeSeconds;
    const moneyEarned = req.body?.moneyEarned;
    if (
      !deviceId ||
      !level ||
      !Number.isFinite(timeSeconds) ||
      !Number.isInteger(moneyEarned) ||
      (moneyEarned as number) < 0 ||
      (timeSeconds as number) < 0
    ) {
      return reply.code(400).send({ error: "invalid level-complete payload" });
    }
    const player = upsertPlayer(deviceId);
    const previousBest = getBestTimes(player.id)[level];
    recordLevelResult(player.id, level, timeSeconds as number, moneyEarned as number);
    const updated = adjustMoney(player.id, moneyEarned as number);
    const newBest = updated.bestTimes[level];
    const isNewBest = previousBest === undefined || newBest < previousBest;
    return { ...updated, isNewBest };
  });
}
