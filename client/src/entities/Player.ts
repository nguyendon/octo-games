import Phaser from "phaser";
import { generatePixelTexture, type Palette, type PixelGrid } from "../pixel";

export const PLAYER_SIZE = 28;
const PLAYER_SPEED = 220;
export const PLAYER_TEXTURE_KEY = "player-chef";
const TEXTURE_KEY = PLAYER_TEXTURE_KEY;

type WasdKeys = Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;

// Top-down 3/4 view chef, 28x28 native pixels.
// W = white (hat / coat highlight)
// w = coat off-white
// G = hat shadow
// k = button / outline
// P = skin
// p = skin shadow
// e = eye
// r = blush
// m = mouth
// N = pant navy
// n = pant highlight
// B = boot
// .  = transparent
const CHEF: PixelGrid = [
  "............................",
  "............................",
  "...........WWWW.............",
  "..........WWWWWW............",
  ".........WWWWWWWW...........",
  ".........WWWWWWWW...........",
  "........WWWWWWWWWW..........",
  "........WGGGGGGGGW..........",
  ".......kPPPPPPPPPPk.........",
  ".......kPPePPPPePPk.........",
  ".......kPPPPPPPPPPk.........",
  ".......kPrPPmmPPrPk.........",
  "........kPPPPPPPPk..........",
  ".........kPPPPPPk...........",
  "........WWWWWWWWWW..........",
  ".......WwwwwwwwwwwW.........",
  "......WwwwwkkkkwwwwW........",
  "......WwwwkBBBBkwwwW........",
  "......WwwwwwwwwwwwwW........",
  "......WwwwwkkkkwwwwW........",
  "......WwwwkBBBBkwwwW........",
  "......WwwwwwwwwwwwwW........",
  ".......WwwwwwwwwwwW.........",
  "........NNNNNNNNNN..........",
  "........NNNNNNNNNN..........",
  ".......NNNN....NNNN.........",
  "......BBBB......BBBB........",
  "......BBBB......BBBB........",
];

const CHEF_PALETTE: Palette = {
  W: 0xffffff,
  w: 0xe8eef5,
  G: 0xc4ccd6,
  k: 0x2b2f3a,
  P: 0xf2c79c,
  p: 0xd8a376,
  e: 0x111111,
  r: 0xed9aa6,
  m: 0x9c2a2a,
  N: 0x32395a,
  n: 0x4a5378,
  B: 0x1a1d24,
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  isHidden = false;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: WasdKeys;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    Player.ensureTexture(scene);
    super(scene, x, y, TEXTURE_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 22);
    body.setOffset((PLAYER_SIZE - 18) / 2, PLAYER_SIZE - 24);
    body.setCollideWorldBounds(true);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as WasdKeys;
  }

  hide() {
    this.isHidden = true;
    this.setAlpha(0.25);
    this.setVelocity(0, 0);
  }

  unhide() {
    this.isHidden = false;
    this.setAlpha(1);
  }

  override update() {
    if (this.isHidden) {
      this.setVelocity(0, 0);
      return;
    }

    const left = this.cursors.left?.isDown || this.wasd.A.isDown;
    const right = this.cursors.right?.isDown || this.wasd.D.isDown;
    const up = this.cursors.up?.isDown || this.wasd.W.isDown;
    const down = this.cursors.down?.isDown || this.wasd.S.isDown;

    let vx = 0;
    let vy = 0;
    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    const len = Math.hypot(vx, vy);
    if (len > 0) {
      vx /= len;
      vy /= len;
    }

    this.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);
    // Pixel art chef stays upright (no rotation) so the hat doesn't flip;
    // facing direction is conveyed by motion + the squish-on-catch tween.
    if (vx < 0) this.setFlipX(true);
    else if (vx > 0) this.setFlipX(false);
  }

  static ensureTexture(scene: Phaser.Scene) {
    generatePixelTexture(scene, TEXTURE_KEY, CHEF, CHEF_PALETTE);
  }
}
