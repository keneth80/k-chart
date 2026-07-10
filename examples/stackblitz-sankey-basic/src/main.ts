import { createKChart, createSankeySeries } from '@keneth80/k-chart';
import './style.css';

interface SankeyRow {
  source: string;
  target: string;
  metric: number;
  category: string;
}

const data: SankeyRow[] = [
  { source: 'Visit', target: 'Signup', metric: 120, category: 'Acquisition' },
  { source: 'Visit', target: 'Browse', metric: 80, category: 'Acquisition' },
  { source: 'Signup', target: 'Trial', metric: 85, category: 'Activation' },
  { source: 'Signup', target: 'Drop off', metric: 35, category: 'Activation' },
  { source: 'Browse', target: 'Trial', metric: 30, category: 'Evaluation' },
  { source: 'Browse', target: 'Exit', metric: 50, category: 'Evaluation' },
  { source: 'Trial', target: 'Paid', metric: 72, category: 'Conversion' },
  { source: 'Trial', target: 'Churn', metric: 43, category: 'Conversion' },
  { source: 'Paid', target: 'Retained', metric: 62, category: 'Retention' },
  { source: 'Paid', target: 'Cancelled', metric: 10, category: 'Retention' }
];

const chart = createKChart<SankeyRow>({
  selector: '#chart',
  data,
  width: 980,
  height: 600,
  margin: { top: 72, right: 24, bottom: 24, left: 24 },
  title: { text: 'Customer journey flow', align: 'left', fontSize: 18 },
  grid: { visible: false },
  legend: { visible: false },
  tooltip: { visible: false },
  animation: { enabled: true, duration: 850, easing: 'easeOutCubic', mode: 'enter' },
  axes: [],
  series: [
    createSankeySeries({
      selector: 'customer-flow',
      sourceField: 'source',
      targetField: 'target',
      valueField: 'metric',
      categoryField: 'category',
      categorySide: 'source',
      nodeAlign: 'justify',
      nodeWidth: 18,
      nodePadding: 16,
      linkColor: 'gradient',
      linkOpacity: 0.64,
      labels: {
        visible: true,
        formatter: (node) => `${node.label} · ${node.value}`
      },
      onNodeClick: ({ node }) => console.info('Sankey node', node.label),
      onLinkClick: ({ link }) => console.info('Sankey flow', link.source.label, link.target.label, link.value)
    })
  ]
});

chart.render();

window.addEventListener('resize', () => {
  const panel = document.querySelector<HTMLElement>('.chart-panel');
  if (!panel) return;
  chart.resize({ width: Math.max(panel.clientWidth - 48, 320), height: 600 });
});

window.addEventListener('beforeunload', () => chart.destroy());
