import Phaser from "phaser";
import type { PlayerProfile } from "@octo/shared";
import { fetchProfile } from "../api";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  async create() {
    this.add
      .text(400, 220, "Octo Games", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        color: "#ffd166",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 280, "hide from the evil pizza · cook one of your own", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#aaa",
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(400, 340, "loading profile...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#888",
      })
      .setOrigin(0.5);

    let profile: PlayerProfile | null = null;
    try {
      profile = await fetchProfile();
      this.registry.set("profile", profile);
      const best = profile.bestTimes["level-1"];
      const bestPart = best === undefined ? "" : ` · best ${best.toFixed(1)}s`;
      statusText
        .setText(`profile loaded · $${profile.totalMoney} saved${bestPart}`)
        .setColor("#9ad17a");
    } catch {
      statusText.setText("server unreachable — playing offline").setColor("#e07b7b");
    }

    const prompt = this.add
      .text(400, 420, "press SPACE to start", {
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
