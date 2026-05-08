import Phaser from "phaser";

export type PixelGrid = readonly string[];
export type PaletteEntry = number | readonly [color: number, alpha: number];
export type Palette = Record<string, PaletteEntry>;

/**
 * Paint a pixel grid into an existing Graphics object.
 * Each char in the grid maps to a palette entry; ' ' and '.' are transparent.
 * Pixel size is 1 device pixel; if you want chunky pixels, generate the
 * texture and render the resulting Sprite at a 2x/3x scale.
 */
export function paintGrid(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  palette: Palette,
  offsetX = 0,
  offsetY = 0,
) {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === " " || ch === ".") continue;
      const entry = palette[ch];
      if (entry === undefined) continue;
      const [color, alpha] = Array.isArray(entry) ? entry : [entry, 1];
      g.fillStyle(color, alpha);
      g.fillRect(offsetX + x, offsetY + y, 1, 1);
    }
  }
}

export function generatePixelTexture(
  scene: Phaser.Scene,
  key: string,
  grid: PixelGrid,
  palette: Palette,
) {
  if (scene.textures.exists(key)) return;
  const w = grid[0].length;
  const h = grid.length;
  const g = scene.add.graphics();
  paintGrid(g, grid, palette);
  g.generateTexture(key, w, h);
  g.destroy();
}
