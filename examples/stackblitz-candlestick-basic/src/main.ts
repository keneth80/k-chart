import { createCanvasCandlestickSeries, createKChart } from '@keneth80/k-chart';
import './style.css';

interface StockPoint {
  label: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const createStockData = (length: number): StockPoint[] => {
  const result: StockPoint[] = [];
  let currentDate = new Date('2024-01-02T00:00:00');
  let previousClose = 104;
  let previousAdjustedClose = 104;

  while (result.length < length) {
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) {
      const index = result.length;
      const trend = Math.sin(index / 24) * 8 + index * 0.045;
      const swing = Math.sin(index / 3.4) * 2.8 + Math.cos(index / 5.7) * 1.7;
      const open = previousClose + Math.sin(index / 4.8) * 1.4;
      const close = open + swing * 0.72 + Math.sin(index / 2.3) * 0.9;
      const high = Math.max(open, close) + 1.6 + Math.abs(Math.sin(index / 2.8)) * 2.4;
      const low = Math.min(open, close) - 1.5 - Math.abs(Math.cos(index / 3.1)) * 2.1;

      result.push({
        label: new Date(currentDate),
        open: Number((open + trend).toFixed(2)),
        high: Number((high + trend).toFixed(2)),
        low: Number((low + trend).toFixed(2)),
        close: Number((close + trend).toFixed(2)),
        previousClose: Number(previousAdjustedClose.toFixed(2))
      });
      previousClose = close;
      previousAdjustedClose = close + trend;
    }
    currentDate = addDays(currentDate, 1);
  }

  return result;
};

const data = createStockData(260);
const domain = [addDays(data[0].label, -8), addDays(data[data.length - 1].label, 8)];

const chart = createKChart<StockPoint>({
  selector: '#chart',
  data,
  width: 920,
  height: 460,
  margin: { top: 88, right: 36, bottom: 58, left: 64 },
  title: { text: 'Canvas Candlestick Renderer', align: 'left', fontSize: 18 },
  grid: { visible: true, x: false, y: true, color: 'rgba(148, 163, 184, 0.22)', dasharray: '3 8' },
  legend: { visible: true, placement: 'top', selectable: true },
  tooltip: {
    visible: true,
    formatter: ({ data: point }) => `
      <strong>${point.label.toISOString().slice(0, 10)}</strong>
      <div>O ${point.open} / H ${point.high}</div>
      <div>L ${point.low} / C ${point.close}</div>
    `
  },
  zoom: {
    enabled: true,
    mode: 'wheel',
    direction: 'x',
    scaleExtent: [1, 80],
    wheelZoom: { enabled: true, devices: 'pc', sensitivity: 0.85 },
    gestureZoom: { enabled: true, devices: 'mobile', minTouches: 1 },
    resetOnDoubleClick: true
  },
  axes: [
    { field: 'label', type: 'time', placement: 'bottom', title: 'Trading Day', tickCount: 8, domain },
    { field: 'close', type: 'number', placement: 'left', title: 'Price', domainFields: ['low', 'high'] }
  ],
  series: [
    createCanvasCandlestickSeries({
      selector: 'stock-ohlc',
      displayName: 'OHLC',
      xField: 'label',
      openField: 'open',
      highField: 'high',
      lowField: 'low',
      closeField: 'close',
      colorMode: 'previous-close',
      previousCloseField: 'previousClose',
      upColor: '#56d08f',
      downColor: '#ff6b8a',
      neutralColor: '#f3b45b',
      wickColor: 'rgba(237, 243, 248, 0.78)',
      minCandleWidth: 2,
      maxCandleWidth: 10
    })
  ]
});

chart.render();
