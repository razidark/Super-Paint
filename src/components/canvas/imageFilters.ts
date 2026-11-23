import type { ImageFilters } from '../../types';

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Apply brightness, contrast, grayscale, sepia, and invert filters
 * directly to an ImageData buffer (in-place mutation).
 */
export function applyFiltersToImageData(
  imageData: ImageData,
  f: ImageFilters
): void {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i],
      g = data[i + 1],
      b = data[i + 2];

    // Brightness
    const bright = (f.brightness - 100) * 2.55;
    r = clamp(r + bright);
    g = clamp(g + bright);
    b = clamp(b + bright);

    // Contrast
    const c = (f.contrast / 100) ** 2;
    r = clamp(((r / 255 - 0.5) * c + 0.5) * 255);
    g = clamp(((g / 255 - 0.5) * c + 0.5) * 255);
    b = clamp(((b / 255 - 0.5) * c + 0.5) * 255);

    // Grayscale
    if (f.grayscale > 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const t = f.grayscale / 100;
      r = lerp(r, gray, t);
      g = lerp(g, gray, t);
      b = lerp(b, gray, t);
    }

    // Sepia
    if (f.sepia > 0) {
      const t = f.sepia / 100;
      const sr = clamp(r * 0.393 + g * 0.769 + b * 0.189);
      const sg = clamp(r * 0.349 + g * 0.686 + b * 0.168);
      const sb = clamp(r * 0.272 + g * 0.534 + b * 0.131);
      r = lerp(r, sr, t);
      g = lerp(g, sg, t);
      b = lerp(b, sb, t);
    }

    // Invert
    if (f.invert > 0) {
      const t = f.invert / 100;
      r = lerp(r, 255 - r, t);
      g = lerp(g, 255 - g, t);
      b = lerp(b, 255 - b, t);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}
