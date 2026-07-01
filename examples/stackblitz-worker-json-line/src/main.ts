import {
  createGuideLineOption,
  createKChart,
  createSpecAreaOption,
  createWebglLineSeries
} from '@keneth80/k-chart';
import './style.css';

interface JsonTracePoint {
  x: number;
  signal: number;
  baseline: number;
  upper: number;
}

const dataStatus = document.querySelector<HTMLElement>('#data-status');
const offscreenStatus = document.querySelector<HTMLElement>('#offscreen-status');
const workerStatus = document.querySelector<HTMLElement>('#worker-status');

let workerCreateCount = 0;

const setText = (target: HTMLElement | null, text: string): void => {
  if (target) {
    target.textContent = text;
  }
};

const supportsOffscreenCanvas = (): boolean => {
  const canvas = document.createElement('canvas');
  return typeof canvas.transferControlToOffscreen === 'function';
};

const createKChartRenderWorker = (): Worker => {
  workerCreateCount += 1;
  setText(workerStatus, `called ${workerCreateCount} time${workerCreateCount === 1 ? '' : 's'}`);
  console.info(`[KChart StackBlitz] render worker created #${workerCreateCount}`);

  return new Worker(
    new URL('./kchart-render.worker.ts', import.meta.url),
    { type: 'module' }
  );
};

const loadData = async (): Promise<JsonTracePoint[]> => {
  const response = await fetch('/data/large-line.json');
  if (!response.ok) {
    throw new Error(`Failed to load JSON data: ${response.status}`);
  }
  return response.json() as Promise<JsonTracePoint[]>;
};

const renderChart = (data: JsonTracePoint[]): void => {
  const chart = createKChart<JsonTracePoint>({
    selector: '#chart',
    data,
    width: 920,
    height: 460,
    margin: { top: 118, right: 36, bottom: 58, left: 64 },
    colors: ['#5db8ff', '#56d08f', '#f3b45b'],
    title: { text: 'WebGL line from fetched JSON', align: 'left', fontSize: 18 },
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
      scaleExtent: [1, 80],
      wheelZoom: { enabled: true, devices: 'pc', sensitivity: 0.85 },
      resetOnDoubleClick: true
    },
    options: [
      createSpecAreaOption([
        { start: 120, end: 210, label: 'FETCHED JSON', color: 'rgba(216, 118, 255, 0.16)' },
        { start: 420, end: 520, label: 'WORKER DRAW', color: 'rgba(93, 184, 255, 0.13)' }
      ]),
      createGuideLineOption({
        x: [
          { value: 100, label: '100' },
          { value: 300, label: '300' },
          { value: 500, label: '500' }
        ],
        y: [
          { value: 42, label: 'LOW', color: 'rgba(93, 184, 255, 0.55)' },
          { value: 68, label: 'HIGH', color: 'rgba(255, 107, 138, 0.55)' }
        ]
      })
    ],
    axes: [
      {
        field: 'x',
        type: 'number',
        placement: 'bottom',
        min: 0,
        max: data.length - 1,
        title: 'Sample Index',
        tickCount: 7
      },
      {
        field: 'signal',
        type: 'number',
        placement: 'left',
        min: 24,
        max: 78,
        title: 'Signal',
        domainFields: ['signal', 'baseline', 'upper']
      }
    ],
    series: [
      createWebglLineSeries({
        selector: 'signal',
        displayName: 'Signal',
        xField: 'x',
        yField: 'signal',
        color: '#5db8ff',
        lineWidth: 1,
        asyncRender: {
          enabled: true,
          workerFactory: createKChartRenderWorker
        }
      }),
      createWebglLineSeries({
        selector: 'baseline',
        displayName: 'Baseline',
        xField: 'x',
        yField: 'baseline',
        color: '#56d08f',
        lineWidth: 1,
        asyncRender: {
          enabled: true,
          workerFactory: createKChartRenderWorker
        }
      }),
      createWebglLineSeries({
        selector: 'upper',
        displayName: 'Upper band',
        xField: 'x',
        yField: 'upper',
        color: '#f3b45b',
        lineWidth: 1,
        asyncRender: {
          enabled: true,
          workerFactory: createKChartRenderWorker
        }
      })
    ]
  });

  chart.render();

  window.addEventListener('resize', () => {
    const panel = document.querySelector<HTMLElement>('.chart-panel');
    if (!panel) {
      return;
    }

    chart.resize({
      width: Math.max(panel.clientWidth - 48, 320),
      height: 460
    });
  });
};

const boot = async (): Promise<void> => {
  const offscreenSupported = supportsOffscreenCanvas();
  setText(offscreenStatus, offscreenSupported ? 'supported' : 'not supported; main-thread fallback');

  try {
    const data = await loadData();
    setText(dataStatus, `${data.length.toLocaleString()} rows from /data/large-line.json`);
    renderChart(data);
  } catch (error) {
    console.error(error);
    setText(dataStatus, 'failed to load JSON');
  }
};

void boot();

