import Phaser from "phaser";

const SIZE = 40;
const TEX_KEY = "hide-spot-wardrobe";

export class HideSpot extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    HideSpot.ensureTexture(scene);
    super(scene, x, y, TEX_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(SIZE, SIZE);
    body.updateFromGameObject();
  }

  private static ensureTexture(scene: Phaser.Scene) {
    if (scene.textures.exists(TEX_KEY)) return;
    const g = scene.add.graphics();

    // Floor shadow under the wardrobe
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(SIZE / 2, SIZE - 1, SIZE * 0.85, 5);

    // Wardrobe body — warm wood
    g.fillStyle(0x4a2f1a, 1);
    g.fillRoundedRect(2, 4, SIZE - 4, SIZE - 6, 3);
    g.fillStyle(0x6b4222, 1);
    g.fillRoundedRect(3, 5, SIZE - 6, SIZE - 8, 2);

    // Two doors with a center divider
    g.lineStyle(1.5, 0x2a1a0e, 1);
    g.lineBetween(SIZE / 2, 7, SIZE / 2, SIZE - 5);

    // Door panels
    g.lineStyle(1, 0x3a230f, 0.7);
    g.strokeRect(6, 9, SIZE / 2 - 9, SIZE - 16);
    g.strokeRect(SIZE / 2 + 3, 9, SIZE / 2 - 9, SIZE - 16);

    // Brass knobs
    g.fillStyle(0xd4a14a, 1);
    g.fillCircle(SIZE / 2 - 4, SIZE / 2, 1.5);
    g.fillCircle(SIZE / 2 + 4, SIZE / 2, 1.5);
    g.fillStyle(0xfde7a8, 1);
    g.fillCircle(SIZE / 2 - 4.4, SIZE / 2 - 0.4, 0.5);
    g.fillCircle(SIZE / 2 + 3.6, SIZE / 2 - 0.4, 0.5);

    // Top trim
    g.fillStyle(0x2a1a0e, 1);
    g.fillRect(2, 2, SIZE - 4, 3);
    g.fillStyle(0x6b4222, 1);
    g.fillRect(4, 2, SIZE - 8, 1);

    g.generateTexture(TEX_KEY, SIZE, SIZE);
    g.destroy();
  }
}
