import Phaser from "phaser";

export interface WinSceneData {
  money: number;
}

export class WinScene extends Phaser.Scene {
  private money = 0;

  constructor() {
    super("Win");
  }

  init(data: WinSceneData) {
    this.money = data.money;
  }

  create() {
    this.add
      .text(400, 220, "PIZZA MADE!", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "56px",
        color: "#9ad17a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 290, "you escaped the evil pizza", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#cfd8dc",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 350, `money earned: $${this.money}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        color: "#f6c84a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

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
