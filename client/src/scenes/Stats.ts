import Phaser from "phaser";
import { LEVEL_IDS, type LevelId, type PlayerProfile } from "@octo/shared";
import { LEVELS } from "../levels";

export class StatsScene extends Phaser.Scene {
  constructor() {
    super("Stats");
  }

  create() {
    this.cameras.main.fadeIn(280, 0, 0, 0);

    this.add
      .text(400, 90, "Records", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "36px",
        color: "#ffd166",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const profile = this.registry.get("profile") as PlayerProfile | undefined;

    if (!profile) {
      this.add
        .text(400, 220, "no profile loaded", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "16px",
          color: "#e07b7b",
        })
        .setOrigin(0.5);
    } else {
      this.add
        .text(400, 160, `$${profile.totalMoney} saved`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "20px",
          color: "#f6c84a",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      let y = 230;
      for (const id of LEVEL_IDS) {
        const cfg = LEVELS[id];
        const wins = profile.winCounts[id] ?? 0;
        const best = profile.bestTimes[id];
        const bestPart = best !== undefined ? `${best.toFixed(1)}s` : "—";
        const winsPart = `${wins} win${wins === 1 ? "" : "s"}`;

        this.add
          .text(120, y, cfg.title, {
            fontFamily: "system-ui, sans-serif",
            fontSize: "16px",
            color: "#cfd8dc",
          })
          .setOrigin(0, 0.5);
        this.add
          .text(560, y, winsPart, {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "14px",
            color: "#9ad17a",
          })
          .setOrigin(1, 0.5);
        this.add
          .text(680, y, `best ${bestPart}`, {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "14px",
            color: best !== undefined ? "#ffd166" : "#666",
          })
          .setOrigin(1, 0.5);
        y += 32;
      }
    }

    const back = this.add
      .text(400, 480, "press SPACE or click to go back", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#aaa",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: back,
      alpha: 0.4,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const goBack = () => this.scene.start("Boot");
    this.input.keyboard!.once("keydown-SPACE", goBack);
    this.input.keyboard!.once("keydown-ESC", goBack);
    back.on("pointerdown", goBack);
  }
}
