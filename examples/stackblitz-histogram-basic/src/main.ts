import {createHistogramSeries, createKChart} from '@keneth80/k-chart';
import './style.css';

interface FulfillmentBin {
  startMinute: number;
  endMinute: number;
  orders: number;
}

const data: FulfillmentBin[] = [
  {startMinute: 0, endMinute: 5, orders: 8},
  {startMinute: 5, endMinute: 10, orders: 21},
  {startMinute: 10, endMinute: 15, orders: 46},
  {startMinute: 15, endMinute: 20, orders: 72},
  {startMinute: 20, endMinute: 25, orders: 89},
  {startMinute: 25, endMinute: 30, orders: 76},
  {startMinute: 30, endMinute: 35, orders: 54},
  {startMinute: 35, endMinute: 40, orders: 33},
  {startMinute: 40, endMinute: 45, orders: 18},
  {startMinute: 45, endMinute: 50, orders: 9},
  {startMinute: 50, endMinute: 55, orders: 4}
];

const histogramSeries = createHistogramSeries<FulfillmentBin>({
  selector: 'fulfillment-time',
  displayName: 'Orders',
  binStartField: 'startMinute',
  binEndField: 'endMinute',
  valueField: 'orders',
  fill: (point) => point.startMinute < 30 ? '#38bdf8' : '#34d399',
  opacity: 0.88,
  gap: 2,
  radius: 3
});

const panel = document.querySelector<HTMLElement>('.chart-panel');
const chartHeight = 520;
const chartWidth = () => Math.max(320, Math.min(1040, (panel?.clientWidth ?? 980) - 48));

const chart = createKChart<FulfillmentBin>({
  selector: '#chart',
  data,
  width: chartWidth(),
  height: chartHeight,
  margin: {top: 76, right: 36, bottom: 62, left: 72},
  title: {text: 'Packed orders by fulfillment time', align: 'left', fontSize: 18},
  grid: {visible: true, x: false, y: true, color: 'rgba(148, 163, 184, 0.2)', dasharray: '3 8'},
  legend: {visible: false},
  tooltip: {visible: true},
  axes: [
    {field: 'startMinute', type: 'number', placement: 'bottom', min: 0, max: 55, title: 'Minutes'},
    {field: 'orders', type: 'number', placement: 'left', min: 0, max: 100, title: 'Orders'}
  ],
  series: [histogramSeries]
});

chart.render();

const resize = () => chart.resize({width: chartWidth(), height: chartHeight});
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  window.removeEventListener('resize', resize);
  chart.destroy();
});
