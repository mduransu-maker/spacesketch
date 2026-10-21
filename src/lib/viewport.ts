export const PLAN_PADDING = 700;
export interface Viewport {
  zoom: number;
  x: number;
  y: number;
}
export const INITIAL_VIEW: Viewport = { zoom: 1, x: 0, y: 0 };
export function clampView(
  length: number,
  width: number,
  view: Viewport,
): Viewport {
  const zoom = Math.min(2.5, Math.max(1, view.zoom));
  const limitX = ((length + PLAN_PADDING * 2) * (1 - 1 / zoom)) / 2;
  const limitY = ((width + PLAN_PADDING * 2) * (1 - 1 / zoom)) / 2;
  return {
    zoom,
    x: Math.max(-limitX, Math.min(limitX, view.x)),
    y: Math.max(-limitY, Math.min(limitY, view.y)),
  };
}
export function planViewBox(
  length: number,
  width: number,
  view: Viewport = INITIAL_VIEW,
): string {
  const v = clampView(length, width, view);
  const w = (length + PLAN_PADDING * 2) / v.zoom;
  const h = (width + PLAN_PADDING * 2) / v.zoom;
  return `${length / 2 + v.x - w / 2} ${width / 2 + v.y - h / 2} ${w} ${h}`;
}
