import Phaser from "phaser";
import type { Player } from "./Player";

const TEX_KEY = "pizza-enemy";
const TEX_SIZE = 56;
const BODY_R = 14;
const TENTACLE_LEN = 12;

const PATROL_SPEED = 70;
const CHASE_SPEED = 160;
const SIGHT_RANGE = 260;
const PATROL_REACH = 8;
const PATROL_TIMEOUT_MS = 4000;
const PATROL_PAUSE_MS = 700;
const MIGRATE_REACH = 16;
const MIGRATE_MIN_MS = 6000;
const MIGRATE_MAX_MS = 9000;

type EnemyState = "patrol" | "chase";

export class PizzaEnemy extends Phaser.Physics.Arcade.Sprite {
  private aiState: EnemyState = "patrol";
  private patrolTarget: Phaser.Math.Vector2 | null = null;
  private patrolStartedAt = 0;
  private pauseUntil = 0;
  private homeRoom: Phaser.Geom.Rectangle;
  private migratePath: Phaser.Math.Vector2[] = [];
  private nextMigrateAt = 0;
  private readonly walls: Phaser.GameObjects.Rectangle[];
  private readonly target: Player;
  private readonly rooms: readonly Phaser.Geom.Rectangle[];
  private readonly intersection: Phaser.Math.Vector2;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Player,
    walls: Phaser.GameObjects.Rectangle[],
    rooms: readonly Phaser.Geom.Rectangle[],
    initialHome: Phaser.Geom.Rectangle,
    intersection: Phaser.Math.Vector2,
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
  }

  override update(time: number) {
    if (this.nextMigrateAt === 0) {
      this.nextMigrateAt = time + Phaser.Math.Between(MIGRATE_MIN_MS, MIGRATE_MAX_MS);
    }

    if (this.canSeeTarget()) {
      if (this.aiState !== "chase") {
        this.aiState = "chase";
        this.setTint(0xff7070);
      }
      this.runChase();
    } else {
      if (this.aiState === "chase") {
        this.aiState = "patrol";
        this.clearTint();
        this.patrolTarget = null;
      }
      this.runPatrol(time);
    }
  }

  private canSeeTarget(): boolean {
    if (this.target.isHidden) return false;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    if (dx * dx + dy * dy > SIGHT_RANGE * SIGHT_RANGE) return false;

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
      this.setVelocity((dx / len) * CHASE_SPEED, (dy / len) * CHASE_SPEED);
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
    g.fillCircle(c - 4, c - 4, 2);
    g.fillCircle(c + 5, c - 2, 2);
    g.fillCircle(c - 2, c + 5, 2);

    g.generateTexture(TEX_KEY, TEX_SIZE, TEX_SIZE);
    g.destroy();
  }
}
