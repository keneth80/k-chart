import { createKChart, createLineSeries } from '@keneth80/k-chart';
import './style.css';

interface PlotPoint { label: string; x: number; value: number; volume: number; }

const data: PlotPoint[] = [
  { label: 'Jan', x: 1, value: 34, volume: 18 },
  { label: 'Feb', x: 2, value: 42, volume: 28 },
  { label: 'Mar', x: 3, value: 38, volume: 22 },
  { label: 'Apr', x: 4, value: 56, volume: 34 },
  { label: 'May', x: 5, value: 51, volume: 30 },
  { label: 'Jun', x: 6, value: 64, volume: 42 }
];

const chart = createKChart<PlotPoint>({
  selector: '#chart', data, width: 920, height: 460,
  margin: { top: 88, right: 36, bottom: 58, left: 64 },
  title: { text: 'SVG Plot Renderer', align: 'left', fontSize: 18 },
  grid: { visible: true, x: false, y: true, color: 'rgba(148, 163, 184, 0.22)', dasharray: '3 8' },
  legend: { visible: true, placement: 'top', selectable: true },
  tooltip: { visible: true, formatter: ({ data, series, y }) => `<strong>${series.displayName}</strong><br/>${data.label}: ${Number(y).toFixed(1)}` },
  axes: [
    { field: 'x', type: 'number', placement: 'bottom', min: 0, max: 7, title: 'Month Index' },
    { field: 'value', type: 'number', placement: 'left', min: 0, max: 72, title: 'Value' }
  ],
  series: [
    createLineSeries({ selector: 'plot-value', displayName: 'Value Points', xField: 'x', yField: 'value', color: '#5db8ff', strokeWidth: 0, dot: { radius: 7, stroke: '#f8fbff' } }),
    createLineSeries({ selector: 'plot-volume', displayName: 'Volume Points', xField: 'x', yField: 'volume', color: '#f3b45b', strokeWidth: 0, dot: { radius: 5, stroke: '#f8fbff' } })
  ]
});

chart.render();
