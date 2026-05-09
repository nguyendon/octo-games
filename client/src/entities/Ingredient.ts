import Phaser from "phaser";
import type { IngredientId } from "@octo/shared";
import { px, pxCircle, pxRect } from "../pixel";

export const INGREDIENT_COLORS: Record<IngredientId, number> = {
  dough: 0xf3d9a4,
  sauce: 0xc4422c,
  cheese: 0xf2c94c,
  pepperoni: 0xa83232,
  basil: 0x4caf50,
};

const TEX_SIZE = 18;

const drawByType: Record<IngredientId, (g: Phaser.GameObjects.Graphics) => void> = {
  dough: (g) => {
    const cx = TEX_SIZE / 2;
    const cy = TEX_SIZE / 2;
    pxCircle(g, cx, cy, 6, 0x8a6a2a);
    pxCircle(g, cx, cy, 5, 0xeac88a);
    pxCircle(g, cx, cy, 4, 0xf3d9a4);
    pxCircle(g, cx - 1, cy - 1, 2, 0xfff1c2);
    px(g, cx - 2, cy - 2, 0xffffff);
    // Texture flecks
    px(g, cx + 2, cy - 1, 0xc8a26a);
    px(g, cx - 1, cy + 2, 0xc8a26a);
  },
  cheese: (g) => {
    const cx = TEX_SIZE / 2;
    const cy = TEX_SIZE / 2;
    // Wedge shape (right-pointing triangle, drawn as horizontal bands)
    for (let y = -5; y <= 5; y++) {
      const halfW = Math.round((1 - Math.abs(y) / 5) * 6);
      for (let x = -6; x <= halfW; x++) {
        const c = y === -5 || y === 5 || x === -6 || x === halfW
          ? 0x8a6a18
          : Math.abs(y) >= 4 || x <= -5
          ? 0xc99a28
          : 0xf2c94c;
        px(g, cx + x, cy + y, c);
      }
    }
    // Highlight stripe along the top edge
    px(g, cx - 4, cy - 3, 0xfde79f);
    px(g, cx - 2, cy - 2, 0xfde79f);
    px(g, cx + 1, cy - 1, 0xfde79f);
    // Holes
    px(g, cx - 2, cy + 1, 0xc99a28);
    px(g, cx + 1, cy + 2, 0xc99a28);
    px(g, cx + 3, cy, 0xc99a28);
  },
  sauce: (g) => {
    const cx = TEX_SIZE / 2;
    const cy = TEX_SIZE / 2;
    // Splat — main blob plus two satellite drops
    pxCircle(g, cx, cy, 5, 0x5e1a08);
    pxCircle(g, cx, cy, 4, 0xa8331f);
    pxCircle(g, cx, cy, 3, 0xc4422c);
    pxCircle(g, cx - 4, cy - 3, 2, 0x5e1a08);
    pxCircle(g, cx - 4, cy - 3, 1, 0xc4422c);
    pxCircle(g, cx + 4, cy + 3, 2, 0x5e1a08);
    pxCircle(g, cx + 4, cy + 3, 1, 0xc4422c);
    // Drip
    px(g, cx + 5, cy - 1, 0xc4422c);
    px(g, cx - 5, cy + 2, 0xc4422c);
    // Highlight
    px(g, cx - 1, cy - 2, 0xff7a55);
    px(g, cx, cy - 2, 0xff7a55);
  },
  pepperoni: (g) => {
    const cx = TEX_SIZE / 2;
    const cy = TEX_SIZE / 2;
    pxCircle(g, cx, cy, 7, 0x3a0808);
    pxCircle(g, cx, cy, 6, 0x7a2222);
    pxCircle(g, cx, cy, 5, 0xa83232);
    // Darker greasy spots
    px(g, cx - 2, cy - 2, 0x6e1818);
    px(g, cx - 3, cy - 1, 0x6e1818);
    px(g, cx + 2, cy - 1, 0x6e1818);
    px(g, cx + 3, cy, 0x6e1818);
    px(g, cx - 1, cy + 3, 0x6e1818);
    px(g, cx + 1, cy + 2, 0x6e1818);
    // Highlight
    px(g, cx - 2, cy - 3, 0xc44d36);
    px(g, cx - 3, cy - 2, 0xc44d36);
  },
  basil: (g) => {
    const cx = TEX_SIZE / 2;
    const cy = TEX_SIZE / 2;
    // Leaf shape — pointed ellipse with vein
    for (let y = -2; y <= 2; y++) {
      const halfW = Math.round(Math.sqrt(1 - (y * y) / 4) * 6);
      for (let x = -6; x <= halfW; x++) {
        const c = y === -2 || y === 2 || x === -6 || x === halfW
          ? 0x153d18
          : 0x2e7d32;
        px(g, cx + x, cy + y, c);
      }
    }
    // Inner highlight
    pxRect(g, cx - 4, cy - 1, 8, 1, 0x4caf50);
    px(g, cx - 3, cy, 0x86d28a);
    px(g, cx, cy, 0x86d28a);
    // Vein
    pxRect(g, cx - 5, cy, 11, 1, 0x153d18);
    // Branches
    px(g, cx - 2, cy - 1, 0x153d18);
    px(g, cx + 2, cy + 1, 0x153d18);
    // Stem
    px(g, cx + 6, cy, 0x6b5a1f);
    px(g, cx + 7, cy, 0x6b5a1f);
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
    drawByType[id](g);
    g.generateTexture(key, TEX_SIZE, TEX_SIZE);
    g.destroy();
  }
}
