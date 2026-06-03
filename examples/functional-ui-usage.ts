import {
    createKChart,
    createLineSeries,
    KChartController
} from '../src';

interface TrafficPoint {
    time: string;
    value: number;
}

const data: TrafficPoint[] = [
    { time: '00:00', value: 12 },
    { time: '01:00', value: 18 }
];

const chart: KChartController<TrafficPoint> = createKChart<TrafficPoint>({
    selector: '#chart',
    data,
    axes: [
        { field: 'time', type: 'string', placement: 'bottom' },
        { field: 'value', type: 'number', placement: 'left' }
    ],
    series: [
        createLineSeries({
            selector: 'traffic',
            displayName: 'Traffic',
            xField: 'time',
            yField: 'value',
            curve: true,
            dot: true
        })
    ]
});

chart.render();

export function updateTraffic(nextData: TrafficPoint[]) {
    chart.updateData(nextData);
}

export function disposeTrafficChart() {
    chart.destroy();
}
