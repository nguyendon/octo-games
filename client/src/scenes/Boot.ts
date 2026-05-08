import Phaser from "phaser";
import type { PlayerProfile } from "@octo/shared";
import { fetchProfile } from "../api";
import { unlockAudio } from "../audio";
import { Player, PLAYER_TEXTURE_KEY } from "../entities/Player";
import { PizzaEnemy, PIZZA_TEXTURE_KEY } from "../entities/PizzaEnemy";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  async create() {
    this.cameras.main.fadeIn(280, 0, 0, 0);

    Player.ensureTexture(this);
    PizzaEnemy.ensureTexture(this);

    // Decorative chef + pizza facing each other
    const chef = this.add.sprite(290, 110, PLAYER_TEXTURE_KEY).setScale(2.6);
    this.tweens.add({
      targets: chef,
      y: 105,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const pizza = this.add.sprite(510, 110, PIZZA_TEXTURE_KEY).setScale(2.0);
    pizza.setFlipX(true);
    this.tweens.add({
      targets: pizza,
      angle: 4,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: pizza,
      scale: 2.1,
      duration: 540,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Title
    this.add
      .text(400, 200, "Octo Games", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "44px",
        color: "#ffd166",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 240, "hide from the evil pizza · cook one of your own", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#aaa",
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(400, 268, "loading profile...", {
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

    this.makeButton(400, 320, "[1]  Level 1 — The Hungry Cook", "#cfd8dc", true, () =>
      startScene("Level1"),
    );

    this.makeButton(
      400,
      355,
      level2Unlocked
        ? "[2]  Level 2 — Tighter Kitchen"
        : "[2]  Level 2 — locked (win Level 1)",
      level2Unlocked ? "#cfd8dc" : "#555",
      level2Unlocked,
      () => startScene("Level2"),
    );

    this.makeButton(
      400,
      390,
      level3Unlocked
        ? "[3]  Level 3 — Pizza Party"
        : "[3]  Level 3 — locked (win Level 2)",
      level3Unlocked ? "#cfd8dc" : "#555",
      level3Unlocked,
      () => startScene("Level3"),
    );

    this.makeButton(400, 440, "[R]  Records", "#cfd8dc", true, () => this.scene.start("Stats"));

    const kb = this.input.keyboard!;
    kb.on("keydown-ONE", () => startScene("Level1"));
    if (level2Unlocked) kb.on("keydown-TWO", () => startScene("Level2"));
    if (level3Unlocked) kb.on("keydown-THREE", () => startScene("Level3"));
    kb.on("keydown-R", () => this.scene.start("Stats"));
    kb.once("keydown-SPACE", () => startScene("Level1"));

    const hint = this.add
      .text(400, 500, "press 1 / 2 / 3 / R — or SPACE for level 1", {
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
