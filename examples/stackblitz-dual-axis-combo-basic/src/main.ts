import {
  createGroupedColumnSeries,
  createKChart,
  createLineSeries
} from '@keneth80/k-chart';
import './style.css';

interface PipelineMonth {
  month: string;
  pipeline: number;
  winRate: number;
}

const data: PipelineMonth[] = [
  {month: 'Jan', pipeline: 4.8, winRate: 31},
  {month: 'Feb', pipeline: 5.3, winRate: 34},
  {month: 'Mar', pipeline: 5.9, winRate: 38},
  {month: 'Apr', pipeline: 5.5, winRate: 36},
  {month: 'May', pipeline: 6.4, winRate: 41},
  {month: 'Jun', pipeline: 6.9, winRate: 45},
  {month: 'Jul', pipeline: 6.2, winRate: 43},
  {month: 'Aug', pipeline: 7.1, winRate: 47},
  {month: 'Sep', pipeline: 7.7, winRate: 51},
  {month: 'Oct', pipeline: 7.4, winRate: 49},
  {month: 'Nov', pipeline: 8.1, winRate: 54},
  {month: 'Dec', pipeline: 8.6, winRate: 57}
];

const chart = createKChart<PipelineMonth>({
  selector: '#chart',
  data,
  height: 470,
  margin: {top: 86, right: 76, bottom: 56, left: 76},
  title: {text: 'Pipeline and win rate', align: 'left', fontSize: 17},
  grid: {visible: true, x: false, y: true, color: '#d9dee7', dasharray: '2 6'},
  legend: {visible: true, placement: 'top', selectable: false, itemGap: 18},
  tooltip: {
    visible: true,
    formatter: ({data: point, series, color}) => {
      const value = series.yField === 'winRate'
        ? point.winRate + '%'
        : '$' + point.pipeline.toFixed(1) + 'M';
      return '<strong style="color:' + color + '">' + series.displayName + '</strong>' +
        '<div>' + point.month + ': ' + value + '</div>';
    }
  },
  axes: [
    {field: 'month', type: 'string', placement: 'bottom', title: 'Month', tickCount: 6},
    {
      field: 'pipeline', type: 'number', placement: 'left', min: 0, max: 10,
      title: 'Pipeline (USD millions)', tickCount: 6,
      tickFormat: (value) => '$' + Number(value).toFixed(0) + 'M'
    },
    {
      field: 'winRate', type: 'number', placement: 'right', min: 0, max: 60,
      title: 'Win rate', tickCount: 4,
      tickFormat: (value) => Number(value).toFixed(0) + '%'
    }
  ],
  series: [
    createGroupedColumnSeries<PipelineMonth>({
      selector: 'qualified-pipeline',
      displayName: 'Qualified pipeline ($M)',
      xField: 'month',
      segments: [{field: 'pipeline', label: 'Qualified pipeline ($M)', color: '#2463a7'}],
      groupWidthRatio: 0.56,
      opacity: 0.94,
      radius: 3
    }),
    createLineSeries<PipelineMonth>({
      selector: 'win-rate',
      displayName: 'Win rate (%)',
      xField: 'month',
      yField: 'winRate',
      color: '#d24f3f',
      strokeWidth: 3,
      curve: true,
      dot: {radius: 4, fill: '#d24f3f', stroke: '#ffffff'}
    })
  ]
}).render();

const chartElement = document.querySelector<HTMLElement>('#chart');
if (chartElement) {
  new ResizeObserver(() => chart.resize()).observe(chartElement);
}

window.addEventListener('beforeunload', () => chart.destroy());
