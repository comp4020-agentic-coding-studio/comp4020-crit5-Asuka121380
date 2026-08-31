import { PICKUP_SPEED } from "./constants";
import { stepWander } from "./motion";
import type { Bounds } from "./geometry";

export interface Pickup {
  id: number;
  x: number;
  y: number;
  heading: number;
  targetHeading: number;
  speed: number;
  nextTurnAt: number;
  spawnedAt: number;
}

let nextId = 1;

function randomHeading(): number {
  return Math.random() * Math.PI * 2;
}

function randomTurnDelay(): number {
  return 800 + Math.random() * 1200;
}

export function createPickup(x: number, y: number, now: number): Pickup {
  const heading = randomHeading();
  return {
    id: nextId++,
    x,
    y,
    heading,
    targetHeading: heading,
    speed: PICKUP_SPEED,
    nextTurnAt: now + randomTurnDelay(),
    spawnedAt: now,
  };
}

export function stepPickup(pickup: Pickup, dt: number, now: number, bounds: Bounds, margin: number): void {
  stepWander(pickup, dt, now, bounds, margin, randomHeading, randomTurnDelay);
}
