import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ENEMY_RADIUS,
  HUD_HEIGHT,
  PICKUP_RADIUS,
  PLAYER_CHARGE_MS,
  PLAYER_RADIUS,
} from "./constants";
import { chargeProgress, isInvulnerable, type Player } from "./player";
import type { RuntimeEnemy } from "./enemies";
import type { Projectile } from "./projectiles";
import type { Pickup } from "./pickup";
import { effectProgress, type Effect } from "./effects";
import type { GameState } from "./game";

const COLORS = {
  background: "#05070f",
  star: "#9fb3d9",
  hull: "#eafcff",
  accent: "#5fd4ff",
  engineHot: "#ffd166",
  engineCool: "#ff8a3d",
  chargeRing: "#7cffcb",
  persistent: "#ff5a36",
  persistentDark: "#9c2f18",
  unstable: "#9c8bff",
  unstableBright: "#d7cbff",
  boltPlayer: "#eafcff",
  boltPersistent: "#ffb04d",
  boltUnstable: "#c9b8ff",
  pickup: "#5cff9e",
  pickupCore: "#ffffff",
  heartFull: "#ff4d6d",
  heartEmpty: "#3a1c24",
};

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

const STAR_COUNT = 36;
const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
  x: Math.random() * ARENA_WIDTH,
  y: Math.random() * ARENA_HEIGHT,
  size: Math.random() < 0.8 ? 1 : 2,
  speed: 6 + Math.random() * 14,
}));

export function draw(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  drawBackground(ctx, now, state.phase);
  drawPickup(ctx, state.pickup, now);
  drawEnemies(ctx, state.enemies, now);
  drawProjectiles(ctx, state.projectiles);
  drawEffects(ctx, state.effects, now);
  drawPlayer(ctx, state.player, now, state.phase);
  drawHearts(ctx, state.player);
  if (state.phase !== "playing" && state.endedAt !== null) {
    drawEndOverlay(ctx, state.phase, state.endedAt, now);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, now: number, phase: GameState["phase"]): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  const speedMultiplier = phase === "won" ? 4 : 1;
  ctx.fillStyle = COLORS.star;
  for (const star of stars) {
    const y = (star.y + (now / 1000) * star.speed * speedMultiplier) % ARENA_HEIGHT;
    ctx.globalAlpha = star.size === 1 ? 0.5 : 0.9;
    ctx.fillRect(Math.round(star.x), Math.round(y), star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  now: number,
  phase: GameState["phase"],
): void {
  const { x, y } = player;
  const r = PLAYER_RADIUS;

  if (phase === "lost") {
    drawWreckage(ctx, x, y, now);
    return;
  }

  // Engine flare beneath the hull; brighter and longer while moving.
  const flareLen = 3 + player.engineFlare * 9;
  const flareColor = player.engineFlare > 0.5 ? COLORS.engineHot : COLORS.engineCool;
  ctx.fillStyle = flareColor;
  ctx.globalAlpha = 0.55 + player.engineFlare * 0.4;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + r * 0.5);
  ctx.lineTo(x + 3, y + r * 0.5);
  ctx.lineTo(x, y + r * 0.5 + flareLen);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Charge ring, visible while charging and not yet fully charged, plus a
  // brief bright pulse right at full charge.
  const progress = chargeProgress(player, now);
  if (player.charging && progress > 0) {
    ctx.strokeStyle = COLORS.chargeRing;
    ctx.globalAlpha = progress >= 1 ? 0.9 : 0.35 + progress * 0.4;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Invulnerability blink.
  if (isInvulnerable(player, now) && Math.floor(now / 80) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  ctx.fillStyle = COLORS.hull;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.75, y + r * 0.6);
  ctx.lineTo(x, y + r * 0.25);
  ctx.lineTo(x - r * 0.75, y + r * 0.6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = COLORS.accent;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.15, r * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}

function drawWreckage(ctx: CanvasRenderingContext2D, x: number, y: number, now: number): void {
  const spin = now / 400;
  ctx.fillStyle = COLORS.hull;
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 4; i++) {
    const angle = spin + (i * Math.PI) / 2;
    const px = x + Math.cos(angle) * 6;
    const py = y + Math.sin(angle) * 6;
    ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;
}

function drawEnemies(ctx: CanvasRenderingContext2D, enemies: RuntimeEnemy[], now: number): void {
  for (const enemy of enemies) {
    const grace = now < enemy.graceUntil;
    ctx.globalAlpha = grace ? 0.5 + 0.5 * Math.sin(now / 40) ** 2 : 1;

    if (enemy.kind === "persistent") {
      drawPersistentEnemy(ctx, enemy.x, enemy.y);
    } else {
      drawUnstableEnemy(ctx, enemy.x, enemy.y, enemy.id, now);
    }
  }
  ctx.globalAlpha = 1;
}

function drawPersistentEnemy(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const r = ENEMY_RADIUS;
  ctx.fillStyle = COLORS.persistentDark;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = COLORS.persistent;
  ctx.fillRect(x - r + 1.5, y - r + 1.5, r * 2 - 3, r * 2 - 3);
}

function drawUnstableEnemy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  id: number,
  now: number,
): void {
  const r = ENEMY_RADIUS;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = COLORS.unstable;
  ctx.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
  ctx.restore();

  ctx.fillStyle = COLORS.unstableBright;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Shed a couple of flickering pixels around it so it visibly degrades.
  const seed = id * 137.5;
  for (let i = 0; i < 3; i++) {
    const t = now / 90 + seed + i * 2.1;
    if (Math.sin(t) < 0.3) continue;
    const angle = (i / 3) * Math.PI * 2 + t * 0.3;
    const dist = r + 2 + Math.sin(t * 1.7) * 2;
    ctx.fillStyle = COLORS.unstableBright;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x + Math.cos(angle) * dist - 0.5, y + Math.sin(angle) * dist - 0.5, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]): void {
  for (const p of projectiles) {
    if (p.owner === "player") {
      ctx.fillStyle = COLORS.boltPlayer;
      ctx.fillRect(p.x - 1, p.y - 4, 2, 8);
    } else if (p.owner === "persistent") {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.fillStyle = COLORS.boltPersistent;
      ctx.fillRect(-3, -1, 6, 2);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.boltUnstable;
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
  }
}

function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup | null, now: number): void {
  if (!pickup) return;
  const pulse = 1 + 0.15 * Math.sin(now / 180);
  const r = PICKUP_RADIUS * pulse;

  ctx.fillStyle = COLORS.pickup;
  ctx.fillRect(pickup.x - r * 0.28, pickup.y - r * 0.75, r * 0.56, r * 1.5);
  ctx.fillRect(pickup.x - r * 0.75, pickup.y - r * 0.28, r * 1.5, r * 0.56);

  ctx.fillStyle = COLORS.pickupCore;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(pickup.x - 1, pickup.y - 1, 2, 2);
  ctx.globalAlpha = 1;
}

function drawEffects(ctx: CanvasRenderingContext2D, effects: Effect[], now: number): void {
  for (const effect of effects) {
    const progress = effectProgress(effect, now);
    const fade = 1 - progress;

    switch (effect.kind) {
      case "muzzle": {
        ctx.fillStyle = COLORS.boltPlayer;
        ctx.globalAlpha = fade;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 2 + progress * 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "explosion": {
        ctx.strokeStyle = COLORS.persistent;
        ctx.globalAlpha = fade;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, ENEMY_RADIUS + progress * 8, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "split": {
        ctx.strokeStyle = COLORS.unstableBright;
        ctx.globalAlpha = fade;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, ENEMY_RADIUS + progress * 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = COLORS.persistent;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, progress * 16, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "fade": {
        ctx.fillStyle = COLORS.unstable;
        ctx.globalAlpha = fade * 0.6;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, ENEMY_RADIUS * (1 - progress), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "hit": {
        ctx.strokeStyle = COLORS.heartFull;
        ctx.globalAlpha = fade;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, PLAYER_RADIUS + progress * 10, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "heal": {
        ctx.strokeStyle = COLORS.pickup;
        ctx.globalAlpha = fade;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, PLAYER_RADIUS + progress * 14, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawHearts(ctx: CanvasRenderingContext2D, player: Player): void {
  const size = 7;
  const gap = 2;
  const startX = 6;
  const startY = HUD_HEIGHT / 2;
  for (let i = 0; i < player.maxHearts; i++) {
    const x = startX + i * (size + gap);
    drawHeart(ctx, x, startY, size, i < player.hearts);
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, filled: boolean): void {
  const r = size / 4;
  ctx.fillStyle = filled ? COLORS.heartFull : COLORS.heartEmpty;
  ctx.beginPath();
  ctx.arc(x - r, y - r * 0.4, r, 0, Math.PI * 2);
  ctx.arc(x + r, y - r * 0.4, r, 0, Math.PI * 2);
  ctx.moveTo(x - size / 2, y);
  ctx.lineTo(x, y + size / 2);
  ctx.lineTo(x + size / 2, y);
  ctx.closePath();
  ctx.fill();
}

function drawEndOverlay(
  ctx: CanvasRenderingContext2D,
  phase: "won" | "lost",
  endedAt: number,
  now: number,
): void {
  const age = now - endedAt;
  const settle = Math.min(1, age / 500);
  const pulse = 0.5 + 0.5 * Math.sin(now / 260);

  ctx.fillStyle = phase === "won" ? "rgba(255, 214, 120, 0.18)" : "rgba(140, 0, 30, 0.35)";
  ctx.globalAlpha = settle;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  ctx.globalAlpha = 1;

  const cx = ARENA_WIDTH / 2;
  const cy = ARENA_HEIGHT / 2;
  const iconR = 12 + pulse * 2;
  ctx.strokeStyle = phase === "won" ? "#ffe8a3" : "#ffc2c2";
  ctx.globalAlpha = 0.6 + pulse * 0.4;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, iconR, 0.4, Math.PI * 1.7);
  ctx.stroke();

  const tipAngle = Math.PI * 1.7;
  const tipX = cx + Math.cos(tipAngle) * iconR;
  const tipY = cy + Math.sin(tipAngle) * iconR;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - 4, tipY - 2);
  ctx.lineTo(tipX - 1, tipY + 4);
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.fill();
  ctx.globalAlpha = 1;
}
