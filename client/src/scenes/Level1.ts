import Phaser from "phaser";
import { INGREDIENT_IDS, type IngredientId } from "@octo/shared";
import { Player } from "../entities/Player";
import { PizzaEnemy } from "../entities/PizzaEnemy";
import { Ingredient } from "../entities/Ingredient";
import { MoneyCoin } from "../entities/MoneyCoin";
import { HideSpot } from "../entities/HideSpot";
import { Stove } from "../entities/Stove";
import { InventoryHud } from "../ui/InventoryHud";

const MAP = { x: 60, y: 60, width: 680, height: 480 };
const WALL_THICKNESS = 12;
const WALL_COLOR = 0x4a4a55;
const FLOOR_COLOR = 0x1f1f24;
const DIVIDER_X = MAP.x + MAP.width / 2; // 400
const DIVIDER_Y = MAP.y + MAP.height / 2; // 300
const DOOR_HALF = 30; // door gap is 60 wide, centered on dividers
const COOK_TIME_MS = 1500;
const CATCH_COOLDOWN_MS = 1200;

const ROOM_TL = new Phaser.Geom.Rectangle(MAP.x, MAP.y, MAP.width / 2, MAP.height / 2);
const ROOM_TR = new Phaser.Geom.Rectangle(DIVIDER_X, MAP.y, MAP.width / 2, MAP.height / 2);
const ROOM_BL = new Phaser.Geom.Rectangle(MAP.x, DIVIDER_Y, MAP.width / 2, MAP.height / 2);
const ROOM_BR = new Phaser.Geom.Rectangle(DIVIDER_X, DIVIDER_Y, MAP.width / 2, MAP.height / 2);
const ROOMS = [ROOM_TL, ROOM_TR, ROOM_BL, ROOM_BR] as const;
const INTERSECTION = new Phaser.Math.Vector2(DIVIDER_X, DIVIDER_Y);

const INGREDIENT_LAYOUT: Array<[IngredientId, number, number]> = [
  ["basil", 200, 250],
  ["dough", 540, 130],
  ["cheese", 660, 240],
  ["sauce", 130, 470],
  ["pepperoni", 320, 420],
];

const COIN_LAYOUT: Array<[number, number]> = [
  [130, 200],
  [520, 100],
  [650, 100],
  [200, 470],
  [130, 380],
  [560, 360],
  [660, 510],
  [480, 460],
];

const HIDE_SPOT_LAYOUT: Array<[number, number]> = [
  [330, 110],
  [430, 250],
  [110, 350],
  [430, 510],
];

const STOVE_POS = { x: 620, y: 460 };

const ROOM_LABELS: Array<[Phaser.Geom.Rectangle, string]> = [
  [ROOM_TL, "LIVING ROOM"],
  [ROOM_TR, "PANTRY"],
  [ROOM_BL, "BATHROOM"],
  [ROOM_BR, "KITCHEN"],
];

export class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private enemy!: PizzaEnemy;
  private stove!: Stove;
  private hud!: InventoryHud;
  private hideSpots: HideSpot[] = [];
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private readonly playerSpawn = new Phaser.Math.Vector2(MAP.x + 80, MAP.y + 80);
  private readonly collected = new Set<IngredientId>();
  private money = 0;
  private invulnerableUntil = 0;
  private cookProgress = 0;
  private catchText?: Phaser.GameObjects.Text;

  constructor() {
    super("Level1");
  }

  create() {
    this.collected.clear();
    this.money = 0;
    this.invulnerableUntil = 0;
    this.cookProgress = 0;

    this.add.rectangle(
      MAP.x + MAP.width / 2,
      MAP.y + MAP.height / 2,
      MAP.width,
      MAP.height,
      FLOOR_COLOR,
    );

    const walls = this.buildWalls();
    walls.forEach((w) => this.physics.add.existing(w, true));

    this.physics.world.setBounds(
      MAP.x + WALL_THICKNESS,
      MAP.y + WALL_THICKNESS,
      MAP.width - WALL_THICKNESS * 2,
      MAP.height - WALL_THICKNESS * 2,
    );

    ROOM_LABELS.forEach(([room, label]) => {
      this.add
        .text(room.x + 14, room.y + 12, label, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "10px",
          color: "#666",
        });
    });

    this.hideSpots = HIDE_SPOT_LAYOUT.map(([x, y]) => new HideSpot(this, x, y));
    this.stove = new Stove(this, STOVE_POS.x, STOVE_POS.y);

    this.player = new Player(this, this.playerSpawn.x, this.playerSpawn.y);
    this.physics.add.collider(this.player, walls);

    this.enemy = new PizzaEnemy(
      this,
      ROOM_TR.centerX,
      ROOM_TR.centerY,
      this.player,
      walls,
      ROOMS,
      ROOM_TR,
      INTERSECTION,
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

    this.add.text(20, 20, "WASD/arrows · SPACE to hide or cook", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#aaa",
    });
    this.add.text(20, 40, "collect all ingredients, then reach the kitchen stove", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      color: "#777",
    });
  }

  override update(time: number, delta: number) {
    this.player.update();
    this.enemy.update(time);

    const onHideSpot = !this.player.isHidden && !!this.physics.overlap(this.player, this.hideSpots);
    const onStove = !this.player.isHidden && !!this.physics.overlap(this.player, this.stove);
    const allIngredients = this.collected.size === INGREDIENT_IDS.length;

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.player.isHidden) {
        this.player.unhide();
      } else if (onHideSpot) {
        this.player.hide();
      }
    }

    if (onStove && allIngredients && this.spaceKey.isDown) {
      this.cookProgress = Math.min(1, this.cookProgress + delta / COOK_TIME_MS);
      this.stove.setProgress(this.cookProgress);
      if (this.cookProgress >= 1) {
        this.scene.start("Win", { money: this.money });
        return;
      }
    } else if (this.cookProgress > 0) {
      this.cookProgress = 0;
      this.stove.setProgress(0);
    }

    this.hud.update(this.collected, this.money, this.player.isHidden, onHideSpot, onStove, allIngredients);
  }

  private buildWalls(): Phaser.GameObjects.Rectangle[] {
    const walls: Phaser.GameObjects.Rectangle[] = [];

    walls.push(this.add.rectangle(MAP.x + MAP.width / 2, MAP.y, MAP.width, WALL_THICKNESS, WALL_COLOR));
    walls.push(this.add.rectangle(MAP.x + MAP.width / 2, MAP.y + MAP.height, MAP.width, WALL_THICKNESS, WALL_COLOR));
    walls.push(this.add.rectangle(MAP.x, MAP.y + MAP.height / 2, WALL_THICKNESS, MAP.height, WALL_COLOR));
    walls.push(this.add.rectangle(MAP.x + MAP.width, MAP.y + MAP.height / 2, WALL_THICKNESS, MAP.height, WALL_COLOR));

    const vTopLen = DIVIDER_Y - DOOR_HALF - MAP.y;
    const vBotLen = MAP.y + MAP.height - (DIVIDER_Y + DOOR_HALF);
    walls.push(
      this.add.rectangle(DIVIDER_X, MAP.y + vTopLen / 2, WALL_THICKNESS, vTopLen, WALL_COLOR),
    );
    walls.push(
      this.add.rectangle(DIVIDER_X, MAP.y + MAP.height - vBotLen / 2, WALL_THICKNESS, vBotLen, WALL_COLOR),
    );

    const hLeftLen = DIVIDER_X - DOOR_HALF - MAP.x;
    const hRightLen = MAP.x + MAP.width - (DIVIDER_X + DOOR_HALF);
    walls.push(
      this.add.rectangle(MAP.x + hLeftLen / 2, DIVIDER_Y, hLeftLen, WALL_THICKNESS, WALL_COLOR),
    );
    walls.push(
      this.add.rectangle(MAP.x + MAP.width - hRightLen / 2, DIVIDER_Y, hRightLen, WALL_THICKNESS, WALL_COLOR),
    );

    walls.push(this.add.rectangle(260, 200, 40, 30, WALL_COLOR));
    walls.push(this.add.rectangle(560, 230, 40, 30, WALL_COLOR));
    walls.push(this.add.rectangle(180, 380, 30, 50, WALL_COLOR));

    return walls;
  }

  private onCaught() {
    if (this.time.now < this.invulnerableUntil) return;
    this.invulnerableUntil = this.time.now + CATCH_COOLDOWN_MS;

    if (this.player.isHidden) this.player.unhide();
    this.player.setPosition(this.playerSpawn.x, this.playerSpawn.y);
    this.player.setVelocity(0, 0);
    this.cookProgress = 0;
    this.stove.setProgress(0);

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
