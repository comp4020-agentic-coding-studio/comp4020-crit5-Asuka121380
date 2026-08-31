// Provisional balance values. All of these are expected to move once the
// finished game gets played — see PROCESS.md for the one change made from an
// actual playtest rather than from reading this file.

export const ARENA_WIDTH = 180;
export const ARENA_HEIGHT = 320;
export const HUD_HEIGHT = 22;

export const PLAY_AREA = {
  minX: 6,
  maxX: ARENA_WIDTH - 6,
  minY: HUD_HEIGHT,
  maxY: ARENA_HEIGHT - 6,
};

export const PLAYER_RADIUS = 10;
export const PLAYER_FOLLOW_RATE = 10; // exponential follow rate, per second
export const PLAYER_STILL_SPEED_THRESHOLD = 4; // px/s below which the ship counts as still
export const PLAYER_CHARGE_MS = 263; // 75% of the original 350ms, per the THUNDER WING revision brief
export const PLAYER_FIRE_INTERVAL_MS = 260;
export const PLAYER_PROJECTILE_SPEED = 240; // px/s, straight up
export const PLAYER_MAX_HEARTS = 5;
export const PLAYER_INVULN_MS = 900;

export const ENEMY_RADIUS = 6;
export const ENEMY_BOUNDARY_MARGIN = 16;
export const ENEMY_TURN_MIN_MS = 900;
export const ENEMY_TURN_MAX_MS = 2200;

export const PERSISTENT_SPEED = 26;
export const PERSISTENT_FIRE_INTERVAL_MS = 1800;
export const PERSISTENT_PROJECTILE_SPEED = 130;
export const PERSISTENT_SPAWN_INTERVAL_MS = 2600;
export const PERSISTENT_MAX_COUNT = 4; // was 6 - see PROCESS.md for the playtest that caused this

export const UNSTABLE_SPEED = 40;
export const UNSTABLE_FIRE_INTERVAL_MS = 3200;
export const UNSTABLE_PROJECTILE_SPEED = 110;
export const UNSTABLE_LIFETIME_MS = 6000;
export const UNSTABLE_SPAWN_INTERVAL_MS = 4200;
export const UNSTABLE_MAX_COUNT = 2;

export const SPLIT_OFFSET = 14; // px either side of the destroyed unstable enemy
export const SPLIT_GRACE_MS = 550; // no firing, no collision damage while this new

export const PICKUP_RADIUS = 7;
export const PICKUP_SPEED = 30;
export const PICKUP_BOUNDARY_MARGIN = 10;
export const PICKUP_HEAL_AMOUNT = 2;
export const PICKUP_CHECK_INTERVAL_MS = 3000;

export const PROJECTILE_RADIUS_PLAYER = 3;
export const PROJECTILE_RADIUS_ENEMY = 3;

export const VICTORY_DURATION_MS = 60000; // survive this long to win
export const COUNTDOWN_MS = 3000; // frozen opening countdown before play begins
