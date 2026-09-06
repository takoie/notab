/**
 * Pure positioning for the shared Popover primitive.
 *
 * Given the anchor rect, the panel's measured size, the viewport and a desired
 * placement, work out where to pin the panel so it grows out of the anchor and
 * never clips the program window.
 */

export type Placement =
  | 'bottom-start'
  | 'bottom-end'
  | 'bottom'
  | 'top-start'
  | 'top-end'
  | 'top';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Positioned {
  /** fixed-position coords, already clamped into the viewport */
  left: number;
  top: number;
  /** transform-origin for the grow-out animation, e.g. "left top" */
  origin: string;
  /** the side the panel ended up on after any flip */
  placement: Placement;
}

/** gap between anchor and panel, and the min inset from the window edge */
const OFFSET = 6;
const MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function isTop(p: Placement): boolean {
  return p.startsWith('top');
}

function isEnd(p: Placement): boolean {
  return p.endsWith('end');
}

function isCenter(p: Placement): boolean {
  return p === 'top' || p === 'bottom';
}

export function computePosition(
  anchor: Rect,
  panel: Size,
  viewport: Viewport,
  placement: Placement = 'bottom-start',
): Positioned {
  let vertical: 'top' | 'bottom' = isTop(placement) ? 'top' : 'bottom';

  // flip vertically if the preferred side has no room but the other does
  const roomBelow = viewport.height - (anchor.y + anchor.height);
  const roomAbove = anchor.y;
  const need = panel.height + OFFSET + MARGIN;
  if (vertical === 'bottom' && roomBelow < need && roomAbove >= need) vertical = 'top';
  else if (vertical === 'top' && roomAbove < need && roomBelow >= need) vertical = 'bottom';

  const top =
    vertical === 'bottom'
      ? anchor.y + anchor.height + OFFSET
      : anchor.y - OFFSET - panel.height;

  // horizontal anchoring, then clamp
  let left: number;
  if (isCenter(placement)) {
    left = anchor.x + anchor.width / 2 - panel.width / 2;
  } else if (isEnd(placement)) {
    left = anchor.x + anchor.width - panel.width;
  } else {
    left = anchor.x;
  }

  const clampedLeft = clamp(left, MARGIN, viewport.width - panel.width - MARGIN);
  const clampedTop = clamp(top, MARGIN, viewport.height - panel.height - MARGIN);

  // origin points back at the anchor so the panel appears to sprout from it
  const originY = vertical === 'bottom' ? 'top' : 'bottom';
  const anchorCenterX = anchor.x + anchor.width / 2;
  const originX =
    anchorCenterX <= clampedLeft + panel.width * 0.33
      ? 'left'
      : anchorCenterX >= clampedLeft + panel.width * 0.67
        ? 'right'
        : 'center';

  const finalPlacement = (
    isCenter(placement) ? vertical : `${vertical}-${isEnd(placement) ? 'end' : 'start'}`
  ) as Placement;

  return {
    left: Math.round(clampedLeft),
    top: Math.round(clampedTop),
    origin: `${originX} ${originY}`,
    placement: finalPlacement,
  };
}
