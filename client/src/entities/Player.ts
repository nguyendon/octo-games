import Phaser from "phaser";

export const PLAYER_SIZE = 28;
const PLAYER_SPEED = 220;
const TEXTURE_KEY = "player-chef";

type WasdKeys = Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;

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
    body.setSize(22, 22);
    body.setOffset((PLAYER_SIZE - 22) / 2, (PLAYER_SIZE - 22) / 2);
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

    if (vx !== 0 || vy !== 0) {
      this.setRotation(Math.atan2(vy, vx));
    }
  }

  private static ensureTexture(scene: Phaser.Scene) {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const W = PLAYER_SIZE;
    const g = scene.add.graphics();

    // Soft drop shadow
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(W / 2, W - 2, 18, 5);

    // Chef coat (oriented "facing right" by default)
    g.fillStyle(0xeaf0f7, 1);
    g.fillRoundedRect(5, 12, 18, 14, 4);
    g.lineStyle(1.5, 0xb3becb, 1);
    g.strokeRoundedRect(5, 12, 18, 14, 4);

    // Coat buttons down the middle
    g.fillStyle(0x2b3340, 1);
    g.fillCircle(14, 16, 1);
    g.fillCircle(14, 20, 1);

    // Skin / face
    g.fillStyle(0xf2c79c, 1);
    g.fillCircle(14, 9, 5);
    g.lineStyle(1, 0xb88860, 1);
    g.strokeCircle(14, 9, 5);

    // Chef hat — band + poof
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(9, 4, 10, 3, 1);
    g.fillCircle(11, 3, 2.4);
    g.fillCircle(14, 1.5, 2.8);
    g.fillCircle(17, 3, 2.4);
    g.lineStyle(1, 0xc8d0d8, 1);
    g.strokeRoundedRect(9, 4, 10, 3, 1);

    // Eyes — facing toward +x (right side of head)
    g.fillStyle(0x111111, 1);
    g.fillCircle(15, 8, 1);
    g.fillCircle(17, 8, 1);

    // Tiny nose / mouth on the leading edge
    g.fillStyle(0xb88860, 1);
    g.fillCircle(18.2, 10, 0.7);

    g.generateTexture(TEXTURE_KEY, W, W);
    g.destroy();
  }
}
