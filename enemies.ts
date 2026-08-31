import {
  ENEMY_TURN_MAX_MS,
  ENEMY_TURN_MIN_MS,
  PERSISTENT_FIRE_INTERVAL_MS,
  PERSISTENT_SPEED,
  SPLIT_GRACE_MS,
  SPLIT_OFFSET,
  UNSTABLE_FIRE_INTERVAL_MS,
  UNSTABLE_LIFETIME_MS,
  UNSTABLE_SPEED,
} from "./constants";
import { stepWander, type Wanderer } from "./motion";
import type { Bounds } from "./geometry";

export type EnemyKind = "persistent" | "unstable";

export interface Enemy {
  kind: EnemyKind;
  x: number;
  y: number;
}

export type UnstableRemovalCause = "timeout" | "destroyed";

/**
 * The one rule the crit-5 focused test pins down: what an unstable enemy
 * turns into when it leaves the battle. Timing out spawns nothing; being
 * destroyed by a player projectile spawns exactly two persistent enemies.
 */
export function resolveUnstableEnemyRemoval(
  enemy: Enemy,
  cause: UnstableRemovalCause,
): Enemy[] {
  if (cause === "timeout") return [];
  return [
    { kind: "persistent", x: enemy.x - SPLIT_OFFSET, y: enemy.y },
    { kind: "persistent", x: enemy.x + SPLIT_OFFSET, y: enemy.y },
  ];
}

export interface RuntimeEnemy extends Enemy, Wanderer {
  id: number;
  spawnedAt: number;
  nextFireAt: number;
  graceUntil: number;
}

let nextId = 1;

function randomHeading(): number {
  return Math.random() * Math.PI * 2;
}

function randomTurnDelay(): number {
  return ENEMY_TURN_MIN_MS + Math.random() * (ENEMY_TURN_MAX_MS - ENEMY_TURN_MIN_MS);
}

export function createEnemy(
  kind: EnemyKind,
  x: number,
  y: number,
  now: number,
  graceMs = 0,
): RuntimeEnemy {
  const heading = randomHeading();
  const speed = kind === "persistent" ? PERSISTENT_SPEED : UNSTABLE_SPEED;
  const fireInterval = kind === "persistent" ? PERSISTENT_FIRE_INTERVAL_MS : UNSTABLE_FIRE_INTERVAL_MS;
  return {
    id: nextId++,
    kind,
    x,
    y,
    heading,
    targetHeading: heading,
    speed,
    nextTurnAt: now + randomTurnDelay(),
    spawnedAt: now,
    graceUntil: now + graceMs,
    nextFireAt: now + graceMs + fireInterval * (0.4 + Math.random() * 0.6),
  };
}

export function stepEnemy(enemy: RuntimeEnemy, dt: number, now: number, bounds: Bounds): void {
  stepWander(enemy, dt, now, bounds, 16, randomHeading, randomTurnDelay);
}

export function isUnstableExpired(enemy: RuntimeEnemy, now: number): boolean {
  return enemy.kind === "unstable" && now - enemy.spawnedAt >= UNSTABLE_LIFETIME_MS;
}

export function spawnSplitEnemies(enemy: RuntimeEnemy, now: number): RuntimeEnemy[] {
  return resolveUnstableEnemyRemoval(enemy, "destroyed").map((e) =>
    createEnemy(e.kind, e.x, e.y, now, SPLIT_GRACE_MS),
  );
}
