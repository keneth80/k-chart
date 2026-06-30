import { createCustomSeries, createKChart } from '@keneth80/k-chart';
import './style.css';

interface MonthPoint {
  label: string;
  x: number;
  value: number;
}

const data: MonthPoint[] = [
  { label: 'Jan', x: 1, value: 34 },
  { label: 'Feb', x: 2, value: 42 },
  { label: 'Mar', x: 3, value: 38 },
  { label: 'Apr', x: 4, value: 56 },
  { label: 'May', x: 5, value: 51 },
  { label: 'Jun', x: 6, value: 64 }
];

const isInsideRoundedRect = (
  mouseX: number,
  mouseY: number,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  if (mouseX < x || mouseX > x + width || mouseY < y || mouseY > y + height) {
    return false;
  }
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) return true;
  const left = x + r;
  const right = x + width - r;
  const top = y + r;
  const bottom = y + height - r;
  if ((mouseX >= left && mouseX <= right) || (mouseY >= top && mouseY <= bottom)) {
    return true;
  }
  const cornerX = mouseX < left ? left : right;
  const cornerY = mouseY < top ? top : bottom;
  return Math.hypot(mouseX - cornerX, mouseY - cornerY) <= r;
};

const columnSeries = createCustomSeries<MonthPoint>({
  selector: 'custom-column',
  displayName: 'Column',
  xField: 'x',
  yField: 'value',
  color: '#5db8ff',
  render({ group, data, xScale, yScale, plotSize }) {
    if (!xScale || !yScale) return;

    const barWidth = Math.max(24, plotSize.width / Math.max(data.length, 1) * 0.48);
    group.selectAll<SVGRectElement, MonthPoint>('rect.demo-column')
      .data(data)
      .join('rect')
      .attr('class', 'demo-column')
      .attr('x', (point) => xScale.scale(point.x) - barWidth / 2)
      .attr('y', (point) => yScale.scale(point.value))
      .attr('width', barWidth)
      .attr('height', (point) => plotSize.height - yScale.scale(point.value))
      .attr('rx', 7)
      .style('fill', '#5db8ff')
      .style('fill-opacity', 0.86)
      .style('stroke', 'transparent')
      .style('stroke-width', 0);
  },
  tooltip({ data, scales, plotSize, seriesGroup, mouseX, mouseY }) {
    const xScale = scales.find((scale) => scale.field === 'x');
    const yScale = scales.find((scale) => scale.field === 'value');
    if (!xScale || !yScale) return undefined;

    seriesGroup.selectAll<SVGRectElement, MonthPoint>('rect.demo-column')
      .style('fill-opacity', 0.86)
      .style('stroke', 'transparent')
      .style('stroke-width', 0);

    const barWidth = Math.max(24, plotSize.width / Math.max(data.length, 1) * 0.48);
    for (const point of data) {
      const x = xScale.scale(point.x);
      const y = yScale.scale(point.value);
      const height = plotSize.height - y;
      if (isInsideRoundedRect(mouseX, mouseY, x - barWidth / 2, y, barWidth, height, 7)) {
        seriesGroup.selectAll<SVGRectElement, MonthPoint>('rect.demo-column')
          .filter((item) => item === point)
          .style('fill-opacity', 1)
          .style('stroke', '#f8fbff')
          .style('stroke-width', 2);

        return {
          data: point,
          x,
          y,
          distance: 0,
          color: '#5db8ff',
          html: `<strong style="color:#5db8ff">${point.label}</strong><br/>value: ${point.value}`
        };
      }
    }
    return undefined;
  },
  clearTooltip({ seriesGroup }) {
    seriesGroup.selectAll<SVGRectElement, MonthPoint>('rect.demo-column')
      .style('fill-opacity', 0.86)
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
  title: { text: 'Custom SVG Column Renderer', align: 'left', fontSize: 18 },
  grid: { visible: true, x: false, y: true, color: 'rgba(148, 163, 184, 0.22)', dasharray: '3 8' },
  legend: { visible: true, placement: 'top', selectable: true },
  tooltip: { visible: true },
  axes: [
    { field: 'x', type: 'number', placement: 'bottom', min: 0, max: 7, title: 'Month Index' },
    { field: 'value', type: 'number', placement: 'left', min: 0, max: 72, title: 'Value' }
  ],
  series: [columnSeries]
});

chart.render();
