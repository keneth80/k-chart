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

const data: StockPoint[] = [
    { date: '2026-06-01', open: 101, high: 108, low: 98, close: 106 },
    { date: '2026-06-02', open: 106, high: 110, low: 102, close: 103 },
    { date: '2026-06-03', open: 103, high: 112, low: 101, close: 111 },
    { date: '2026-06-04', open: 111, high: 116, low: 107, close: 114 },
    { date: '2026-06-05', open: 114, high: 115, low: 105, close: 107 }
];

createKChart<StockPoint>({
    selector: '#chart',
    data,
    axes: [
        { field: 'date', type: 'time', placement: 'bottom', tickCount: 5, domain: ['2026-05-31', '2026-06-06'] },
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
