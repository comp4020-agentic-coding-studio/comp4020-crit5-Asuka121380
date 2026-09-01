import {
  PLAYER_CHARGE_MS,
  PLAYER_FIRE_INTERVAL_MS,
  PLAYER_FOLLOW_RATE,
  PLAYER_INVULN_MS,
  PLAYER_MAX_HEARTS,
  PLAYER_STILL_SPEED_THRESHOLD,
} from "./constants";

export interface Player {
  x: number;
  y: number;
  hearts: number;
  maxHearts: number;
  isMoving: boolean;
  charging: boolean;
  chargeStart: number;
  invulnerableUntil: number;
  lastFireAt: number;
  engineFlare: number; // smoothed 0..1, for rendering only
  chargeAnnounced: boolean; // latched true once a charge cycle has announced "ready"
}

export function createPlayer(x: number, y: number, now: number): Player {
  return {
    x,
    y,
    hearts: PLAYER_MAX_HEARTS,
    maxHearts: PLAYER_MAX_HEARTS,
    isMoving: false,
    charging: true,
    chargeStart: now,
    invulnerableUntil: 0,
    lastFireAt: 0,
    engineFlare: 0.1,
    chargeAnnounced: false,
  };
}

/** Moves the ship toward the target and updates the moving/charging state that firing depends on. */
export function updatePlayerMovement(
  player: Player,
  targetX: number,
  targetY: number,
  dt: number,
  now: number,
): void {
  const prevX = player.x;
  const prevY = player.y;
  const follow = 1 - Math.exp(-PLAYER_FOLLOW_RATE * dt);
  player.x += (targetX - player.x) * follow;
  player.y += (targetY - player.y) * follow;

  const movedDist = Math.hypot(player.x - prevX, player.y - prevY);
  const speed = dt > 0 ? movedDist / dt : 0;
  const moving = speed > PLAYER_STILL_SPEED_THRESHOLD;

  if (moving) {
    player.isMoving = true;
    player.charging = false;
    player.chargeAnnounced = false;
  } else {
    player.isMoving = false;
    if (!player.charging) {
      player.charging = true;
      player.chargeStart = now;
    }
  }

  const flareTarget = moving ? 1 : 0.12;
  player.engineFlare += (flareTarget - player.engineFlare) * Math.min(1, dt * 8);
}

export function chargeProgress(player: Player, now: number): number {
  if (!player.charging) return 0;
  return Math.min(1, (now - player.chargeStart) / PLAYER_CHARGE_MS);
}

/** Latches true the instant a charge cycle first reaches full; resets once
 * charging stops, so it fires exactly once per charge-up. */
export function checkAndAnnounceChargeReady(player: Player, now: number): boolean {
  if (!player.charging) return false;
  if (player.chargeAnnounced) return false;
  if (chargeProgress(player, now) < 1) return false;
  player.chargeAnnounced = true;
  return true;
}

export function shouldFire(player: Player, now: number): boolean {
  if (player.isMoving || !player.charging) return false;
  if (chargeProgress(player, now) < 1) return false;
  return now - player.lastFireAt >= PLAYER_FIRE_INTERVAL_MS;
}

export function markFired(player: Player, now: number): void {
  player.lastFireAt = now;
}

export function isInvulnerable(player: Player, now: number): boolean {
  return now < player.invulnerableUntil;
}

/** Returns true if the hit actually applied (false while invulnerable). */
export function damagePlayer(player: Player, now: number): boolean {
  if (isInvulnerable(player, now)) return false;
  player.hearts = Math.max(0, player.hearts - 1);
  player.invulnerableUntil = now + PLAYER_INVULN_MS;
  return true;
}

export function healPlayer(player: Player, amount: number): void {
  player.hearts = Math.min(player.maxHearts, player.hearts + amount);
}
