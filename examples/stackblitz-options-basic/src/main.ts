import { createCursorLineOption, createGuideLineOption, createKChart, createLineSeries, createSpecAreaOption, createTooltipNoteOption } from '@keneth80/k-chart';
import './style.css';

interface DemoPoint { label: string; x: number; value: number; volume: number; }
const data: DemoPoint[] = [
  { label: 'Jan', x: 1, value: 34, volume: 18 }, { label: 'Feb', x: 2, value: 42, volume: 28 },
  { label: 'Mar', x: 3, value: 38, volume: 22 }, { label: 'Apr', x: 4, value: 56, volume: 34 },
  { label: 'May', x: 5, value: 51, volume: 30 }, { label: 'Jun', x: 6, value: 64, volume: 42 }
];

createKChart<DemoPoint>({
  selector: '#chart', data, width: 920, height: 460,
  margin: { top: 116, right: 36, bottom: 58, left: 64 },
  title: { text: 'KChart Option Layers', align: 'left', fontSize: 18 },
  grid: { visible: true, x: false, y: true, color: 'rgba(148, 163, 184, 0.22)', dasharray: '3 8' },
  legend: { visible: true, placement: 'top', selectable: true },
  tooltip: { visible: true, formatter: ({ data, series, color }) => `<strong style="color:${color}">${series.displayName}</strong><br/>${data.label}<br/>value ${data.value}<br/>volume ${data.volume}` },
  options: [
    createSpecAreaOption([{ start: 2, end: 3.5, label: 'STEP 02', color: 'rgba(216, 118, 255, 0.16)' }, { start: 4.5, end: 5.8, label: 'STEP 05', color: 'rgba(93, 184, 255, 0.13)' }]),
    createGuideLineOption({ x: [{ value: 2, label: 'A' }, { value: 4, label: 'B' }, { value: 6, label: 'C' }], y: [{ value: 36, label: 'LOW', color: 'rgba(93, 184, 255, 0.5)' }, { value: 58, label: 'HIGH', color: 'rgba(255, 107, 138, 0.55)' }] }),
    createCursorLineOption({ valueFormat: (value) => Number(value).toFixed(1), xFormat: (value) => String(value) }),
    createTooltipNoteOption({ maxNotes: 4, pinButtonLabel: 'Pin note', notePlaceholder: 'Write a memo for this point...', onChange: (notes) => console.info('Pinned notes', notes) })
  ],
  axes: [
    { field: 'x', type: 'number', placement: 'bottom', min: 0, max: 7, title: 'Month Index' },
    { field: 'value', type: 'number', placement: 'left', min: 0, max: 72, title: 'Value' }
  ],
  series: [
    createLineSeries({ selector: 'value', displayName: 'Value', xField: 'x', yField: 'value', color: '#5db8ff', strokeWidth: 3, curve: true, dot: true }),
    createLineSeries({ selector: 'volume', displayName: 'Volume', xField: 'x', yField: 'volume', color: '#56d08f', strokeWidth: 3, curve: true, dot: true })
  ]
}).render();
