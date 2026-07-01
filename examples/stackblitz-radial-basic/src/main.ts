import { createCustomSeries, createKChart, type KChartSeries } from '@keneth80/k-chart';
import './style.css';

interface CapabilityPoint {
  label: string;
  value: number;
  volume: number;
  extra: number;
}

const data: CapabilityPoint[] = [
  { label: 'Reliability', value: 62, volume: 55, extra: 48 },
  { label: 'Latency', value: 48, volume: 62, extra: 36 },
  { label: 'Throughput', value: 68, volume: 42, extra: 58 },
  { label: 'Quality', value: 54, volume: 49, extra: 64 },
  { label: 'Cost', value: 46, volume: 58, extra: 42 },
  { label: 'Coverage', value: 59, volume: 37, extra: 55 }
];

const createRadialMetricSeries = (
  selector: string,
  displayName: string,
  yField: 'value' | 'volume' | 'extra',
  color: string,
  drawFrame = false
): KChartSeries<CapabilityPoint> => {
  const maxValue = 72;
  const pointRadius = 4;

  const polarPoint = (
    index: number,
    count: number,
    value: number,
    centerX: number,
    centerY: number,
    radius: number
  ): [number, number] => {
    const angle = (Math.PI * 2 * index) / Math.max(count, 1) - Math.PI / 2;
    const distance = radius * Math.max(0, Math.min(value / maxValue, 1));
    return [
      centerX + Math.cos(angle) * distance,
      centerY + Math.sin(angle) * distance
    ];
  };

  const labelPoint = (
    index: number,
    count: number,
    centerX: number,
    centerY: number,
    radius: number
  ): [number, number] => {
    const angle = (Math.PI * 2 * index) / Math.max(count, 1) - Math.PI / 2;
    return [
      centerX + Math.cos(angle) * (radius + 26),
      centerY + Math.sin(angle) * (radius + 26)
    ];
  };

  return createCustomSeries<CapabilityPoint>({
    selector,
    displayName,
    xField: 'label',
    yField,
    color,
    render({ group, data: points, plotSize }) {
      const centerX = plotSize.width / 2;
      const centerY = plotSize.height / 2 + 12;
      const radius = Math.max(96, Math.min(plotSize.width, plotSize.height) * 0.34);

      if (drawFrame) {
        group.selectAll<SVGCircleElement, number>('circle.radial-ring')
          .data([0.2, 0.4, 0.6, 0.8, 1])
          .join('circle')
          .attr('class', 'radial-ring')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', (value) => radius * value)
          .style('fill', 'none')
          .style('stroke', 'rgba(203, 213, 225, 0.18)')
          .style('stroke-dasharray', '2 6');

        group.selectAll<SVGLineElement, CapabilityPoint>('line.radial-spoke')
          .data(points)
          .join('line')
          .attr('class', 'radial-spoke')
          .attr('x1', centerX)
          .attr('y1', centerY)
          .attr('x2', (_point, index) => labelPoint(index, points.length, centerX, centerY, radius - 4)[0])
          .attr('y2', (_point, index) => labelPoint(index, points.length, centerX, centerY, radius - 4)[1])
          .style('stroke', 'rgba(203, 213, 225, 0.14)');

        group.selectAll<SVGTextElement, CapabilityPoint>('text.radial-label')
          .data(points)
          .join('text')
          .attr('class', 'radial-label')
          .attr('x', (_point, index) => labelPoint(index, points.length, centerX, centerY, radius)[0])
          .attr('y', (_point, index) => labelPoint(index, points.length, centerX, centerY, radius)[1])
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('fill', 'rgba(226, 232, 240, 0.86)')
          .style('font-size', '12px')
          .style('font-weight', 700)
          .text((point) => point.label);
      }

      const path = points
        .map((point, index) => {
          const [x, y] = polarPoint(index, points.length, Number(point[yField]), centerX, centerY, radius);
          return `${index === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');

      group.selectAll<SVGPathElement, CapabilityPoint[]>('path.radial-area')
        .data([points])
        .join('path')
        .attr('class', `radial-area ${selector}`)
        .attr('d', `${path} Z`)
        .style('fill', color)
        .style('fill-opacity', 0.16)
        .style('stroke', color)
        .style('stroke-width', 2.6)
        .style('filter', 'drop-shadow(0 0 10px rgba(125, 211, 252, 0.14))');

      group.selectAll<SVGCircleElement, CapabilityPoint>('circle.radial-point')
        .data(points)
        .join('circle')
        .attr('class', `radial-point ${selector}`)
        .attr('cx', (point, index) => polarPoint(index, points.length, Number(point[yField]), centerX, centerY, radius)[0])
        .attr('cy', (point, index) => polarPoint(index, points.length, Number(point[yField]), centerX, centerY, radius)[1])
        .attr('r', pointRadius)
        .style('fill', color)
        .style('stroke', '#f8fafc')
        .style('stroke-width', 1.2);
    },
    tooltip({ data: points, plotSize, seriesGroup, mouseX, mouseY }) {
      const centerX = plotSize.width / 2;
      const centerY = plotSize.height / 2 + 12;
      const radius = Math.max(96, Math.min(plotSize.width, plotSize.height) * 0.34);

      seriesGroup.selectAll<SVGCircleElement, CapabilityPoint>(`circle.${selector}`)
        .attr('r', pointRadius)
        .style('stroke-width', 1.2);

      let closest: { point: CapabilityPoint; x: number; y: number; distance: number } | undefined;
      points.forEach((point, index) => {
        const [x, y] = polarPoint(index, points.length, Number(point[yField]), centerX, centerY, radius);
        const distance = Math.hypot(mouseX - x, mouseY - y);
        if (!closest || distance < closest.distance) {
          closest = { point, x, y, distance };
        }
      });

      if (!closest || closest.distance > 18) {
        return undefined;
      }

      seriesGroup.selectAll<SVGCircleElement, CapabilityPoint>(`circle.${selector}`)
        .filter((point) => point === closest?.point)
        .attr('r', 6)
        .style('stroke-width', 2);

      return {
        data: closest.point,
        x: closest.x,
        y: closest.y,
        distance: closest.distance,
        color,
        html: `<strong style="color:${color}">${displayName}</strong><br/>${closest.point.label}: ${Number(closest.point[yField]).toFixed(1)}`
      };
    },
    clearTooltip({ seriesGroup }) {
      seriesGroup.selectAll<SVGCircleElement, CapabilityPoint>(`circle.${selector}`)
        .attr('r', pointRadius)
        .style('stroke-width', 1.2);
    }
  });
};

const chart = createKChart<CapabilityPoint>({
  selector: '#chart',
  data,
  width: 920,
  height: 500,
  margin: { top: 88, right: 36, bottom: 42, left: 36 },
  colors: ['#5db8ff', '#56d08f', '#f3b45b'],
  title: {
    text: 'Radial Capability Comparison',
    align: 'left',
    fontSize: 18
  },
  grid: {
    visible: false
  },
  legend: {
    visible: true,
    placement: 'top',
    selectable: true
  },
  tooltip: {
    visible: true
  },
  axes: [],
  series: [
    createRadialMetricSeries('radial-current', 'Current', 'value', '#5db8ff', true),
    createRadialMetricSeries('radial-target', 'Target', 'volume', '#56d08f'),
    createRadialMetricSeries('radial-risk', 'Risk', 'extra', '#f3b45b')
  ]
});

chart.render();

window.addEventListener('resize', () => {
  const panel = document.querySelector<HTMLElement>('.chart-panel');
  if (!panel) {
    return;
  }

  chart.resize({
    width: Math.max(panel.clientWidth - 48, 320),
    height: 500
  });
});
