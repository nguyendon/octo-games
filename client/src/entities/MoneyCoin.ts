import Phaser from "phaser";
import { px, pxCircle } from "../pixel";

const TEX_KEY = "money-coin";
const SIZE = 14;

export class MoneyCoin extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    MoneyCoin.ensureTexture(scene);
    super(scene, x, y, TEX_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    scene.tweens.add({
      targets: this,
      y: y - 2,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    scene.tweens.add({
      targets: this,
      scaleX: 0.6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private static ensureTexture(scene: Phaser.Scene) {
    if (scene.textures.exists(TEX_KEY)) return;
    const g = scene.add.graphics();
    const c = SIZE / 2;
    pxCircle(g, c, c, 6, 0x6a4f0e);
    pxCircle(g, c, c, 5, 0xc89a1c);
    pxCircle(g, c, c, 4, 0xf6c84a);
    // $ stamp
    px(g, c, c - 2, 0x6a4f0e);
    px(g, c, c + 2, 0x6a4f0e);
    px(g, c - 1, c - 1, 0x6a4f0e);
    px(g, c, c - 1, 0x6a4f0e);
    px(g, c + 1, c, 0x6a4f0e);
    px(g, c - 1, c + 1, 0x6a4f0e);
    px(g, c, c + 1, 0x6a4f0e);
    // Highlight
    px(g, c - 2, c - 2, 0xfde79f);
    px(g, c - 2, c - 1, 0xfde79f);
    g.generateTexture(TEX_KEY, SIZE, SIZE);
    g.destroy();
  }
}
