import {createKChart, createTreemapSeries} from '@keneth80/k-chart';
import './style.css';

interface ProductMetric {
  product: string;
  category: 'Platform' | 'Analytics' | 'Commerce' | 'Services';
  revenue: number;
  color: string;
}

const categoryColors: Record<ProductMetric['category'], string> = {
  Platform: '#38bdf8',
  Analytics: '#a78bfa',
  Commerce: '#34d399',
  Services: '#fb7185'
};

const data: ProductMetric[] = [
  {product: 'Core Platform', category: 'Platform', revenue: 42, color: categoryColors.Platform},
  {product: 'Developer API', category: 'Platform', revenue: 24, color: categoryColors.Platform},
  {product: 'Insights Pro', category: 'Analytics', revenue: 31, color: categoryColors.Analytics},
  {product: 'Forecasting', category: 'Analytics', revenue: 18, color: categoryColors.Analytics},
  {product: 'Checkout', category: 'Commerce', revenue: 27, color: categoryColors.Commerce},
  {product: 'Subscriptions', category: 'Commerce', revenue: 21, color: categoryColors.Commerce},
  {product: 'Implementation', category: 'Services', revenue: 16, color: categoryColors.Services},
  {product: 'Support Plus', category: 'Services', revenue: 11, color: categoryColors.Services}
];

const treemapSeries = createTreemapSeries<ProductMetric>({
  selector: 'product-revenue',
  displayName: 'Product revenue',
  // Rectangle area maps to this metric, so larger revenue occupies more space.
  valueField: 'revenue',
  // Treemap input stays flat: this dimension supplies the visible product label.
  labelField: 'product',
  colorField: 'color',
  gap: 6,
  radius: 6,
  minLabelArea: 1500,
  opacity: 0.9,
  sort: true
});

const chart = createKChart<ProductMetric>({
  selector: '#chart',
  data,
  width: 980,
  height: 560,
  margin: {top: 72, right: 24, bottom: 24, left: 24},
  title: {text: 'Product revenue by category', align: 'left', fontSize: 18},
  grid: {visible: false},
  legend: {visible: false},
  tooltip: {visible: true},
  axes: [],
  series: [treemapSeries]
});

chart.render();

window.addEventListener('resize', () => {
  const panel = document.querySelector<HTMLElement>('.chart-panel');
  if (!panel) return;
  chart.resize({width: Math.max(panel.clientWidth - 48, 320), height: 560});
});

window.addEventListener('beforeunload', () => chart.destroy());
