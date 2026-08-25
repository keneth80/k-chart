import {createKChart, createWaterfallSeries} from '@keneth80/k-chart';
import './style.css';

interface ProfitBridge {
  driver: string;
  amount: number;
  total: boolean;
}

const data: ProfitBridge[] = [
  {driver: 'Q1 profit', amount: 84, total: true},
  {driver: 'Volume', amount: 26, total: false},
  {driver: 'Pricing', amount: 9, total: false},
  {driver: 'Fulfillment', amount: -12, total: false},
  {driver: 'Hiring', amount: -8, total: false},
  {driver: 'Marketing', amount: -6, total: false},
  {driver: 'Q2 profit', amount: 93, total: true}
];

const waterfallSeries = createWaterfallSeries<ProfitBridge>({
  selector: 'profit-bridge',
  displayName: 'Operating profit',
  xField: 'driver',
  valueField: 'amount',
  totalField: 'total',
  positiveColor: '#34d399',
  negativeColor: '#fb7185',
  totalColor: '#38bdf8',
  connectorColor: 'rgba(203, 213, 225, 0.5)',
  connectorDasharray: '3 5',
  connectorWidth: 1.4,
  opacity: 0.92,
  barWidthRatio: 0.62,
  radius: 4,
  labels: {
    visible: true,
    formatter: (item) => item.total
      ? `$${item.value}m`
      : `${item.value > 0 ? '+' : ''}$${item.value}m`,
    color: '#e8eef7',
    fontSize: 11,
    fontWeight: 800,
    offset: 8
  }
});

const panel = document.querySelector<HTMLElement>('.chart-panel');
const chartHeight = 520;
const chartWidth = () => Math.max(320, Math.min(1040, (panel?.clientWidth ?? 980) - 48));

const chart = createKChart<ProfitBridge>({
  selector: '#chart',
  data,
  width: chartWidth(),
  height: chartHeight,
  margin: {top: 72, right: 36, bottom: 72, left: 76},
  title: {text: 'Operating profit bridge · USD millions', align: 'left', fontSize: 18},
  grid: {visible: true, x: false, y: true, color: 'rgba(148, 163, 184, 0.2)', dasharray: '3 8'},
  legend: {visible: false},
  tooltip: {visible: true},
  axes: [
    {field: 'driver', type: 'point', placement: 'bottom', title: 'Profit driver'},
    {field: 'amount', type: 'number', placement: 'left', min: 0, max: 130, title: 'USD millions'}
  ],
  series: [waterfallSeries]
});

chart.render();

const resize = () => chart.resize({width: chartWidth(), height: chartHeight});
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  window.removeEventListener('resize', resize);
  chart.destroy();
});
