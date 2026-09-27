import {type FieldFrame, type Probe, type SubcellField, validateFrame} from './model.js';

export const SELECTED_CELL_ID = 'cell:126.5:37.5';

export const PROBES: Probe[] = [
  {id: 'SIM-A', name: 'Synthetic probe A', longitude: 126.66, latitude: 37.69},
  {id: 'SIM-B', name: 'Synthetic probe B', longitude: 126.85, latitude: 37.83},
  {id: 'SIM-C', name: 'Synthetic probe C', longitude: 126.9, latitude: 37.6}
];

/** Neighboring cells sample the same continuous synthetic field. */
function syntheticField(longitude: number, latitude: number, frame: number): number {
  const peakA = [82, 42, 70][frame];
  const peakB = [46, 87, 58][frame];
  const a = Math.exp(-0.5 * (
    ((longitude - 126.66) / 0.064) ** 2 + ((latitude - 37.69) / 0.057) ** 2
  ));
  const b = Math.exp(-0.5 * (
    ((longitude - 126.85) / 0.046) ** 2 + ((latitude - 37.83) / 0.073) ** 2
  ));
  const c = Math.exp(-0.5 * (
    ((longitude - 127.13) / 0.13) ** 2 + ((latitude - 37.3) / 0.095) ** 2
  ));
  const ridge = 15
    * Math.exp(-0.5 * ((latitude - 37.52 - (longitude - 126.5) * 0.45) / 0.04) ** 2)
    * Math.exp(-0.5 * ((longitude - 126.72) / 0.23) ** 2);
  return Math.min(100, Math.max(0, 5 + peakA * a + peakB * b + 60 * c + ridge));
}
export function makeFrame(frame = 0): FieldFrame {
  if (!Number.isInteger(frame) || frame < 0 || frame > 2) {
    throw new RangeError('Frame must be 0, 1, or 2.');
  }
  const cells: SubcellField[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const west = 126 + column * 0.5;
      const south = 37 + row * 0.5;
      const bounds = {west, south, east: west + 0.5, north: south + 0.5};
      const columns = 51;
      const rows = 51;
      const values: (number | null)[] = [];
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < columns; x += 1) {
          const longitude = west + x / (columns - 1) * 0.5;
          const latitude = south + 0.5 - y / (rows - 1) * 0.5;
          const missing = longitude > 126.08
            && longitude < 126.22
            && latitude > 38.24
            && latitude < 38.37;
          values.push(
            missing ? null : Math.round(syntheticField(longitude, latitude, frame) * 100) / 100
          );
        }
      }
      cells.push({
        id: `cell:${west}:${south}`,
        bounds,
        columns,
        rows,
        values
      });
    }
  }
  const result: FieldFrame = {
    time: `2026-01-01T00:${String(frame * 10).padStart(2, '0')}:00Z`,
    metric: {name: 'Synthetic hazard intensity', unit: 'index-0-100', range: [0, 100]},
    provenance: 'synthetic',
    cells
  };
  validateFrame(result);
  return result;
}
