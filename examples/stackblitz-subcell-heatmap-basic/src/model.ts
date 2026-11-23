/** Geographic scalar samples, not a point-density heatmap. Coordinates use [lon, lat]. */
export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}
export interface SubcellField {
  id: string;
  bounds: Bounds;
  /** Node samples; row 0 is north, column 0 is west. Both boundaries are included. */
  columns: number;
  rows: number;
  /** Row-major. null is unobserved; numeric zero is a valid sample. */
  values: readonly (number | null)[];
}

export interface FieldFrame {
  time: string;
  metric: {
    name: string;
    unit: 'index-0-100';
    range: readonly [0, 100];
  };
  provenance: 'synthetic' | 'observed' | 'modelled';
  cells: readonly SubcellField[];
}

export interface Probe {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
}

export const CELL_STEP = 0.5;
export const MERCATOR_LAT_LIMIT = 85;
const EPSILON = 1e-9;

export function validateBounds(bounds: Bounds): void {
  if (
    ![bounds.west, bounds.east, bounds.south, bounds.north].every(Number.isFinite)
    || bounds.west < -180
    || bounds.east > 180
    || bounds.west >= bounds.east
    || bounds.south < -MERCATOR_LAT_LIMIT
    || bounds.north > MERCATOR_LAT_LIMIT
    || bounds.south >= bounds.north
  ) {
    throw new RangeError(
      'Invalid non-wrapping bounds. Split antimeridian data and keep latitude within [-85, 85].'
    );
  }
}

export function validateCell(cell: SubcellField): void {
  validateBounds(cell.bounds);
  const {bounds} = cell;
  if (
    !cell.id
    || Math.abs(bounds.east - bounds.west - CELL_STEP) > EPSILON
    || Math.abs(bounds.north - bounds.south - CELL_STEP) > EPSILON
    || Math.abs(bounds.west / CELL_STEP - Math.round(bounds.west / CELL_STEP)) > EPSILON
    || Math.abs(bounds.south / CELL_STEP - Math.round(bounds.south / CELL_STEP)) > EPSILON
  ) {
    throw new RangeError('Each cell needs an id and aligned 0.5-degree bounds.');
  }
  if (
    !Number.isInteger(cell.rows)
    || !Number.isInteger(cell.columns)
    || cell.rows < 2
    || cell.columns < 2
    || cell.rows > 1024
    || cell.columns > 1024
    || cell.values.length !== cell.rows * cell.columns
  ) {
    throw new RangeError('Invalid sample matrix.');
  }
  for (const value of cell.values) {
    if (!(value === null || (Number.isFinite(value) && value >= 0 && value <= 100))) {
      throw new RangeError('Values must be finite numbers in [0, 100] or null.');
    }
  }
}

export function validateFrame(frame: FieldFrame): void {
  if (
    !Number.isFinite(Date.parse(frame.time))
    || frame.metric.unit !== 'index-0-100'
    || frame.metric.range[0] !== 0
    || frame.metric.range[1] !== 100
    || !['synthetic', 'observed', 'modelled'].includes(frame.provenance)
  ) {
    throw new TypeError('Invalid frame metadata.');
  }
  if (frame.cells.length < 1 || frame.cells.length > 100) {
    throw new RangeError('This example supports 1 to 100 loaded cells.');
  }
  const ids = new Set<string>();
  const positions = new Set<string>();
  for (const cell of frame.cells) {
    validateCell(cell);
    const position = `${cell.bounds.west},${cell.bounds.south}`;
    if (ids.has(cell.id) || positions.has(position)) {
      throw new Error('Duplicate cell id or bounds.');
    }
    ids.add(cell.id);
    positions.add(position);
  }
}

export function unionBounds(cells: readonly SubcellField[]): Bounds {
  if (!cells.length) {
    throw new RangeError('Cells are required.');
  }
  return {
    west: Math.min(...cells.map((cell) => cell.bounds.west)),
    south: Math.min(...cells.map((cell) => cell.bounds.south)),
    east: Math.max(...cells.map((cell) => cell.bounds.east)),
    north: Math.max(...cells.map((cell) => cell.bounds.north))
  };
}

export function contains(bounds: Bounds, longitude: number, latitude: number): boolean {
  return Number.isFinite(longitude)
    && Number.isFinite(latitude)
    && longitude >= bounds.west
    && longitude <= bounds.east
    && latitude >= bounds.south
    && latitude <= bounds.north;
}

/** Bilinear interpolation of node values. Missing neighbors remain missing. */
export function sampleCell(
  cell: SubcellField,
  longitude: number,
  latitude: number
): number | null {
  if (!contains(cell.bounds, longitude, latitude)) {
    return null;
  }
  const {bounds} = cell;
  const x = (longitude - bounds.west) / (bounds.east - bounds.west) * (cell.columns - 1);
  const y = (bounds.north - latitude) / (bounds.north - bounds.south) * (cell.rows - 1);
  const x0 = Math.min(cell.columns - 2, Math.floor(x));
  const y0 = Math.min(cell.rows - 2, Math.floor(y));
  const tx = x - x0;
  const ty = y - y0;
  const weights = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty];
  const values = [
    cell.values[y0 * cell.columns + x0],
    cell.values[y0 * cell.columns + x0 + 1],
    cell.values[(y0 + 1) * cell.columns + x0],
    cell.values[(y0 + 1) * cell.columns + x0 + 1]
  ];
  let result = 0;
  for (let index = 0; index < weights.length; index += 1) {
    if (weights[index] < 1e-10) {
      continue;
    }
    const value = values[index];
    if (value === null) {
      return null;
    }
    result += value * weights[index];
  }
  return result;
}

export function sampleFrame(
  frame: FieldFrame,
  longitude: number,
  latitude: number
): number | null {
  const cell = frame.cells.find((candidate) => contains(candidate.bounds, longitude, latitude));
  return cell ? sampleCell(cell, longitude, latitude) : null;
}

export function frameStats(cell: SubcellField): {
  min: number | null;
  max: number | null;
  sampleMean: number | null;
  count: number;
} {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  for (const value of cell.values) {
    if (value !== null) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      sum += value;
      count += 1;
    }
  }
  return {
    min: count ? min : null,
    max: count ? max : null,
    sampleMean: count ? sum / count : null,
    count
  };
}

export function mixFrames(a: FieldFrame, b: FieldFrame, progress: number): FieldFrame {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1 || a.cells.length !== b.cells.length) {
    throw new RangeError('Invalid frame blend.');
  }
  const cells = a.cells.map((cell, index) => {
    const next = b.cells[index];
    if (
      cell.id !== next.id
      || cell.rows !== next.rows
      || cell.columns !== next.columns
      || JSON.stringify(cell.bounds) !== JSON.stringify(next.bounds)
    ) {
      throw new Error('Frame blending requires matching geometry and cell order.');
    }
    return {
      ...cell,
      values: cell.values.map((value, valueIndex) => {
        const nextValue = next.values[valueIndex];
        if (progress === 0) return value;
        if (progress === 1) return nextValue;
        return value === null || nextValue === null
          ? null
          : value + (nextValue - value) * progress;
      })
    };
  });
  return {...b, cells};
}

/** Spherical approximation for the explanatory UI, not geodesic analysis. */
export function approximateCellKm(bounds: Bounds): {widthKm: number; heightKm: number} {
  const kilometersPerDegree = Math.PI * 6371 / 180;
  return {
    widthKm: (bounds.east - bounds.west) * kilometersPerDegree
      * Math.cos((bounds.south + bounds.north) / 2 * Math.PI / 180),
    heightKm: (bounds.north - bounds.south) * kilometersPerDegree
  };
}
