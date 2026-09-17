type Pointer = { pointerId: number; pointerType: string; clientX: number; clientY: number; isPrimary: boolean };

// Handle touch release directly, without toggling again on the synthetic click.
export function createTapActivation(now: () => number = Date.now) {
  let start: { id: number; x: number; y: number; moved: boolean } | null = null;
  let suppressClickUntil = 0;
  return {
    down(event: Pointer) {
      if (!event.isPrimary) { start = null; return; }
      if (event.pointerType !== "touch") { start = null; suppressClickUntil = 0; return; }
      start = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    },
    move(event: Pointer) {
      if (start && start.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) start.moved = true;
    },
    cancel() { start = null; },
    up(event: Pointer) {
      const tap = start;
      start = null;
      if (!tap || tap.id !== event.pointerId || event.pointerType !== "touch" || tap.moved || Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) return false;
      suppressClickUntil = now() + 800;
      return true;
    },
    click(detail: number) { return detail === 0 || now() >= suppressClickUntil; },
  };
}
