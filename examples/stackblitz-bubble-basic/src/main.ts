import {createBubbleSeries, createKChart} from '@keneth80/k-chart';
import './style.css';

interface ProductPortfolio {
  product: string;
  growth: number;
  revenue: number;
  customers: number;
  segment: 'Core' | 'Growth';
}

const data: ProductPortfolio[] = [
  {product: 'Workspace', growth: 18, revenue: 42, customers: 118, segment: 'Core'},
  {product: 'Analytics', growth: 31, revenue: 28, customers: 76, segment: 'Growth'},
  {product: 'Automation', growth: 44, revenue: 21, customers: 54, segment: 'Growth'},
  {product: 'Commerce', growth: 24, revenue: 36, customers: 92, segment: 'Core'},
  {product: 'Developer API', growth: 37, revenue: 18, customers: 63, segment: 'Growth'},
  {product: 'Enterprise', growth: 12, revenue: 55, customers: 34, segment: 'Core'},
  {product: 'Support Plus', growth: 8, revenue: 14, customers: 141, segment: 'Core'}
];

const bubbleSeries = createBubbleSeries<ProductPortfolio>({
  selector: 'product-portfolio',
  displayName: 'Product portfolio',
  xField: 'growth',
  yField: 'revenue',
  radiusField: 'customers',
  minRadius: 8,
  maxRadius: 28,
  fill: (point) => point.segment === 'Core' ? '#38bdf8' : '#fbbf24',
  stroke: '#f8fafc',
  strokeWidth: 1.5,
  opacity: 0.78
});

const panel = document.querySelector<HTMLElement>('.chart-panel');
const chartHeight = 520;
const chartWidth = () => Math.max(320, Math.min(1040, (panel?.clientWidth ?? 980) - 48));

const chart = createKChart<ProductPortfolio>({
  selector: '#chart',
  data,
  width: chartWidth(),
  height: chartHeight,
  margin: {top: 76, right: 42, bottom: 62, left: 72},
  title: {text: 'Product portfolio position', align: 'left', fontSize: 18},
  grid: {visible: true, x: true, y: true, color: 'rgba(148, 163, 184, 0.18)', dasharray: '3 8'},
  legend: {visible: false},
  tooltip: {visible: true},
  axes: [
    {field: 'growth', type: 'number', placement: 'bottom', min: 0, max: 50, title: 'Annual growth · %'},
    {field: 'revenue', type: 'number', placement: 'left', min: 0, max: 65, title: 'Revenue · USD millions'}
  ],
  series: [bubbleSeries]
});

chart.render();

const resize = () => chart.resize({width: chartWidth(), height: chartHeight});
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  window.removeEventListener('resize', resize);
  chart.destroy();
});
