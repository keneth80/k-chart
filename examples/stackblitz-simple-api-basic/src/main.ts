import {
  chartConfig,
  createLineChart
} from '@keneth80/k-chart';
import './style.css';

interface SalesPoint {
  month: string;
  revenue: number;
  orders: number;
}

const data: SalesPoint[] = [
  { month: 'Jan', revenue: 42, orders: 320 },
  { month: 'Feb', revenue: 48, orders: 360 },
  { month: 'Mar', revenue: 45, orders: 340 },
  { month: 'Apr', revenue: 58, orders: 420 },
  { month: 'May', revenue: 64, orders: 480 },
  { month: 'Jun', revenue: 62, orders: 450 },
  { month: 'Jul', revenue: 74, orders: 520 },
  { month: 'Aug', revenue: 81, orders: 590 }
];

const lineChart = createLineChart<SalesPoint>({
  selector: '#line-chart',
  data,
  x: { field: 'month', type: 'point', title: 'Month' },
  y: { field: 'revenue', type: 'number', title: 'Revenue', min: 30 },
  title: 'Revenue Trend',
  color: '#5db8ff',
  curve: true,
  dot: { radius: 4 },
  animation: { enabled: true, duration: 820 },
  tooltip: {
    visible: true,
    formatter: ({ data: point }) => `<strong>${point.month}</strong><br/>Revenue: ${point.revenue}k`
  }
});

const columnChart = chartConfig<SalesPoint>(data)
  .selector('#column-chart')
  .title('Orders By Month')
  .x('month', 'point', { title: 'Month' })
  .y('orders', 'number', { title: 'Orders', min: 250 })
  .column({
    displayName: 'Orders',
    color: '#56d08f',
    barRadius: 6
  })
  .tooltip({
    visible: true,
    formatter: ({ data: point }) => `<strong>${point.month}</strong><br/>Orders: ${point.orders}`
  })
  .animation({ enabled: true, duration: 760 })
  .render();

window.addEventListener('resize', () => {
  const linePanel = document.querySelector<HTMLElement>('#line-chart');
  const columnPanel = document.querySelector<HTMLElement>('#column-chart');

  lineChart.resize({
    width: Math.max(linePanel?.clientWidth ?? 320, 320),
    height: 360
  });
  columnChart.resize({
    width: Math.max(columnPanel?.clientWidth ?? 320, 320),
    height: 360
  });
});
