import {
    createCanvasCandlestickSeries,
    createKChart
} from '@keneth80/k-chart';

interface StockPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number): Date => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const createStockData = (length: number): StockPoint[] => {
    const data: StockPoint[] = [];
    let currentDate = new Date('2024-01-02T00:00:00');
    let previousClose = 104;

    while (data.length < length) {
        const day = currentDate.getDay();
        if (day !== 0 && day !== 6) {
            const index = data.length;
            const trend = Math.sin(index / 24) * 8 + index * 0.045;
            const swing = Math.sin(index / 3.4) * 2.8 + Math.cos(index / 5.7) * 1.7;
            const open = previousClose + Math.sin(index / 4.8) * 1.4;
            const close = open + swing * 0.72 + Math.sin(index / 2.3) * 0.9;
            const high = Math.max(open, close) + 1.6 + Math.abs(Math.sin(index / 2.8)) * 2.4;
            const low = Math.min(open, close) - 1.5 - Math.abs(Math.cos(index / 3.1)) * 2.1;

            data.push({
                date: formatDate(currentDate),
                open: Number((open + trend).toFixed(2)),
                high: Number((high + trend).toFixed(2)),
                low: Number((low + trend).toFixed(2)),
                close: Number((close + trend).toFixed(2))
            });
            previousClose = close;
        }
        currentDate = addDays(currentDate, 1);
    }

    return data;
};

const data = createStockData(520);
const domain = [
    formatDate(addDays(new Date(data[0].date), -8)),
    formatDate(addDays(new Date(data[data.length - 1].date), 8))
];

createKChart<StockPoint>({
    selector: '#chart',
    data,
    axes: [
        { field: 'date', type: 'time', placement: 'bottom', tickCount: 8, domain },
        {
            field: 'close',
            type: 'number',
            placement: 'left',
            title: 'Price',
            domainFields: ['low', 'high']
        }
    ],
    title: {
        text: 'Candlestick Chart'
    },
    tooltip: {
        visible: true
    },
    zoom: {
        enabled: true,
        mode: 'wheel',
        direction: 'x',
        scaleExtent: [1, 120],
        wheelZoom: { enabled: true, devices: 'pc', sensitivity: 0.85 },
        gestureZoom: { enabled: true, devices: 'mobile', minTouches: 1 },
        resetOnDoubleClick: true
    },
    series: [
        createCanvasCandlestickSeries({
            selector: 'price',
            displayName: 'Price',
            xField: 'date',
            openField: 'open',
            highField: 'high',
            lowField: 'low',
            closeField: 'close',
            upColor: '#22c55e',
            downColor: '#ef4444'
        })
    ]
}).render();
