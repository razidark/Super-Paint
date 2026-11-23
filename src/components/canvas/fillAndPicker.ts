/**
 * Parse a hex color string (#RRGGBB) into { r, g, b }.
 */
function parseHex(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

/**
 * Flood-fill from (startX, startY) on the given ImageData with fillColorHex.
 * Uses a stack-based algorithm with a tolerance of 30 per channel.
 * Mutates imageData in-place.
 */
export function floodFill(
  imageData: ImageData,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fillColorHex: string
): void {
  const data = imageData.data;
  const tx = Math.round(startX);
  const ty = Math.round(startY);
  const idx = (ty * width + tx) * 4;
  const targetR = data[idx],
    targetG = data[idx + 1],
    targetB = data[idx + 2],
    targetA = data[idx + 3];

  const { r, g, b } = parseHex(fillColorHex);

  // Don't fill if already the target color
  if (r === targetR && g === targetG && b === targetB && targetA === 255)
    return;

  const match = (i: number) =>
    Math.abs(data[i] - targetR) < 30 &&
    Math.abs(data[i + 1] - targetG) < 30 &&
    Math.abs(data[i + 2] - targetB) < 30 &&
    Math.abs(data[i + 3] - targetA) < 30;

  const fill = (i: number) => {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  };

  const stack = [tx + ty * width];
  const visited = new Uint8Array(width * height);

  while (stack.length) {
    const pos = stack.pop()!;
    if (visited[pos]) continue;
    visited[pos] = 1;
    const pi = pos * 4;
    if (!match(pi)) continue;
    fill(pi);
    const px = pos % width;
    const py = Math.floor(pos / width);
    if (px > 0) stack.push(pos - 1);
    if (px < width - 1) stack.push(pos + 1);
    if (py > 0) stack.push(pos - width);
    if (py < height - 1) stack.push(pos + width);
  }
}

/**
 * Sample the color at (x, y) from the topmost visible layer.
 * Returns the hex color string or null if transparent.
 */
export function sampleColor(
  layerCanvases: Map<string, HTMLCanvasElement>,
  layers: { id: string; visible: boolean }[],
  x: number,
  y: number
): string | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible) continue;
    const canvas = layerCanvases.get(layer.id);
    if (!canvas) continue;
    const ctx = canvas.getContext('2d')!;
    const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    if (pixel[3] > 0) {
      return `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1]
        .toString(16)
        .padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
    }
  }
  return null;
}
