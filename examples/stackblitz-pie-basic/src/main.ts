import { createCustomSeries, createKChart, type KChartSeries } from '@keneth80/k-chart';
import './style.css';

interface SegmentPoint {
  label: string;
  value: number;
}

const data: SegmentPoint[] = [
  { label: 'Product A', value: 34 },
  { label: 'Product B', value: 42 },
  { label: 'Product C', value: 26 },
  { label: 'Product D', value: 18 },
  { label: 'Product E', value: 31 }
];

const palette = ['#5db8ff', '#56d08f', '#f3b45b', '#d876ff', '#ff6b8a'];

const createPieSeries = (innerRadiusRatio = 0): KChartSeries<SegmentPoint> => {
  type PieSegment = {
    point: SegmentPoint;
    value: number;
    startAngle: number;
    endAngle: number;
    color: string;
  };

  const pointOnCircle = (centerX: number, centerY: number, radius: number, angle: number): [number, number] => [
    centerX + Math.cos(angle) * radius,
    centerY + Math.sin(angle) * radius
  ];

  const createSegments = (points: SegmentPoint[]): PieSegment[] => {
    const total = points.reduce((sum, point) => sum + Math.max(0, point.value), 0) || 1;
    let cursor = -Math.PI / 2;
    return points.map((point, index) => {
      const value = Math.max(0, point.value);
      const angle = (value / total) * Math.PI * 2;
      const segment = { point, value, startAngle: cursor, endAngle: cursor + angle, color: palette[index % palette.length] };
      cursor += angle;
      return segment;
    });
  };

  const describeSegment = (segment: PieSegment, centerX: number, centerY: number, outerRadius: number, innerRadius: number): string => {
    const [outerStartX, outerStartY] = pointOnCircle(centerX, centerY, outerRadius, segment.startAngle);
    const [outerEndX, outerEndY] = pointOnCircle(centerX, centerY, outerRadius, segment.endAngle);
    const largeArcFlag = segment.endAngle - segment.startAngle > Math.PI ? 1 : 0;
    if (innerRadius <= 0) {
      return `M${centerX},${centerY} L${outerStartX},${outerStartY} A${outerRadius},${outerRadius} 0 ${largeArcFlag} 1 ${outerEndX},${outerEndY} Z`;
    }
    const [innerEndX, innerEndY] = pointOnCircle(centerX, centerY, innerRadius, segment.endAngle);
    const [innerStartX, innerStartY] = pointOnCircle(centerX, centerY, innerRadius, segment.startAngle);
    return `M${outerStartX},${outerStartY} A${outerRadius},${outerRadius} 0 ${largeArcFlag} 1 ${outerEndX},${outerEndY} L${innerEndX},${innerEndY} A${innerRadius},${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX},${innerStartY} Z`;
  };

  const normalizeAngle = (angle: number): number => {
    let normalized = angle;
    while (normalized < -Math.PI / 2) normalized += Math.PI * 2;
    while (normalized >= Math.PI * 1.5) normalized -= Math.PI * 2;
    return normalized;
  };

  return createCustomSeries<SegmentPoint>({
    selector: 'pie-segments',
    displayName: 'Share',
    xField: 'label',
    yField: 'value',
    render({ group, data: points, plotSize }) {
      const centerX = plotSize.width / 2;
      const centerY = plotSize.height / 2 + 8;
      const outerRadius = Math.max(92, Math.min(plotSize.width, plotSize.height) * 0.34);
      const innerRadius = outerRadius * innerRadiusRatio;
      const segments = createSegments(points);
      const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

      group.selectAll<SVGPathElement, PieSegment>('path.pie-segment')
        .data(segments)
        .join('path')
        .attr('class', 'pie-segment')
        .attr('d', (segment) => describeSegment(segment, centerX, centerY, outerRadius, innerRadius))
        .style('fill', (segment) => segment.color)
        .style('fill-opacity', 0.84)
        .style('stroke', '#101720')
        .style('stroke-width', 2);

      group.selectAll<SVGTextElement, PieSegment>('text.pie-label')
        .data(segments)
        .join('text')
        .attr('class', 'pie-label')
        .attr('x', (segment) => pointOnCircle(centerX, centerY, outerRadius + 28, (segment.startAngle + segment.endAngle) / 2)[0])
        .attr('y', (segment) => pointOnCircle(centerX, centerY, outerRadius + 28, (segment.startAngle + segment.endAngle) / 2)[1])
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('fill', 'rgba(226, 232, 240, 0.86)')
        .style('font-size', '12px')
        .style('font-weight', 700)
        .text((segment) => `${segment.point.label} ${Math.round((segment.value / total) * 100)}%`);
    },
    tooltip({ data: points, plotSize, seriesGroup, mouseX, mouseY }) {
      const centerX = plotSize.width / 2;
      const centerY = plotSize.height / 2 + 8;
      const outerRadius = Math.max(92, Math.min(plotSize.width, plotSize.height) * 0.34);
      const innerRadius = outerRadius * innerRadiusRatio;
      const distance = Math.hypot(mouseX - centerX, mouseY - centerY);
      const angle = normalizeAngle(Math.atan2(mouseY - centerY, mouseX - centerX));
      const total = points.reduce((sum, point) => sum + Math.max(0, point.value), 0) || 1;

      seriesGroup.selectAll<SVGPathElement, PieSegment>('path.pie-segment')
        .style('fill-opacity', 0.84)
        .style('stroke', '#101720');

      if (distance > outerRadius || distance < innerRadius) return undefined;
      const segment = createSegments(points).find((item) => angle >= item.startAngle && angle <= item.endAngle);
      if (!segment) return undefined;

      seriesGroup.selectAll<SVGPathElement, PieSegment>('path.pie-segment')
        .filter((item) => item.point === segment.point)
        .style('fill-opacity', 1)
        .style('stroke', '#f8fafc');

      const midAngle = (segment.startAngle + segment.endAngle) / 2;
      const [x, y] = pointOnCircle(centerX, centerY, outerRadius * 0.62, midAngle);
      return {
        data: segment.point,
        x,
        y,
        distance: 0,
        color: segment.color,
        html: `<strong style="color:${segment.color}">${segment.point.label}</strong><br/>value: ${segment.value}<br/>share: ${Math.round((segment.value / total) * 100)}%`
      };
    }
  });
};

const chart = createKChart<SegmentPoint>({
  selector: '#chart',
  data,
  width: 920,
  height: 500,
  margin: { top: 88, right: 36, bottom: 42, left: 36 },
  title: { text: 'Market Share Pie Chart', align: 'left', fontSize: 18 },
  grid: { visible: false },
  legend: { visible: false },
  tooltip: { visible: true },
  axes: [],
  series: [createPieSeries(0)]
});

chart.render();

window.addEventListener('resize', () => {
  const panel = document.querySelector<HTMLElement>('.chart-panel');
  if (!panel) return;
  chart.resize({ width: Math.max(panel.clientWidth - 48, 320), height: 500 });
});
