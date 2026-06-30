import { createKChart } from '@keneth80/k-chart';
import { createThreeWaferSeries, createWaferDies } from '@keneth80/k-chart-three';
import '@keneth80/k-chart-three/style.css';
import './style.css';

const dies = createWaferDies({ rows: 29, cols: 29, seed: 1207 });

createKChart({
  selector: '#chart',
  data: dies,
  width: 920,
  height: 520,
  margin: { top: 74, right: 18, bottom: 18, left: 18 },
  title: { text: 'Three.js Wafer Monitor', align: 'left', fontSize: 18 },
  grid: { visible: false },
  legend: { visible: false },
  tooltip: { visible: false },
  axes: [],
  series: [
    createThreeWaferSeries({
      selector: 'fab-wafer',
      displayName: 'Wafer A-17',
      fields: { id: 'id', row: 'row', col: 'col', status: 'status', value: 'value', label: 'label' },
      wafer: { radius: 5.4, notch: true },
      scene: { controls: { orbit: true, autoRotate: true } },
      onDieClick: ({ die }) => console.info('Selected die', die)
    })
  ]
}).render();
