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

const chart = createKChart<RevenuePoint>({
  selector: '#chart',
  data,
  width: 920,
  height: 460,
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
