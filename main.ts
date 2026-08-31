import { ARENA_HEIGHT, ARENA_WIDTH } from "./constants";
import { createGame, updateGame, type GameState } from "./game";
import { attachPointerInput, type PointerState } from "./input";
import { draw } from "./render";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("missing #game canvas");

canvas.width = ARENA_WIDTH;
canvas.height = ARENA_HEIGHT;
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2d canvas context unavailable");
ctx.imageSmoothingEnabled = false;

function resize(): void {
  const scale = Math.min(window.innerWidth / ARENA_WIDTH, window.innerHeight / ARENA_HEIGHT);
  canvas!.style.width = `${ARENA_WIDTH * scale}px`;
  canvas!.style.height = `${ARENA_HEIGHT * scale}px`;
}
window.addEventListener("resize", resize);
resize();

const pointer: PointerState = {
  x: ARENA_WIDTH / 2,
  y: ARENA_HEIGHT * 0.78,
  restartRequested: false,
};
attachPointerInput(canvas, pointer);

let state: GameState = createGame(performance.now());
let last = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (pointer.restartRequested) {
    pointer.restartRequested = false;
    if (state.phase !== "playing") {
      state = createGame(now);
    }
  }

  updateGame(state, dt, now, pointer);
  draw(ctx!, state, now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
