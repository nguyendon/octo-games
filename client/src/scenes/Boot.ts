import Phaser from "phaser";
import type { PlayerProfile } from "@octo/shared";
import { fetchProfile } from "../api";
import { unlockAudio } from "../audio";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  async create() {
    this.add
      .text(400, 180, "Octo Games", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        color: "#ffd166",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 240, "hide from the evil pizza · cook one of your own", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#aaa",
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(400, 290, "loading profile...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#888",
      })
      .setOrigin(0.5);

    let profile: PlayerProfile | null = null;
    try {
      profile = await fetchProfile();
      this.registry.set("profile", profile);
      const best1 = profile.bestTimes["level-1"];
      const best2 = profile.bestTimes["level-2"];
      const parts: string[] = [`$${profile.totalMoney} saved`];
      if (best1 !== undefined) parts.push(`L1 best ${best1.toFixed(1)}s`);
      if (best2 !== undefined) parts.push(`L2 best ${best2.toFixed(1)}s`);
      statusText.setText(parts.join(" · ")).setColor("#9ad17a");
    } catch {
      statusText.setText("server unreachable — playing offline").setColor("#e07b7b");
    }

    const wins1 = profile?.winCounts["level-1"] ?? 0;
    const level2Unlocked = wins1 >= 1;

    const startScene = (sceneKey: string) => {
      unlockAudio();
      this.scene.start(sceneKey);
    };

    this.makeButton(400, 360, "[1]  Level 1 — The Hungry Cook", "#cfd8dc", true, () =>
      startScene("Level1"),
    );

    this.makeButton(
      400,
      400,
      level2Unlocked
        ? "[2]  Level 2 — Tighter Kitchen"
        : "[2]  Level 2 — locked (win Level 1 first)",
      level2Unlocked ? "#cfd8dc" : "#555",
      level2Unlocked,
      () => startScene("Level2"),
    );

    const kb = this.input.keyboard!;
    kb.on("keydown-ONE", () => startScene("Level1"));
    if (level2Unlocked) kb.on("keydown-TWO", () => startScene("Level2"));
    kb.once("keydown-SPACE", () => startScene("Level1"));

    const hint = this.add
      .text(400, 460, "press 1 or 2 (or SPACE for level 1)", {
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
