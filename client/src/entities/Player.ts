import Phaser from "phaser";

export const PLAYER_SIZE = 24;
const PLAYER_SPEED = 220;
const TEXTURE_KEY = "player-placeholder";

type WasdKeys = Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: WasdKeys;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    if (!scene.textures.exists(TEXTURE_KEY)) {
      const g = scene.add.graphics();
      g.fillStyle(0x6cb4ff, 1);
      g.fillRoundedRect(0, 0, PLAYER_SIZE, PLAYER_SIZE, 4);
      g.lineStyle(2, 0x2b6cb0, 1);
      g.strokeRoundedRect(1, 1, PLAYER_SIZE - 2, PLAYER_SIZE - 2, 4);
      g.generateTexture(TEXTURE_KEY, PLAYER_SIZE, PLAYER_SIZE);
      g.destroy();
    }

    super(scene, x, y, TEXTURE_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_SIZE, PLAYER_SIZE);
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

  override update() {
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
  }
}
