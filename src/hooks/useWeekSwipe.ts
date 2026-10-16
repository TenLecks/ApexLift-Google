import { useRef, useState } from 'react';
import type React from 'react';
import { swipeStep } from '../utils/swipe';

const SLIDE_MS = 180;

/**
 * Horizontal swipe between weeks: the content follows the finger, then slides out and the
 * next week slides in. Vertical scrolling is left to the browser (touch-action: pan-y).
 */
export function useWeekSwipe(opts: { canPrev: boolean; canNext: boolean; onStep(step: -1 | 1): void }) {
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(false);
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const widthRef = useRef(375);

  const reset = () => {
    setAnimate(true);
    setOffset(0);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    dragging.current = false;
    suppressClick.current = false;
    widthRef.current = e.currentTarget.clientWidth || 375;
    setAnimate(false);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!dragging.current) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
      dragging.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already released: the drag still works without capture */
      }
    }
    const blocked = (dx > 0 && !opts.canPrev) || (dx < 0 && !opts.canNext);
    setOffset(blocked ? dx * 0.25 : dx);
  };

  const finish = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || !dragging.current) return;
    // Swallow only the click that ends this drag, never a later tap.
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 300);
    const width = widthRef.current;
    const step = swipeStep({ dx: e.clientX - s.x, dy: e.clientY - s.y, ms: performance.now() - s.t, width });
    if (step === 0) return reset();
    const allowed = (step === 1 && opts.canNext) || (step === -1 && opts.canPrev);
    if (!allowed) return reset();
    setAnimate(true);
    setOffset(-step * width);
    setTimeout(() => {
      opts.onStep(step);
      setAnimate(false);
      setOffset(step * width);
      requestAnimationFrame(() => requestAnimationFrame(reset));
    }, SLIDE_MS);
  };

  return {
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      // A drag must not also tap whatever button it started on.
      onClickCapture: (e: React.MouseEvent) => {
        if (suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
          suppressClick.current = false;
        }
      },
      style: { touchAction: 'pan-y' } as React.CSSProperties,
    },
    slideStyle: {
      transform: `translateX(${offset}px)`,
      transition: animate ? `transform ${SLIDE_MS}ms ease-out` : 'none',
    } as React.CSSProperties,
  };
}
