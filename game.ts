import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ENEMY_RADIUS,
  PERSISTENT_FIRE_INTERVAL_MS,
  PERSISTENT_MAX_COUNT,
  PERSISTENT_PROJECTILE_SPEED,
  PERSISTENT_SPAWN_INTERVAL_MS,
  PICKUP_BOUNDARY_MARGIN,
  PICKUP_CHECK_INTERVAL_MS,
  PICKUP_HEAL_AMOUNT,
  PICKUP_RADIUS,
  PLAYER_RADIUS,
  PLAY_AREA,
  UNSTABLE_FIRE_INTERVAL_MS,
  UNSTABLE_MAX_COUNT,
  UNSTABLE_PROJECTILE_SPEED,
  UNSTABLE_SPAWN_INTERVAL_MS,
  VICTORY_DURATION_MS,
  COUNTDOWN_MS,
} from "./constants";
import { clamp, insetBounds, circlesOverlap, type Bounds } from "./geometry";
import {
  createEnemy,
  isUnstableExpired,
  spawnSplitEnemies,
  stepEnemy,
  type RuntimeEnemy,
} from "./enemies";
import {
  createPlayer,
  damagePlayer,
  healPlayer,
  isInvulnerable,
  markFired,
  shouldFire,
  updatePlayerMovement,
  type Player,
} from "./player";
import {
  createEnemyProjectile,
  createPlayerProjectile,
  isOutOfBounds,
  stepProjectile,
  type Projectile,
} from "./projectiles";
import { createPickup, stepPickup, type Pickup } from "./pickup";
import { createEffect, isEffectDone, type Effect } from "./effects";

export type GamePhase = "countdown" | "playing" | "won" | "lost";

export interface PointerInput {
  x: number;
  y: number;
}

export interface GameState {
  phase: GamePhase;
  elapsedMs: number;
  endedAt: number | null;
  countdownEndAt: number;
  player: Player;
  enemies: RuntimeEnemy[];
  projectiles: Projectile[];
  pickup: Pickup | null;
  effects: Effect[];
  nextPersistentSpawnAt: number;
  nextUnstableSpawnAt: number;
  nextPickupCheckAt: number;
}

const playerBounds: Bounds = insetBounds(PLAY_AREA, PLAYER_RADIUS);
const enemyBounds: Bounds = insetBounds(PLAY_AREA, ENEMY_RADIUS);
const pickupBounds: Bounds = insetBounds(PLAY_AREA, PICKUP_RADIUS);

function randomSpawnX(radius: number): number {
  return PLAY_AREA.minX + radius + Math.random() * (PLAY_AREA.maxX - PLAY_AREA.minX - 2 * radius);
}

export function createGame(now: number): GameState {
  const startX = ARENA_WIDTH / 2;
  const startY = ARENA_HEIGHT * 0.78;
  return {
    phase: "countdown",
    elapsedMs: 0,
    endedAt: null,
    countdownEndAt: now + COUNTDOWN_MS,
    player: createPlayer(startX, startY, now),
    enemies: [],
    projectiles: [],
    pickup: null,
    effects: [],
    nextPersistentSpawnAt: now + 900,
    nextUnstableSpawnAt: now + 2400,
    nextPickupCheckAt: now + 3000,
  };
}

export function updateGame(state: GameState, dt: number, now: number, pointer: PointerInput): void {
  if (state.phase === "countdown") {
    if (now >= state.countdownEndAt) {
      state.phase = "playing";
      state.nextPersistentSpawnAt = now + 900;
      state.nextUnstableSpawnAt = now + 2400;
      state.nextPickupCheckAt = now + 3000;
    }
    return;
  }

  if (state.phase === "playing") {
    state.elapsedMs += dt * 1000;

    const targetX = clamp(pointer.x, playerBounds.minX, playerBounds.maxX);
    const targetY = clamp(pointer.y, playerBounds.minY, playerBounds.maxY);
    updatePlayerMovement(state.player, targetX, targetY, dt, now);

    if (shouldFire(state.player, now)) {
      markFired(state.player, now);
      const noseY = state.player.y - PLAYER_RADIUS;
      state.projectiles.push(createPlayerProjectile(state.player.x, noseY));
      state.effects.push(createEffect("muzzle", state.player.x, noseY, now));
    }

    stepEnemies(state, dt, now);
    for (const p of state.projectiles) stepProjectile(p, dt);
    stepPickupLogic(state, dt, now);
    resolveCollisions(state, now);
    spawnEnemies(state, now);

    if (state.player.hearts <= 0) {
      state.phase = "lost";
      state.endedAt = now;
    } else if (state.elapsedMs >= VICTORY_DURATION_MS) {
      state.phase = "won";
      state.endedAt = now;
    }
  }

  state.effects = state.effects.filter((effect) => !isEffectDone(effect, now));
}

function stepEnemies(state: GameState, dt: number, now: number): void {
  for (const enemy of state.enemies) {
    stepEnemy(enemy, dt, now, enemyBounds);
  }

  const survivors: RuntimeEnemy[] = [];
  for (const enemy of state.enemies) {
    if (isUnstableExpired(enemy, now)) {
      state.effects.push(createEffect("fade", enemy.x, enemy.y, now));
      continue;
    }
    survivors.push(enemy);
  }
  state.enemies = survivors;

  for (const enemy of state.enemies) {
    if (now < enemy.graceUntil) continue;
    if (now >= enemy.nextFireAt) {
      const speed = enemy.kind === "persistent" ? PERSISTENT_PROJECTILE_SPEED : UNSTABLE_PROJECTILE_SPEED;
      state.projectiles.push(
        createEnemyProjectile(enemy.x, enemy.y, state.player.x, state.player.y, enemy.kind, speed),
      );
      const interval = enemy.kind === "persistent" ? PERSISTENT_FIRE_INTERVAL_MS : UNSTABLE_FIRE_INTERVAL_MS;
      enemy.nextFireAt = now + interval;
    }
  }
}

function stepPickupLogic(state: GameState, dt: number, now: number): void {
  if (state.pickup) {
    stepPickup(state.pickup, dt, now, pickupBounds, PICKUP_BOUNDARY_MARGIN);
    return;
  }
  if (now >= state.nextPickupCheckAt) {
    state.nextPickupCheckAt = now + PICKUP_CHECK_INTERVAL_MS;
    if (state.player.hearts < state.player.maxHearts) {
      state.pickup = createPickup(randomSpawnX(PICKUP_RADIUS), pickupBounds.minY, now);
    }
  }
}

function resolveCollisions(state: GameState, now: number): void {
  const remainingProjectiles: Projectile[] = [];
  const deadEnemyIds = new Set<number>();
  const spawned: RuntimeEnemy[] = [];

  for (const projectile of state.projectiles) {
    if (isOutOfBounds(projectile, ARENA_WIDTH, ARENA_HEIGHT)) continue;

    if (projectile.owner === "player") {
      let hit = false;
      for (const enemy of state.enemies) {
        if (deadEnemyIds.has(enemy.id)) continue;
        if (!circlesOverlap(projectile.x, projectile.y, projectile.radius, enemy.x, enemy.y, ENEMY_RADIUS)) {
          continue;
        }
        deadEnemyIds.add(enemy.id);
        hit = true;
        if (enemy.kind === "unstable") {
          spawned.push(...spawnSplitEnemies(enemy, now));
          state.effects.push(createEffect("split", enemy.x, enemy.y, now));
        } else {
          state.effects.push(createEffect("explosion", enemy.x, enemy.y, now));
        }
        break;
      }
      if (hit) continue;
    } else if (
      !isInvulnerable(state.player, now) &&
      circlesOverlap(projectile.x, projectile.y, projectile.radius, state.player.x, state.player.y, PLAYER_RADIUS)
    ) {
      damagePlayer(state.player, now);
      state.effects.push(createEffect("hit", state.player.x, state.player.y, now));
      continue;
    }

    remainingProjectiles.push(projectile);
  }
  state.projectiles = remainingProjectiles;

  const survivors: RuntimeEnemy[] = [];
  for (const enemy of state.enemies) {
    if (deadEnemyIds.has(enemy.id)) continue;
    const collidesWithPlayer =
      now >= enemy.graceUntil &&
      circlesOverlap(enemy.x, enemy.y, ENEMY_RADIUS, state.player.x, state.player.y, PLAYER_RADIUS);
    if (collidesWithPlayer) {
      if (!isInvulnerable(state.player, now)) {
        damagePlayer(state.player, now);
        state.effects.push(createEffect("hit", state.player.x, state.player.y, now));
      }
      state.effects.push(createEffect("explosion", enemy.x, enemy.y, now));
      continue; // direct collisions remove the enemy without the split rule
    }
    survivors.push(enemy);
  }
  state.enemies = survivors.concat(spawned);

  if (
    state.pickup &&
    circlesOverlap(state.pickup.x, state.pickup.y, PICKUP_RADIUS, state.player.x, state.player.y, PLAYER_RADIUS)
  ) {
    healPlayer(state.player, PICKUP_HEAL_AMOUNT);
    state.effects.push(createEffect("heal", state.player.x, state.player.y, now));
    state.pickup = null;
  }
}

function spawnEnemies(state: GameState, now: number): void {
  let persistentCount = 0;
  let unstableCount = 0;
  for (const enemy of state.enemies) {
    if (enemy.kind === "persistent") persistentCount++;
    else unstableCount++;
  }

  if (now >= state.nextPersistentSpawnAt && persistentCount < PERSISTENT_MAX_COUNT) {
    state.enemies.push(createEnemy("persistent", randomSpawnX(ENEMY_RADIUS), enemyBounds.minY, now));
    state.nextPersistentSpawnAt = now + PERSISTENT_SPAWN_INTERVAL_MS;
  }

  if (now >= state.nextUnstableSpawnAt && unstableCount < UNSTABLE_MAX_COUNT) {
    state.enemies.push(createEnemy("unstable", randomSpawnX(ENEMY_RADIUS), enemyBounds.minY, now));
    state.nextUnstableSpawnAt = now + UNSTABLE_SPAWN_INTERVAL_MS;
  }
}
