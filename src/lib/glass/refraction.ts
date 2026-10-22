/** SDF and Snell edge model adapted from the supplied Liquid Glass Studio
 * (Charles Yin, MIT 2024; /licenses/liquid-glass-studio.txt).
 * This creates geometry only. The browser supplies live backdrop pixels. */
export const REFRACTION_MAX_PIXELS = 131_072;
export const REFRACTION_MAX_SIDE = 512;
export const REFRACTION_SCALE = 64;
export interface RefractionField { href: string; width: number; height: number; }

export function supportsStudioRefraction(): boolean {
  // URL backdrop filtering is positively exercised on Chromium. Other engines
  // keep ordinary native blur until their actual output is verified too.
  return /(?:Chrom(?:e|ium)|Edg)\/\d/.test(navigator.userAgent)
    && typeof CSS !== 'undefined' && CSS.supports('backdrop-filter', 'url("#studio-refraction")');
}

export function createRefractionField(width: number, height: number, radius: number): RefractionField | null {
  if (![width, height, radius].every(Number.isFinite) || width <= 1 || height <= 1) return null;
  const scale = Math.min(1, REFRACTION_MAX_SIDE / Math.max(width, height), Math.sqrt(REFRACTION_MAX_PIXELS / (width * height)));
  const mapWidth = Math.max(1, Math.floor(width * scale)), mapHeight = Math.max(1, Math.floor(height * scale));
  const canvas = document.createElement('canvas'); canvas.width = mapWidth; canvas.height = mapHeight;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const pixels = context.createImageData(mapWidth, mapHeight);
  const corner = Math.max(1, Math.min(radius, width / 2, height / 2));
  const sdf = (x: number, y: number) => {
    const px = Math.abs(x - width / 2), py = Math.abs(y - height / 2);
    const dx = px - width / 2, dy = py - height / 2;
    if (dx > -corner && dy > -corner) {
      return (Math.abs(px - width / 2 + corner) ** 2.6 + Math.abs(py - height / 2 + corner) ** 2.6) ** (1 / 2.6) - corner;
    }
    return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  };
  for (let y = 0; y < mapHeight; y++) for (let x = 0; x < mapWidth; x++) {
    const px = (x + 0.5) * width / mapWidth, py = (y + 0.5) * height / mapHeight;
    const distance = sdf(px, py), depth = Math.max(-distance, 0);
    let displacement = 0, nx = 0, ny = 0;
    if (distance <= 0 && depth < 22) {
      nx = sdf(px + 0.6, py) - sdf(px - 0.6, py);
      ny = sdf(px, py + 0.6) - sdf(px, py - 0.6);
      const length = Math.hypot(nx, ny) || 1; nx /= length; ny /= length;
      const ratio = Math.max(0, Math.min(1, 1 - depth / 22));
      const incidence = Math.asin(ratio * ratio), transmitted = Math.asin(Math.sin(incidence) / 1.45);
      displacement = Math.min(18, -Math.tan(transmitted - incidence) * 13);
    }
    const index = (y * mapWidth + x) * 4;
    // The SVG channel transfer maps 128 exactly to .5, leaving the lens center
    // undisplaced rather than shifting it by an 8-bit quantization error.
    pixels.data[index] = Math.round(128 + nx * displacement / REFRACTION_SCALE * 256);
    pixels.data[index + 1] = Math.round(128 + ny * displacement / REFRACTION_SCALE * 256);
    // Preserve the sharp optical rim, then soften real page text in the center.
    // This channel is geometry only; it never contains backdrop pixels.
    pixels.data[index + 2] = Math.round(Math.max(0, Math.min(1, (depth - 22) / 14)) * 255);
    pixels.data[index + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  return { href: canvas.toDataURL('image/png'), width: mapWidth, height: mapHeight };
}
