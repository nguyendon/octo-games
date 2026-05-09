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

/** Plot a single 1×1 pixel at integer coordinates. */
export function px(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  color: number,
  alpha = 1,
) {
  g.fillStyle(color, alpha);
  g.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** Pixel-perfect filled circle (each pixel decided by integer distance test). */
export function pxCircle(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  color: number,
) {
  const r2 = r * r;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r2) px(g, cx + x, cy + y, color);
    }
  }
}

/** Pixel-perfect filled axis-aligned ellipse. */
export function pxEllipse(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
) {
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) px(g, cx + x, cy + y, color);
    }
  }
}

/** Filled rectangle with snapped integer coordinates. */
export function pxRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
) {
  g.fillStyle(color, 1);
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
