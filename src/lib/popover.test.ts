import { describe, it, expect } from 'vitest';
import { computePosition, type Rect } from './popover';

const vp = { width: 1000, height: 800 };
const panel = { width: 220, height: 160 };

describe('computePosition', () => {
  it('bottom-start pins the panel under the anchor left edge', () => {
    const anchor: Rect = { x: 100, y: 100, width: 40, height: 28 };
    const p = computePosition(anchor, panel, vp, 'bottom-start');
    expect(p.left).toBe(100);
    expect(p.top).toBe(100 + 28 + 6);
    expect(p.placement).toBe('bottom-start');
    expect(p.origin).toBe('left top');
  });

  it('bottom-end aligns the panel right edge to the anchor right edge', () => {
    const anchor: Rect = { x: 900, y: 50, width: 40, height: 28 };
    const p = computePosition(anchor, panel, vp, 'bottom-end');
    // 940 - 220 = 720, still inside viewport so no clamp
    expect(p.left).toBe(720);
    expect(p.origin).toBe('right top');
  });

  it('clamps to the window when the anchor sits in the corner', () => {
    const anchor: Rect = { x: 990, y: 10, width: 8, height: 8 };
    const p = computePosition(anchor, panel, vp, 'bottom-end');
    expect(p.left).toBe(vp.width - panel.width - 8); // 772
    expect(p.left + panel.width).toBeLessThanOrEqual(vp.width - 8);
  });

  it('never places the panel past the left edge', () => {
    const anchor: Rect = { x: 2, y: 300, width: 10, height: 10 };
    const p = computePosition(anchor, panel, vp, 'bottom-end');
    expect(p.left).toBe(8);
  });

  it('flips above the anchor when there is no room below', () => {
    const anchor: Rect = { x: 100, y: 760, width: 40, height: 28 };
    const p = computePosition(anchor, panel, vp, 'bottom-start');
    expect(p.placement).toBe('top-start');
    expect(p.top).toBe(760 - 6 - panel.height);
    expect(p.origin).toBe('left bottom');
  });

  it('stays below when neither side has full room (prefers requested side)', () => {
    const tall = { width: 220, height: 700 };
    const anchor: Rect = { x: 100, y: 300, width: 40, height: 28 };
    const p = computePosition(anchor, tall, vp, 'bottom-start');
    expect(p.placement).toBe('bottom-start');
    expect(p.top).toBe(92); // clamped to viewport.height - panel.height - MARGIN
  });

  it('centre placement keeps the panel centred on the anchor', () => {
    const anchor: Rect = { x: 400, y: 100, width: 60, height: 28 };
    const p = computePosition(anchor, panel, vp, 'bottom');
    expect(p.left).toBe(400 + 30 - 110);
    expect(p.placement).toBe('bottom');
  });
});
