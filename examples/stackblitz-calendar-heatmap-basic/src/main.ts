import {createCustomSeries, createKChart} from '@keneth80/k-chart';
import './style.css';

interface CalendarDay {
  date: string;
  dateLabel: string;
  weekKey: string;
  dayLabel: string;
  cases: number;
}

const DAY_MS = 86_400_000;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PALETTE = ['#ffffd9', '#c7e9b4', '#7fcdbb', '#41b6c4', '#225ea8'];
const START = Date.UTC(2026, 0, 1);
const END = Date.UTC(2026, 5, 30);
const START_DAY_OFFSET = (new Date(START).getUTCDay() + 6) % 7;

const colorForCases = (value: number): string => {
  if (value < 24) return PALETTE[0];
  if (value < 38) return PALETTE[1];
  if (value < 52) return PALETTE[2];
  if (value < 65) return PALETTE[3];
  return PALETTE[4];
};

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC'
});

const data: CalendarDay[] = [];
for (let timestamp = START, dayIndex = 0; timestamp <= END; timestamp += DAY_MS, dayIndex += 1) {
  const date = new Date(timestamp);
  const day = (date.getUTCDay() + 6) % 7;
  const week = Math.floor((START_DAY_OFFSET + dayIndex) / 7);
  const weekdayBase = day < 5 ? 48 : 17;
  const seasonality = Math.sin(dayIndex / 13) * 11 + Math.cos(dayIndex / 31) * 7;
  const launchLift = date.getUTCMonth() === 2 || date.getUTCMonth() === 4 ? 13 : 0;
  const cases = Math.max(6, Math.round(weekdayBase + seasonality + launchLift + (dayIndex % 9)));

  data.push({
    date: date.toISOString().slice(0, 10),
    dateLabel: dateFormatter.format(date),
    weekKey: 'W' + String(week + 1).padStart(2, '0'),
    dayLabel: DAYS[day],
    cases
  });
}

const weekKeys = Array.from(new Set(data.map((point) => point.weekKey)));
const monthLabels = new Map<string, string>();
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
weekKeys.forEach((weekKey, index) => {
  const representativeDay = new Date(START + Math.max(0, index * 7 - START_DAY_OFFSET) * DAY_MS);
  monthLabels.set(weekKey, monthNames[Math.min(representativeDay.getUTCMonth(), 5)]);
});

const calendarSeries = createCustomSeries<CalendarDay>({
  selector: 'support-calendar',
  displayName: 'Cases opened',
  xField: 'weekKey',
  yField: 'dayLabel',
  color: PALETTE[3],
  render({group, data: points, xScale, yScale, plotSize}) {
    if (!xScale || !yScale) return;

    const stepX = xScale.scale.step?.() ?? plotSize.width / weekKeys.length;
    const stepY = yScale.scale.step?.() ?? plotSize.height / DAYS.length;
    const cellWidth = Math.max(3, stepX - Math.min(3, stepX * 0.2));
    const cellHeight = Math.max(8, stepY - Math.min(4, stepY * 0.18));

    const cells = group.selectAll<SVGRectElement, CalendarDay>('rect.calendar-cell')
      .data(points, (point: CalendarDay) => point.date)
      .join('rect')
      .attr('class', 'calendar-cell')
      .attr('x', (point) => xScale.scale(point.weekKey) - cellWidth / 2)
      .attr('y', (point) => yScale.scale(point.dayLabel) - cellHeight / 2)
      .attr('width', cellWidth)
      .attr('height', cellHeight)
      .attr('rx', Math.min(3, cellWidth / 4))
      .attr('aria-label', (point) => point.dateLabel + ': ' + point.cases + ' cases opened')
      .style('fill', (point) => colorForCases(point.cases))
      .style('stroke', '#ffffff')
      .style('stroke-width', 1);

    cells.selectAll('title')
      .data((point) => [point])
      .join('title')
      .text((point) => point.dateLabel + ': ' + point.cases + ' cases opened');
  },
  tooltip({data: points, scales, plotSize, seriesGroup, mouseX, mouseY}) {
    const xScale = scales.find((scale) => scale.field === 'weekKey');
    const yScale = scales.find((scale) => scale.field === 'dayLabel');
    if (!xScale || !yScale) return undefined;

    const stepX = xScale.scale.step?.() ?? plotSize.width / weekKeys.length;
    const stepY = yScale.scale.step?.() ?? plotSize.height / DAYS.length;
    const cellWidth = Math.max(3, stepX - Math.min(3, stepX * 0.2));
    const cellHeight = Math.max(8, stepY - Math.min(4, stepY * 0.18));

    seriesGroup.selectAll<SVGRectElement, CalendarDay>('rect.calendar-cell')
      .style('stroke', '#ffffff')
      .style('stroke-width', 1);

    for (const point of points) {
      const centerX = xScale.scale(point.weekKey);
      const centerY = yScale.scale(point.dayLabel);
      const inside = Math.abs(mouseX - centerX) <= cellWidth / 2
        && Math.abs(mouseY - centerY) <= cellHeight / 2;
      if (!inside) continue;

      seriesGroup.selectAll<SVGRectElement, CalendarDay>('rect.calendar-cell')
        .filter((item) => item === point)
        .style('stroke', '#152b2a')
        .style('stroke-width', 2);

      return {
        data: point,
        x: centerX,
        y: centerY,
        distance: 0,
        color: colorForCases(point.cases),
        html: '<strong>' + point.dateLabel + '</strong><br/>' + point.cases + ' cases opened'
      };
    }

    return undefined;
  },
  clearTooltip({seriesGroup}) {
    seriesGroup.selectAll<SVGRectElement, CalendarDay>('rect.calendar-cell')
      .style('stroke', '#ffffff')
      .style('stroke-width', 1);
  }
});

const chart = createKChart<CalendarDay>({
  selector: '#chart',
  data,
  height: 340,
  margin: {top: 66, right: 24, bottom: 28, left: 58},
  title: {text: 'H1 2026 case intake calendar', align: 'left', fontSize: 17},
  grid: {visible: false},
  legend: {visible: false},
  tooltip: {visible: true},
  axes: [
    {
      field: 'weekKey', type: 'point', placement: 'top', domain: weekKeys,
      padding: 0.5, tickCount: 6,
      tickFormat: (value) => monthLabels.get(String(value)) ?? ''
    },
    {
      field: 'dayLabel', type: 'point', placement: 'left', domain: [...DAYS].reverse(),
      padding: 0.5, tickCount: 7
    }
  ],
  series: [calendarSeries]
}).render();

const totalElement = document.querySelector<HTMLElement>('#case-total');
if (totalElement) {
  totalElement.textContent = data.reduce((sum, point) => sum + point.cases, 0).toLocaleString();
}

const chartElement = document.querySelector<HTMLElement>('#chart');
if (chartElement) {
  new ResizeObserver(() => chart.resize()).observe(chartElement);
}

window.addEventListener('beforeunload', () => chart.destroy());
