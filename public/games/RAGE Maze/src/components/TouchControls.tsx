import { useEffect, useRef, useState } from 'react';
import { input } from '../game/input';

const RADIUS = 56;

export function TouchControls() {
  const [joy, setJoy] = useState<{ bx: number; by: number; kx: number; ky: number } | null>(null);
  const joyId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lastLook = useRef({ x: 0, y: 0 });
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault();
      const isLeft = e.clientX < window.innerWidth * 0.45;
      if (isLeft && joyId.current === null) {
        joyId.current = e.pointerId;
        setJoy({ bx: e.clientX, by: e.clientY, kx: e.clientX, ky: e.clientY });
        input.joy.x = 0; input.joy.y = 0;
      } else if (!isLeft && lookId.current === null) {
        lookId.current = e.pointerId;
        lastLook.current = { x: e.clientX, y: e.clientY };
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId === joyId.current) {
        setJoy((j) => {
          if (!j) return j;
          let dx = e.clientX - j.bx, dy = e.clientY - j.by;
          const d = Math.hypot(dx, dy);
          if (d > RADIUS) { dx = (dx / d) * RADIUS; dy = (dy / d) * RADIUS; }
          input.joy.x = dx / RADIUS;
          input.joy.y = -dy / RADIUS;
          return { ...j, kx: j.bx + dx, ky: j.by + dy };
        });
      } else if (e.pointerId === lookId.current) {
        input.lookDX += e.clientX - lastLook.current.x;
        input.lookDY += e.clientY - lastLook.current.y;
        lastLook.current = { x: e.clientX, y: e.clientY };
      }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === joyId.current) {
        joyId.current = null;
        input.joy.x = 0; input.joy.y = 0;
        setJoy(null);
      } else if (e.pointerId === lookId.current) {
        lookId.current = null;
      }
    };
    el.addEventListener('pointerdown', down, { passive: false });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      input.joy.x = 0; input.joy.y = 0;
    };
  }, []);

  return (
    <div ref={zoneRef} className="absolute inset-0 z-10" style={{ touchAction: 'none' }}>
      {!joy && (
        <div className="absolute left-6 bottom-8 w-28 h-28 rounded-full joy-base opacity-50 flex items-center justify-center text-xs text-white/60 font-semibold">
          MOVE
        </div>
      )}
      <div className="absolute right-6 bottom-8 text-xs text-white/40 font-semibold pointer-events-none">DRAG TO LOOK</div>
      {joy && (
        <>
          <div className="absolute rounded-full joy-base" style={{ left: joy.bx - RADIUS, top: joy.by - RADIUS, width: RADIUS * 2, height: RADIUS * 2 }} />
          <div className="absolute rounded-full joy-knob" style={{ left: joy.kx - 24, top: joy.ky - 24, width: 48, height: 48 }} />
        </>
      )}
    </div>
  );
}
