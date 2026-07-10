import { createGraphSeries, createKChart } from '@keneth80/k-chart';
import './style.css';

interface GraphRow {
  source: string;
  target: string;
  metric: number;
  category: string;
}

const data: GraphRow[] = [
  { source: 'Browser', target: 'API Gateway', metric: 46, category: 'Client' },
  { source: 'Mobile App', target: 'API Gateway', metric: 34, category: 'Client' },
  { source: 'API Gateway', target: 'Auth', metric: 32, category: 'Platform' },
  { source: 'API Gateway', target: 'Orders', metric: 58, category: 'Platform' },
  { source: 'API Gateway', target: 'Catalog', metric: 41, category: 'Platform' },
  { source: 'Orders', target: 'Database', metric: 43, category: 'Service' },
  { source: 'Orders', target: 'Queue', metric: 27, category: 'Service' },
  { source: 'Catalog', target: 'Search', metric: 36, category: 'Service' },
  { source: 'Queue', target: 'Worker', metric: 24, category: 'Data' },
  { source: 'Worker', target: 'Database', metric: 19, category: 'Data' }
];

const graphSeries = createGraphSeries<GraphRow>({
  selector: 'service-graph',
  displayName: 'Service relationships',
  sourceField: 'source',
  targetField: 'target',
  valueField: 'metric',
  categoryField: 'category',
  categorySide: 'source',
  layout: 'force',
  directed: true,
  edgeSymbols: 'circle-arrow',
  roam: 'both',
  scaleExtent: [0.5, 5],
  selectMode: 'multiple',
  nodeMinRadius: 10,
  nodeMaxRadius: 30,
  edgeMinWidth: 1.2,
  edgeMaxWidth: 7,
  labels: {
    visible: true,
    formatter: (node) => `${node.label} · ${node.value}`
  },
  onNodeClick: ({ node, selectedIds }) => {
    console.info('Selected graph node', node.label, selectedIds);
  }
});

const chart = createKChart<GraphRow>({
  selector: '#chart',
  data,
  width: 980,
  height: 600,
  margin: { top: 72, right: 24, bottom: 24, left: 24 },
  title: { text: 'Service request relationships', align: 'left', fontSize: 18 },
  grid: { visible: false },
  legend: { visible: false },
  tooltip: { visible: false },
  axes: [],
  series: [graphSeries]
});

chart.render();

window.addEventListener('resize', () => {
  const panel = document.querySelector<HTMLElement>('.chart-panel');
  if (!panel) return;
  chart.resize({ width: Math.max(panel.clientWidth - 48, 320), height: 600 });
});

window.addEventListener('beforeunload', () => chart.destroy());
