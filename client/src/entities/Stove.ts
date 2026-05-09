import Phaser from "phaser";
import { px, pxCircle, pxRect } from "../pixel";

const W = 60;
const H = 44;
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
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "10px",
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
    pxRect(g, 4, H - 3, W - 8, 2, 0x000000);
    g.fillStyle(0x000000, 0.5);
    g.fillRect(4, H - 3, W - 8, 2);

    // Body outline + main fill
    pxRect(g, 1, 2, W - 2, H - 6, 0x14171c);
    pxRect(g, 2, 3, W - 4, H - 8, 0x4d525c);
    pxRect(g, 2, 3, W - 4, 2, 0x6c727d);
    // Side gradient hints
    pxRect(g, W - 4, 4, 1, H - 10, 0x363a44);
    pxRect(g, 3, 4, 1, H - 10, 0x666c77);

    // Stovetop plate (darker recess)
    pxRect(g, 4, 5, W - 8, 16, 0x1a1d22);
    pxRect(g, 5, 6, W - 10, 14, 0x2c2f37);

    // Two burners
    const drawBurner = (cx: number) => {
      pxCircle(g, cx, 13, 6, 0x0a0a0e);
      pxCircle(g, cx, 13, 5, 0x2a1408);
      pxCircle(g, cx, 13, 4, 0xc04018);
      pxCircle(g, cx, 13, 3, 0xff6a2a);
      pxCircle(g, cx, 13, 2, 0xffce5a);
      px(g, cx, 13, 0xfff2c0);
      // hot ring
      px(g, cx, 13 - 6, 0xff8a3a);
      px(g, cx, 13 + 6, 0xff8a3a);
      px(g, cx - 6, 13, 0xff8a3a);
      px(g, cx + 6, 13, 0xff8a3a);
    };
    drawBurner(W / 2 - 12);
    drawBurner(W / 2 + 12);

    // Knob row with engraved indents
    const drawKnob = (cx: number) => {
      pxCircle(g, cx, 26, 2, 0x0a0a0e);
      pxCircle(g, cx, 26, 1, 0x2c2f37);
      px(g, cx, 26, 0xcfd8dc);
      // pointer
      px(g, cx + 2, 26, 0x9aa0aa);
    };
    drawKnob(W / 2 - 10);
    drawKnob(W / 2 + 10);

    // Oven door
    pxRect(g, 4, 30, W - 8, 11, 0x14171c);
    pxRect(g, 5, 31, W - 10, 9, 0x2a2e36);
    // Door window with warm glow
    pxRect(g, 8, 33, W - 16, 5, 0x0a0306);
    pxRect(g, 9, 34, W - 18, 3, 0x4a1808);
    pxRect(g, 10, 34, W - 20, 1, 0xff8a2a);
    px(g, 11, 35, 0xffce5a);
    px(g, W - 12, 35, 0xffce5a);
    // Handle
    pxRect(g, W / 2 - 8, 30, 16, 1, 0x9aa0aa);
    pxRect(g, W / 2 - 8, 31, 16, 1, 0x4a4f59);

    g.generateTexture(TEX_KEY, W, H);
    g.destroy();
  }
}
