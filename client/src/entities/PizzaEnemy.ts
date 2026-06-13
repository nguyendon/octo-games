import Phaser from "phaser";
import type { Player } from "./Player";
import { getPizzaSpeedMultiplier } from "../speedMultiplier";

export const PIZZA_TEXTURE_KEY = "pizza-enemy";
const TEX_KEY = PIZZA_TEXTURE_KEY;
// Source image is 192x162; display at this size so the pizza reads roughly
// the same on-screen footprint as the 28px chef while keeping the source
// detail crisp under linear filtering.
const DISPLAY_W = 52;
const DISPLAY_H = 44;
const HITBOX_W = 26;
const HITBOX_H = 22;

const PATROL_SPEED = 70;
const DEFAULT_CHASE_SPEED = 160;
const DEFAULT_SEARCH_SPEED = 140;
const DEFAULT_SIGHT_RANGE = 260;
const PATROL_REACH = 8;
const SEARCH_REACH = 24;
const PATROL_TIMEOUT_MS = 4000;
const PATROL_PAUSE_MS = 700;
const SEARCH_DURATION_MS = 3000;
const MIGRATE_REACH = 16;
const MIGRATE_MIN_MS = 6000;
const MIGRATE_MAX_MS = 9000;

const TINT_CHASE = 0xff7070;
const TINT_SEARCH = 0xffaa66;

type EnemyState = "patrol" | "chase" | "search";

export interface PizzaTuning {
  chaseSpeed?: number;
  searchSpeed?: number;
  sightRange?: number;
}

export class PizzaEnemy extends Phaser.Physics.Arcade.Sprite {
  private aiState: EnemyState = "patrol";
  private patrolTarget: Phaser.Math.Vector2 | null = null;
  private patrolStartedAt = 0;
  private pauseUntil = 0;
  private homeRoom: Phaser.Geom.Rectangle;
  private migratePath: Phaser.Math.Vector2[] = [];
  private nextMigrateAt = 0;
  private lastSeenAt: Phaser.Math.Vector2 | null = null;
  private searchUntil = 0;
  private readonly walls: Phaser.GameObjects.Rectangle[];
  private readonly target: Player;
  private readonly rooms: readonly Phaser.Geom.Rectangle[];
  private readonly intersection: Phaser.Math.Vector2;
  private readonly chaseSpeed: number;
  private readonly searchSpeed: number;
  private readonly sightRange: number;
  private trail?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Player,
    walls: Phaser.GameObjects.Rectangle[],
    rooms: readonly Phaser.Geom.Rectangle[],
    initialHome: Phaser.Geom.Rectangle,
    intersection: Phaser.Math.Vector2,
    tuning: PizzaTuning = {},
  ) {
    PizzaEnemy.ensureTexture(scene);

    super(scene, x, y, TEX_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDisplaySize(DISPLAY_W, DISPLAY_H);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Body sizes are in frame-pixel units; we want a HITBOX_W x HITBOX_H
    // world-unit hitbox centered in the displayed sprite. Convert through the
    // current scale so it stays right regardless of source-image dimensions.
    const fw = this.frame.width;
    const fh = this.frame.height;
    const hitFrameW = (HITBOX_W / DISPLAY_W) * fw;
    const hitFrameH = (HITBOX_H / DISPLAY_H) * fh;
    body.setSize(hitFrameW, hitFrameH);
    body.setOffset((fw - hitFrameW) / 2, (fh - hitFrameH) / 2);
    body.setCollideWorldBounds(true);

    this.target = target;
    this.walls = walls;
    this.rooms = rooms;
    this.homeRoom = initialHome;
    this.intersection = intersection;
    this.chaseSpeed = tuning.chaseSpeed ?? DEFAULT_CHASE_SPEED;
    this.searchSpeed = tuning.searchSpeed ?? DEFAULT_SEARCH_SPEED;
    this.sightRange = tuning.sightRange ?? DEFAULT_SIGHT_RANGE;

    // Inky trail emitted while chasing
    if (!scene.textures.exists("pizza-trail")) {
      const tg = scene.add.graphics();
      tg.fillStyle(0x222222, 1);
      tg.fillCircle(4, 4, 4);
      tg.generateTexture("pizza-trail", 8, 8);
      tg.destroy();
    }
    this.trail = scene.add.particles(0, 0, "pizza-trail", {
      follow: this,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.45, end: 0 },
      lifespan: 520,
      quantity: 1,
      frequency: 80,
      speed: 0,
      emitting: false,
    });
    this.trail.setDepth(this.depth - 1);

    // Idle wiggle so the pizza never looks frozen between patrol pauses.
    scene.tweens.add({
      targets: this,
      angle: 4,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  resetTo(x: number, y: number, homeRoom: Phaser.Geom.Rectangle) {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.homeRoom = homeRoom;
    this.migratePath = [];
    this.patrolTarget = null;
    this.lastSeenAt = null;
    this.searchUntil = 0;
    this.aiState = "patrol";
    this.clearTint();
    this.trail?.stop();
    this.nextMigrateAt = 0;
  }

  override update(time: number) {
    if (this.nextMigrateAt === 0) {
      this.nextMigrateAt = time + Phaser.Math.Between(MIGRATE_MIN_MS, MIGRATE_MAX_MS);
    }

    if (this.canSeeTarget()) {
      this.lastSeenAt = new Phaser.Math.Vector2(this.target.x, this.target.y);
      this.enterChase();
      this.runChase();
      return;
    }

    if (this.aiState === "chase") {
      this.enterSearch(time);
    }

    if (this.aiState === "search") {
      if (time > this.searchUntil || this.reachedLastSeen()) {
        this.enterPatrol();
      } else {
        this.runSearch();
        return;
      }
    }

    this.runPatrol(time);
  }

  private enterChase() {
    if (this.aiState === "chase") return;
    this.aiState = "chase";
    this.setTint(TINT_CHASE);
    this.trail?.start();
    this.emit("chase-start");
  }

  private enterSearch(time: number) {
    if (!this.lastSeenAt) {
      this.enterPatrol();
      return;
    }
    this.aiState = "search";
    this.setTint(TINT_SEARCH);
    this.trail?.stop();
    this.searchUntil = time + SEARCH_DURATION_MS;
  }

  private enterPatrol() {
    this.aiState = "patrol";
    this.clearTint();
    this.trail?.stop();
    this.patrolTarget = null;
    this.lastSeenAt = null;
  }

  private runSearch() {
    if (!this.lastSeenAt) {
      this.setVelocity(0, 0);
      return;
    }
    this.walkTowards(this.lastSeenAt, this.searchSpeed);
  }

  private reachedLastSeen(): boolean {
    if (!this.lastSeenAt) return true;
    const dx = this.lastSeenAt.x - this.x;
    const dy = this.lastSeenAt.y - this.y;
    return dx * dx + dy * dy < SEARCH_REACH * SEARCH_REACH;
  }

  private canSeeTarget(): boolean {
    if (this.target.isHidden) return false;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    if (dx * dx + dy * dy > this.sightRange * this.sightRange) return false;

    const sightLine = new Phaser.Geom.Line(this.x, this.y, this.target.x, this.target.y);
    for (const wall of this.walls) {
      if (Phaser.Geom.Intersects.LineToRectangle(sightLine, wall.getBounds())) {
        return false;
      }
    }
    return true;
  }

  private runChase() {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const s = this.chaseSpeed * getPizzaSpeedMultiplier();
      this.setVelocity((dx / len) * s, (dy / len) * s);
    } else {
      this.setVelocity(0, 0);
    }
  }

  private runPatrol(time: number) {
    if (time < this.pauseUntil) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.migratePath.length > 0) {
      this.followMigratePath(time);
      return;
    }

    if (time > this.nextMigrateAt) {
      this.startMigration(time);
      return;
    }

    if (
      !this.patrolTarget ||
      this.reachedTarget() ||
      time - this.patrolStartedAt > PATROL_TIMEOUT_MS
    ) {
      this.pickPatrolTarget();
      this.patrolStartedAt = time;
      this.pauseUntil = time + PATROL_PAUSE_MS;
      this.setVelocity(0, 0);
      return;
    }

    this.walkTowards(this.patrolTarget, PATROL_SPEED);
  }

  private followMigratePath(time: number) {
    const wp = this.migratePath[0]!;
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    if (dx * dx + dy * dy < MIGRATE_REACH * MIGRATE_REACH) {
      this.migratePath.shift();
      if (this.migratePath.length === 0) {
        this.nextMigrateAt = time + Phaser.Math.Between(MIGRATE_MIN_MS, MIGRATE_MAX_MS);
        this.patrolTarget = null;
        this.pauseUntil = time + PATROL_PAUSE_MS;
        this.setVelocity(0, 0);
      }
      return;
    }
    this.walkTowards(wp, PATROL_SPEED);
  }

  private startMigration(time: number) {
    const others = this.rooms.filter((r) => r !== this.homeRoom);
    const next = Phaser.Math.RND.pick([...others]);
    this.migratePath = [
      this.intersection.clone(),
      new Phaser.Math.Vector2(next.centerX, next.centerY),
    ];
    this.homeRoom = next;
    this.patrolTarget = null;
    this.patrolStartedAt = time;
  }

  private walkTowards(p: Phaser.Math.Vector2, speed: number) {
    const s = speed * getPizzaSpeedMultiplier();
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      this.setVelocity((dx / len) * s, (dy / len) * s);
    } else {
      this.setVelocity(0, 0);
    }
  }

  private reachedTarget(): boolean {
    if (!this.patrolTarget) return true;
    const dx = this.patrolTarget.x - this.x;
    const dy = this.patrolTarget.y - this.y;
    return dx * dx + dy * dy < PATROL_REACH * PATROL_REACH;
  }

  private pickPatrolTarget() {
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(this.homeRoom.left + 28, this.homeRoom.right - 28);
      const y = Phaser.Math.Between(this.homeRoom.top + 28, this.homeRoom.bottom - 28);
      const inWall = this.walls.some((w) => w.getBounds().contains(x, y));
      if (!inWall) {
        this.patrolTarget = new Phaser.Math.Vector2(x, y);
        return;
      }
    }
    this.patrolTarget = null;
  }

  static ensureTexture(scene: Phaser.Scene) {
    // The image is loaded in BootScene.preload(); here we just opt this texture
    // into bilinear filtering so the detailed source art doesn't look chunky
    // when scaled down under the game's global pixelArt:true setting.
    if (!scene.textures.exists(TEX_KEY)) return;
    scene.textures.get(TEX_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}
