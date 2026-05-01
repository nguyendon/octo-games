import Phaser from "phaser";

const W = 64;
const H = 44;

export class Stove extends Phaser.GameObjects.Rectangle {
  private barBg: Phaser.GameObjects.Rectangle;
  private barFill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, W, H, 0x9aa0aa);
    this.setStrokeStyle(2, 0x4f535e);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    scene.add.circle(x - 14, y - 4, 6, 0x303339).setStrokeStyle(1, 0x6a6e78);
    scene.add.circle(x + 14, y - 4, 6, 0x303339).setStrokeStyle(1, 0x6a6e78);
    scene.add
      .text(x, y + H / 2 + 3, "STOVE", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "11px",
        color: "#cfd8dc",
      })
      .setOrigin(0.5, 0);

    this.barBg = scene.add
      .rectangle(x, y - H / 2 - 12, W, 6, 0x222226)
      .setStrokeStyle(1, 0x4f535e)
      .setVisible(false);
    this.barFill = scene.add
      .rectangle(x - W / 2, y - H / 2 - 12, 0, 6, 0x9ad17a)
      .setOrigin(0, 0.5)
      .setVisible(false);
  }

  setProgress(p: number) {
    const showing = p > 0 && p < 1;
    this.barBg.setVisible(showing);
    this.barFill.setVisible(showing);
    this.barFill.width = (this.width as number) * Math.max(0, Math.min(1, p));
  }
}
