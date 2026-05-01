import Phaser from "phaser";
import type { IngredientId } from "@octo/shared";

const COLORS: Record<IngredientId, number> = {
  dough: 0xf3d9a4,
  sauce: 0xc4422c,
  cheese: 0xf2c94c,
  pepperoni: 0xa83232,
  basil: 0x4caf50,
};

const SIZE = 18;

export class Ingredient extends Phaser.Physics.Arcade.Sprite {
  readonly ingredientId: IngredientId;

  constructor(scene: Phaser.Scene, x: number, y: number, id: IngredientId) {
    Ingredient.ensureTexture(scene, id);
    super(scene, x, y, `ingredient-${id}`);
    this.ingredientId = id;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }

  private static ensureTexture(scene: Phaser.Scene, id: IngredientId) {
    const key = `ingredient-${id}`;
    if (scene.textures.exists(key)) return;
    const r = SIZE / 2;
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillCircle(r + 1, r + 2, r);
    g.fillStyle(COLORS[id], 1);
    g.fillCircle(r, r, r - 2);
    g.lineStyle(1, 0x000000, 0.5);
    g.strokeCircle(r, r, r - 2);
    g.generateTexture(key, SIZE + 2, SIZE + 4);
    g.destroy();
  }
}
