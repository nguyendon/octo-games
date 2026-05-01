import Phaser from "phaser";
import type { PlayerProfile } from "@octo/shared";
import { recordLevelComplete } from "../api";

export interface WinSceneData {
  money: number;
  timeSeconds: number;
}

export class WinScene extends Phaser.Scene {
  private money = 0;
  private timeSeconds = 0;

  constructor() {
    super("Win");
  }

  init(data: WinSceneData) {
    this.money = data.money;
    this.timeSeconds = data.timeSeconds;
  }

  async create() {
    this.add
      .text(400, 200, "PIZZA MADE!", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "56px",
        color: "#9ad17a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 270, `you escaped in ${this.timeSeconds.toFixed(1)} s`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#cfd8dc",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 320, `+ $${this.money} earned`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#f6c84a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const savedText = this.add
      .text(400, 360, "saving to your profile...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#888",
      })
      .setOrigin(0.5);

    try {
      const updated = await recordLevelComplete("level-1", this.timeSeconds, this.money);
      this.registry.set("profile", updated);
      const best = updated.bestTimes["level-1"];
      const bestPart = best !== undefined ? ` · best ${best.toFixed(1)}s` : "";
      savedText.setText(`now $${updated.totalMoney} saved${bestPart}`).setColor("#9ad17a");
      if (updated.isNewBest) {
        const badge = this.add
          .text(400, 395, "★ new best time! ★", {
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
    } catch {
      const profile = this.registry.get("profile") as PlayerProfile | undefined;
      const fallback = profile ? `(offline · $${profile.totalMoney} saved)` : "(offline — not saved)";
      savedText.setText(fallback).setColor("#e07b7b");
    }

    const prompt = this.add
      .text(400, 440, "press SPACE to play again", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#ddd",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard!.once("keydown-SPACE", () => this.scene.start("Level1"));
  }
}
