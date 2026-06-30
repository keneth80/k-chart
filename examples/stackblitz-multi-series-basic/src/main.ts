import { createCanvasLineSeries, createCursorLineOption, createKChart, createLineSeries } from '@keneth80/k-chart';
import './style.css';

interface DemoPoint { label: string; x: number; value: number; volume: number; extra: number; }
const data: DemoPoint[] = [
  { label: 'Jan', x: 1, value: 34, volume: 18, extra: 12 }, { label: 'Feb', x: 2, value: 42, volume: 28, extra: 18 },
  { label: 'Mar', x: 3, value: 38, volume: 22, extra: 20 }, { label: 'Apr', x: 4, value: 56, volume: 34, extra: 26 },
  { label: 'May', x: 5, value: 51, volume: 30, extra: 24 }, { label: 'Jun', x: 6, value: 64, volume: 42, extra: 31 }
];

createKChart<DemoPoint>({
  selector: '#chart', data, width: 920, height: 460,
  margin: { top: 92, right: 68, bottom: 58, left: 64 },
  title: { text: 'Hybrid SVG + Canvas Series', align: 'left', fontSize: 18 },
  grid: { visible: true, x: false, y: true, color: 'rgba(148, 163, 184, 0.22)', dasharray: '3 8' },
  legend: { visible: true, placement: 'top', selectable: true },
  tooltip: { visible: true },
  options: [createCursorLineOption({ valueFormat: (value) => Number(value).toFixed(1), xFormat: (value) => String(value) })],
  axes: [
    { field: 'x', type: 'number', placement: 'bottom', min: 0, max: 7, title: 'Month Index' },
    { field: 'value', type: 'number', placement: 'left', min: 0, max: 72, title: 'Value' },
    { field: 'volume', type: 'number', placement: 'right', min: 0, max: 48, title: 'Volume' }
  ],
  series: [
    createLineSeries({ selector: 'svg-value', displayName: 'SVG Value', xField: 'x', yField: 'value', color: '#5db8ff', strokeWidth: 3, curve: true, dot: true }),
    createCanvasLineSeries({ selector: 'canvas-volume', displayName: 'Canvas Volume', xField: 'x', yField: 'volume', color: '#56d08f', lineWidth: 2.5 }),
    createLineSeries({ selector: 'svg-extra', displayName: 'SVG Extra', xField: 'x', yField: 'extra', color: '#f3b45b', strokeWidth: 3, curve: true, dot: true })
  ]
}).render();
