import { createCanvasLineSeries, createKChart } from '@keneth80/k-chart';
import './style.css';

interface SignalPoint {
  x: number;
  value: number;
  volume: number;
  extra: number;
}

const data: SignalPoint[] = Array.from({ length: 96 }, (_, index) => {
  const wave = Math.sin(index / 7) * 12;
  const trend = index * 0.18;
  return {
    x: index,
    value: 42 + wave + trend,
    volume: 30 + Math.cos(index / 9) * 9 + trend * 0.5,
    extra: 52 + Math.sin(index / 4.8) * 7 - trend * 0.16
  };
});

const chart = createKChart<SignalPoint>({
  selector: '#chart',
  data,
  width: 920,
  height: 460,
  margin: { top: 88, right: 36, bottom: 58, left: 64 },
  colors: ['#5db8ff', '#56d08f', '#f3b45b'],
  title: { text: 'Canvas Line Renderer', align: 'left', fontSize: 18 },
  grid: {
    visible: true,
    x: false,
    y: true,
    color: 'rgba(148, 163, 184, 0.22)',
    dasharray: '3 8'
  },
  legend: { visible: true, placement: 'top', selectable: true },
  tooltip: {
    visible: true,
    formatter: ({ data: point, series, y }) => `
      <strong>${series.displayName}</strong>
      <div>x ${point.x}: ${Number(y).toFixed(1)}</div>
    `
  },
  zoom: {
    enabled: true,
    mode: 'both',
    direction: 'x',
    scaleExtent: [1, 16],
    wheelZoom: { enabled: true, devices: 'pc', sensitivity: 0.85 },
    resetOnDoubleClick: true
  },
  axes: [
    { field: 'x', type: 'number', placement: 'bottom', min: 0, max: data.length - 1, title: 'Sample Index' },
    { field: 'value', type: 'number', placement: 'left', min: 0, max: 80, title: 'Signal', domainFields: ['value', 'volume', 'extra'] }
  ],
  series: [
    createCanvasLineSeries({ selector: 'canvas-value', displayName: 'Value', xField: 'x', yField: 'value', color: '#5db8ff', lineWidth: 2.5 }),
    createCanvasLineSeries({ selector: 'canvas-volume', displayName: 'Volume', xField: 'x', yField: 'volume', color: '#56d08f', lineWidth: 2.5 }),
    createCanvasLineSeries({ selector: 'canvas-extra', displayName: 'Extra', xField: 'x', yField: 'extra', color: '#f3b45b', lineWidth: 2.5 })
  ]
});

chart.render();

window.addEventListener('resize', () => {
  const panel = document.querySelector<HTMLElement>('.chart-panel');
  if (!panel) {
    return;
  }

  chart.resize({ width: Math.max(panel.clientWidth - 48, 320), height: 460 });
});
