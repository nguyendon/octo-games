import Phaser from "phaser";
import { generatePixelTexture, type Palette, type PixelGrid } from "../pixel";

const SIZE = 36;
const TEX_KEY = "hide-spot-wardrobe";

// 36x36 wardrobe (top-down 3/4 view)
// W = wood top trim
// w = wood mid
// d = wood dark seam
// D = wood deep shadow
// k = outline
// h = hinge
// b = brass knob
// B = brass shadow
// s = floor shadow under wardrobe
const WARDROBE: PixelGrid = [
  "....................................",
  "....................................",
  "....kkkkkkkkkkkkkkkkkkkkkkkkkkkk....",
  "....kWWWWWWWWWWWWWWWWWWWWWWWWWWk....",
  "....kWWWWWWWWWWWWWWWWWWWWWWWWWWk....",
  "....kWWdddddddddddddddddddddWWk.....",
  "....kwwwwwwwwwwwwwwwwwwwwwwwwwwk....",
  "....khwwwwwwwwwwwwdwwwwwwwwwwwhk....",
  "....khwwwwwwwwwwwwdwwwwwwwwwwwhk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....khwwwwwwwwbwwwdwwwbwwwwwwwhk....",
  "....khwwwwwwwBbwwwdwwwbBwwwwwwhk....",
  "....kwwwwwwwwBwwwwdwwwwBwwwwwwwk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....kwwwwwwwwwwwwwdwwwwwwwwwwwwk....",
  "....khwwwwwwwwwwwwdwwwwwwwwwwwhk....",
  "....khwwwwwwwwwwwwdwwwwwwwwwwwhk....",
  "....kDDDDDDDDDDDDDDDDDDDDDDDDDDk....",
  "....kkkkkkkkkkkkkkkkkkkkkkkkkkkk....",
  "....ssssssssssssssssssssssssssss....",
  "...sssssssssssssssssssssssssssss....",
  "....................................",
  "....................................",
  "....................................",
  "....................................",
  "....................................",
  "....................................",
];

const PALETTE: Palette = {
  k: 0x1a0d05,
  W: 0x6e3c1a,
  w: 0x8a4f24,
  d: 0x3a1e0a,
  D: 0x2a1407,
  h: 0xc5a14a,
  b: 0xe3c06a,
  B: 0x6a4818,
  s: [0x000000, 0.4],
};

export class HideSpot extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    HideSpot.ensureTexture(scene);
    super(scene, x, y, TEX_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(SIZE - 8, SIZE - 8);
    body.setOffset(4, 4);
    body.updateFromGameObject();
  }

  private static ensureTexture(scene: Phaser.Scene) {
    if (scene.textures.exists(TEX_KEY)) return;
    generatePixelTexture(scene, TEX_KEY, WARDROBE, PALETTE);
  }
}
