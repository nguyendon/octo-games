import Phaser from "phaser";
import type { Player } from "./Player";

const TEX_KEY = "pizza-enemy";
const TEX_SIZE = 56;
const BODY_R = 14;
const TENTACLE_LEN = 12;

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

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_R * 2, BODY_R * 2);
    body.setOffset(TEX_SIZE / 2 - BODY_R, TEX_SIZE / 2 - BODY_R);
    body.setCollideWorldBounds(true);

    this.target = target;
    this.walls = walls;
    this.rooms = rooms;
    this.homeRoom = initialHome;
    this.intersection = intersection;
    this.chaseSpeed = tuning.chaseSpeed ?? DEFAULT_CHASE_SPEED;
    this.searchSpeed = tuning.searchSpeed ?? DEFAULT_SEARCH_SPEED;
    this.sightRange = tuning.sightRange ?? DEFAULT_SIGHT_RANGE;

    // Idle wiggle so the pizza never looks frozen between patrol pauses.
    scene.tweens.add({
      targets: this,
      angle: 4,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    scene.tweens.add({
      targets: this,
      scale: 1.05,
      duration: 540,
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
    this.emit("chase-start");
  }

  private enterSearch(time: number) {
    if (!this.lastSeenAt) {
      this.enterPatrol();
      return;
    }
    this.aiState = "search";
    this.setTint(TINT_SEARCH);
    this.searchUntil = time + SEARCH_DURATION_MS;
  }

  private enterPatrol() {
    this.aiState = "patrol";
    this.clearTint();
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
      this.setVelocity((dx / len) * this.chaseSpeed, (dy / len) * this.chaseSpeed);
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
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      this.setVelocity((dx / len) * speed, (dy / len) * speed);
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

  private static ensureTexture(scene: Phaser.Scene) {
    if (scene.textures.exists(TEX_KEY)) return;
    const c = TEX_SIZE / 2;
    const g = scene.add.graphics();

    g.lineStyle(3, 0x111111, 1);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      g.moveTo(c, c);
      g.lineTo(c + Math.cos(angle) * (BODY_R + TENTACLE_LEN), c + Math.sin(angle) * (BODY_R + TENTACLE_LEN));
    }
    g.strokePath();

    g.fillStyle(0xe07a3a, 1);
    g.fillCircle(c, c, BODY_R);
    g.fillStyle(0xfbcd9d, 1);
    g.fillCircle(c, c, BODY_R - 4);

    g.fillStyle(0xc44d36, 1);
    g.fillCircle(c - 5, c + 4, 1.6);
    g.fillCircle(c + 5, c + 4, 1.6);
    g.fillCircle(c, c + 6, 1.6);

    // tiny menacing eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c - 4, c - 2, 1.8);
    g.fillCircle(c + 4, c - 2, 1.8);
    g.fillStyle(0x111111, 1);
    g.fillCircle(c - 4, c - 2, 1);
    g.fillCircle(c + 4, c - 2, 1);

    g.generateTexture(TEX_KEY, TEX_SIZE, TEX_SIZE);
    g.destroy();
  }
}
