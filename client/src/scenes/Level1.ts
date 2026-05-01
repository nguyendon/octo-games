import Phaser from "phaser";
import { INGREDIENT_IDS, type IngredientId } from "@octo/shared";
import { Player } from "../entities/Player";
import { PizzaEnemy } from "../entities/PizzaEnemy";
import { Ingredient } from "../entities/Ingredient";
import { MoneyCoin } from "../entities/MoneyCoin";
import { HideSpot } from "../entities/HideSpot";
import { InventoryHud } from "../ui/InventoryHud";

const ROOM = { x: 60, y: 60, width: 680, height: 480 };
const WALL_THICKNESS = 12;
const WALL_COLOR = 0x4a4a55;
const FLOOR_COLOR = 0x1f1f24;
const CATCH_COOLDOWN_MS = 1200;

const INGREDIENT_LAYOUT: Array<[IngredientId, number, number]> = [
  ["dough", 140, 130],
  ["sauce", 650, 140],
  ["cheese", 140, 490],
  ["pepperoni", 640, 490],
  ["basil", 300, 300],
];

const COIN_LAYOUT: Array<[number, number]> = [
  [300, 130],
  [500, 200],
  [200, 250],
  [560, 380],
  [110, 350],
  [700, 300],
];

const HIDE_SPOT_LAYOUT: Array<[number, number]> = [
  [110, 200],
  [700, 460],
  [350, 500],
];

export class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private enemy!: PizzaEnemy;
  private hud!: InventoryHud;
  private hideSpots: HideSpot[] = [];
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private readonly playerSpawn = new Phaser.Math.Vector2(ROOM.x + 100, ROOM.y + 100);
  private readonly collected = new Set<IngredientId>();
  private money = 0;
  private invulnerableUntil = 0;
  private catchText?: Phaser.GameObjects.Text;

  constructor() {
    super("Level1");
  }

  create() {
    this.collected.clear();
    this.money = 0;
    this.invulnerableUntil = 0;

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

    this.hideSpots = HIDE_SPOT_LAYOUT.map(([x, y]) => new HideSpot(this, x, y));

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

    const ingredients = INGREDIENT_LAYOUT.map(([id, x, y]) => new Ingredient(this, x, y, id));
    this.physics.add.overlap(this.player, ingredients, (_p, ing) => {
      const i = ing as Ingredient;
      if (this.collected.has(i.ingredientId)) return;
      this.collected.add(i.ingredientId);
      i.destroy();
    });

    const coins = COIN_LAYOUT.map(([x, y]) => new MoneyCoin(this, x, y));
    this.physics.add.overlap(this.player, coins, (_p, c) => {
      (c as MoneyCoin).destroy();
      this.money += 1;
    });

    this.hud = new InventoryHud(this);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.add.text(20, 20, "WASD or arrows to move", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#aaa",
    });
    this.add.text(20, 40, `collect all ${INGREDIENT_IDS.length} ingredients · $${this.money}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#888",
    });

    this.refreshHud(false);
  }

  override update(time: number) {
    this.player.update();
    this.enemy.update(time);

    const onHideSpot = !!this.physics.overlap(this.player, this.hideSpots);
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.player.isHidden) {
        this.player.unhide();
      } else if (onHideSpot) {
        this.player.hide();
      }
    }

    this.refreshHud(onHideSpot);
  }

  private refreshHud(onHideSpot: boolean) {
    this.hud.update(this.collected, this.money, this.player.isHidden, onHideSpot);
  }

  private onCaught() {
    if (this.time.now < this.invulnerableUntil) return;
    this.invulnerableUntil = this.time.now + CATCH_COOLDOWN_MS;

    if (this.player.isHidden) this.player.unhide();
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
