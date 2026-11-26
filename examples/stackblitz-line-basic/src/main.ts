import { createKChart, createLineSeries } from '@keneth80/k-chart';
import './style.css';

interface RevenuePoint {
  month: string;
  revenue: number;
  target: number;
}

const data: RevenuePoint[] = [
  { month: 'Jan', revenue: 42, target: 38 },
  { month: 'Feb', revenue: 48, target: 42 },
  { month: 'Mar', revenue: 45, target: 46 },
  { month: 'Apr', revenue: 58, target: 50 },
  { month: 'May', revenue: 64, target: 55 },
  { month: 'Jun', revenue: 62, target: 60 },
  { month: 'Jul', revenue: 74, target: 64 },
  { month: 'Aug', revenue: 81, target: 70 },
  { month: 'Sep', revenue: 78, target: 73 },
  { month: 'Oct', revenue: 88, target: 78 },
  { month: 'Nov', revenue: 92, target: 82 },
  { month: 'Dec', revenue: 101, target: 88 }
];

const chartRoot = document.querySelector<HTMLElement>('#chart');
if (!chartRoot) {
  throw new Error('Chart container not found');
}
const readChartSize = () => ({
  width: Math.max(1, chartRoot.clientWidth),
  height: Math.max(1, chartRoot.clientHeight)
});
let chartSize = readChartSize();

const chart = createKChart<RevenuePoint>({
  selector: '#chart',
  data,
  ...chartSize,
  margin: {
    top: 88,
    right: 36,
    bottom: 58,
    left: 64
  },
  colors: ['#7dd3fc', '#fbbf24'],
  title: {
    text: 'Monthly Revenue vs Target',
    align: 'left',
    fontSize: 18
  },
  grid: {
    visible: true,
    x: false,
    y: true,
    color: 'rgba(148, 163, 184, 0.22)',
    dasharray: '3 8'
  },
  legend: {
    visible: true,
    placement: 'top',
    selectable: true
  },
  axes: [
    {
      field: 'month',
      type: 'point',
      placement: 'bottom',
      title: 'Month'
    },
    {
      field: 'revenue',
      type: 'number',
      placement: 'left',
      domainFields: ['revenue', 'target'],
      min: 30,
      title: 'Revenue (k USD)'
    }
  ],
  tooltip: {
    visible: true,
    formatter: ({ data: point, series, y }) => `
      <strong>${series.displayName}</strong>
      <div>${point.month}: ${Number(y).toLocaleString()}k USD</div>
    `
  },
  series: [
    createLineSeries({
      selector: 'revenue-line',
      displayName: 'Revenue',
      xField: 'month',
      yField: 'revenue',
      strokeWidth: 3,
      curve: true,
      dot: { radius: 4 }
    }),
    createLineSeries({
      selector: 'target-line',
      displayName: 'Target',
      xField: 'month',
      yField: 'target',
      color: '#fbbf24',
      strokeWidth: 2.5,
      curve: true,
      dot: { radius: 3, fill: '#fbbf24' }
    })
  ]
});

chart.render();

let disposed = false;
const resizeChart = () => {
  if (disposed) return;
  const nextSize = readChartSize();
  if (nextSize.width === chartSize.width && nextSize.height === chartSize.height) return;
  chartSize = nextSize;
  chart.resize(chartSize);
};
const resizeObserver = typeof ResizeObserver === 'undefined'
  ? undefined
  : new ResizeObserver(resizeChart);
resizeObserver?.observe(chartRoot);
if (!resizeObserver) window.addEventListener('resize', resizeChart);

const dispose = () => {
  if (disposed) return;
  disposed = true;
  resizeObserver?.disconnect();
  window.removeEventListener('resize', resizeChart);
  window.removeEventListener('pagehide', onPageHide);
  window.removeEventListener('pageshow', onPageShow);
  chart.destroy();
};
// A cached page keeps its chart, but resumes observing when restored.
const onPageHide = (event: PageTransitionEvent) => {
  if (event.persisted) resizeObserver?.disconnect();
  else dispose();
};
const onPageShow = (event: PageTransitionEvent) => {
  if (!event.persisted || disposed) return;
  resizeObserver?.observe(chartRoot);
  resizeChart();
};
window.addEventListener('pagehide', onPageHide);
window.addEventListener('pageshow', onPageShow);
(import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot?.dispose(dispose);
