import {createKChart, createTreeSeries} from '@keneth80/k-chart';
import './style.css';

interface OrganizationRow {
  id: string;
  parent: string | null;
  name: string;
  team: string;
  headcount: number;
}

const data: OrganizationRow[] = [
  {id: 'ceo', parent: null, name: 'Chief Executive Officer', team: 'Executive', headcount: 1},
  {id: 'product', parent: 'ceo', name: 'VP Product', team: 'Product', headcount: 28},
  {id: 'engineering', parent: 'ceo', name: 'VP Engineering', team: 'Engineering', headcount: 54},
  {id: 'revenue', parent: 'ceo', name: 'VP Revenue', team: 'Revenue', headcount: 35},
  {id: 'design', parent: 'product', name: 'Design', team: 'Product', headcount: 9},
  {id: 'research', parent: 'product', name: 'Research', team: 'Product', headcount: 7},
  {id: 'platform', parent: 'engineering', name: 'Platform', team: 'Engineering', headcount: 18},
  {id: 'frontend', parent: 'engineering', name: 'Frontend', team: 'Engineering', headcount: 16},
  {id: 'data', parent: 'engineering', name: 'Data & AI', team: 'Engineering', headcount: 20},
  {id: 'sales', parent: 'revenue', name: 'Sales', team: 'Revenue', headcount: 22},
  {id: 'success', parent: 'revenue', name: 'Customer Success', team: 'Revenue', headcount: 13}
];

const treeSeries = createTreeSeries<OrganizationRow>({
  selector: 'organization-tree',
  displayName: 'Organization',
  idField: 'id',
  parentField: 'parent',
  labelField: 'name',
  valueField: 'headcount',
  categoryField: 'team',
  layout: 'orthogonal',
  orientation: 'left-right',
  emphasis: 'descendant',
  symbol: 'circle',
  symbolSize: (node) => 10 + Math.sqrt(node.value) * 1.5,
  labelPosition: 'right',
  roam: 'both',
  scaleExtent: [0.6, 4],
  fitPadding: 112,
  labels: {
    visible: true,
    formatter: (node) => `${node.label} · ${node.value}`
  },
  onNodeClick: ({node}) => console.info('Selected tree node', node.id, node.row)
});

const chart = createKChart<OrganizationRow>({
  selector: '#chart',
  data,
  width: 980,
  height: 600,
  margin: {top: 72, right: 32, bottom: 24, left: 32},
  title: {text: 'Organization hierarchy', align: 'left', fontSize: 18},
  grid: {visible: false},
  legend: {visible: false},
  tooltip: {visible: true},
  axes: [],
  series: [treeSeries]
});

chart.render();

window.addEventListener('resize', () => {
  const panel = document.querySelector<HTMLElement>('.chart-panel');
  if (!panel) return;
  chart.resize({width: Math.max(panel.clientWidth - 48, 320), height: 600});
});

window.addEventListener('beforeunload', () => chart.destroy());
