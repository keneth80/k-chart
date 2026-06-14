import {
    createKChart,
    createSvgGlobeSeries
} from '@keneth80/k-chart';

interface CityPoint {
    name: string;
    lat: number;
    lon: number;
    radius: number;
    url: string;
}

const cities: CityPoint[] = [
    { name: 'Seoul', lat: 37.5665, lon: 126.9780, radius: 6, url: 'https://en.wikipedia.org/wiki/Seoul' },
    { name: 'New York', lat: 40.7128, lon: -74.0060, radius: 5, url: 'https://en.wikipedia.org/wiki/New_York_City' },
    { name: 'London', lat: 51.5072, lon: -0.1276, radius: 5, url: 'https://en.wikipedia.org/wiki/London' }
];

createKChart<CityPoint>({
    selector: '#chart',
    data: cities,
    margin: { top: 64, right: 20, bottom: 20, left: 20 },
    title: {
        text: 'Draggable Globe Markers'
    },
    grid: { visible: false },
    legend: { visible: false },
    tooltip: { visible: false },
    axes: [],
    series: [
        createSvgGlobeSeries({
            selector: 'cities',
            displayName: 'Cities',
            latField: 'lat',
            lonField: 'lon',
            labelField: 'name',
            initialRotate: [-120, -18, 0],
            zoom: { enabled: true, min: 0.65, max: 2.6, controls: { visible: true, x: 6, y: 6 } },
            landFill: '#22c55e',
            landStroke: 'rgba(236, 253, 245, 0.72)',
            landOpacity: 0.58,
            countryBordersStroke: 'rgba(236, 253, 245, 0.28)',
            markerRadius: (point) => point.radius,
            markerColor: '#5db8ff',
            onMarkerClick: ({ data }) => {
                window.open(data.url, '_blank', 'noopener,noreferrer');
            }
        })
    ]
}).render();
