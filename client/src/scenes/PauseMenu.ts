import Phaser from "phaser";
import { getPizzaSpeedMultiplier, setPizzaSpeedMultiplier } from "../speedMultiplier";

export type PauseChoice = "resume" | "restart" | "close";
export type PauseContext = "game" | "boot";

interface PauseInit {
  context?: PauseContext;
}

const SLIDER_MIN = 0;
const SLIDER_MAX = 2;
const TRACK_W = 240;
const TRACK_H = 6;
const KNOB_W = 14;
const KNOB_H = 22;

export class PauseMenuScene extends Phaser.Scene {
  private context: PauseContext = "game";

  constructor() {
    super("PauseMenu");
  }

  init(data: PauseInit) {
    this.context = data?.context ?? "game";
  }

  create() {
    this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
    this.add.rectangle(400, 300, 380, 280, 0x1c1c20).setStrokeStyle(2, 0x4a4a55);

    this.add
      .text(400, 215, "SETTINGS", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "30px",
        color: "#ffd166",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.addSpeedSlider(290);

    const kb = this.input.keyboard!;
    if (this.context === "game") {
      this.makeButton(400, 360, "[1]  Resume — ESC", "#cfd8dc", () => this.choose("resume"));
      this.makeButton(400, 395, "[2]  Restart level", "#e07b7b", () => this.choose("restart"));
      kb.on("keydown-ONE", () => this.choose("resume"));
      kb.on("keydown-TWO", () => this.choose("restart"));
    } else {
      this.makeButton(400, 380, "[ESC]  Back to title", "#cfd8dc", () => this.choose("close"));
    }
    kb.on("keydown-ESC", () =>
      this.choose(this.context === "game" ? "resume" : "close"),
    );
  }

  private addSpeedSlider(y: number) {
    this.add
      .text(400, y - 32, "pizza speed (global multiplier)", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#888",
      })
      .setOrigin(0.5);

    const trackLeft = 400 - TRACK_W / 2;
    this.add.rectangle(400, y, TRACK_W, TRACK_H, 0x2e2e36).setStrokeStyle(1, 0x4a4a55);
    const fill = this.add
      .rectangle(trackLeft, y, 0, TRACK_H, 0xffd166)
      .setOrigin(0, 0.5);

    const valueText = this.add
      .text(400 + TRACK_W / 2 + 18, y, "", {
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "13px",
        color: "#ffd166",
      })
      .setOrigin(0, 0.5);

    const knob = this.add
      .rectangle(trackLeft, y, KNOB_W, KNOB_H, 0xffd166)
      .setStrokeStyle(1, 0xffffff);
    knob.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(knob, true);

    const applyRatio = (rRaw: number) => {
      const r = Phaser.Math.Clamp(rRaw, 0, 1);
      const v = SLIDER_MIN + r * (SLIDER_MAX - SLIDER_MIN);
      knob.x = trackLeft + r * TRACK_W;
      fill.width = r * TRACK_W;
      valueText.setText(`${v.toFixed(2)}x`);
      setPizzaSpeedMultiplier(v);
    };

    const startV = getPizzaSpeedMultiplier();
    applyRatio((startV - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN));

    this.input.on(
      "drag",
      (
        _p: Phaser.Input.Pointer,
        obj: Phaser.GameObjects.GameObject,
        dragX: number,
      ) => {
        if (obj !== knob) return;
        applyRatio((dragX - trackLeft) / TRACK_W);
      },
    );

    // Wide invisible hit area on the track so clicks anywhere along it
    // jump the knob to that position.
    const trackHit = this.add
      .rectangle(400, y, TRACK_W, KNOB_H + 6, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    trackHit.on("pointerdown", (p: Phaser.Input.Pointer) => {
      applyRatio((p.x - trackLeft) / TRACK_W);
    });
  }

  private makeButton(x: number, y: number, label: string, color: string, onClick: () => void) {
    const text = this.add
      .text(x, y, label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    text.on("pointerover", () => text.setStyle({ color: "#fff" }));
    text.on("pointerout", () => text.setStyle({ color }));
    text.on("pointerdown", onClick);
    return text;
  }

  private choose(choice: PauseChoice) {
    this.events.emit("choice", choice);
  }
}
