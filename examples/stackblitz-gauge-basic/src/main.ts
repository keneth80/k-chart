import {createGaugeSeries, createKChart} from '@keneth80/k-chart';
import './style.css';

interface DeliveryMetric {
  label: string;
  rate: number;
}

const data: DeliveryMetric[] = [
  {label: 'On-time this month', rate: 94.6}
];

const gaugeSeries = createGaugeSeries<DeliveryMetric>({
  selector: 'on-time-delivery',
  displayName: 'On-time delivery',
  valueField: 'rate',
  labelField: 'label',
  min: 80,
  max: 100,
  startAngle: -125,
  endAngle: 125,
  color: '#34d399',
  trackColor: 'rgba(148, 163, 184, 0.22)',
  needleColor: '#f8fafc',
  thickness: 20,
  showNeedle: true,
  valueFormat: (value) => `${value.toFixed(1)}%`
});

const panel = document.querySelector<HTMLElement>('.chart-panel');
const chartHeight = 520;
const chartWidth = () => Math.max(320, Math.min(1040, (panel?.clientWidth ?? 980) - 48));

const chart = createKChart<DeliveryMetric>({
  selector: '#chart',
  data,
  width: chartWidth(),
  height: chartHeight,
  margin: {top: 72, right: 24, bottom: 24, left: 24},
  title: {text: 'Monthly service-level performance', align: 'left', fontSize: 18},
  grid: {visible: false},
  legend: {visible: false},
  tooltip: {visible: false},
  axes: [],
  series: [gaugeSeries]
});

chart.render();

const resize = () => chart.resize({width: chartWidth(), height: chartHeight});
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  window.removeEventListener('resize', resize);
  chart.destroy();
});
