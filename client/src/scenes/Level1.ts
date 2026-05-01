import Phaser from "phaser";
import { Player } from "../entities/Player";

const ROOM = { x: 60, y: 60, width: 680, height: 480 };
const WALL_THICKNESS = 12;
const WALL_COLOR = 0x4a4a55;
const FLOOR_COLOR = 0x1f1f24;

export class Level1Scene extends Phaser.Scene {
  private player!: Player;

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

    this.physics.world.setBounds(
      ROOM.x + WALL_THICKNESS / 2,
      ROOM.y + WALL_THICKNESS / 2,
      ROOM.width - WALL_THICKNESS,
      ROOM.height - WALL_THICKNESS,
    );

    this.player = new Player(this, ROOM.x + 100, ROOM.y + 100);
    this.physics.add.collider(this.player, walls);

    this.add.text(20, 20, "WASD or arrows to move", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#aaa",
    });
  }

  override update() {
    this.player.update();
  }
}
