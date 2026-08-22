import {createGroupedColumnSeries, createKChart} from '@keneth80/k-chart';
import './style.css';

interface ChannelRevenue {
  quarter: string;
  direct: number;
  partner: number;
  marketplace: number;
}

const data: ChannelRevenue[] = [
  {quarter: 'Q1', direct: 18.4, partner: 11.2, marketplace: 6.8},
  {quarter: 'Q2', direct: 21.7, partner: 13.5, marketplace: 8.1},
  {quarter: 'Q3', direct: 24.3, partner: 15.8, marketplace: 9.7},
  {quarter: 'Q4', direct: 29.1, partner: 18.2, marketplace: 12.4}
];

const groupedSeries = createGroupedColumnSeries<ChannelRevenue>({
  selector: 'channel-revenue',
  displayName: 'Revenue channels',
  xField: 'quarter',
  segments: [
    {field: 'direct', label: 'Direct', color: '#38bdf8'},
    {field: 'partner', label: 'Partner', color: '#34d399'},
    {field: 'marketplace', label: 'Marketplace', color: '#fbbf24'}
  ],
  opacity: 0.92,
  groupWidthRatio: 0.72,
  gap: 5,
  radius: 4
});

const panel = document.querySelector<HTMLElement>('.chart-panel');
const chartHeight = 520;
const chartWidth = () => Math.max(320, Math.min(1040, (panel?.clientWidth ?? 980) - 48));

const chart = createKChart<ChannelRevenue>({
  selector: '#chart',
  data,
  width: chartWidth(),
  height: chartHeight,
  margin: {top: 72, right: 32, bottom: 58, left: 72},
  title: {text: 'Revenue by channel · USD millions', align: 'left', fontSize: 18},
  grid: {visible: true, x: false, y: true, color: 'rgba(148, 163, 184, 0.2)', dasharray: '3 8'},
  legend: {visible: false},
  tooltip: {visible: true},
  axes: [
    {field: 'quarter', type: 'point', placement: 'bottom', title: 'Quarter'},
    {field: 'direct', type: 'number', placement: 'left', min: 0, max: 34, title: 'USD millions'}
  ],
  series: [groupedSeries]
});

chart.render();

const resize = () => chart.resize({width: chartWidth(), height: chartHeight});
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  window.removeEventListener('resize', resize);
  chart.destroy();
});
