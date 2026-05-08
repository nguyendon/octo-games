import Phaser from "phaser";

const TEX_KEY = "money-coin";
const SIZE = 18;

export class MoneyCoin extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    MoneyCoin.ensureTexture(scene);
    super(scene, x, y, TEX_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    // Idle sparkle: gentle bob + scale wobble
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
      scaleX: 0.85,
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
    // Shadow
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(c, SIZE - 2, 11, 4);
    // Coin rim
    g.fillStyle(0x8a6d12, 1);
    g.fillCircle(c, c, c - 1);
    g.fillStyle(0xc89a1c, 1);
    g.fillCircle(c, c, c - 2);
    // Face
    g.fillStyle(0xf6c84a, 1);
    g.fillCircle(c, c, c - 3);
    // Stamped $
    g.lineStyle(1.5, 0x8a6d12, 1);
    g.lineBetween(c, c - 3, c, c + 3);
    g.beginPath();
    g.arc(c - 1, c - 1.2, 1.7, 0, Math.PI, false);
    g.strokePath();
    g.beginPath();
    g.arc(c + 1, c + 1.2, 1.7, Math.PI, 0, false);
    g.strokePath();
    // Highlight
    g.fillStyle(0xfde79f, 1);
    g.fillCircle(c - 2, c - 2, 1.4);
    g.generateTexture(TEX_KEY, SIZE, SIZE);
    g.destroy();
  }
}
