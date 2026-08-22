import {createBarSeries, createKChart} from '@keneth80/k-chart';
import './style.css';

interface SupportQueue {
  team: string;
  openCases: number;
  color: string;
}

const data: SupportQueue[] = [
  {team: 'Enterprise', openCases: 48, color: '#38bdf8'},
  {team: 'Integrations', openCases: 41, color: '#67e8f9'},
  {team: 'Billing', openCases: 32, color: '#34d399'},
  {team: 'Onboarding', openCases: 27, color: '#fbbf24'},
  {team: 'Accounts', openCases: 19, color: '#fb7185'}
];

const barSeries = createBarSeries<SupportQueue>({
  selector: 'support-queue',
  displayName: 'Open cases',
  xField: 'openCases',
  yField: 'team',
  fill: (point) => point.color,
  opacity: 0.9,
  minBarHeight: 18,
  maxBarHeight: 38,
  radius: 5
});

const panel = document.querySelector<HTMLElement>('.chart-panel');
const chartHeight = 520;
const chartWidth = () => Math.max(320, Math.min(1040, (panel?.clientWidth ?? 980) - 48));

const chart = createKChart<SupportQueue>({
  selector: '#chart',
  data,
  width: chartWidth(),
  height: chartHeight,
  margin: {top: 76, right: 36, bottom: 58, left: 112},
  title: {text: 'Unresolved customer cases', align: 'left', fontSize: 18},
  grid: {visible: true, x: true, y: false, color: 'rgba(148, 163, 184, 0.2)', dasharray: '3 8'},
  legend: {visible: false},
  tooltip: {visible: true},
  axes: [
    {field: 'openCases', type: 'number', placement: 'bottom', min: 0, max: 55, title: 'Open cases'},
    {field: 'team', type: 'point', placement: 'left', title: 'Support team'}
  ],
  series: [barSeries]
});

chart.render();

const resize = () => chart.resize({width: chartWidth(), height: chartHeight});
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  window.removeEventListener('resize', resize);
  chart.destroy();
});
