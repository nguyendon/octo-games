import Phaser from "phaser";
import type { Player } from "./Player";

export const PIZZA_TEXTURE_KEY = "pizza-enemy";
const TEX_KEY = PIZZA_TEXTURE_KEY;
const TEX_SIZE = 36;
const BODY_R = 10;
const TENTACLE_LEN = 6;
const HITBOX_R = 12;

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

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(HITBOX_R * 2, HITBOX_R * 2);
    body.setOffset(TEX_SIZE / 2 - HITBOX_R, TEX_SIZE / 2 - HITBOX_R);
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

  static ensureTexture(scene: Phaser.Scene) {
    if (scene.textures.exists(TEX_KEY)) return;
    const cx = TEX_SIZE / 2;
    const cy = TEX_SIZE / 2;
    const g = scene.add.graphics();

    const px = (color: number, x: number, y: number, alpha = 1) => {
      g.fillStyle(color, alpha);
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    };

    // Tentacles — 8 directions, drawn as 1-2 px wide chunky lines.
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      for (let t = 0; t <= TENTACLE_LEN; t++) {
        const r = BODY_R - 1 + t;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        px(0x0e0e16, x, y);
        // Thicken by 1 px perpendicular
        const px2x = x + Math.cos(angle + Math.PI / 2);
        const px2y = y + Math.sin(angle + Math.PI / 2);
        px(0x1c1c2a, px2x, px2y);
      }
      // Bulb at tip
      const tipR = BODY_R + TENTACLE_LEN;
      const tx = cx + Math.cos(angle) * tipR;
      const ty = cy + Math.sin(angle) * tipR;
      px(0x0e0e16, tx, ty);
      px(0x0e0e16, tx + Math.cos(angle + Math.PI / 2), ty + Math.sin(angle + Math.PI / 2));
      px(0x0e0e16, tx - Math.cos(angle + Math.PI / 2), ty - Math.sin(angle + Math.PI / 2));
    }

    // Body — concentric pixel rings (no AA: each pixel decided by distance).
    for (let y = -BODY_R; y <= BODY_R; y++) {
      for (let x = -BODY_R; x <= BODY_R; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d > BODY_R + 0.2) continue;
        let color;
        if (d > BODY_R - 0.6) color = 0x3a1808;
        else if (d > BODY_R - 1.6) color = 0x6a2f10;
        else if (d > BODY_R - 2.6) color = 0xa8602a;
        else if (d > BODY_R - 3.6) color = 0xd6863a;
        else if (d > BODY_R - 4.5) color = 0xe8a55a;
        else color = 0xf0c46e;
        px(color, cx + x, cy + y);
      }
    }

    // Cheese highlight specks
    px(0xfde7a8, cx - 4, cy - 1);
    px(0xfde7a8, cx + 3, cy + 2);
    px(0xfde7a8, cx - 1, cy + 4);

    // Pepperoni — three small dark-red discs (3-pixel plus-shape)
    const peps: Array<[number, number]> = [
      [-4, -1],
      [3, -2],
      [-1, 4],
    ];
    for (const [dx, dy] of peps) {
      const x = cx + dx;
      const y = cy + dy;
      px(0x7a2222, x, y);
      px(0x7a2222, x - 1, y);
      px(0x7a2222, x + 1, y);
      px(0x7a2222, x, y - 1);
      px(0x7a2222, x, y + 1);
      px(0xa83232, x, y);
      px(0x4a1010, x + 1, y + 1);
    }

    // Eyes — 2x2 with bright red iris and black pupil dot
    const drawEye = (ex: number, ey: number) => {
      px(0xffffff, ex, ey);
      px(0xffffff, ex + 1, ey);
      px(0xffffff, ex, ey + 1);
      px(0xffffff, ex + 1, ey + 1);
      px(0xff2d2d, ex + 1, ey);
      px(0xff8a8a, ex, ey);
      px(0x000000, ex + 1, ey + 1);
    };
    drawEye(cx - 4, cy - 4);
    drawEye(cx + 2, cy - 4);

    // Mouth: open black slit with two top fangs
    for (let dx = -3; dx <= 3; dx++) {
      px(0x0a0306, cx + dx, cy + 2);
      px(0x0a0306, cx + dx, cy + 3);
    }
    px(0xffffff, cx - 2, cy + 2);
    px(0xffffff, cx + 2, cy + 2);
    px(0xed9aa6, cx, cy + 3);

    g.generateTexture(TEX_KEY, TEX_SIZE, TEX_SIZE);
    g.destroy();
  }
}
