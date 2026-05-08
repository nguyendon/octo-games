import Phaser from "phaser";
import type { IngredientId } from "@octo/shared";

export const INGREDIENT_COLORS: Record<IngredientId, number> = {
  dough: 0xf3d9a4,
  sauce: 0xc4422c,
  cheese: 0xf2c94c,
  pepperoni: 0xa83232,
  basil: 0x4caf50,
};

const TEX_SIZE = 22;

const drawByType: Record<IngredientId, (g: Phaser.GameObjects.Graphics) => void> = {
  dough: (g) => {
    const c = TEX_SIZE / 2;
    g.fillStyle(0xb39060, 1);
    g.fillCircle(c, c, 7);
    g.fillStyle(0xf5e0b3, 1);
    g.fillCircle(c, c, 6);
    g.fillStyle(0xfff1d0, 1);
    g.fillCircle(c - 2, c - 2, 2);
  },
  cheese: (g) => {
    const c = TEX_SIZE / 2;
    g.fillStyle(0x9a8228, 1);
    g.fillTriangle(c - 7 + 1, c - 5 + 1, c + 6 + 1, c + 1, c - 7 + 1, c + 5 + 1);
    g.fillStyle(0xf2c94c, 1);
    g.fillTriangle(c - 7, c - 5, c + 6, c, c - 7, c + 5);
    g.fillStyle(0xf7d669, 1);
    g.fillCircle(c - 3, c - 1, 1);
    g.fillCircle(c, c + 1, 1);
    g.fillCircle(c + 2, c - 2, 0.8);
  },
  sauce: (g) => {
    const c = TEX_SIZE / 2;
    g.fillStyle(0x6a1f10, 1);
    g.fillCircle(c, c, 6);
    g.fillCircle(c - 4, c - 2, 2.5);
    g.fillCircle(c + 4, c + 2, 2.5);
    g.fillStyle(0xc4422c, 1);
    g.fillCircle(c, c, 5);
    g.fillCircle(c - 4, c - 2, 2);
    g.fillCircle(c + 4, c + 2, 2);
    g.fillStyle(0xe55a3a, 1);
    g.fillCircle(c - 1, c - 2, 1.5);
  },
  pepperoni: (g) => {
    const c = TEX_SIZE / 2;
    g.fillStyle(0x4a1010, 1);
    g.fillCircle(c, c, 7);
    g.fillStyle(0x7a2222, 1);
    g.fillCircle(c, c, 6.5);
    g.fillStyle(0xa83232, 1);
    g.fillCircle(c, c, 5.5);
    g.fillStyle(0x6e1818, 1);
    g.fillCircle(c - 2, c - 2, 1.1);
    g.fillCircle(c + 2, c - 1, 1.1);
    g.fillCircle(c - 1, c + 3, 1.1);
    g.fillCircle(c + 3, c + 2, 0.9);
  },
  basil: (g) => {
    const c = TEX_SIZE / 2;
    g.fillStyle(0x153d18, 1);
    g.fillEllipse(c, c + 1, 11, 6);
    g.fillStyle(0x2e7d32, 1);
    g.fillEllipse(c, c, 10, 5);
    g.fillStyle(0x4caf50, 1);
    g.fillEllipse(c - 1, c - 1, 8, 3);
    g.lineStyle(1, 0x153d18, 1);
    g.lineBetween(c - 5, c, c + 5, c);
    g.lineBetween(c - 2, c - 1, c - 1, c + 1);
    g.lineBetween(c + 2, c - 1, c + 1, c + 1);
  },
};

export class Ingredient extends Phaser.Physics.Arcade.Sprite {
  readonly ingredientId: IngredientId;

  constructor(scene: Phaser.Scene, x: number, y: number, id: IngredientId) {
    Ingredient.ensureTexture(scene, id);
    super(scene, x, y, `ingredient-${id}`);
    this.ingredientId = id;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    // Subtle bob so it reads as collectible
    scene.tweens.add({
      targets: this,
      y: y - 2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private static ensureTexture(scene: Phaser.Scene, id: IngredientId) {
    const key = `ingredient-${id}`;
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    // Soft drop shadow first so the shape sits above it
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(TEX_SIZE / 2, TEX_SIZE - 3, 12, 4);
    drawByType[id](g);
    g.generateTexture(key, TEX_SIZE, TEX_SIZE);
    g.destroy();
  }
}
