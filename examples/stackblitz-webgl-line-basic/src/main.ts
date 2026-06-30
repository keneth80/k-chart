import {
  createGuideLineOption,
  createKChart,
  createSpecAreaOption,
  createWebglLineSeries
} from '@keneth80/k-chart';
import './style.css';

interface TracePoint {
  x: number;
  signal0: number;
  signal1: number;
  signal2: number;
}

const length = 12000;
const data: TracePoint[] = Array.from({ length }, (_, index) => ({
  x: index,
  signal0: 48 + Math.sin(index / 22) * 18 + Math.sin(index / 5) * 3,
  signal1: 42 + Math.cos(index / 18) * 14 + Math.sin(index / 11) * 4,
  signal2: 55 + Math.sin(index / 31) * 10 + Math.cos(index / 8) * 5
}));

const chart = createKChart<TracePoint>({
  selector: '#chart',
  data,
  width: 920,
  height: 460,
  margin: { top: 118, right: 36, bottom: 58, left: 64 },
  colors: ['#5db8ff', '#56d08f', '#f3b45b'],
  title: { text: 'WebGL Line Renderer', align: 'left', fontSize: 18 },
  grid: {
    visible: true,
    x: false,
    y: true,
    color: 'rgba(148, 163, 184, 0.2)',
    dasharray: '3 8'
  },
  legend: { visible: true, placement: 'top', selectable: true },
  tooltip: { visible: false },
  zoom: {
    enabled: true,
    mode: 'both',
    direction: 'x',
    scaleExtent: [1, 60],
    wheelZoom: { enabled: true, devices: 'pc', sensitivity: 0.85 },
    resetOnDoubleClick: true
  },
  options: [
    createSpecAreaOption([
      { start: 1800, end: 3400, label: 'STEP 02', color: 'rgba(216, 118, 255, 0.16)' },
      { start: 7600, end: 9200, label: 'STEP 05', color: 'rgba(93, 184, 255, 0.13)' }
    ]),
    createGuideLineOption({
      x: [
        { value: 1200, label: '1' },
        { value: 6200, label: '2' },
        { value: 10400, label: '3' }
      ],
      y: [
        { value: 36, label: 'LOW', color: 'rgba(93, 184, 255, 0.55)' },
        { value: 68, label: 'HIGH', color: 'rgba(255, 107, 138, 0.55)' }
      ]
    })
  ],
  axes: [
    { field: 'x', type: 'number', placement: 'bottom', min: 0, max: length - 1, title: 'Sample Index', tickCount: 6, tickFormat: (value) => `${Math.round(Number(value) / 1000)}k` },
    { field: 'signal0', type: 'number', placement: 'left', min: 20, max: 80, title: 'Signal', domainFields: ['signal0', 'signal1', 'signal2'] }
  ],
  series: [
    createWebglLineSeries({ selector: 'trace-1', displayName: 'Trace 1', xField: 'x', yField: 'signal0', color: '#5db8ff', lineWidth: 1 }),
    createWebglLineSeries({ selector: 'trace-2', displayName: 'Trace 2', xField: 'x', yField: 'signal1', color: '#56d08f', lineWidth: 1 }),
    createWebglLineSeries({ selector: 'trace-3', displayName: 'Trace 3', xField: 'x', yField: 'signal2', color: '#f3b45b', lineWidth: 1 })
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
