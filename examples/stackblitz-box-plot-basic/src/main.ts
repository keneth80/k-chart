import {createBoxPlotSeries, createKChart} from '@keneth80/k-chart';
import './style.css';

interface DeliveryDistribution {
  center: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}

const data: DeliveryDistribution[] = [
  {center: 'North', min: 18, q1: 23, median: 27, q3: 31, max: 38, outliers: [44]},
  {center: 'South', min: 21, q1: 26, median: 30, q3: 35, max: 43, outliers: [49, 52]},
  {center: 'East', min: 16, q1: 21, median: 25, q3: 29, max: 36, outliers: []},
  {center: 'West', min: 24, q1: 29, median: 34, q3: 39, max: 47, outliers: [54]},
  {center: 'Central', min: 17, q1: 22, median: 26, q3: 30, max: 37, outliers: [42]}
];

const boxPlotSeries = createBoxPlotSeries<DeliveryDistribution>({
  selector: 'delivery-distribution',
  displayName: 'Delivery time',
  xField: 'center',
  minField: 'min',
  q1Field: 'q1',
  medianField: 'median',
  q3Field: 'q3',
  maxField: 'max',
  outliersField: 'outliers',
  color: '#67e8f9',
  fill: '#38bdf8',
  opacity: 0.32,
  boxWidthRatio: 0.5,
  minBoxWidth: 20,
  maxBoxWidth: 52,
  strokeWidth: 2
});

const panel = document.querySelector<HTMLElement>('.chart-panel');
const chartHeight = 520;
const chartWidth = () => Math.max(320, Math.min(1040, (panel?.clientWidth ?? 980) - 48));

const chart = createKChart<DeliveryDistribution>({
  selector: '#chart',
  data,
  width: chartWidth(),
  height: chartHeight,
  margin: {top: 76, right: 36, bottom: 62, left: 72},
  title: {text: 'Transit time distribution · hours', align: 'left', fontSize: 18},
  grid: {visible: true, x: false, y: true, color: 'rgba(148, 163, 184, 0.2)', dasharray: '3 8'},
  legend: {visible: false},
  tooltip: {visible: true},
  axes: [
    {field: 'center', type: 'point', placement: 'bottom', title: 'Fulfillment center'},
    {field: 'median', type: 'number', placement: 'left', min: 10, max: 60, title: 'Hours'}
  ],
  series: [boxPlotSeries]
});

chart.render();

const resize = () => chart.resize({width: chartWidth(), height: chartHeight});
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  window.removeEventListener('resize', resize);
  chart.destroy();
});
