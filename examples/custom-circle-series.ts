import {
    createKChart,
    createCustomSeries,
    KChartController
} from '../src';

interface CirclePoint {
    x: number;
    y: number;
    radius: number;
}

const data: CirclePoint[] = [
    { x: 1, y: 12, radius: 8 },
    { x: 2, y: 18, radius: 12 },
    { x: 3, y: 9, radius: 6 }
];

const circleSeries = createCustomSeries<CirclePoint>({
    selector: 'custom-circle',
    displayName: 'Custom Circle',
    xField: 'x',
    yField: 'y',
    render({ group, data: seriesData, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        group.selectAll('.custom-circle')
            .data(seriesData)
            .join('circle')
            .attr('class', 'custom-circle')
            .attr('cx', (point: CirclePoint) => xScale.scale(point.x))
            .attr('cy', (point: CirclePoint) => yScale.scale(point.y))
            .attr('r', (point: CirclePoint) => point.radius)
            .style('fill', color ?? '#58a6ff')
            .style('fill-opacity', 0.6)
            .style('stroke', '#ffffff')
            .style('stroke-width', 1.5);
    }
});

const chart: KChartController<CirclePoint> = createKChart<CirclePoint>({
    selector: '#chart',
    data,
    axes: [
        { field: 'x', type: 'number', placement: 'bottom', min: 0, max: 4 },
        { field: 'y', type: 'number', placement: 'left', min: 0, max: 24 }
    ],
    series: [
        circleSeries
    ]
});

chart.render();
