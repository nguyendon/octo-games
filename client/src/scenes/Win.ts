import Phaser from "phaser";
import type { LevelId, PlayerProfile } from "@octo/shared";
import { recordLevelComplete } from "../api";
import { sfx } from "../audio";

export interface WinSceneData {
  money: number;
  timeSeconds: number;
  levelId: LevelId;
  sceneKey: string;
}

export class WinScene extends Phaser.Scene {
  private money = 0;
  private timeSeconds = 0;
  private levelId: LevelId = "level-1";
  private sceneKey = "Level1";

  constructor() {
    super("Win");
  }

  init(data: WinSceneData) {
    this.money = data.money;
    this.timeSeconds = data.timeSeconds;
    this.levelId = data.levelId ?? "level-1";
    this.sceneKey = data.sceneKey ?? "Level1";
  }

  async create() {
    this.cameras.main.fadeIn(280, 0, 0, 0);
    sfx.win();

    this.add
      .text(400, 180, "PIZZA MADE!", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "56px",
        color: "#9ad17a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 240, `${this.levelId} cleared in ${this.timeSeconds.toFixed(1)} s`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#cfd8dc",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 290, `+ $${this.money} earned`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#f6c84a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const savedText = this.add
      .text(400, 330, "saving to your profile...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#888",
      })
      .setOrigin(0.5);

    let unlockMessage = "";
    try {
      const previousProfile = this.registry.get("profile") as PlayerProfile | undefined;
      const previousLevel1Wins = previousProfile?.winCounts["level-1"] ?? 0;
      const previousLevel2Wins = previousProfile?.winCounts["level-2"] ?? 0;
      const updated = await recordLevelComplete(this.levelId, this.timeSeconds, this.money);
      this.registry.set("profile", updated);
      const best = updated.bestTimes[this.levelId];
      const wins = updated.winCounts[this.levelId] ?? 0;
      const bestPart = best !== undefined ? ` · best ${best.toFixed(1)}s` : "";
      savedText.setText(`win #${wins} · $${updated.totalMoney} saved${bestPart}`).setColor("#9ad17a");
      if (updated.isNewBest) {
        const badge = this.add
          .text(400, 365, "★ new best time! ★", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "20px",
            color: "#ffd166",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        this.tweens.add({
          targets: badge,
          scale: 1.08,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      if (this.levelId === "level-1" && previousLevel1Wins === 0) {
        unlockMessage = "Level 2 unlocked!";
      } else if (this.levelId === "level-2" && previousLevel2Wins === 0) {
        unlockMessage = "Level 3 unlocked!";
      }
    } catch {
      const profile = this.registry.get("profile") as PlayerProfile | undefined;
      const fallback = profile ? `(offline · $${profile.totalMoney} saved)` : "(offline — not saved)";
      savedText.setText(fallback).setColor("#e07b7b");
    }

    if (unlockMessage) {
      this.add
        .text(400, 405, unlockMessage, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "16px",
          color: "#ffd166",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    }

    const replay = this.add
      .text(400, 460, "press SPACE to replay this level", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#ddd",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 490, "press M to return to menu", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#888",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: replay,
      alpha: 0.4,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const kb = this.input.keyboard!;
    kb.once("keydown-SPACE", () => this.scene.start(this.sceneKey));
    kb.once("keydown-M", () => this.scene.start("Boot"));
  }
}
