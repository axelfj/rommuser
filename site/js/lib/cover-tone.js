// The colour along the bottom edge of a cover, kept dark enough for white logos on top. The listen dialog paints
// the band under the cover with it, so the cover runs into its own colour instead of a fixed black.
const MAX_LIGHTNESS = 0.14;

function averageBottom(image) {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 1;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const w = image.naturalWidth,
    h = image.naturalHeight;
  g.drawImage(image, 0, h * 0.9, w, h * 0.1, 0, 0, 8, 1);
  const data = g.getImageData(0, 0, 8, 1).data;
  let r = 0,
    gr = 0,
    b = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    gr += data[i + 1];
    b += data[i + 2];
  }
  return [r / 8, gr / 8, b / 8];
}

// Same hue and saturation, lightness capped.
function darken([r, g, b]) {
  const max = Math.max(r, g, b) / 255,
    min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (l <= MAX_LIGHTNESS || max === 0) return [r, g, b].map(Math.round);
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  const target = MAX_LIGHTNESS,
    c = (1 - Math.abs(2 * target - 1)) * s,
    m = target - c / 2;
  // Each channel keeps its place between the darkest and brightest channel.
  return [r, g, b].map((v) => Math.round((m + (max === min ? 0 : ((v / 255 - min) / (max - min)) * c)) * 255));
}

// Resolves to "rgb(r g b)", or null when the image cannot be read.
export function coverTone(image) {
  const read = () => {
    try {
      return `rgb(${darken(averageBottom(image)).join(' ')})`;
    } catch {
      return null;
    }
  };
  if (image.complete && image.naturalWidth) return Promise.resolve(read());
  return new Promise((resolve) => {
    image.addEventListener('load', () => resolve(read()), { once: true });
    image.addEventListener('error', () => resolve(null), { once: true });
  });
}
