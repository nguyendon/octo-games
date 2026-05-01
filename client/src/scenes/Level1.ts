import Phaser from "phaser";
import { Player } from "../entities/Player";
import { PizzaEnemy } from "../entities/PizzaEnemy";

const ROOM = { x: 60, y: 60, width: 680, height: 480 };
const WALL_THICKNESS = 12;
const WALL_COLOR = 0x4a4a55;
const FLOOR_COLOR = 0x1f1f24;
const CATCH_COOLDOWN_MS = 1200;

export class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private enemy!: PizzaEnemy;
  private readonly playerSpawn = new Phaser.Math.Vector2(ROOM.x + 100, ROOM.y + 100);
  private invulnerableUntil = 0;
  private catchText?: Phaser.GameObjects.Text;

  constructor() {
    super("Level1");
  }

  create() {
    this.add.rectangle(
      ROOM.x + ROOM.width / 2,
      ROOM.y + ROOM.height / 2,
      ROOM.width,
      ROOM.height,
      FLOOR_COLOR,
    );

    const walls: Phaser.GameObjects.Rectangle[] = [
      this.add.rectangle(ROOM.x + ROOM.width / 2, ROOM.y, ROOM.width, WALL_THICKNESS, WALL_COLOR),
      this.add.rectangle(ROOM.x + ROOM.width / 2, ROOM.y + ROOM.height, ROOM.width, WALL_THICKNESS, WALL_COLOR),
      this.add.rectangle(ROOM.x, ROOM.y + ROOM.height / 2, WALL_THICKNESS, ROOM.height, WALL_COLOR),
      this.add.rectangle(ROOM.x + ROOM.width, ROOM.y + ROOM.height / 2, WALL_THICKNESS, ROOM.height, WALL_COLOR),
      this.add.rectangle(420, 280, 80, 80, WALL_COLOR),
      this.add.rectangle(220, 420, 140, 24, WALL_COLOR),
    ];
    walls.forEach((w) => this.physics.add.existing(w, true));

    const interior = new Phaser.Geom.Rectangle(
      ROOM.x + WALL_THICKNESS,
      ROOM.y + WALL_THICKNESS,
      ROOM.width - WALL_THICKNESS * 2,
      ROOM.height - WALL_THICKNESS * 2,
    );
    this.physics.world.setBounds(interior.x, interior.y, interior.width, interior.height);

    this.player = new Player(this, this.playerSpawn.x, this.playerSpawn.y);
    this.physics.add.collider(this.player, walls);

    this.enemy = new PizzaEnemy(
      this,
      ROOM.x + ROOM.width - 100,
      ROOM.y + 90,
      this.player,
      walls,
      interior,
    );
    this.physics.add.collider(this.enemy, walls);

    this.physics.add.overlap(this.player, this.enemy, () => this.onCaught());

    this.add.text(20, 20, "WASD or arrows to move", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#aaa",
    });
    this.add.text(20, 40, "stay out of the pizza's line of sight", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#888",
    });
  }

  override update(time: number) {
    this.player.update();
    this.enemy.update(time);
  }

  private onCaught() {
    if (this.time.now < this.invulnerableUntil) return;
    this.invulnerableUntil = this.time.now + CATCH_COOLDOWN_MS;

    this.player.setPosition(this.playerSpawn.x, this.playerSpawn.y);
    this.player.setVelocity(0, 0);

    if (!this.catchText) {
      this.catchText = this.add
        .text(400, 300, "CAUGHT!", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "64px",
          color: "#e07b7b",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(100);
    }
    this.catchText.setAlpha(1);
    this.tweens.add({
      targets: this.catchText,
      alpha: 0,
      duration: 1100,
      ease: "Cubic.easeIn",
    });
  }
}
