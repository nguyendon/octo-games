import Phaser from "phaser";

const TEX_KEY = "money-coin";
const SIZE = 14;

export class MoneyCoin extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    MoneyCoin.ensureTexture(scene);
    super(scene, x, y, TEX_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }

  private static ensureTexture(scene: Phaser.Scene) {
    if (scene.textures.exists(TEX_KEY)) return;
    const r = SIZE / 2;
    const g = scene.add.graphics();
    g.fillStyle(0x8a6d12, 1);
    g.fillCircle(r, r, r);
    g.fillStyle(0xf6c84a, 1);
    g.fillCircle(r, r, r - 2);
    g.fillStyle(0xfde79f, 1);
    g.fillCircle(r - 1.5, r - 1.5, 2);
    g.generateTexture(TEX_KEY, SIZE, SIZE);
    g.destroy();
  }
}
