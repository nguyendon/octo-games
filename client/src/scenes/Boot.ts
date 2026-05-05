import Phaser from "phaser";
import type { PlayerProfile } from "@octo/shared";
import { fetchProfile } from "../api";
import { unlockAudio } from "../audio";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  async create() {
    this.cameras.main.fadeIn(280, 0, 0, 0);

    this.add
      .text(400, 140, "Octo Games", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        color: "#ffd166",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 195, "hide from the evil pizza · cook one of your own", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#aaa",
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(400, 235, "loading profile...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#888",
      })
      .setOrigin(0.5);

    let profile: PlayerProfile | null = null;
    try {
      profile = await fetchProfile();
      this.registry.set("profile", profile);
      statusText.setText(`$${profile.totalMoney} saved`).setColor("#9ad17a");
    } catch {
      statusText.setText("server unreachable — playing offline").setColor("#e07b7b");
    }

    const wins1 = profile?.winCounts["level-1"] ?? 0;
    const wins2 = profile?.winCounts["level-2"] ?? 0;
    const level2Unlocked = wins1 >= 1;
    const level3Unlocked = wins2 >= 1;

    const startScene = (sceneKey: string) => {
      unlockAudio();
      this.scene.start(sceneKey);
    };

    this.makeButton(400, 290, "[1]  Level 1 — The Hungry Cook", "#cfd8dc", true, () =>
      startScene("Level1"),
    );

    this.makeButton(
      400,
      325,
      level2Unlocked
        ? "[2]  Level 2 — Tighter Kitchen"
        : "[2]  Level 2 — locked (win Level 1)",
      level2Unlocked ? "#cfd8dc" : "#555",
      level2Unlocked,
      () => startScene("Level2"),
    );

    this.makeButton(
      400,
      360,
      level3Unlocked
        ? "[3]  Level 3 — Pizza Party"
        : "[3]  Level 3 — locked (win Level 2)",
      level3Unlocked ? "#cfd8dc" : "#555",
      level3Unlocked,
      () => startScene("Level3"),
    );

    this.makeButton(400, 415, "[R]  Records", "#cfd8dc", true, () => this.scene.start("Stats"));

    const kb = this.input.keyboard!;
    kb.on("keydown-ONE", () => startScene("Level1"));
    if (level2Unlocked) kb.on("keydown-TWO", () => startScene("Level2"));
    if (level3Unlocked) kb.on("keydown-THREE", () => startScene("Level3"));
    kb.on("keydown-R", () => this.scene.start("Stats"));
    kb.once("keydown-SPACE", () => startScene("Level1"));

    const hint = this.add
      .text(400, 470, "press 1 / 2 / 3 / R — or SPACE for level 1", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#888",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: hint,
      alpha: 0.4,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: string,
    enabled: boolean,
    onClick: () => void,
  ) {
    const text = this.add
      .text(x, y, label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color,
      })
      .setOrigin(0.5);
    if (!enabled) return text;
    text.setInteractive({ useHandCursor: true });
    text.on("pointerover", () => text.setStyle({ color: "#fff" }));
    text.on("pointerout", () => text.setStyle({ color }));
    text.on("pointerdown", onClick);
    return text;
  }
}
