import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ENEMY_RADIUS,
  HUD_HEIGHT,
  PICKUP_RADIUS,
  PLAYER_RADIUS,
  VICTORY_DURATION_MS,
} from "./constants";
import { chargeProgress, isInvulnerable, type Player } from "./player";
import type { RuntimeEnemy } from "./enemies";
import type { Projectile } from "./projectiles";
import type { Pickup } from "./pickup";
import { effectProgress, type Effect } from "./effects";
import type { GameState } from "./game";
import {
  drawBitmap,
  bitmapSize,
  ditherRim,
  drawPixelText,
  pixel,
  pixelArc,
  pixelCircle,
  pixelEllipseRing,
  pixelPoly,
  pixelRect,
  pixelTextWidth,
  rotatePoints,
  type Bitmap,
  type Point,
} from "./pixels";

// Every sprite in this file is built from pixels.ts's integer-snapped
// primitives (pixelRect/pixelPoly/pixelCircle/pixelArc) rather than
// ctx.arc/ctx.ellipse/ctx.rotate, because Canvas2D always anti-aliases
// filled/stroked vector paths regardless of ctx.imageSmoothingEnabled ---
// that flag only affects drawImage scaling. See pixels.ts's header comment.

const COLORS = {
  backgroundTop: "#03040c",
  backgroundBottom: "#0a1030",
  star: "#9fb3d9",
  hull: "#eafcff",
  hullDark: "#8fa6c9",
  accent: "#5fd4ff",
  wingDark: "#2c3a6b",
  wingAccent: "#5fd4ff",
  navLeft: "#ff5a5a",
  navRight: "#6dffb0",
  engineHot: "#ffd166",
  engineCool: "#ff8a3d",
  chargeRing: "#7cffcb",
  persistent: "#ff5a36",
  persistentDark: "#9c2f18",
  persistentAccent: "#ffe27a",
  persistentHighlight: "#ffb37a",
  persistentShadow: "#5e1c0c",
  unstable: "#9c8bff",
  unstableBright: "#d7cbff",
  unstableShadow: "#5a4a99",
  boltPlayer: "#eafcff",
  boltPersistent: "#ffb04d",
  boltUnstable: "#c9b8ff",
  boltHighlight: "#ffffff",
  pickup: "#5cff9e",
  pickupCore: "#ffffff",
  pickupShadow: "#0d3d22",
  heartFull: "#ff4d6d",
  heartEmpty: "#3a1c24",
  planetSaturnBody: "#d9b177",
  planetSaturnBand: "#c99a5c",
  planetSaturnRing: "#e8d2a3",
  planetJupiterBody: "#c97b5a",
  planetJupiterBand: "#8a4a3a",
  planetHighlight: "#f5e6c8",
  endWonIcon: "#ffe8a3",
  endLostIcon: "#ffc2c2",
};

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

const STAR_COUNT = 40;
const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
  x: Math.random() * ARENA_WIDTH,
  y: Math.random() * ARENA_HEIGHT,
  size: Math.random() < 0.8 ? 1 : 2,
  speed: 6 + Math.random() * 14,
}));

interface Planet {
  x: number;
  y: number;
  radius: number;
  speed: number;
  kind: "saturn" | "jupiter";
}

// Purely decorative, non-interactive backdrop dressing --- kept at reduced
// alpha and drawn behind the starfield so it never competes visually with
// gameplay-relevant layers.
const PLANETS: Planet[] = [
  { x: ARENA_WIDTH * 0.24, y: ARENA_HEIGHT * 0.15, radius: 26, speed: 2, kind: "saturn" },
  { x: ARENA_WIDTH * 0.78, y: ARENA_HEIGHT * 0.7, radius: 18, speed: 1, kind: "jupiter" },
];

/** Fills a polygon given in coordinates local to (x, y) --- the pixel-art
 * equivalent of ctx.translate + ctx.beginPath/lineTo/fill. */
function poly(ctx: CanvasRenderingContext2D, x: number, y: number, points: Point[], color: string): void {
  pixelPoly(
    ctx,
    points.map(([px, py]) => [x + px, y + py] as Point),
    color,
  );
}

export function draw(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  // The background animation is driven off a frozen clock during the
  // countdown so the whole scene genuinely holds still, not just the sim.
  const bgNow = state.phase === "countdown" ? state.countdownEndAt : now;
  drawBackground(ctx, bgNow, state.phase);
  drawPickup(ctx, state.pickup, now);
  drawEnemies(ctx, state.enemies, now);
  drawProjectiles(ctx, state.projectiles);
  drawEffects(ctx, state.effects, now);
  drawPlayer(ctx, state.player, now, state.phase);
  drawHud(ctx, state, now);
  if (state.phase === "countdown") {
    drawCountdown(ctx, state.countdownEndAt, now);
  }
  if ((state.phase === "won" || state.phase === "lost") && state.endedAt !== null) {
    drawEndOverlay(ctx, state.phase, state.endedAt, now);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, now: number, phase: GameState["phase"]): void {
  const splitY = Math.round(ARENA_HEIGHT * 0.62);
  pixelRect(ctx, 0, 0, ARENA_WIDTH, splitY, COLORS.backgroundTop);
  pixelRect(ctx, 0, splitY, ARENA_WIDTH, ARENA_HEIGHT - splitY, COLORS.backgroundBottom);
  // Dithered seam --- a deliberate checkerboard instead of a smooth
  // gradient blend between the two background bands.
  for (let x = 0; x < ARENA_WIDTH; x++) {
    if ((x + splitY) % 2 === 0) {
      pixel(ctx, x, splitY - 1, COLORS.backgroundBottom);
      pixel(ctx, x, splitY, COLORS.backgroundTop);
    }
  }

  const speedMultiplier = phase === "won" ? 4 : 1;
  const drift = (now / 1000) * speedMultiplier;

  for (const planet of PLANETS) {
    const wrap = ARENA_HEIGHT + planet.radius * 4;
    const y = ((planet.y + drift * planet.speed) % wrap) - planet.radius * 2;
    drawPlanet(ctx, planet.x, y, planet.radius, planet.kind);
  }

  for (const star of stars) {
    const y = (star.y + drift * star.speed) % ARENA_HEIGHT;
    ctx.globalAlpha = star.size === 1 ? 0.5 : 0.9;
    pixelRect(ctx, star.x, y, star.size, star.size, COLORS.star);
  }
  ctx.globalAlpha = 1;
}

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  kind: Planet["kind"],
): void {
  ctx.globalAlpha = 0.5;
  if (kind === "saturn") {
    pixelCircle(ctx, x, y, r, COLORS.planetSaturnBody, true);
    pixelRect(ctx, x - r, y - r * 0.18, r * 2, r * 0.28, COLORS.planetSaturnBand);
    pixelEllipseRing(ctx, x, y, r * 1.7, r * 0.5, -0.35, COLORS.planetSaturnRing);
    ditherRim(ctx, x, y, r, COLORS.backgroundTop);
    pixelCircle(ctx, x - r * 0.35, y - r * 0.35, Math.max(1, r * 0.18), COLORS.planetHighlight, true);
  } else {
    pixelCircle(ctx, x, y, r, COLORS.planetJupiterBody, true);
    for (let i = -2; i <= 2; i++) {
      ctx.globalAlpha = 0.3;
      pixelRect(ctx, x - r, y + i * r * 0.35 - r * 0.08, r * 2, r * 0.16, COLORS.planetJupiterBand);
    }
    ctx.globalAlpha = 0.5;
    ditherRim(ctx, x, y, r, COLORS.backgroundTop);
    pixelCircle(ctx, x - r * 0.35, y - r * 0.35, Math.max(1, r * 0.18), COLORS.planetHighlight, true);
  }
  ctx.globalAlpha = 1;
}

const ENGINE_FLARE_STEPS = [3, 5, 7, 9, 11];

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

  const active = phase !== "countdown";

  // Twin engine flares; brighter and longer while moving. A small set of
  // discrete length frames (not a continuous lerp) so the flare reads as
  // deliberately animated pixel art rather than a smooth vector wobble.
  // Held to a faint idle glow during the frozen countdown instead.
  if (active) {
    const stepIndex = Math.min(
      ENGINE_FLARE_STEPS.length - 1,
      Math.floor(player.engineFlare * ENGINE_FLARE_STEPS.length),
    );
    const flareLen = ENGINE_FLARE_STEPS[stepIndex];
    const flareColor = player.engineFlare > 0.5 ? COLORS.engineHot : COLORS.engineCool;
    const baseAlpha = 0.55 + player.engineFlare * 0.4;
    ctx.globalAlpha = baseAlpha;
    for (const side of [-1, 1]) {
      const bx = side * r * 0.45;
      poly(
        ctx,
        x,
        y,
        [
          [bx - 1.6, r * 0.55],
          [bx + 1.6, r * 0.55],
          [bx, r * 0.55 + flareLen],
        ],
        flareColor,
      );
    }
    // Inner hot-core streak, layered on top for internal detail.
    ctx.globalAlpha = Math.min(1, baseAlpha + 0.2);
    for (const side of [-1, 1]) {
      const bx = side * r * 0.45;
      poly(
        ctx,
        x,
        y,
        [
          [bx - 0.6, r * 0.55],
          [bx + 0.6, r * 0.55],
          [bx, r * 0.55 + flareLen * 0.7],
        ],
        COLORS.engineHot,
      );
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 0.35;
    for (const side of [-1, 1]) {
      pixelCircle(ctx, x + side * r * 0.45, y + r * 0.55, 1.3, COLORS.engineCool, true);
    }
    ctx.globalAlpha = 1;
  }

  // Charge ring, visible while charging and not yet fully charged, plus a
  // brief bright pulse right at full charge. Suppressed during the
  // countdown so the ship reads as genuinely paused.
  if (active) {
    const progress = chargeProgress(player, now);
    if (player.charging && progress > 0) {
      ctx.globalAlpha = progress >= 1 ? 0.9 : 0.35 + progress * 0.4;
      pixelArc(ctx, x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress), COLORS.chargeRing);
      ctx.globalAlpha = 1;
    }
  }

  // Invulnerability blink.
  if (isInvulnerable(player, now) && Math.floor(now / 80) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // Swept wings, drawn behind the fuselage so the ship reads much wider
  // (and so visibly larger than either enemy silhouette) than its hitbox.
  for (const side of [-1, 1]) {
    poly(
      ctx,
      x,
      y,
      [
        [side * r * 0.35, -r * 0.1],
        [side * r * 1.7, r * 0.75],
        [side * r * 0.9, r * 0.85],
        [side * r * 0.25, r * 0.35],
      ],
      COLORS.wingDark,
    );
  }
  for (const side of [-1, 1]) {
    poly(
      ctx,
      x,
      y,
      [
        [side * r * 0.35, -r * 0.1],
        [side * r * 1.7, r * 0.75],
        [side * r * 1.4, r * 0.78],
        [side * r * 0.3, r * 0.05],
      ],
      COLORS.wingAccent,
    );
  }

  // Wingtip nav lights --- a small asymmetric detail (red left, green right).
  pixelRect(ctx, x - r * 1.68, y + r * 0.72, 1.4, 1.4, COLORS.navLeft);
  pixelRect(ctx, x + r * 1.68 - 1.4, y + r * 0.72, 1.4, 1.4, COLORS.navRight);

  // Fuselage.
  poly(
    ctx,
    x,
    y,
    [
      [0, -r * 1.3],
      [r * 0.55, r * 0.1],
      [r * 0.4, r * 0.75],
      [0, r * 0.55],
      [-r * 0.4, r * 0.75],
      [-r * 0.55, r * 0.1],
    ],
    COLORS.hullDark,
  );
  poly(
    ctx,
    x,
    y,
    [
      [0, -r * 1.3],
      [r * 0.4, r * 0.05],
      [0, r * 0.45],
      [-r * 0.4, r * 0.05],
    ],
    COLORS.hull,
  );

  // Canopy, plus a small glint highlight for internal detail.
  poly(
    ctx,
    x,
    y,
    [
      [0, -r * 0.35 - r * 0.34],
      [r * 0.22, -r * 0.35],
      [0, -r * 0.35 + r * 0.34],
      [-r * 0.22, -r * 0.35],
    ],
    COLORS.accent,
  );
  ctx.globalAlpha = 0.8;
  pixelCircle(ctx, x - r * 0.06, y - r * 0.5, r * 0.08, COLORS.hull, true);
  ctx.globalAlpha = 1;
}

function drawWreckage(ctx: CanvasRenderingContext2D, x: number, y: number, now: number): void {
  const spin = now / 400;
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 4; i++) {
    const angle = spin + (i * Math.PI) / 2;
    const px = x + Math.cos(angle) * 6;
    const py = y + Math.sin(angle) * 6;
    pixelRect(ctx, px - 1.5, py - 1.5, 3, 3, COLORS.hull);
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

// A squat, wide armoured gunship --- deliberately flat and boxy so its
// silhouette reads nothing like the player's tall swept-wing fighter or the
// unstable enemy's spinning spiked crystal.
function drawPersistentEnemy(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const r = ENEMY_RADIUS;
  poly(
    ctx,
    x,
    y,
    [
      [-r * 1.3, 0],
      [-r * 0.7, -r * 0.9],
      [r * 0.7, -r * 0.9],
      [r * 1.3, 0],
      [r * 0.7, r * 0.9],
      [-r * 0.7, r * 0.9],
    ],
    COLORS.persistentDark,
  );
  poly(
    ctx,
    x,
    y,
    [
      [-r * 0.95, 0],
      [-r * 0.5, -r * 0.65],
      [r * 0.5, -r * 0.65],
      [r * 0.95, 0],
      [r * 0.5, r * 0.65],
      [-r * 0.5, r * 0.65],
    ],
    COLORS.persistent,
  );
  // Top-edge highlight and bottom-edge shadow slivers --- a hard-edged
  // bevel instead of a smooth lighting gradient.
  poly(
    ctx,
    x,
    y,
    [
      [-r * 0.4, -r * 0.65],
      [r * 0.4, -r * 0.65],
      [r * 0.3, -r * 0.5],
      [-r * 0.3, -r * 0.5],
    ],
    COLORS.persistentHighlight,
  );
  poly(
    ctx,
    x,
    y,
    [
      [-r * 0.4, r * 0.65],
      [r * 0.4, r * 0.65],
      [r * 0.3, r * 0.5],
      [-r * 0.3, r * 0.5],
    ],
    COLORS.persistentShadow,
  );
  pixelRect(ctx, x - r * 1.35, y - r * 0.25, r * 0.4, r * 0.5, COLORS.persistentDark);
  pixelRect(ctx, x + r * 0.95, y - r * 0.25, r * 0.4, r * 0.5, COLORS.persistentDark);
  pixelCircle(ctx, x, y, r * 0.3, COLORS.persistentAccent, true);
}

// A spinning spiked crystal that visibly sheds pixels --- reads as
// unstable/fragile at a glance, unlike the persistent enemy's flat armour.
// The spin is 6 discrete rotation frames (not a continuous ctx.rotate) so
// it reads as deliberately animated pixel art.
const UNSTABLE_SPIKES = 5;
const UNSTABLE_ROTATION_FRAMES = 6;
const UNSTABLE_FRAME_INTERVAL_MS = 260;

function unstableStarPoints(r: number, rotation: number, radiusScale: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < UNSTABLE_SPIKES * 2; i++) {
    const angle = (i / (UNSTABLE_SPIKES * 2)) * Math.PI * 2 + rotation;
    const radius = (i % 2 === 0 ? r * 1.05 : r * 0.42) * radiusScale;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return points;
}

function drawUnstableEnemy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  id: number,
  now: number,
): void {
  const r = ENEMY_RADIUS;
  const frame = Math.floor(now / UNSTABLE_FRAME_INTERVAL_MS) % UNSTABLE_ROTATION_FRAMES;
  const rotation = (frame / UNSTABLE_ROTATION_FRAMES) * Math.PI * 2;

  // A slightly larger dark star behind an inset bright star gives the
  // crystal a faceted, bordered look instead of a flat silhouette.
  poly(ctx, x, y, unstableStarPoints(r, rotation, 1), COLORS.unstableShadow);
  poly(ctx, x, y, unstableStarPoints(r, rotation, 0.82), COLORS.unstable);

  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now / 120 + id);
  pixelCircle(ctx, x, y, r * 0.32, COLORS.unstableBright, true);
  ctx.globalAlpha = 1;

  // Shed a couple of flickering pixels around it so it visibly degrades.
  const seed = id * 137.5;
  for (let i = 0; i < 3; i++) {
    const t = now / 90 + seed + i * 2.1;
    if (Math.sin(t) < 0.3) continue;
    const angle = (i / 3) * Math.PI * 2 + t * 0.3;
    const dist = r + 2 + Math.sin(t * 1.7) * 2;
    ctx.globalAlpha = 0.7;
    pixel(ctx, x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, COLORS.unstableBright);
  }
  ctx.globalAlpha = 1;
}

// Bolt silhouettes, defined once in local space and rotated per-shot ---
// pixelPoly's scanline fill stays crisp at any rotation, so the octant snap
// below is a deliberate retro animation-frame choice, not a technical need.
const PERSISTENT_BOLT: Point[] = [
  [-3, -1],
  [2, -1],
  [3, 0],
  [2, 1],
  [-3, 1],
];
const UNSTABLE_BOLT: Point[] = [
  [-2.8, 0],
  [0, -2.8],
  [2.8, 0],
  [0, 2.8],
];
const OCTANT = Math.PI / 4;

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]): void {
  for (const p of projectiles) {
    if (p.owner === "player") {
      pixelRect(ctx, p.x - 1, p.y - 4, 2, 8, COLORS.boltPlayer);
      pixel(ctx, p.x, p.y - 4, COLORS.hull);
    } else if (p.owner === "persistent") {
      const angle = Math.atan2(p.vy, p.vx);
      const snapped = Math.round(angle / OCTANT) * OCTANT;
      const shape = rotatePoints(PERSISTENT_BOLT, snapped).map(([px, py]) => [p.x + px, p.y + py] as Point);
      pixelPoly(ctx, shape, COLORS.boltPersistent);
      const [tx, ty] = rotatePoints([[3, 0]], snapped)[0];
      pixel(ctx, p.x + tx, p.y + ty, COLORS.boltHighlight);
    } else {
      const shape = rotatePoints(UNSTABLE_BOLT, OCTANT).map(([px, py]) => [p.x + px, p.y + py] as Point);
      pixelPoly(ctx, shape, COLORS.boltUnstable);
    }
  }
}

function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup | null, now: number): void {
  if (!pickup) return;
  const pulse = 1 + 0.15 * Math.sin(now / 180);
  const r = PICKUP_RADIUS * pulse;

  // A 1px dark backing cross behind the bright one for outline contrast
  // against a busy background.
  pixelRect(ctx, pickup.x - r * 0.28 - 1, pickup.y - r * 0.75 - 1, r * 0.56 + 2, r * 1.5 + 2, COLORS.pickupShadow);
  pixelRect(ctx, pickup.x - r * 0.75 - 1, pickup.y - r * 0.28 - 1, r * 1.5 + 2, r * 0.56 + 2, COLORS.pickupShadow);
  pixelRect(ctx, pickup.x - r * 0.28, pickup.y - r * 0.75, r * 0.56, r * 1.5, COLORS.pickup);
  pixelRect(ctx, pickup.x - r * 0.75, pickup.y - r * 0.28, r * 1.5, r * 0.56, COLORS.pickup);

  ctx.globalAlpha = 0.6;
  pixelRect(ctx, pickup.x - 1, pickup.y - 1, 2, 2, COLORS.pickupCore);
  ctx.globalAlpha = 1;
}

/** Plots `count` shard-sized squares around a circle of the given radius ---
 * the pixel-cluster equivalent of a stroked expanding ring. */
function burst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  count: number,
  size: number,
  color: string,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    pixelRect(ctx, px - size / 2, py - size / 2, size, size, color);
  }
}

function drawEffects(ctx: CanvasRenderingContext2D, effects: Effect[], now: number): void {
  for (const effect of effects) {
    const progress = effectProgress(effect, now);
    const fade = 1 - progress;

    switch (effect.kind) {
      case "muzzle": {
        ctx.globalAlpha = fade;
        pixelCircle(ctx, effect.x, effect.y, 2 + progress * 3, COLORS.boltPlayer, true);
        break;
      }
      case "explosion": {
        ctx.globalAlpha = fade;
        burst(ctx, effect.x, effect.y, ENEMY_RADIUS + progress * 8, 8, 2, COLORS.persistent);
        break;
      }
      case "split": {
        ctx.globalAlpha = fade;
        burst(ctx, effect.x, effect.y, ENEMY_RADIUS + progress * 12, 8, 2, COLORS.unstableBright);
        burst(ctx, effect.x, effect.y, progress * 16, 6, 2, COLORS.persistent);
        break;
      }
      case "fade": {
        ctx.globalAlpha = fade * 0.6;
        pixelCircle(ctx, effect.x, effect.y, ENEMY_RADIUS * (1 - progress), COLORS.unstable, true);
        break;
      }
      case "hit": {
        ctx.globalAlpha = fade;
        burst(ctx, effect.x, effect.y, PLAYER_RADIUS + progress * 10, 8, 2, COLORS.heartFull);
        break;
      }
      case "heal": {
        ctx.globalAlpha = fade;
        burst(ctx, effect.x, effect.y, PLAYER_RADIUS + progress * 14, 8, 2, COLORS.pickup);
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  drawHearts(ctx, state.player);

  if (state.phase === "playing") {
    const remainingMs = Math.max(0, VICTORY_DURATION_MS - state.elapsedMs);
    const seconds = Math.ceil(remainingMs / 1000);
    const scale = 2;
    ctx.globalAlpha = 0.85;
    drawPixelText(ctx, String(seconds), ARENA_WIDTH - 6, HUD_HEIGHT / 2 - (5 * scale) / 2, COLORS.hull, "right", scale);
    ctx.globalAlpha = 1;
  }
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

const HEART_BITMAP: Bitmap = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."];

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, filled: boolean): void {
  const color = filled ? COLORS.heartFull : COLORS.heartEmpty;
  const scale = size / 7;
  const { width, height } = bitmapSize(HEART_BITMAP, scale);
  drawBitmap(ctx, x - width / 2, y - height / 2, HEART_BITMAP, { "#": color }, scale);
}

function drawCountdown(ctx: CanvasRenderingContext2D, countdownEndAt: number, now: number): void {
  const msLeft = Math.max(0, countdownEndAt - now);
  const secondsLeft = Math.max(1, Math.ceil(msLeft / 1000));
  const intoSecond = (msLeft % 1000) / 1000;
  const scale = 0.75 + (1 - intoSecond) * 0.35;

  const cx = ARENA_WIDTH / 2;
  const cy = ARENA_HEIGHT * 0.42;

  ctx.globalAlpha = 0.7;
  pixelArc(ctx, cx, cy, 18 * scale, 0, Math.PI * 2, COLORS.chargeRing);
  ctx.globalAlpha = 1;

  const digitScale = Math.max(1, Math.round(4 * scale));
  const text = String(secondsLeft);
  const width = pixelTextWidth(text, digitScale);
  const height = 5 * digitScale;
  drawPixelText(ctx, text, cx - width / 2, cy - height / 2, COLORS.hull, "left", digitScale);
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
  const color = phase === "won" ? COLORS.endWonIcon : COLORS.endLostIcon;
  ctx.globalAlpha = 0.6 + pulse * 0.4;

  if (phase === "won") {
    // A five-point pixel star --- a clean win icon.
    const points: Point[] = [];
    const spikes = 5;
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? iconR : iconR * 0.42;
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
    }
    pixelPoly(ctx, points, color);
  } else {
    // A scattered broken-shard cluster --- reads as shattered, not victorious.
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = iconR * (0.4 + (i % 2) * 0.5);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      pixelRect(ctx, px - 1.5, py - 1.5, 3, 3, color);
    }
    pixelRect(ctx, cx - 1.5, cy - 1.5, 3, 3, color);
  }
  ctx.globalAlpha = 1;
}
