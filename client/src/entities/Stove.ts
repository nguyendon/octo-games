import Phaser from "phaser";

const W = 70;
const H = 50;
const TEX_KEY = "stove";

export class Stove extends Phaser.GameObjects.Sprite {
  private barBg: Phaser.GameObjects.Rectangle;
  private barFill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    Stove.ensureTexture(scene);
    super(scene, x, y, TEX_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(W, H);
    body.updateFromGameObject();

    scene.add
      .text(x, y + H / 2 + 3, "STOVE", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "11px",
        color: "#cfd8dc",
      })
      .setOrigin(0.5, 0);

    this.barBg = scene.add
      .rectangle(x, y - H / 2 - 12, W - 6, 6, 0x222226)
      .setStrokeStyle(1, 0x4f535e)
      .setVisible(false);
    this.barFill = scene.add
      .rectangle(x - (W - 6) / 2, y - H / 2 - 12, 0, 6, 0x9ad17a)
      .setOrigin(0, 0.5)
      .setVisible(false);
  }

  setProgress(p: number) {
    const showing = p > 0 && p < 1;
    this.barBg.setVisible(showing);
    this.barFill.setVisible(showing);
    this.barFill.width = (W - 6) * Math.max(0, Math.min(1, p));
  }

  private static ensureTexture(scene: Phaser.Scene) {
    if (scene.textures.exists(TEX_KEY)) return;
    const g = scene.add.graphics();

    // Floor shadow
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(W / 2, H - 2, W * 0.9, 5);

    // Stove body
    g.fillStyle(0x3c4150, 1);
    g.fillRoundedRect(2, 4, W - 4, H - 8, 3);
    g.fillStyle(0x9aa0aa, 1);
    g.fillRoundedRect(3, 5, W - 6, H - 10, 2);

    // Top stovetop (slightly darker plate)
    g.fillStyle(0x4f535e, 1);
    g.fillRoundedRect(5, 7, W - 10, 18, 2);

    // Two burners with red glow
    const burnerY = 16;
    const drawBurner = (cx: number) => {
      g.fillStyle(0x1a1a1a, 1);
      g.fillCircle(cx, burnerY, 7);
      g.fillStyle(0xff6a2a, 1);
      g.fillCircle(cx, burnerY, 5);
      g.fillStyle(0xffce5a, 1);
      g.fillCircle(cx, burnerY, 3);
      g.fillStyle(0x0a0a0a, 1);
      g.fillCircle(cx, burnerY, 1.4);
      // hot ring
      g.lineStyle(1, 0xffce5a, 0.6);
      g.strokeCircle(cx, burnerY, 6);
    };
    drawBurner(W / 2 - 14);
    drawBurner(W / 2 + 14);

    // Knobs
    g.fillStyle(0x222629, 1);
    g.fillCircle(W / 2 - 10, 30, 2.5);
    g.fillCircle(W / 2 + 10, 30, 2.5);
    g.fillStyle(0xcfd8dc, 1);
    g.fillRect(W / 2 - 11, 30 - 0.5, 2, 1);
    g.fillRect(W / 2 + 9, 30 - 0.5, 2, 1);

    // Oven door (lower half) with handle
    g.fillStyle(0x2a2e36, 1);
    g.fillRoundedRect(6, 33, W - 12, 13, 2);
    g.fillStyle(0x191b22, 1);
    g.fillRect(10, 36, W - 20, 7);
    g.fillStyle(0xff8a2a, 0.18);
    g.fillRect(10, 36, W - 20, 7);
    // handle
    g.fillStyle(0x9aa0aa, 1);
    g.fillRect(W / 2 - 8, 34, 16, 1.5);

    g.generateTexture(TEX_KEY, W, H);
    g.destroy();
  }
}
