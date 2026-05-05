import Phaser from "phaser";
import { INGREDIENT_IDS, type IngredientId, type LevelId, type PlayerProfile } from "@octo/shared";
import { Player } from "../entities/Player";
import { PizzaEnemy } from "../entities/PizzaEnemy";
import { Ingredient, INGREDIENT_COLORS } from "../entities/Ingredient";
import { MoneyCoin } from "../entities/MoneyCoin";
import { HideSpot } from "../entities/HideSpot";
import { Stove } from "../entities/Stove";
import { InventoryHud } from "../ui/InventoryHud";
import { spendMoney } from "../api";
import { isMuted, sfx, toggleMuted } from "../audio";
import { LEVELS, type LevelConfig, type RoomKey } from "../levels";

const MAP = { x: 60, y: 60, width: 680, height: 480 };
const WALL_THICKNESS = 12;
const WALL_COLOR = 0x4a4a55;
const FLOOR_COLOR = 0x1f1f24;
const DIVIDER_X = MAP.x + MAP.width / 2;
const DIVIDER_Y = MAP.y + MAP.height / 2;
const DOOR_HALF = 30;
const COOK_TIME_MS = 1500;
const CATCH_FEE = 3;
const PAY_FEE_GRACE_MS = 1500;

const ROOM_TL = new Phaser.Geom.Rectangle(MAP.x, MAP.y, MAP.width / 2, MAP.height / 2);
const ROOM_TR = new Phaser.Geom.Rectangle(DIVIDER_X, MAP.y, MAP.width / 2, MAP.height / 2);
const ROOM_BL = new Phaser.Geom.Rectangle(MAP.x, DIVIDER_Y, MAP.width / 2, MAP.height / 2);
const ROOM_BR = new Phaser.Geom.Rectangle(DIVIDER_X, DIVIDER_Y, MAP.width / 2, MAP.height / 2);
const ROOMS = [ROOM_TL, ROOM_TR, ROOM_BL, ROOM_BR] as const;
const ROOM_BY_KEY: Record<RoomKey, Phaser.Geom.Rectangle> = {
  TL: ROOM_TL,
  TR: ROOM_TR,
  BL: ROOM_BL,
  BR: ROOM_BR,
};
const INTERSECTION = new Phaser.Math.Vector2(DIVIDER_X, DIVIDER_Y);

export class LevelScene extends Phaser.Scene {
  protected levelId: LevelId = "level-1";
  private cfg!: LevelConfig;
  private player!: Player;
  private enemy!: PizzaEnemy;
  private stove!: Stove;
  private hud!: InventoryHud;
  private hideSpots: HideSpot[] = [];
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private muteKey!: Phaser.Input.Keyboard.Key;
  private muteIndicator?: Phaser.GameObjects.Text;
  private tierLabel?: Phaser.GameObjects.Text;
  private playerSpawn = new Phaser.Math.Vector2(0, 0);
  private readonly collected = new Set<IngredientId>();
  private readonly ingredientSprites = new Map<IngredientId, Ingredient>();
  private ingredientCollider?: Phaser.Physics.Arcade.Collider;
  private money = 0;
  private invulnerableUntil = 0;
  private cookProgress = 0;
  private isInputBlocked = false;
  private startedAt = 0;

  constructor(key = "Level1") {
    super(key);
  }

  init() {
    this.cfg = LEVELS[this.levelId];
  }

  create() {
    this.cameras.main.fadeIn(280, 0, 0, 0);
    this.collected.clear();
    this.money = 0;
    this.invulnerableUntil = 0;
    this.cookProgress = 0;
    this.isInputBlocked = false;
    this.startedAt = this.time.now;
    this.playerSpawn.set(this.cfg.playerSpawn.x, this.cfg.playerSpawn.y);

    this.add.rectangle(
      MAP.x + MAP.width / 2,
      MAP.y + MAP.height / 2,
      MAP.width,
      MAP.height,
      FLOOR_COLOR,
    );

    const doorColor = 0x2a2a32;
    this.add.rectangle(DIVIDER_X, DIVIDER_Y, DOOR_HALF * 2 + 4, DOOR_HALF * 2 + 4, doorColor);
    this.add.rectangle(DIVIDER_X, DIVIDER_Y, DOOR_HALF * 2 - 4, DOOR_HALF * 2 - 4, 0x2f2f37);

    const walls = this.buildWalls();
    walls.forEach((w) => this.physics.add.existing(w, true));

    this.physics.world.setBounds(
      MAP.x + WALL_THICKNESS,
      MAP.y + WALL_THICKNESS,
      MAP.width - WALL_THICKNESS * 2,
      MAP.height - WALL_THICKNESS * 2,
    );

    (Object.entries(this.cfg.roomLabels) as Array<[RoomKey, string]>).forEach(([key, label]) => {
      const room = ROOM_BY_KEY[key];
      this.add.text(room.x + 14, room.y + 12, label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "10px",
        color: "#666",
      });
    });

    this.hideSpots = this.cfg.hideSpotLayout.map(([x, y]) => new HideSpot(this, x, y));
    this.stove = new Stove(this, this.cfg.stove.x, this.cfg.stove.y);

    this.player = new Player(this, this.playerSpawn.x, this.playerSpawn.y);
    this.physics.add.collider(this.player, walls);

    const wins = this.getProfile()?.winCounts[this.levelId] ?? 0;
    const tier = Math.min(wins + this.cfg.difficultyBonus, 5);
    const spawnRoom = ROOM_BY_KEY[this.cfg.pizzaSpawnRoom];
    this.enemy = new PizzaEnemy(
      this,
      spawnRoom.centerX,
      spawnRoom.centerY,
      this.player,
      walls,
      ROOMS,
      spawnRoom,
      INTERSECTION,
      {
        chaseSpeed: 160 + tier * 12,
        searchSpeed: 140 + tier * 10,
        sightRange: 260 + tier * 16,
      },
    );
    this.physics.add.collider(this.enemy, walls);
    this.physics.add.overlap(this.player, this.enemy, () => this.onCaught());
    this.enemy.on("chase-start", () => sfx.spotted());

    this.respawnIngredients();

    const coins = this.cfg.coinLayout.map(([x, y]) => new MoneyCoin(this, x, y));
    this.physics.add.overlap(this.player, coins, (_p, c) => {
      const coin = c as MoneyCoin;
      this.spawnPop(coin.x, coin.y, 0xf6c84a);
      coin.destroy();
      this.money += 1;
      sfx.coin();
    });

    this.hud = new InventoryHud(this);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.muteKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.add.text(20, 20, "WASD/arrows · SPACE hide or cook · ESC pause · M mute", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#aaa",
    });
    this.add.text(20, 40, `${this.cfg.title} · pizza tier ${tier}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      color: "#777",
    });

    this.muteIndicator = this.add.text(20, 580, isMuted() ? "[muted]" : "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      color: "#888",
    });

    this.tierLabel = this.add
      .text(this.enemy.x, this.enemy.y - 32, `T${tier}`, {
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "11px",
        color: "#ff8a8a",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.maybeShowTutorial();
  }

  private maybeShowTutorial() {
    const KEY = "octo-games:seen-intro";
    let seen = false;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {
      /* ignored */
    }
    if (seen) return;

    const lines = [
      "you are the chef.",
      "the evil pizza is hunting you through the house.",
      "",
      "find every ingredient — basil, dough, cheese, sauce, pepperoni —",
      "then return to the kitchen stove and hold SPACE to cook.",
      "",
      "step on a dark blue spot and tap SPACE to hide.",
      "if it catches you, you can pay $3 (per saved profile) to keep going.",
    ];

    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.78).setDepth(200);
    const panel = this.add
      .rectangle(400, 300, 540, 280, 0x1c1c20)
      .setStrokeStyle(2, 0x4a4a55)
      .setDepth(200);
    const title = this.add
      .text(400, 200, "how to play", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        color: "#ffd166",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(201);
    const body = this.add
      .text(400, 305, lines.join("\n"), {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#cfd8dc",
        align: "center",
        lineSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(201);
    const dismiss = this.add
      .text(400, 410, "press SPACE to start", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#aaa",
      })
      .setOrigin(0.5)
      .setDepth(201);

    this.isInputBlocked = true;
    this.physics.pause();

    this.input.keyboard!.once("keydown-SPACE", () => {
      try {
        localStorage.setItem(KEY, "1");
      } catch {
        /* ignored */
      }
      [overlay, panel, title, body, dismiss].forEach((g) => g.destroy());
      this.physics.resume();
      this.isInputBlocked = false;
      this.startedAt = this.time.now;
    });
  }

  override update(time: number, delta: number) {
    if (this.isInputBlocked) return;

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.openPauseMenu();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      const nowMuted = toggleMuted();
      this.muteIndicator?.setText(nowMuted ? "[muted]" : "");
    }

    this.player.update();
    this.enemy.update(time);

    if (this.tierLabel) {
      this.tierLabel.setPosition(this.enemy.x, this.enemy.y - 32);
    }

    const onHideSpot = !this.player.isHidden && !!this.physics.overlap(this.player, this.hideSpots);
    const onStove = !this.player.isHidden && !!this.physics.overlap(this.player, this.stove);
    const allIngredients = this.collected.size === INGREDIENT_IDS.length;

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.player.isHidden) {
        this.player.unhide();
        sfx.unhide();
      } else if (onHideSpot) {
        this.player.hide();
        sfx.hide();
      }
    }

    if (onStove && allIngredients && this.spaceKey.isDown) {
      this.cookProgress = Math.min(1, this.cookProgress + delta / COOK_TIME_MS);
      this.stove.setProgress(this.cookProgress);
      if (this.cookProgress >= 1) {
        sfx.cookComplete();
        const elapsedSeconds = (this.time.now - this.startedAt) / 1000;
        this.scene.start("Win", {
          money: this.money,
          timeSeconds: elapsedSeconds,
          levelId: this.levelId,
          sceneKey: this.scene.key,
        });
        return;
      }
    } else if (this.cookProgress > 0) {
      this.cookProgress = 0;
      this.stove.setProgress(0);
    }

    const profile = this.getProfile();
    const totalSaved = profile?.totalMoney ?? 0;
    const best = profile?.bestTimes[this.levelId];
    const elapsed = (this.time.now - this.startedAt) / 1000;
    this.hud.update(
      this.collected,
      this.money,
      totalSaved,
      this.player.isHidden,
      onHideSpot,
      onStove,
      allIngredients,
      elapsed,
      best,
    );
  }

  private getProfile(): PlayerProfile | null {
    return (this.registry.get("profile") as PlayerProfile | undefined) ?? null;
  }

  private buildWalls(): Phaser.GameObjects.Rectangle[] {
    const walls: Phaser.GameObjects.Rectangle[] = [];

    walls.push(this.add.rectangle(MAP.x + MAP.width / 2, MAP.y, MAP.width, WALL_THICKNESS, WALL_COLOR));
    walls.push(this.add.rectangle(MAP.x + MAP.width / 2, MAP.y + MAP.height, MAP.width, WALL_THICKNESS, WALL_COLOR));
    walls.push(this.add.rectangle(MAP.x, MAP.y + MAP.height / 2, WALL_THICKNESS, MAP.height, WALL_COLOR));
    walls.push(this.add.rectangle(MAP.x + MAP.width, MAP.y + MAP.height / 2, WALL_THICKNESS, MAP.height, WALL_COLOR));

    const vTopLen = DIVIDER_Y - DOOR_HALF - MAP.y;
    const vBotLen = MAP.y + MAP.height - (DIVIDER_Y + DOOR_HALF);
    walls.push(this.add.rectangle(DIVIDER_X, MAP.y + vTopLen / 2, WALL_THICKNESS, vTopLen, WALL_COLOR));
    walls.push(this.add.rectangle(DIVIDER_X, MAP.y + MAP.height - vBotLen / 2, WALL_THICKNESS, vBotLen, WALL_COLOR));

    const hLeftLen = DIVIDER_X - DOOR_HALF - MAP.x;
    const hRightLen = MAP.x + MAP.width - (DIVIDER_X + DOOR_HALF);
    walls.push(this.add.rectangle(MAP.x + hLeftLen / 2, DIVIDER_Y, hLeftLen, WALL_THICKNESS, WALL_COLOR));
    walls.push(this.add.rectangle(MAP.x + MAP.width - hRightLen / 2, DIVIDER_Y, hRightLen, WALL_THICKNESS, WALL_COLOR));

    walls.push(this.add.rectangle(260, 200, 40, 30, WALL_COLOR));
    walls.push(this.add.rectangle(560, 230, 40, 30, WALL_COLOR));
    walls.push(this.add.rectangle(180, 380, 30, 50, WALL_COLOR));

    return walls;
  }

  private respawnIngredients() {
    this.ingredientCollider?.destroy();
    this.ingredientSprites.forEach((s) => s.destroy());
    this.ingredientSprites.clear();
    this.cfg.ingredientLayout.forEach(([id, x, y]) => {
      const ing = new Ingredient(this, x, y, id);
      this.ingredientSprites.set(id, ing);
    });
    this.ingredientCollider = this.physics.add.overlap(
      this.player,
      [...this.ingredientSprites.values()],
      (_p, ing) => {
        const i = ing as Ingredient;
        if (this.collected.has(i.ingredientId)) return;
        this.collected.add(i.ingredientId);
        this.spawnPop(i.x, i.y, INGREDIENT_COLORS[i.ingredientId]);
        i.destroy();
        this.ingredientSprites.delete(i.ingredientId);
        sfx.pickup();
      },
    );
  }

  private onCaught() {
    if (this.isInputBlocked) return;
    if (this.time.now < this.invulnerableUntil) return;

    this.isInputBlocked = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);
    sfx.caught();
    this.cameras.main.shake(280, 0.012);
    this.cameras.main.flash(220, 224, 76, 76);

    const totalMoney = this.getProfile()?.totalMoney ?? 0;
    this.scene.launch("CaughtModal", { fee: CATCH_FEE, totalMoney });

    const modal = this.scene.get("CaughtModal");
    modal.events.once("choice", (choice: "restart" | "pay") => {
      this.scene.stop("CaughtModal");
      if (choice === "restart") {
        this.scene.restart();
      } else {
        void this.handlePayFee();
      }
    });
  }

  private spawnPop(x: number, y: number, color: number) {
    if (!this.textures.exists("pop")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture("pop", 8, 8);
      g.destroy();
    }
    const e = this.add.particles(x, y, "pop", {
      speed: { min: 60, max: 140 },
      lifespan: 320,
      quantity: 8,
      scale: { start: 1.2, end: 0 },
      tint: color,
      emitting: false,
    });
    e.explode(8);
    this.time.delayedCall(500, () => e.destroy());
  }

  private openPauseMenu() {
    this.isInputBlocked = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);

    this.scene.launch("PauseMenu");
    const menu = this.scene.get("PauseMenu");
    menu.events.once("choice", (choice: "resume" | "restart") => {
      this.scene.stop("PauseMenu");
      if (choice === "restart") {
        this.scene.restart();
      } else {
        this.physics.resume();
        this.isInputBlocked = false;
      }
    });
  }

  private async handlePayFee() {
    try {
      const updated = await spendMoney(CATCH_FEE);
      this.registry.set("profile", updated);
    } catch (e) {
      console.error("pay-fee failed:", e);
      this.scene.restart();
      return;
    }

    this.collected.clear();
    this.respawnIngredients();
    this.player.setPosition(this.playerSpawn.x, this.playerSpawn.y);
    this.player.setVelocity(0, 0);
    if (this.player.isHidden) this.player.unhide();
    this.cookProgress = 0;
    this.stove.setProgress(0);
    const resetRoom = ROOM_BY_KEY[this.cfg.pizzaResetRoom];
    this.enemy.resetTo(resetRoom.centerX, resetRoom.centerY, resetRoom);
    this.invulnerableUntil = this.time.now + PAY_FEE_GRACE_MS;
    this.physics.resume();
    this.isInputBlocked = false;
  }
}

export class Level1Scene extends LevelScene {
  constructor() {
    super("Level1");
    this.levelId = "level-1";
  }
}

export class Level2Scene extends LevelScene {
  constructor() {
    super("Level2");
    this.levelId = "level-2";
  }
}
