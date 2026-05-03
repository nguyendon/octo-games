import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../src/db";
import { registerProfileRoutes } from "../src/routes/profile";

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  registerProfileRoutes(app);
  await app.ready();
});

beforeEach(() => {
  db.exec("DELETE FROM level_result; DELETE FROM player;");
});

async function postJson(url: string, payload: unknown) {
  return app.inject({ method: "POST", url, payload });
}

describe("POST /api/profile", () => {
  it("creates a fresh player at zero balance", async () => {
    const res = await postJson("/api/profile", { deviceId: "alpha" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalMoney).toBe(0);
    expect(body.bestTimes).toEqual({});
    expect(body.winCounts).toEqual({});
    expect(body.id).toBeGreaterThan(0);
  });

  it("is idempotent for the same deviceId", async () => {
    const a = await postJson("/api/profile", { deviceId: "alpha" });
    const b = await postJson("/api/profile", { deviceId: "alpha" });
    expect(a.json().id).toBe(b.json().id);
  });

  it("rejects missing deviceId with 400", async () => {
    const res = await postJson("/api/profile", {});
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/profile/level-complete", () => {
  it("records the run and returns isNewBest=true for the first win", async () => {
    const res = await postJson("/api/profile/level-complete", {
      deviceId: "alpha",
      level: "level-1",
      timeSeconds: 25.7,
      moneyEarned: 5,
    });
    const body = res.json();
    expect(res.statusCode).toBe(200);
    expect(body.totalMoney).toBe(5);
    expect(body.isNewBest).toBe(true);
    expect(body.bestTimes["level-1"]).toBeCloseTo(25.7);
  });

  it("preserves earlier best when slower run is submitted", async () => {
    await postJson("/api/profile/level-complete", {
      deviceId: "alpha",
      level: "level-1",
      timeSeconds: 12,
      moneyEarned: 5,
    });
    const slow = await postJson("/api/profile/level-complete", {
      deviceId: "alpha",
      level: "level-1",
      timeSeconds: 30,
      moneyEarned: 5,
    });
    expect(slow.json().isNewBest).toBe(false);
    expect(slow.json().bestTimes["level-1"]).toBe(12);
    expect(slow.json().totalMoney).toBe(10);
  });

  it("increments winCounts per level on each completion", async () => {
    for (let i = 0; i < 3; i++) {
      await postJson("/api/profile/level-complete", {
        deviceId: "alpha",
        level: "level-1",
        timeSeconds: 20,
        moneyEarned: 1,
      });
    }
    const profile = await postJson("/api/profile", { deviceId: "alpha" });
    expect(profile.json().winCounts["level-1"]).toBe(3);
  });

  it("updates best when faster run is submitted", async () => {
    await postJson("/api/profile/level-complete", {
      deviceId: "alpha",
      level: "level-1",
      timeSeconds: 30,
      moneyEarned: 5,
    });
    const fast = await postJson("/api/profile/level-complete", {
      deviceId: "alpha",
      level: "level-1",
      timeSeconds: 18.4,
      moneyEarned: 5,
    });
    expect(fast.json().isNewBest).toBe(true);
    expect(fast.json().bestTimes["level-1"]).toBeCloseTo(18.4);
  });

  it("rejects negative moneyEarned", async () => {
    const res = await postJson("/api/profile/level-complete", {
      deviceId: "alpha",
      level: "level-1",
      timeSeconds: 12,
      moneyEarned: -1,
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/profile/spend", () => {
  it("deducts the requested amount when the player can afford it", async () => {
    await postJson("/api/profile/level-complete", {
      deviceId: "alpha",
      level: "level-1",
      timeSeconds: 12,
      moneyEarned: 10,
    });
    const res = await postJson("/api/profile/spend", { deviceId: "alpha", amount: 3 });
    expect(res.statusCode).toBe(200);
    expect(res.json().totalMoney).toBe(7);
  });

  it("returns 402 with insufficient_funds when balance is too low", async () => {
    await postJson("/api/profile", { deviceId: "alpha" });
    const res = await postJson("/api/profile/spend", { deviceId: "alpha", amount: 10 });
    expect(res.statusCode).toBe(402);
    expect(res.json().error).toBe("insufficient_funds");
    expect(res.json().totalMoney).toBe(0);
  });

  it("rejects non-positive amounts", async () => {
    const zero = await postJson("/api/profile/spend", { deviceId: "alpha", amount: 0 });
    expect(zero.statusCode).toBe(400);
    const negative = await postJson("/api/profile/spend", { deviceId: "alpha", amount: -5 });
    expect(negative.statusCode).toBe(400);
  });

  it("rejects non-integer amounts", async () => {
    const res = await postJson("/api/profile/spend", { deviceId: "alpha", amount: 1.5 });
    expect(res.statusCode).toBe(400);
  });
});
