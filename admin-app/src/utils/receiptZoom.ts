export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export type ReceiptTransform = Point & { scale: number };

export const MAX_RECEIPT_ZOOM = 6;
export const INITIAL_RECEIPT_TRANSFORM: ReceiptTransform = { scale: 1, x: 0, y: 0 };

export function fitReceiptImage(viewport: Size, image: Size): Size {
  if (viewport.width <= 0 || viewport.height <= 0 || image.width <= 0 || image.height <= 0) return viewport;
  const ratio = Math.min(viewport.width / image.width, viewport.height / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

export function clampReceiptTransform(value: ReceiptTransform, viewport: Size, image: Size): ReceiptTransform {
  const scale = Math.max(1, Math.min(MAX_RECEIPT_ZOOM, value.scale));
  const fitted = fitReceiptImage(viewport, image);
  const maxX = Math.max(0, (fitted.width * scale - viewport.width) / 2);
  const maxY = Math.max(0, (fitted.height * scale - viewport.height) / 2);
  return { scale, x: Math.max(-maxX, Math.min(maxX, value.x)), y: Math.max(-maxY, Math.min(maxY, value.y)) };
}

// Keep the image point under the fingers in place while zooming/moving them.
// Points are measured relative to the centre of the viewport.
export function zoomReceiptAround(value: ReceiptTransform, scale: number, from: Point, to: Point = from): ReceiptTransform {
  const boundedScale = Math.max(1, Math.min(MAX_RECEIPT_ZOOM, scale));
  const ratio = boundedScale / value.scale;
  return { scale: boundedScale, x: to.x - (from.x - value.x) * ratio, y: to.y - (from.y - value.y) * ratio };
}
