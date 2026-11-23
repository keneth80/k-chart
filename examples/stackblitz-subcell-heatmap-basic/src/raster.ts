import {type Bounds, type FieldFrame, sampleFrame, validateBounds} from './model.js';

/** One fixed color scale for every cell, frame, and zoom level. */
export const COLOR_STOPS: readonly [number, readonly [number, number, number]][] = [
  [0, [14, 49, 68]],
  [20, [24, 121, 131]],
  [40, [95, 181, 157]],
  [60, [242, 209, 119]],
  [80, [239, 119, 60]],
  [100, [184, 35, 60]]
];

export function colorFor(
  value: number | null,
  showLowValueBackground = true
): [number, number, number, number] {
  if (value === null) {
    return [0, 0, 0, 0];
  }
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError('Invalid scalar value.');
  }
  let stopIndex = 0;
  while (stopIndex < COLOR_STOPS.length - 2 && value > COLOR_STOPS[stopIndex + 1][0]) {
    stopIndex += 1;
  }
  const [startValue, startColor] = COLOR_STOPS[stopIndex];
  const [endValue, endColor] = COLOR_STOPS[stopIndex + 1];
  const progress = (value - startValue) / (endValue - startValue);
  return [
    Math.round(startColor[0] + (endColor[0] - startColor[0]) * progress),
    Math.round(startColor[1] + (endColor[1] - startColor[1]) * progress),
    Math.round(startColor[2] + (endColor[2] - startColor[2]) * progress),
    showLowValueBackground ? 224 : Math.round(224 * value / 100)
  ];
}

export function mercatorY(latitude: number): number {
  return Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
}

export function inverseMercatorY(value: number): number {
  return (2 * Math.atan(Math.exp(value)) - Math.PI / 2) * 180 / Math.PI;
}

export function geoToUV(
  bounds: Bounds,
  longitude: number,
  latitude: number
): [number, number] {
  return [
    (longitude - bounds.west) / (bounds.east - bounds.west),
    (mercatorY(bounds.north) - mercatorY(latitude))
      / (mercatorY(bounds.north) - mercatorY(bounds.south))
  ];
}

export function uvToGeo(bounds: Bounds, u: number, v: number): [number, number] {
  return [
    bounds.west + (bounds.east - bounds.west) * u,
    inverseMercatorY(
      mercatorY(bounds.north) - v * (mercatorY(bounds.north) - mercatorY(bounds.south))
    )
  ];
}

/** Pixel-center sampling in Web Mercator, not linear latitude screen placement. */
export function rasterPixels(
  frame: FieldFrame,
  bounds: Bounds,
  width: number,
  height: number,
  showLowValueBackground = true
): Uint8ClampedArray {
  validateBounds(bounds);
  if (
    !Number.isInteger(width)
    || !Number.isInteger(height)
    || width < 2
    || height < 2
    || width > 1024
    || height > 1024
  ) {
    throw new RangeError('Raster size must be between 2 and 1024 pixels per side.');
  }
  const bytes = new Uint8ClampedArray(width * height * 4);
  const northY = mercatorY(bounds.north);
  const spanY = northY - mercatorY(bounds.south);
  for (let y = 0; y < height; y += 1) {
    const latitude = inverseMercatorY(northY - (y + 0.5) / height * spanY);
    for (let x = 0; x < width; x += 1) {
      const longitude = bounds.west + (x + 0.5) / width * (bounds.east - bounds.west);
      bytes.set(
        colorFor(sampleFrame(frame, longitude, latitude), showLowValueBackground),
        (y * width + x) * 4
      );
    }
  }
  return bytes;
}

export function paintRaster(
  canvas: HTMLCanvasElement,
  frame: FieldFrame,
  bounds: Bounds,
  showLowValueBackground = true
): void {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D is unavailable.');
  }
  const image = context.createImageData(canvas.width, canvas.height);
  image.data.set(rasterPixels(
    frame,
    bounds,
    canvas.width,
    canvas.height,
    showLowValueBackground
  ));
  context.putImageData(image, 0, 0);
}
