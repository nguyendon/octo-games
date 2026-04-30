import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  async create() {
    this.add
      .text(400, 260, "Octo Games", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        color: "#ffd166",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 320, "hello pizza", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#aaa",
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(400, 380, "checking server...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#888",
      })
      .setOrigin(0.5);

    try {
      const res = await fetch("/api/health");
      const json = await res.json();
      statusText.setText(`server: ${json.status}`).setColor("#9ad17a");
    } catch {
      statusText.setText("server: unreachable").setColor("#e07b7b");
    }
  }
}
