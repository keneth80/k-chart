import { createCustomSeries, createKChart } from '@keneth80/k-chart';
import './style.css';

interface MonthPoint {
  label: string;
  x: number;
  value: number;
  volume: number;
  extra: number;
}

type StackSegment = { field: 'extra' | 'volume' | 'value'; label: string; color: string };
type StackDatum = { point: MonthPoint; segment: StackSegment; y0: number; y1: number };

const stackSegments: StackSegment[] = [
  { field: 'extra', label: 'Extra', color: '#f3b45b' },
  { field: 'volume', label: 'Volume', color: '#56d08f' },
  { field: 'value', label: 'Value', color: '#5db8ff' }
];

const data: MonthPoint[] = [
  { label: 'Jan', x: 1, value: 34, volume: 18, extra: 12 },
  { label: 'Feb', x: 2, value: 42, volume: 28, extra: 18 },
  { label: 'Mar', x: 3, value: 38, volume: 22, extra: 20 },
  { label: 'Apr', x: 4, value: 56, volume: 34, extra: 26 },
  { label: 'May', x: 5, value: 51, volume: 30, extra: 24 },
  { label: 'Jun', x: 6, value: 64, volume: 42, extra: 31 }
];

const isInsideRect = (mouseX: number, mouseY: number, x: number, y: number, width: number, height: number) =>
  mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height;

const formatTooltip = (point: MonthPoint) => {
  const rows = stackSegments.map((segment) => `
    <div style="display:flex;justify-content:space-between;gap:18px;color:${segment.color}">
      <span>${segment.label}</span><strong>${point[segment.field]}</strong>
    </div>`).join('');
  const total = stackSegments.reduce((sum, segment) => sum + point[segment.field], 0);
  return `<div style="min-width:150px"><strong>${point.label}</strong>${rows}<hr/>Total ${total}</div>`;
};

const stackedColumnSeries = createCustomSeries<MonthPoint>({
  selector: 'stacked-column',
  displayName: 'Stacked Column',
  xField: 'x',
  yField: 'value',
  render({ group, data, xScale, yScale, plotSize }) {
    if (!xScale || !yScale) return;

    const barWidth = Math.max(24, plotSize.width / Math.max(data.length, 1) * 0.48);
    const stacks = group.selectAll<SVGGElement, MonthPoint>('g.demo-stack')
      .data(data)
      .join('g')
      .attr('class', 'demo-stack');

    stacks.selectAll<SVGRectElement, StackDatum>('rect')
      .data((point) => {
        let offset = 0;
        return stackSegments.map((segment) => {
          const value = point[segment.field] * 0.42;
          const item = { point, segment, y0: offset, y1: offset + value };
          offset += value;
          return item;
        });
      })
      .join('rect')
      .attr('x', (item) => xScale.scale(item.point.x) - barWidth / 2)
      .attr('y', (item) => yScale.scale(item.y1))
      .attr('width', barWidth)
      .attr('height', (item) => yScale.scale(item.y0) - yScale.scale(item.y1))
      .attr('rx', 5)
      .style('fill', (item) => item.segment.color)
      .style('fill-opacity', 0.88)
      .style('stroke', 'transparent')
      .style('stroke-width', 0);
  },
  tooltip({ data, scales, plotSize, seriesGroup, mouseX, mouseY }) {
    const xScale = scales.find((scale) => scale.field === 'x');
    const yScale = scales.find((scale) => scale.field === 'value');
    if (!xScale || !yScale) return undefined;

    seriesGroup.selectAll<SVGRectElement, StackDatum>('g.demo-stack rect')
      .style('fill-opacity', 0.88)
      .style('stroke', 'transparent')
      .style('stroke-width', 0);

    const barWidth = Math.max(24, plotSize.width / Math.max(data.length, 1) * 0.48);
    for (const point of data) {
      const x = xScale.scale(point.x);
      let offset = 0;
      const totalScaled = stackSegments.reduce((sum, segment) => sum + point[segment.field] * 0.42, 0);
      for (const segment of stackSegments) {
        const value = point[segment.field] * 0.42;
        const y0 = yScale.scale(offset);
        const y1 = yScale.scale(offset + value);
        const top = Math.min(y0, y1);
        const bottom = Math.max(y0, y1);
        if (isInsideRect(mouseX, mouseY, x - barWidth / 2, top, barWidth, bottom - top)) {
          seriesGroup.selectAll<SVGRectElement, StackDatum>('g.demo-stack rect')
            .filter((item) => item.point === point)
            .style('fill-opacity', 1)
            .style('stroke', '#f8fbff')
            .style('stroke-width', 1.5);
          return { data: point, x, y: yScale.scale(totalScaled), distance: 0, html: formatTooltip(point) };
        }
        offset += value;
      }
    }
    return undefined;
  },
  clearTooltip({ seriesGroup }) {
    seriesGroup.selectAll<SVGRectElement, StackDatum>('g.demo-stack rect')
      .style('fill-opacity', 0.88)
      .style('stroke', 'transparent')
      .style('stroke-width', 0);
  }
});

const chart = createKChart<MonthPoint>({
  selector: '#chart',
  data,
  width: 920,
  height: 460,
  margin: { top: 88, right: 36, bottom: 58, left: 64 },
  title: { text: 'Custom SVG Stacked Column', align: 'left', fontSize: 18 },
  grid: { visible: true, x: false, y: true, color: 'rgba(148, 163, 184, 0.22)', dasharray: '3 8' },
  legend: { visible: true, placement: 'top', selectable: false },
  tooltip: { visible: true },
  axes: [
    { field: 'x', type: 'number', placement: 'bottom', min: 0, max: 7, title: 'Month Index' },
    { field: 'value', type: 'number', placement: 'left', min: 0, max: 72, title: 'Stacked Value' }
  ],
  series: [stackedColumnSeries]
});

chart.render();
