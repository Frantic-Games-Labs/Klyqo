export interface InputState {
  keys: Set<string>;
  // touch/joystick move vector -1..1 (x = strafe, y = forward)
  joy: { x: number; y: number };
  // accumulated look deltas (pixels) from mouse/touch
  lookDX: number;
  lookDY: number;
  pointerLocked: boolean;
}

export const input: InputState = {
  keys: new Set(),
  joy: { x: 0, y: 0 },
  lookDX: 0,
  lookDY: 0,
  pointerLocked: false,
};

export const isTouchDevice = () =>
  typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && window.matchMedia('(pointer: coarse)').matches;

let bound = false;
export function bindGlobalInput(onKey: (code: string) => void) {
  if (bound) return () => {};
  bound = true;
  const kd = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!input.keys.has(e.code)) onKey(e.code);
    input.keys.add(e.code);
  };
  const ku = (e: KeyboardEvent) => input.keys.delete(e.code);
  const blur = () => input.keys.clear();
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);
  window.addEventListener('blur', blur);
  return () => {
    bound = false;
    window.removeEventListener('keydown', kd);
    window.removeEventListener('keyup', ku);
    window.removeEventListener('blur', blur);
  };
}
