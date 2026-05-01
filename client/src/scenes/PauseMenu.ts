import Phaser from "phaser";

export type PauseChoice = "resume" | "restart";

export class PauseMenuScene extends Phaser.Scene {
  constructor() {
    super("PauseMenu");
  }

  create() {
    this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
    this.add.rectangle(400, 300, 360, 220, 0x1c1c20).setStrokeStyle(2, 0x4a4a55);

    this.add
      .text(400, 235, "PAUSED", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "32px",
        color: "#ffd166",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.makeButton(400, 305, "[1]  Resume — ESC", "#cfd8dc", () => this.choose("resume"));
    this.makeButton(400, 345, "[2]  Restart level", "#e07b7b", () => this.choose("restart"));

    const kb = this.input.keyboard!;
    kb.on("keydown-ONE", () => this.choose("resume"));
    kb.on("keydown-TWO", () => this.choose("restart"));
    kb.on("keydown-ESC", () => this.choose("resume"));
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
