import { ARENA_HEIGHT, ARENA_WIDTH } from "./constants";
import { initAudio } from "./audio";

export interface PointerState {
  x: number;
  y: number;
  restartRequested: boolean;
}

// Touch offset so the ship sits above the finger instead of hiding under it.
const TOUCH_TARGET_OFFSET_Y = -34;

export function attachPointerInput(canvas: HTMLCanvasElement, pointer: PointerState): void {
  function mapToArena(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    return { x: relX * ARENA_WIDTH, y: relY * ARENA_HEIGHT };
  }

  function handleMove(event: PointerEvent): void {
    const { x, y } = mapToArena(event.clientX, event.clientY);
    const offset = event.pointerType === "touch" ? TOUCH_TARGET_OFFSET_Y : 0;
    pointer.x = x;
    pointer.y = y + offset;
  }

  canvas.addEventListener("pointerdown", (event) => {
    initAudio();
    event.preventDefault();
    pointer.restartRequested = true;
    handleMove(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    event.preventDefault();
    handleMove(event);
  });
  canvas.addEventListener("pointerup", (event) => event.preventDefault());
  canvas.addEventListener("pointercancel", (event) => event.preventDefault());
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
}
