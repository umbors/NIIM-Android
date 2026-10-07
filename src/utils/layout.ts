import * as fabric from "fabric";

/** Fit content without stretching QR modules or clipping rotated objects. */
export function fitObject(canvas: fabric.Canvas, object: fabric.FabricObject, protectNeighbors = true) {
  object.setCoords();
  const margin = Math.min(4, canvas.width / 10, canvas.height / 10);
  let width = canvas.width - 2 * margin;
  let height = canvas.height - 2 * margin;
  if (object instanceof fabric.Textbox) {
    const position = object.getBoundingRect();
    // Preserve neighboring content when edited text becomes taller or wider.
    for (const neighbor of protectNeighbors ? canvas.getObjects() : []) {
      if (neighbor === object) continue;
      const b = neighbor.getBoundingRect();
      if (b.top >= position.top && b.left < position.left + position.width && b.left + b.width > position.left)
        height = Math.min(height, Math.max(4, b.top - position.top - margin));
      if (b.left >= position.left && b.top < position.top + position.height && b.top + b.height > position.top)
        width = Math.min(width, Math.max(4, b.left - position.left - margin));
    }
    object.set({ width: Math.min(object.width, width / Math.max(object.scaleX, 0.01)) });
    object.initDimensions();
    object.setCoords();
    if ("fontAutoSize" in object && object.fontAutoSize) {
      while (object.getBoundingRect().height > height && object.fontSize > 4) {
        object.set({ fontSize: object.fontSize - 1 });
        object.initDimensions();
        object.setCoords();
      }
    }
  }
  let bounds = object.getBoundingRect();
  const scale = Math.min(1, width / Math.max(bounds.width, 1), height / Math.max(bounds.height, 1));
  if (scale < 1) object.set({ scaleX: object.scaleX * scale, scaleY: object.scaleY * scale });
  object.setCoords();
  bounds = object.getBoundingRect();
  object.set({
    left: object.left + Math.max(margin - bounds.left, Math.min(0, canvas.width - margin - bounds.left - bounds.width)),
    top: object.top + Math.max(margin - bounds.top, Math.min(0, canvas.height - margin - bounds.top - bounds.height)),
  });
  object.setCoords();
}

/** Find an unoccupied position; report insufficient space rather than silently covering content. */
export function placeObject(canvas: fabric.Canvas, object: fabric.FabricObject): boolean {
  fitObject(canvas, object, false);
  const others = canvas.getObjects().filter((entry) => entry !== object).map((entry) => entry.getBoundingRect());
  const bounds = object.getBoundingRect();
  for (let y = 4; y <= canvas.height - bounds.height - 2; y += 4) {
    for (let x = 4; x <= canvas.width - bounds.width - 2; x += 4) {
      if (others.some((b) => x < b.left + b.width + 2 && x + bounds.width + 2 > b.left &&
        y < b.top + b.height + 2 && y + bounds.height + 2 > b.top)) continue;
      object.set({ left: object.left + x - bounds.left, top: object.top + y - bounds.top });
      object.setCoords();
      return true;
    }
  }
  return others.length === 0;
}

export function resizeLayout(canvas: fabric.Canvas, width: number, height: number) {
  const scale = Math.min(width / canvas.width, height / canvas.height);
  canvas.discardActiveObject();
  const dx = (width - canvas.width * scale) / 2;
  const dy = (height - canvas.height * scale) / 2;
  for (const object of canvas.getObjects()) {
    object.set({ left: object.left * scale + dx, top: object.top * scale + dy,
      scaleX: object.scaleX * scale, scaleY: object.scaleY * scale });
    object.setCoords();
  }
  canvas.setDimensions({ width, height });
  for (const object of canvas.getObjects()) fitObject(canvas, object, false);
}
