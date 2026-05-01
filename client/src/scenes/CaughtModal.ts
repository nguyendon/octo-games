import Phaser from "phaser";

export type CaughtChoice = "restart" | "pay";

export interface CaughtModalData {
  fee: number;
  totalMoney: number;
}

export class CaughtModalScene extends Phaser.Scene {
  private fee = 0;
  private totalMoney = 0;

  constructor() {
    super("CaughtModal");
  }

  init(data: CaughtModalData) {
    this.fee = data.fee;
    this.totalMoney = data.totalMoney;
  }

  create() {
    this.add.rectangle(400, 300, 800, 600, 0x000000, 0.65);
    this.add.rectangle(400, 300, 480, 280, 0x1c1c20).setStrokeStyle(2, 0x4a4a55);

    this.add
      .text(400, 200, "CAUGHT BY THE PIZZA", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "26px",
        color: "#e07b7b",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 240, `$${this.totalMoney} saved`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#888",
      })
      .setOrigin(0.5);

    this.makeButton(400, 300, "[1]  Restart level — free", "#cfd8dc", true, () =>
      this.choose("restart"),
    );

    const canPay = this.totalMoney >= this.fee;
    this.makeButton(
      400,
      340,
      `[2]  Pay $${this.fee} — drop ingredients, keep going`,
      canPay ? "#9ad17a" : "#555",
      canPay,
      () => this.choose("pay"),
    );

    if (!canPay) {
      this.add
        .text(400, 365, "(not enough saved to pay the fee)", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#666",
        })
        .setOrigin(0.5);
    }

    const kb = this.input.keyboard!;
    kb.on("keydown-ONE", () => this.choose("restart"));
    if (canPay) kb.on("keydown-TWO", () => this.choose("pay"));
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

  private choose(choice: CaughtChoice) {
    this.events.emit("choice", choice);
  }
}
