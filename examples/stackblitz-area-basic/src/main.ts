import {createAreaSeries, createKChart} from '@keneth80/k-chart';
import './style.css';

interface DemandPoint {
  week: number;
  demand: number;
}

const data: DemandPoint[] = [
  {week: 1, demand: 64},
  {week: 2, demand: 68},
  {week: 3, demand: 66},
  {week: 4, demand: 73},
  {week: 5, demand: 78},
  {week: 6, demand: 84},
  {week: 7, demand: 91},
  {week: 8, demand: 96},
  {week: 9, demand: 92},
  {week: 10, demand: 87},
  {week: 11, demand: 81},
  {week: 12, demand: 76}
];

const areaSeries = createAreaSeries<DemandPoint>({
  selector: 'weekly-demand',
  displayName: 'Peak demand',
  xField: 'week',
  yField: 'demand',
  baseline: 55,
  fill: '#38bdf8',
  fillOpacity: 0.3,
  stroke: '#67e8f9',
  strokeWidth: 3,
  curve: true
});

const panel = document.querySelector<HTMLElement>('.chart-panel');
const chartHeight = 520;
const chartWidth = () => Math.max(320, Math.min(1040, (panel?.clientWidth ?? 980) - 48));

const chart = createKChart<DemandPoint>({
  selector: '#chart',
  data,
  width: chartWidth(),
  height: chartHeight,
  margin: {top: 88, right: 32, bottom: 58, left: 68},
  title: {text: 'Peak demand · GW', align: 'left', fontSize: 18},
  grid: {visible: true, x: false, y: true, color: 'rgba(148, 163, 184, 0.2)', dasharray: '3 8'},
  legend: {visible: true, placement: 'top', selectable: false},
  tooltip: {visible: true},
  axes: [
    {field: 'week', type: 'number', placement: 'bottom', min: 1, max: 12, tickCount: 6, title: 'Week'},
    {field: 'demand', type: 'number', placement: 'left', min: 55, max: 105, title: 'Gigawatts'}
  ],
  series: [areaSeries]
});

chart.render();

const resize = () => chart.resize({width: chartWidth(), height: chartHeight});
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  window.removeEventListener('resize', resize);
  chart.destroy();
});
