import {
  createGroupedColumnSeries,
  createGuideLineOption,
  createKChart,
  createLineSeries
} from '@keneth80/k-chart';
import './style.css';

interface IncidentPoint {
  category: string;
  incidents: number;
  cumulative: number;
}

const rankedIncidents = [
  {category: 'Late scans', incidents: 94},
  {category: 'Label errors', incidents: 67},
  {category: 'Count variance', incidents: 48},
  {category: 'Routing', incidents: 35},
  {category: 'Packaging', incidents: 24},
  {category: 'Cold chain', incidents: 16},
  {category: 'Other', incidents: 11}
];

const total = rankedIncidents.reduce((sum, item) => sum + item.incidents, 0);
let runningTotal = 0;
const data: IncidentPoint[] = rankedIncidents.map((item) => {
  runningTotal += item.incidents;
  return {...item, cumulative: Number(((runningTotal / total) * 100).toFixed(1))};
});

const chart = createKChart<IncidentPoint>({
  selector: '#chart',
  data,
  height: 480,
  margin: {top: 90, right: 78, bottom: 68, left: 70},
  title: {text: total + ' incidents reviewed', align: 'left', fontSize: 17},
  grid: {visible: true, x: false, y: true, color: '#d9ddd8', dasharray: '2 6'},
  legend: {visible: true, placement: 'top', selectable: false, itemGap: 18},
  tooltip: {
    visible: true,
    formatter: ({data: point, series, color}) => {
      const value = series.yField === 'cumulative'
        ? point.cumulative.toFixed(1) + '%'
        : point.incidents + ' incidents';
      return '<strong style="color:' + color + '">' + series.displayName + '</strong>' +
        '<div>' + point.category + ': ' + value + '</div>';
    }
  },
  options: [
    createGuideLineOption({
      y: [{
        value: 80,
        color: '#c3483e',
        width: 1.5,
        dasharray: '6 5',
      }]
    })
  ],
  axes: [
    {field: 'category', type: 'string', placement: 'bottom', title: 'Incident category', tickCount: 7},
    {
      field: 'cumulative', type: 'number', placement: 'right', min: 0, max: 100,
      title: 'Cumulative share', tickCount: 5,
      tickFormat: (value) => Number(value).toFixed(0) + '%'
    },
    {
      field: 'incidents', type: 'number', placement: 'left', min: 0, max: 110,
      title: 'Incident count', tickCount: 6,
      tickFormat: (value) => Number(value).toFixed(0)
    }
  ],
  series: [
    createGroupedColumnSeries<IncidentPoint>({
      selector: 'incident-count',
      displayName: 'Incidents',
      xField: 'category',
      segments: [{field: 'incidents', label: 'Incidents', color: '#26766a'}],
      groupWidthRatio: 0.62,
      opacity: 0.95,
      radius: 3
    }),
    createLineSeries<IncidentPoint>({
      selector: 'cumulative-share',
      displayName: 'Cumulative share',
      xField: 'category',
      yField: 'cumulative',
      color: '#d06136',
      strokeWidth: 3,
      curve: false,
      dot: {radius: 4, fill: '#d06136', stroke: '#ffffff'}
    })
  ]
}).render();

const chartElement = document.querySelector<HTMLElement>('#chart');
if (chartElement) {
  new ResizeObserver(() => chart.resize()).observe(chartElement);
}

window.addEventListener('beforeunload', () => chart.destroy());
