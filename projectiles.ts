import { PLAYER_PROJECTILE_SPEED, PROJECTILE_RADIUS_ENEMY, PROJECTILE_RADIUS_PLAYER } from "./constants";
import type { EnemyKind } from "./enemies";

export type ProjectileOwner = "player" | EnemyKind;

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: ProjectileOwner;
  radius: number;
}

let nextId = 1;

export function createPlayerProjectile(x: number, y: number): Projectile {
  return {
    id: nextId++,
    x,
    y,
    vx: 0,
    vy: -PLAYER_PROJECTILE_SPEED,
    owner: "player",
    radius: PROJECTILE_RADIUS_PLAYER,
  };
}

export function createEnemyProjectile(
  x: number,
  y: number,
  targetX: number,
  targetY: number,
  owner: EnemyKind,
  speed: number,
): Projectile {
  const dx = targetX - x;
  const dy = targetY - y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  return {
    id: nextId++,
    x,
    y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    owner,
    radius: PROJECTILE_RADIUS_ENEMY,
  };
}

export function stepProjectile(p: Projectile, dt: number): void {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
}

export function isOutOfBounds(p: Projectile, width: number, height: number, pad = 24): boolean {
  return p.x < -pad || p.x > width + pad || p.y < -pad || p.y > height + pad;
}
