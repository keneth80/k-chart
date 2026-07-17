import { createCanvasLineSeries, createKChart } from '@keneth80/k-chart';
import './style.css';

interface RealtimePoint {
  label: string;
  time: Date;
  signalA: number;
  signalB: number;
  signalC: number;
}

const INTERVAL_MS = 250;
const MAX_POINTS = 240;
const INITIAL_POINTS = 120;

const formatTick = (value: Date): string =>
  value.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });

const createPoint = (tick: number, startTime: number): RealtimePoint => {
  const time = new Date(startTime + tick * INTERVAL_MS);
  return {
    label: formatTick(time),
    time,
    signalA: 52 + Math.sin(tick / 8) * 13 + Math.sin(tick / 2.9) * 2.8,
    signalB: 45 + Math.cos(tick / 10) * 8 + Math.sin(tick / 3.4) * 2.6,
    signalC: 58 + Math.sin(tick / 14) * 7 - Math.cos(tick / 6.2) * 3.2
  };
};

const startTime = Date.now() - (INITIAL_POINTS - 1) * INTERVAL_MS;
let tick = INITIAL_POINTS;
let data: RealtimePoint[] = Array.from({ length: INITIAL_POINTS }, (_, index) =>
  createPoint(index, startTime)
);

const chart = createKChart<RealtimePoint>({
  selector: '#chart',
  data,
  width: 920,
  height: 460,
  margin: { top: 92, right: 36, bottom: 58, left: 64 },
  colors: ['#5db8ff', '#56d08f', '#f3b45b'],
  title: { text: 'Realtime time-series line', align: 'left', fontSize: 18 },
  grid: {
    visible: true,
    x: false,
    y: true,
    color: 'rgba(148, 163, 184, 0.22)',
    dasharray: '3 8'
  },
  legend: { visible: true, placement: 'top', selectable: true },
  animation: {
    enabled: true,
    duration: INTERVAL_MS,
    easing: 'linear',
    mode: 'update'
  },
  tooltip: {
    visible: true,
    formatter: ({ data: point, series, y }) => `
      <strong>${series.displayName}</strong>
      <div>${point.label}</div>
      <div>${Number(y).toFixed(2)}</div>
    `
  },
  axes: [
    { field: 'time', type: 'time', placement: 'bottom', title: 'Clock', tickCount: 6, tickFormat: formatTick },
    {
      field: 'signalA',
      type: 'number',
      placement: 'left',
      min: 28,
      max: 76,
      title: 'Signal',
      domainFields: ['signalA', 'signalB', 'signalC']
    }
  ],
  series: [
    createCanvasLineSeries({ selector: 'signal-a', displayName: 'Signal A', xField: 'time', yField: 'signalA', color: '#5db8ff', lineWidth: 2.5 }),
    createCanvasLineSeries({ selector: 'signal-b', displayName: 'Signal B', xField: 'time', yField: 'signalB', color: '#56d08f', lineWidth: 2.5 }),
    createCanvasLineSeries({ selector: 'signal-c', displayName: 'Signal C', xField: 'time', yField: 'signalC', color: '#f3b45b', lineWidth: 2.5 })
  ]
});

chart.render();

const appendPoint = (): void => {
  data.push(createPoint(tick, startTime));
  if (data.length > MAX_POINTS) {
    data.splice(0, data.length - MAX_POINTS);
  }

  chart.updateData(data);
  tick += 1;
};

const timer = window.setInterval(appendPoint, INTERVAL_MS);

window.addEventListener('resize', () => {
  const panel = document.querySelector<HTMLElement>('.chart-panel');
  if (!panel) {
    return;
  }

  chart.resize({ width: Math.max(panel.clientWidth - 48, 320), height: 460 });
});

window.addEventListener('beforeunload', () => {
  window.clearInterval(timer);
  chart.destroy();
});
