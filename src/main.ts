import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../packages/k-chart-maplibre/src/style.css';
import { area as d3Area, linkVertical } from 'd3-shape';
import {
    createMapLibreFlatMap,
    createMapLibreGlobeBridge,
    createMapLibrePlaceResolver,
    parseMapLibrePlaces
} from '../packages/k-chart-maplibre/src';
import type {
    KChartMapLibreController,
    KChartMapLibreGlobeBridge,
    KChartMapLibrePlace
} from '../packages/k-chart-maplibre/src';
import {
    createThreeConstellationSeries,
    ariesLinks,
    ariesNodes
} from '../examples/three-constellation-series';
import {
    createCanvasCandlestickSeries,
    createCanvasLineSeries,
    createCanvasPointSeries,
    createCursorLineOption,
    createCustomSeries,
    createGuideLineOption,
    createKChart,
    createLineSeries,
    createSpecAreaOption,
    createSvgGlobeSeries,
    createWebglLineSeries,
    createWebglPointSeries,
    KChartAxis,
    KChartController,
    KChartOption,
    KChartSeries
} from './index';

interface DemoPoint {
    [key: string]: string | number;
    label: string;
    x: number;
    value: number;
    volume: number;
    extra: number;
    radius: number;
    category: string;
    previousClose?: number;
}

type DemoKind =
    | 'line'
    | 'canvas-line'
    | 'canvas-candlestick'
    | 'webgl-line'
    | 'canvas-bigdata-line'
    | 'webgl-large-line'
    | 'column'
    | 'stacked-column'
    | 'plot'
    | 'area'
    | 'multi-options'
    | 'option-spec-area'
    | 'option-guide-line'
    | 'option-cursor-line'
    | 'axis-custom-margin'
    | 'tooltip-template'
    | 'tooltip-custom'
    | 'topology'
    | 'three-constellation'
    | 'globe-map'
    | 'globe-map-drilldown'
    | 'update-series'
    | 'update-data'
    | 'real-time'
    | 'circle'
    | 'canvas-point'
    | 'webgl-point';

interface ExampleMeta {
    kind: DemoKind;
    title: string;
    dataLabel?: string;
}

const baseData: DemoPoint[] = [
    { label: 'Jan', x: 1, value: 34, volume: 18, extra: 12, radius: 6, category: 'A' },
    { label: 'Feb', x: 2, value: 42, volume: 28, extra: 18, radius: 9, category: 'B' },
    { label: 'Mar', x: 3, value: 38, volume: 22, extra: 20, radius: 7, category: 'C' },
    { label: 'Apr', x: 4, value: 56, volume: 34, extra: 26, radius: 12, category: 'D' },
    { label: 'May', x: 5, value: 51, volume: 30, extra: 24, radius: 10, category: 'E' },
    { label: 'Jun', x: 6, value: 64, volume: 42, extra: 31, radius: 14, category: 'F' }
];

const globeData: DemoPoint[] = [
    { label: 'Seoul', x: 126.9780, value: 37.5665, volume: 1, extra: 1, radius: 6, category: 'Asia', lat: 37.5665, lon: 126.9780, url: 'https://en.wikipedia.org/wiki/Seoul' },
    { label: 'New York', x: -74.0060, value: 40.7128, volume: 1, extra: 1, radius: 5, category: 'North America', lat: 40.7128, lon: -74.0060, url: 'https://en.wikipedia.org/wiki/New_York_City' },
    { label: 'London', x: -0.1276, value: 51.5072, volume: 1, extra: 1, radius: 5, category: 'Europe', lat: 51.5072, lon: -0.1276, url: 'https://en.wikipedia.org/wiki/London' },
    { label: 'Sydney', x: 151.2093, value: -33.8688, volume: 1, extra: 1, radius: 5, category: 'Oceania', lat: -33.8688, lon: 151.2093, url: 'https://en.wikipedia.org/wiki/Sydney' },
    { label: 'Sao Paulo', x: -46.6333, value: -23.5505, volume: 1, extra: 1, radius: 5, category: 'South America', lat: -23.5505, lon: -46.6333, url: 'https://en.wikipedia.org/wiki/S%C3%A3o_Paulo' }
];

interface DemoPlace extends KChartMapLibrePlace {
    city: string;
}

const globePlaces = parseMapLibrePlaces<DemoPlace, DemoPlace>([
    { id: 'seoul-gyeongbokgung', city: 'Seoul', name: 'Gyeongbokgung Palace', category: 'Attraction', address: '161 Sajik-ro, Jongno-gu, Seoul', description: 'Main royal palace of the Joseon dynasty.', lat: 37.5796, lon: 126.9770 },
    { id: 'seoul-bukchon', city: 'Seoul', name: 'Bukchon Hanok Village', category: 'Attraction', address: '37 Gyedong-gil, Jongno-gu, Seoul', description: 'Traditional neighborhood with preserved hanok houses.', lat: 37.5826, lon: 126.9830 },
    { id: 'seoul-gwangjang', city: 'Seoul', name: 'Gwangjang Market', category: 'Restaurant', address: '88 Changgyeonggung-ro, Jongno-gu, Seoul', description: 'Market known for bindaetteok, mayak gimbap, and street food.', lat: 37.5700, lon: 126.9996 },
    { id: 'seoul-myeongdong-kyoja', city: 'Seoul', name: 'Myeongdong Kyoja', category: 'Restaurant', address: '29 Myeongdong 10-gil, Jung-gu, Seoul', description: 'Long-running kalguksu and dumpling restaurant.', lat: 37.5625, lon: 126.9856 },
    { id: 'seoul-namsan', city: 'Seoul', name: 'N Seoul Tower', category: 'Attraction', address: '105 Namsangongwon-gil, Yongsan-gu, Seoul', description: 'Observation tower overlooking central Seoul.', lat: 37.5512, lon: 126.9882 },
    { id: 'new-york-central-park', city: 'New York', name: 'Central Park', category: 'Attraction', address: 'New York, NY 10024', description: 'Large urban park in Manhattan.', lat: 40.7829, lon: -73.9654 },
    { id: 'new-york-katz', city: 'New York', name: "Katz's Delicatessen", category: 'Restaurant', address: '205 E Houston St, New York, NY', description: 'Historic delicatessen known for pastrami sandwiches.', lat: 40.7223, lon: -73.9874 },
    { id: 'london-tower-bridge', city: 'London', name: 'Tower Bridge', category: 'Attraction', address: 'Tower Bridge Rd, London', description: 'Landmark suspension bridge over the Thames.', lat: 51.5055, lon: -0.0754 },
    { id: 'london-borough-market', city: 'London', name: 'Borough Market', category: 'Restaurant', address: 'London SE1 9AL', description: 'Historic food market near London Bridge.', lat: 51.5055, lon: -0.0910 },
    { id: 'sydney-opera-house', city: 'Sydney', name: 'Sydney Opera House', category: 'Attraction', address: 'Bennelong Point, Sydney NSW', description: 'Performing arts center on Sydney Harbour.', lat: -33.8568, lon: 151.2153 },
    { id: 'sao-paulo-mercadao', city: 'Sao Paulo', name: 'Mercadao Municipal', category: 'Restaurant', address: 'Rua da Cantareira 306, Sao Paulo', description: 'Municipal market famous for local food.', lat: -23.5418, lon: -46.6291 }
], (place) => place);

const resolveGlobePlaces = createMapLibrePlaceResolver<DemoPoint, DemoPlace>(
    globePlaces,
    {
        getCityKey: (city) => city.label,
        getPlaceCityKey: (place) => place.city
    }
);

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number): Date => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const createStockData = (length: number): DemoPoint[] => {
    const data: DemoPoint[] = [];
    let currentDate = new Date('2024-01-02T00:00:00');
    let previousClose = 104;
    let previousAdjustedClose = 104;

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
            const adjustedOpen = open + trend;
            const adjustedClose = close + trend;
            const adjustedHigh = high + trend;
            const adjustedLow = low + trend;
            const label = formatDate(currentDate);

            data.push({
                label,
                x: index + 1,
                value: Number(adjustedClose.toFixed(2)),
                volume: Math.round(3200 + Math.abs(Math.sin(index / 4)) * 2800 + index * 12),
                extra: Number(adjustedOpen.toFixed(2)),
                radius: 3,
                category: label,
                open: Number(adjustedOpen.toFixed(2)),
                high: Number(adjustedHigh.toFixed(2)),
                low: Number(adjustedLow.toFixed(2)),
                close: Number(adjustedClose.toFixed(2)),
                previousClose: Number(previousAdjustedClose.toFixed(2))
            });
            previousClose = close;
            previousAdjustedClose = adjustedClose;
        }
        currentDate = addDays(currentDate, 1);
    }

    return data;
};

const stockData = createStockData(520);

const stockDomain = (): [string, string] => {
    const first = new Date(String(stockData[0].label));
    const last = new Date(String(stockData[stockData.length - 1].label));

    return [
        formatDate(addDays(first, -4)),
        formatDate(addDays(last, 4))
    ];
};

const createLargeData = (length: number): DemoPoint[] => Array.from({ length }, (_: unknown, index: number) => {
    const wave = Math.sin(index / 120) * 22 + Math.cos(index / 43) * 8;
    const drift = Math.sin(index / 2800) * 10;
    const noise = Math.sin(index * 0.017) * 3;

    const point: DemoPoint = {
        label: String(index),
        x: index,
        value: 52 + wave + drift + noise,
        volume: 42 + Math.cos(index / 150) * 16 + Math.sin(index / 61) * 7,
        extra: 30 + Math.sin(index / 210) * 12 + Math.cos(index / 80) * 5,
        radius: 1,
        category: String(index)
    };
    for (let signalIndex = 0; signalIndex < 10; signalIndex += 1) {
        point[`signal${signalIndex}`] = 48
            + Math.sin(index / (80 + signalIndex * 18)) * (12 + signalIndex)
            + Math.cos(index / (37 + signalIndex * 9)) * 5
            + signalIndex * 3;
    }

    return point;
});

const largeCanvasData = createLargeData(50000);
const largeWebglData = createLargeData(120000);
const createKChartRenderWorker = (): Worker => {
    const debugWindow = window as typeof window & {__kchartWorkerCreated?: number};
    debugWindow.__kchartWorkerCreated = (debugWindow.__kchartWorkerCreated ?? 0) + 1;
    console.info(`[KChart Demo] creating render worker #${debugWindow.__kchartWorkerCreated}`);

    return new Worker(
        new URL('./kchart-render.worker.ts', import.meta.url),
        { type: 'module' }
    );
};
const asyncLineRender = {
    enabled: true,
    workerFactory: createKChartRenderWorker
};
const largeWebglGuideLines = [
    { value: 1200, label: '1' },
    { value: 6200, label: '2' },
    { value: 24000, label: '3' },
    { value: 64000, label: '4' },
    { value: 102000, label: '5' },
    { value: 104600, label: '6' },
    { value: 106800, label: '7' },
    { value: 112200, label: '8' },
    { value: 114400, label: '9' },
    { value: 116000, label: '10' },
    { value: 118800, label: '11' }
];

let chart: KChartController<DemoPoint> | null = null;
let activeKind: DemoKind = 'line';
let realtimeTimer: number | undefined;

const examples: ExampleMeta[] = [
    { kind: 'line', title: 'SVG line renderer' },
    { kind: 'canvas-line', title: 'Canvas line renderer' },
    { kind: 'canvas-candlestick', title: 'Canvas candlestick renderer', dataLabel: 'OHLC' },
    { kind: 'webgl-line', title: 'WebGL line renderer' },
    { kind: 'canvas-bigdata-line', title: 'Canvas BigData line renderer', dataLabel: '50k points' },
    { kind: 'webgl-large-line', title: 'WebGL BigData line renderer', dataLabel: '120k points' },
    { kind: 'column', title: 'SVG column renderer' },
    { kind: 'stacked-column', title: 'SVG stacked column renderer' },
    { kind: 'plot', title: 'SVG plot renderer' },
    { kind: 'area', title: 'SVG area renderer' },
    { kind: 'multi-options', title: 'SVG multi series renderer' },
    { kind: 'globe-map', title: 'Globe marker zoom focus', dataLabel: 'same globe zoom' },
    { kind: 'globe-map-drilldown', title: 'Globe marker map drilldown', dataLabel: 'Mercator map focus' },
    { kind: 'option-spec-area', title: 'Spec area option' },
    { kind: 'option-guide-line', title: 'Guide line option' },
    { kind: 'option-cursor-line', title: 'Cursor line option' },
    { kind: 'axis-custom-margin', title: 'Axis custom margin' },
    { kind: 'tooltip-template', title: 'Tooltip template change' },
    { kind: 'tooltip-custom', title: 'Tooltip custom template' },
    { kind: 'topology', title: 'Topology renderer' },
    { kind: 'three-constellation', title: 'Three.js Aries constellation', dataLabel: '3D custom series' },
    { kind: 'update-series', title: 'Update series API' },
    { kind: 'update-data', title: 'Update data API' },
    { kind: 'real-time', title: 'Real time series API' },
    { kind: 'circle', title: 'Custom SVG circle renderer' },
    { kind: 'canvas-point', title: 'Canvas point renderer' },
    { kind: 'webgl-point', title: 'WebGL point renderer' }
];

const chartRoot = document.querySelector<HTMLElement>('#chart-div');
const configView = document.querySelector<HTMLElement>('#json-configuration');
const summary = document.querySelector<HTMLElement>('#example-filter-summary');
const themeLabel = document.querySelector<HTMLElement>('#current-theme-label');
const chartExampleLayout = document.querySelector<HTMLElement>('.container-chart-example');
let mapLibreController: KChartMapLibreController<DemoPlace> | undefined;
let mapLibreBridge: KChartMapLibreGlobeBridge<DemoPoint, DemoPlace> | undefined;

const setupMapLibreDemo = (): void => {
    if (!chartRoot) {
        return;
    }
    mapLibreController = createMapLibreFlatMap<DemoPlace>({
        container: chartRoot,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        initialZoom: 13,
        cluster: true,
        markerColor: '#0ea5e9'
    });
    mapLibreBridge = createMapLibreGlobeBridge(
        mapLibreController,
        resolveGlobePlaces,
        {
            getLabel: (city) => `${city.label} places`,
            zoom: 13
        }
    );
};

const isGlobeMapExample = (kind: DemoKind): boolean =>
    kind === 'globe-map' || kind === 'globe-map-drilldown';

const scaledX = (scale: any, value: unknown): number => {
    const position = scale.scale(value);
    return typeof scale.scale.bandwidth === 'function'
        ? position + scale.scale.bandwidth() / 2
        : position;
};

const bandStart = (scale: any, value: unknown): number => scale.scale(value);

const bandWidth = (scale: any, fallback = 24): number => typeof scale.scale.bandwidth === 'function'
    ? scale.scale.bandwidth()
    : fallback;

const svgColumnSeries = (selector: string, yField: 'value' | 'volume' | 'extra', color: string): KChartSeries<DemoPoint> => createCustomSeries<DemoPoint>({
    selector,
    displayName: yField === 'value' ? 'Value' : yField === 'volume' ? 'Volume' : 'Extra',
    xField: 'category',
    yField,
    color,
    render({ group, data, xScale, yScale }) {
        if (!xScale || !yScale) {
            return;
        }

        const width = bandWidth(xScale, 28);
        group.selectAll<SVGRectElement, DemoPoint>(`.${selector}`)
            .data(data)
            .join('rect')
            .attr('class', selector)
            .attr('x', (point) => bandStart(xScale, point.category))
            .attr('y', (point) => yScale.scale(point[yField]))
            .attr('width', width)
            .attr('height', (point) => yScale.scale(0) - yScale.scale(point[yField]))
            .attr('rx', 4)
            .style('fill', color)
            .style('opacity', 0.88);
    }
});

const stackedColumnSeries = createCustomSeries<DemoPoint>({
    selector: 'demo-stacked-column',
    displayName: 'Value + Volume',
    xField: 'category',
    yField: 'value',
    color: '#5db8ff',
    render({ group, data, xScale, yScale }) {
        if (!xScale || !yScale) {
            return;
        }

        const width = bandWidth(xScale, 28);
        const segments = data.flatMap((point) => [
            { category: point.category, y0: 0, y1: point.value, color: '#5db8ff' },
            { category: point.category, y0: point.value, y1: point.value + point.volume, color: '#f3b45b' }
        ]);

        group.selectAll<SVGRectElement, typeof segments[number]>('.demo-stacked-column-segment')
            .data(segments)
            .join('rect')
            .attr('class', 'demo-stacked-column-segment')
            .attr('x', (segment) => bandStart(xScale, segment.category))
            .attr('width', width)
            .attr('rx', 4)
            .attr('y', (segment) => yScale.scale(segment.y1))
            .attr('height', (segment) => yScale.scale(segment.y0) - yScale.scale(segment.y1))
            .style('fill', (segment) => segment.color)
            .style('opacity', 0.88);
    }
});

const areaSeries = createCustomSeries<DemoPoint>({
    selector: 'demo-area',
    displayName: 'Area',
    xField: 'x',
    yField: 'value',
    color: '#5db8ff',
    render({ group, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        const area = d3Area<DemoPoint>()
            .x((point) => scaledX(xScale, point.x))
            .y0(() => yScale.scale(0))
            .y1((point) => yScale.scale(point.value));

        group.selectAll<SVGPathElement, DemoPoint[]>('.demo-area-fill')
            .data([data])
            .join('path')
            .attr('class', 'demo-area-fill')
            .attr('d', area)
            .style('fill', color)
            .style('fill-opacity', 0.28);
    }
});

const circleSeries = createCustomSeries<DemoPoint>({
    selector: 'demo-circle',
    displayName: 'Custom Circles',
    xField: 'x',
    yField: 'value',
    color: '#f3b45b',
    render({ group, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        group.selectAll<SVGCircleElement, DemoPoint>('.demo-circle')
            .data(data)
            .join('circle')
            .attr('class', 'demo-circle')
            .attr('cx', (point) => scaledX(xScale, point.x))
            .attr('cy', (point) => yScale.scale(point.value))
            .attr('r', (point) => point.radius)
            .style('fill', color)
            .style('fill-opacity', 0.68)
            .style('stroke', '#f8fbff')
            .style('stroke-width', 1.4);
    }
});

const topologySeries = createCustomSeries<DemoPoint>({
    selector: 'demo-topology',
    displayName: 'Topology',
    color: '#5db8ff',
    render({ group, plotSize }) {
        type TopologyMember = {
            id: string;
            type: 'D' | 'C';
            machine: string;
            framework?: string;
            localX?: number;
            localY?: number;
        };
        type TopologyFramework = {
            id: string;
            placement: 'top' | 'bottom';
            members: TopologyMember[];
        };
        type TopologyMachine = {
            id: string;
            status: 'connected' | 'disconnected';
        };
        type TopologyPoint = {
            id: string;
            x: number;
            y: number;
            kind: 'member' | 'machine';
            machine?: string;
            framework?: string;
        };
        type TopologyLink = {
            id: string;
            memberId: string;
            machineId: string;
            frameworkId?: string;
            source: { x: number; y: number };
            target: { x: number; y: number };
        };

        const frameworks: TopologyFramework[] = [
            { id: 'TEST_CLEAN', placement: 'top', members: ['C1', 'C4', 'D1', 'D2', 'C2', 'C3'].map((id, index) => ({ id, type: id.startsWith('D') ? 'D' : 'C', machine: index < 2 ? 'M16-FW-01' : 'M16-FW-02' })) },
            { id: 'TEST_CMP', placement: 'top', members: ['D1', 'D2', 'C1', 'C2', 'C3', 'C4'].map((id, index) => ({ id, type: id.startsWith('D') ? 'D' : 'C', machine: index < 3 ? 'M16-FW-02' : 'M16-FW-03' })) },
            { id: 'TEST_CVD', placement: 'top', members: ['D1', 'D2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'].map((id, index) => ({ id, type: id.startsWith('D') ? 'D' : 'C', machine: index < 2 ? 'M16-FW-03' : `P3-Dummy-${Math.min(index, 12)}` })) },
            { id: 'TEST_DIFF', placement: 'top', members: ['D1', 'D2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map((id, index) => ({ id, type: id.startsWith('D') ? 'D' : 'C', machine: `P3-Dummy-${index + 3}` })) },
            { id: 'TEST_ETCH', placement: 'top', members: ['D1', 'D2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map((id, index) => ({ id, type: id.startsWith('D') ? 'D' : 'C', machine: `P3-Dummy-${index + 8}` })) },
            { id: 'TEST_IMP', placement: 'bottom', members: ['D1', 'D2', 'C1', 'C2', 'C3', 'C4'].map((id, index) => ({ id, type: id.startsWith('D') ? 'D' : 'C', machine: index < 2 ? 'M16-FW-01' : 'M16-FW-03' })) },
            { id: 'TEST_METAL', placement: 'bottom', members: ['D1', 'D2', 'C2', 'C3', 'C4', 'C5', 'C6', 'C1'].map((id, index) => ({ id, type: id.startsWith('D') ? 'D' : 'C', machine: `P3-Dummy-${index + 2}` })) },
            { id: 'TEST_PHOTO', placement: 'bottom', members: ['D1', 'D2', 'C8', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C9', 'C11'].map((id, index) => ({ id, type: id.startsWith('D') ? 'D' : 'C', machine: `P3-Dummy-${index + 5}` })) }
        ];
        const machines: TopologyMachine[] = [
            { id: 'M16-FW-01', status: 'connected' },
            { id: 'M16-FW-02', status: 'connected' },
            { id: 'M16-FW-03', status: 'disconnected' },
            ...Array.from({ length: 14 }, (_, index) => ({ id: `P3-Dummy-${index + 1}`, status: 'connected' as const }))
        ];
        const memberPositions = new Map<string, TopologyPoint>();
        const machinePositions = new Map<string, TopologyPoint>();
        const topFrameworks = frameworks.filter((item) => item.placement === 'top');
        const bottomFrameworks = frameworks.filter((item) => item.placement === 'bottom');
        const gap = 10;
        const titleHeight = 30;
        const memberWidth = Math.max(28, Math.min(42, (plotSize.width - gap * 10) / 44));
        const memberHeight = 62;
        const topY = 8;
        const machineY = plotSize.height * 0.44;
        const bottomY = plotSize.height - 122;
        const machineWidth = Math.max(44, Math.min(58, (plotSize.width - gap * (machines.length - 1)) / machines.length));

        const layoutFrameworks = (items: TopologyFramework[], y: number) => {
            const widths = items.map((item) => item.members.length * memberWidth + (item.members.length + 1) * 5);
            const total = widths.reduce((sum, width) => sum + width, 0) + gap * (items.length - 1);
            let x = Math.max(0, plotSize.width / 2 - total / 2);
            return items.map((item, index) => {
                const frame = { ...item, x, y, width: widths[index], height: 106 };
                x += widths[index] + gap;
                return frame;
            });
        };

        const laidOutFrameworks = [
            ...layoutFrameworks(topFrameworks, topY),
            ...layoutFrameworks(bottomFrameworks, bottomY)
        ];
        const machineTotal = machines.length * machineWidth + (machines.length - 1) * gap;
        const machineStart = Math.max(0, plotSize.width / 2 - machineTotal / 2);
        const laidOutMachines = machines.map((machine, index) => ({
            ...machine,
            x: machineStart + index * (machineWidth + gap),
            y: machineY,
            width: machineWidth,
            height: 72
        }));

        const linkPath = linkVertical<any, any>()
            .source((item) => item.source)
            .target((item) => item.target)
            .x((item) => item.x)
            .y((item) => item.y);

        group.selectAll('.demo-topology-background')
            .data([undefined])
            .join('rect')
            .attr('class', 'demo-topology-background')
            .attr('width', plotSize.width)
            .attr('height', plotSize.height)
            .style('fill', '#f4f5f7');

        const frameworkGroup = group.selectAll<SVGGElement, typeof laidOutFrameworks[number]>('.demo-topology-framework')
            .data(laidOutFrameworks)
            .join('g')
            .attr('class', 'demo-topology-framework')
            .attr('data-framework', (item) => item.id)
            .attr('transform', (item) => `translate(${item.x}, ${item.y})`);

        frameworkGroup.selectAll('rect.demo-topology-framework-bg')
            .data((item) => [item])
            .join('rect')
            .attr('class', 'demo-topology-framework-bg')
            .attr('rx', 6)
            .attr('width', (item) => item.width)
            .attr('height', (item) => item.height)
            .style('fill', '#e4e5e8');

        frameworkGroup.selectAll('text.demo-topology-framework-title')
            .data((item) => [item])
            .join('text')
            .attr('class', 'demo-topology-framework-title')
            .attr('x', 10)
            .attr('y', (item) => item.placement === 'top' ? 22 : item.height - 10)
            .style('fill', '#111827')
            .style('font-size', '16px')
            .style('font-weight', 700)
            .text((item) => item.id);

        frameworkGroup.selectAll<SVGGElement, TopologyMember>('.demo-topology-member')
            .data((item) => item.members.map((member, index) => {
                const x = 5 + index * (memberWidth + 5);
                const y = item.placement === 'top' ? titleHeight : 10;
                const key = `${item.id}-${member.id}`;
                memberPositions.set(key, {
                    id: key,
                    x: item.x + x + memberWidth / 2,
                    y: item.y + y + (item.placement === 'top' ? memberHeight : 0),
                    kind: 'member',
                    machine: member.machine,
                    framework: item.id
                });
                return {
                    ...member,
                    framework: item.id,
                    localX: x,
                    localY: y
                };
            }))
            .join('g')
            .attr('class', 'demo-topology-member')
            .attr('data-machine', (member) => member.machine)
            .attr('data-framework', (member) => member.framework ?? '')
            .attr('data-member', (member) => `${member.framework}-${member.id}`)
            .attr('transform', (member) => `translate(${member.localX ?? 0}, ${member.localY ?? 0})`);

        const memberGroup = group.selectAll<SVGGElement, TopologyMember>('.demo-topology-member');
        memberGroup.selectAll('rect.demo-topology-member-card')
            .data((member) => [member])
            .join('rect')
            .attr('class', 'demo-topology-member-card')
            .attr('rx', 5)
            .attr('width', memberWidth)
            .attr('height', memberHeight)
            .style('fill', '#ffffff')
            .style('stroke', '#d6d8dc');

        memberGroup.selectAll('rect.demo-topology-member-icon')
            .data((member) => [member])
            .join('rect')
            .attr('class', 'demo-topology-member-icon')
            .attr('x', memberWidth * 0.18)
            .attr('y', 14)
            .attr('width', memberWidth * 0.64)
            .attr('height', 18)
            .attr('rx', 2)
            .style('fill', '#eceeef')
            .style('stroke', '#b9bdc2');

        memberGroup.selectAll('text.demo-topology-member-label')
            .data((member) => [member])
            .join('text')
            .attr('class', 'demo-topology-member-label')
            .attr('x', memberWidth / 2)
            .attr('y', 50)
            .style('fill', '#1f2937')
            .style('font-size', '11px')
            .style('font-weight', 700)
            .style('text-anchor', 'middle')
            .text((member) => member.id);

        const machineGroup = group.selectAll<SVGGElement, typeof laidOutMachines[number]>('.demo-topology-machine')
            .data(laidOutMachines)
            .join('g')
            .attr('class', 'demo-topology-machine')
            .attr('data-machine', (machine) => machine.id)
            .attr('transform', (machine) => {
                machinePositions.set(machine.id, {
                    id: machine.id,
                    x: machine.x + machine.width / 2,
                    y: machine.y,
                    kind: 'machine'
                });
                return `translate(${machine.x}, ${machine.y})`;
            });

        machineGroup.selectAll('rect.demo-topology-machine-card')
            .data((machine) => [machine])
            .join('rect')
            .attr('class', 'demo-topology-machine-card')
            .attr('rx', 5)
            .attr('width', (machine) => machine.width)
            .attr('height', (machine) => machine.height)
            .style('fill', '#ffffff')
            .style('stroke', '#d6d8dc');

        machineGroup.selectAll('rect.demo-topology-machine-icon')
            .data((machine) => [machine])
            .join('rect')
            .attr('class', 'demo-topology-machine-icon')
            .attr('x', (machine) => machine.width * 0.22)
            .attr('y', 16)
            .attr('width', (machine) => machine.width * 0.56)
            .attr('height', 24)
            .attr('rx', 2)
            .style('fill', '#f2fff0')
            .style('stroke', '#7ed957')
            .style('stroke-width', 1.5);

        machineGroup.selectAll('circle.demo-topology-machine-state')
            .data((machine) => [machine])
            .join('circle')
            .attr('class', 'demo-topology-machine-state')
            .attr('cx', (machine) => machine.width - 8)
            .attr('cy', 14)
            .attr('r', 7)
            .style('fill', (machine) => machine.status === 'connected' ? '#7ed957' : '#d1d5db')
            .style('stroke', '#5fbf3f');

        machineGroup.selectAll('text.demo-topology-machine-label')
            .data((machine) => [machine])
            .join('text')
            .attr('class', 'demo-topology-machine-label')
            .attr('x', (machine) => machine.width / 2)
            .attr('y', 64)
            .style('fill', '#1f2937')
            .style('font-size', '11px')
            .style('font-weight', 700)
            .style('text-anchor', 'middle')
            .text((machine) => machine.id.length > 9 ? `${machine.id.slice(0, 7)}...` : machine.id);

        const links = Array.from(memberPositions.values())
            .map((member) => {
                const machine = member.machine ? machinePositions.get(member.machine) : undefined;
                if (!machine) {
                    return undefined;
                }
                return {
                    id: `${member.id}-${machine.id}`,
                    memberId: member.id,
                    machineId: machine.id,
                    frameworkId: member.framework,
                    source: member.y < machine.y
                        ? { x: member.x, y: member.y }
                        : { x: member.x, y: member.y },
                    target: member.y < machine.y
                        ? { x: machine.x, y: machine.y }
                        : { x: machine.x, y: machine.y + 72 }
                };
            })
            .filter(Boolean) as TopologyLink[];

        group.selectAll<SVGPathElement, typeof links[number]>('.demo-topology-link')
            .data(links)
            .join('path')
            .attr('class', 'demo-topology-link')
            .attr('data-machine', (item) => item.machineId)
            .attr('data-member', (item) => item.memberId)
            .attr('data-framework', (item) => item.frameworkId ?? '')
            .attr('d', (item) => linkPath(item))
            .style('fill', 'none')
            .style('stroke', '#8c8f94')
            .style('stroke-width', 1)
            .style('opacity', 0.72)
            .style('pointer-events', 'none');

        const resetHighlight = () => {
            group.selectAll('.demo-topology-link').style('stroke', '#8c8f94').style('opacity', 0.72).style('stroke-width', 1);
            group.selectAll('.demo-topology-member, .demo-topology-machine, .demo-topology-framework').style('opacity', 1);
            group.selectAll('.demo-topology-member-card, .demo-topology-machine-card, .demo-topology-framework-bg').style('stroke', '#d6d8dc').style('stroke-width', 1);
        };
        const applyLinkHighlight = (predicate: (link: SVGPathElement) => boolean) => {
            group.selectAll<SVGPathElement, unknown>('.demo-topology-link')
                .style('opacity', function() {
                    return predicate(this as SVGPathElement) ? 1 : 0.12;
                })
                .style('stroke', function() {
                    return predicate(this as SVGPathElement) ? '#0384fc' : '#8c8f94';
                })
                .style('stroke-width', function() {
                    return predicate(this as SVGPathElement) ? 2 : 1;
                });
        };
        const highlightMachine = (machineId: string) => {
            applyLinkHighlight((link) => link.getAttribute('data-machine') === machineId);
            group.selectAll('.demo-topology-member')
                .style('opacity', function() {
                    return (this as SVGGElement).getAttribute('data-machine') === machineId ? 1 : 0.22;
                });
            group.selectAll('.demo-topology-machine')
                .style('opacity', function() {
                    return (this as SVGGElement).getAttribute('data-machine') === machineId ? 1 : 0.22;
                });
            group.selectAll('.demo-topology-framework')
                .style('opacity', function() {
                    return (this as SVGGElement).querySelector(`[data-machine="${machineId}"]`) ? 1 : 0.28;
                });
            group.selectAll('.demo-topology-machine-card')
                .style('stroke', function() {
                    return (this as SVGElement).parentElement?.getAttribute('data-machine') === machineId ? '#0384fc' : '#d6d8dc';
                })
                .style('stroke-width', function() {
                    return (this as SVGElement).parentElement?.getAttribute('data-machine') === machineId ? 2 : 1;
                });
        };
        const highlightMember = (memberId: string, machineId: string, frameworkId: string) => {
            applyLinkHighlight((link) => link.getAttribute('data-member') === memberId);
            group.selectAll('.demo-topology-member')
                .style('opacity', function() {
                    return (this as SVGGElement).getAttribute('data-member') === memberId ? 1 : 0.18;
                });
            group.selectAll('.demo-topology-machine')
                .style('opacity', function() {
                    return (this as SVGGElement).getAttribute('data-machine') === machineId ? 1 : 0.18;
                });
            group.selectAll('.demo-topology-framework')
                .style('opacity', function() {
                    return (this as SVGGElement).getAttribute('data-framework') === frameworkId ? 1 : 0.22;
                });
            group.selectAll('.demo-topology-member-card')
                .style('stroke', function() {
                    return (this as SVGElement).parentElement?.getAttribute('data-member') === memberId ? '#0384fc' : '#d6d8dc';
                })
                .style('stroke-width', function() {
                    return (this as SVGElement).parentElement?.getAttribute('data-member') === memberId ? 2 : 1;
                });
            group.selectAll('.demo-topology-machine-card')
                .style('stroke', function() {
                    return (this as SVGElement).parentElement?.getAttribute('data-machine') === machineId ? '#0384fc' : '#d6d8dc';
                })
                .style('stroke-width', function() {
                    return (this as SVGElement).parentElement?.getAttribute('data-machine') === machineId ? 2 : 1;
                });
        };
        const highlightFramework = (frameworkId: string) => {
            const machineIds = new Set(links
                .filter((link) => link.frameworkId === frameworkId)
                .map((link) => link.machineId));
            applyLinkHighlight((link) => link.getAttribute('data-framework') === frameworkId);
            group.selectAll('.demo-topology-member')
                .style('opacity', function() {
                    return (this as SVGGElement).getAttribute('data-framework') === frameworkId ? 1 : 0.18;
                });
            group.selectAll('.demo-topology-machine')
                .style('opacity', function() {
                    const machineId = (this as SVGGElement).getAttribute('data-machine') ?? '';
                    return machineIds.has(machineId) ? 1 : 0.18;
                });
            group.selectAll('.demo-topology-framework')
                .style('opacity', function() {
                    return (this as SVGGElement).getAttribute('data-framework') === frameworkId ? 1 : 0.22;
                });
            group.selectAll('.demo-topology-framework-bg')
                .style('stroke', function() {
                    return (this as SVGElement).parentElement?.getAttribute('data-framework') === frameworkId ? '#0384fc' : '#d6d8dc';
                })
                .style('stroke-width', function() {
                    return (this as SVGElement).parentElement?.getAttribute('data-framework') === frameworkId ? 2 : 1;
                });
            group.selectAll('.demo-topology-machine-card')
                .style('stroke', function() {
                    const machineId = (this as SVGElement).parentElement?.getAttribute('data-machine') ?? '';
                    return machineIds.has(machineId) ? '#0384fc' : '#d6d8dc';
                })
                .style('stroke-width', function() {
                    const machineId = (this as SVGElement).parentElement?.getAttribute('data-machine') ?? '';
                    return machineIds.has(machineId) ? 2 : 1;
                });
        };

        frameworkGroup
            .on('mouseover', (event, framework) => {
                if ((event.target as Element).closest('.demo-topology-member')) {
                    return;
                }
                highlightFramework(framework.id);
            })
            .on('mouseout', (event) => {
                const current = event.currentTarget as SVGGElement;
                const relatedNode = event.relatedTarget as Node | null;
                if (relatedNode && current.contains(relatedNode)) {
                    return;
                }
                resetHighlight();
            });
        group.selectAll<SVGGElement, typeof laidOutMachines[number]>('.demo-topology-machine')
            .on('mouseover', (event, machine) => {
                event.stopPropagation();
                highlightMachine(machine.id);
            })
            .on('mouseout', (event) => {
                event.stopPropagation();
                const current = event.currentTarget as SVGGElement;
                const relatedNode = event.relatedTarget as Node | null;
                if (relatedNode && current.contains(relatedNode)) {
                    return;
                }
                resetHighlight();
            });
        group.selectAll<SVGGElement, TopologyMember>('.demo-topology-member')
            .on('mouseover', (event, member) => {
                event.stopPropagation();
                highlightMember(`${member.framework}-${member.id}`, member.machine, member.framework ?? '');
            })
            .on('mouseout', (event, member) => {
                event.stopPropagation();
                const current = event.currentTarget as SVGGElement;
                const relatedNode = event.relatedTarget as Node | null;
                if (relatedNode && current.contains(relatedNode)) {
                    return;
                }
                const frameworkNode = current.parentElement;
                if (frameworkNode && relatedNode && frameworkNode.contains(relatedNode)) {
                    highlightFramework(member.framework ?? '');
                    return;
                }
                resetHighlight();
            });
    }
});

const resolveDemoData = (kind: DemoKind): DemoPoint[] => {
    if (kind === 'webgl-large-line') {
        return largeWebglData;
    }
    if (kind === 'canvas-bigdata-line') {
        return largeCanvasData;
    }
    if (kind === 'canvas-candlestick') {
        return stockData;
    }
    if (isGlobeMapExample(kind)) {
        return globeData;
    }
    if (kind === 'three-constellation') {
        return ariesNodes.map((node) => ({
            ...node,
            value: node.y,
            volume: node.z,
            extra: node.size,
            radius: node.size,
            category: 'Aries'
        })) as DemoPoint[];
    }
    return baseData;
};

const createAxes = (kind: DemoKind): KChartAxis<DemoPoint>[] => {
    if (isGlobeMapExample(kind) || kind === 'three-constellation') {
        return [];
    }
    if (kind === 'column') {
        return [
            { field: 'category', type: 'string' as const, placement: 'bottom' as const, title: 'Month' },
            { field: 'value', type: 'number' as const, placement: 'left' as const, min: 0, max: 72, title: 'Value' }
        ];
    }
    if (kind === 'stacked-column') {
        return [
            { field: 'category', type: 'string' as const, placement: 'bottom' as const, title: 'Month' },
            { field: 'value', type: 'number' as const, placement: 'left' as const, min: 0, max: 120, title: 'Stacked Value' }
        ];
    }
    if (kind === 'canvas-candlestick') {
        return [
            { field: 'label', type: 'time' as const, placement: 'bottom' as const, title: 'Trading Day', tickCount: 8, domain: stockDomain() },
            { field: 'close', type: 'number' as const, placement: 'left' as const, title: 'Price', domainFields: ['low', 'high'] }
        ];
    }
    if (kind === 'webgl-large-line' || kind === 'canvas-bigdata-line') {
        const max = kind === 'webgl-large-line' ? largeWebglData.length - 1 : largeCanvasData.length - 1;
        return [
            { field: 'x', type: 'number' as const, placement: 'bottom' as const, min: 0, max, title: 'Sample Index', tickCount: 6, tickFormat: (value: number) => `${Math.round(value / 1000)}k` },
            { field: 'value', type: 'number' as const, placement: 'left' as const, min: 0, max: 100, title: 'Signal', tickCount: 5 }
        ];
    }
    if (kind === 'multi-options') {
        return [
            { field: 'x', type: 'number' as const, placement: 'bottom' as const, min: 0, max: 7, title: 'Month Index' },
            { field: 'value', type: 'number' as const, placement: 'left' as const, min: 0, max: 72, title: 'Value' },
            { field: 'volume', type: 'number' as const, placement: 'right' as const, min: 0, max: 48, title: 'Volume' }
        ];
    }
    return [
        { field: 'x', type: 'number' as const, placement: 'bottom' as const, min: 0, max: 7, title: 'Month Index' },
        { field: kind === 'canvas-point' ? 'volume' as const : 'value' as const, type: 'number' as const, placement: 'left' as const, min: 0, max: 72, title: kind === 'canvas-point' ? 'Volume' : 'Value' }
    ];
};

const createSeries = (kind: DemoKind): KChartSeries<DemoPoint>[] => {
    if (kind === 'canvas-line' || kind === 'canvas-bigdata-line') {
        const prefix = `demo-${kind}`;
        const asyncRender = kind === 'canvas-bigdata-line' ? asyncLineRender : undefined;
        return [
            createCanvasLineSeries({ selector: `${prefix}-value`, displayName: kind === 'canvas-bigdata-line' ? '50k Value' : 'Canvas Value', xField: 'x', yField: 'value', color: '#5db8ff', lineWidth: 2, asyncRender }),
            createCanvasLineSeries({ selector: `${prefix}-volume`, displayName: kind === 'canvas-bigdata-line' ? '50k Volume' : 'Canvas Volume', xField: 'x', yField: 'volume', color: '#56d08f', lineWidth: 2, asyncRender }),
            createCanvasLineSeries({ selector: `${prefix}-extra`, displayName: kind === 'canvas-bigdata-line' ? '50k Extra' : 'Canvas Extra', xField: 'x', yField: 'extra', color: '#f3b45b', lineWidth: 2, asyncRender })
        ];
    }
    if (kind === 'webgl-line' || kind === 'webgl-large-line') {
        const prefix = `demo-${kind}`;
        if (kind === 'webgl-large-line') {
            const colors = ['#5db8ff', '#56d08f', '#f3b45b', '#d876ff', '#ff6b8a', '#72e4ff', '#a8d95f', '#ff9f5a', '#9ca3ff', '#f2f7ff'];
            return colors.map((color, index) => createWebglLineSeries({
                selector: `${prefix}-signal-${index}`,
                displayName: `Trace ${index + 1}`,
                xField: 'x',
                yField: `signal${index}`,
                color,
                lineWidth: 1,
                asyncRender: asyncLineRender
            }));
        }

        return [
            createWebglLineSeries({ selector: `${prefix}-value`, displayName: 'WebGL Value', xField: 'x', yField: 'value', color: '#5db8ff', lineWidth: 1 }),
            createWebglLineSeries({ selector: `${prefix}-volume`, displayName: 'WebGL Volume', xField: 'x', yField: 'volume', color: '#56d08f', lineWidth: 1 }),
            createWebglLineSeries({ selector: `${prefix}-extra`, displayName: 'WebGL Extra', xField: 'x', yField: 'extra', color: '#f3b45b', lineWidth: 1 })
        ];
    }
    if (kind === 'column') {
        return [svgColumnSeries('demo-column', 'value', '#5db8ff')];
    }
    if (kind === 'stacked-column') {
        return [stackedColumnSeries];
    }
    if (kind === 'canvas-candlestick') {
        return [
            createCanvasCandlestickSeries({
                selector: 'demo-candlestick',
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
        ];
    }
    if (isGlobeMapExample(kind)) {
        const drilldownMode = kind === 'globe-map-drilldown' ? 'external-map' : 'zoom';
        return [
            createSvgGlobeSeries({
                selector: 'demo-globe',
                displayName: 'Cities',
                latField: 'lat',
                lonField: 'lon',
                labelField: 'label',
                initialRotate: [-120, -18, 0],
                zoom: { enabled: true, min: 0.65, max: 3, controls: { visible: true, x: 6, y: 6 } },
                sphereFill: 'rgba(14, 58, 91, 0.94)',
                sphereStroke: 'rgba(148, 163, 184, 0.65)',
                graticuleStroke: 'rgba(148, 163, 184, 0.24)',
                landFill: '#22c55e',
                landStroke: 'rgba(236, 253, 245, 0.72)',
                landOpacity: 0.58,
                countryBordersStroke: 'rgba(236, 253, 245, 0.28)',
                countryBordersStrokeWidth: 0.55,
                markerRadius: (point) => Number(point.radius) || 5,
                markerColor: '#5db8ff',
                drilldown: {
                    enabled: true,
                    mode: drilldownMode,
                    autoMapOnZoom: kind === 'globe-map-drilldown',
                    mapZoomThreshold: 2.4,
                    globeZoomThreshold: 1.8,
                    focusZoom: 2.7,
                    zoomScale: 7,
                    duration: 1200,
                    resetControl: true,
                    landFill: '#38bdf8',
                    landStroke: 'rgba(240, 249, 255, 0.78)',
                    landOpacity: 0.5,
                    onEnter: mapLibreBridge?.onEnter,
                    onExit: mapLibreBridge?.onExit
                }
            })
        ];
    }
    if (kind === 'plot') {
        return [createLineSeries({ selector: 'demo-plot-anchor', displayName: 'Plot Points', xField: 'x', yField: 'value', color: '#5db8ff', strokeWidth: 0, dot: { radius: 6, stroke: '#f8fbff' } })];
    }
    if (kind === 'area') {
        return [areaSeries, createLineSeries({ selector: 'demo-area-line', displayName: 'Area Outline', xField: 'x', yField: 'value', color: '#5db8ff', strokeWidth: 2, curve: true })];
    }
    if (kind === 'multi-options' || kind === 'update-series') {
        return [
            createLineSeries({ selector: 'demo-line', displayName: 'Value', xField: 'x', yField: 'value', color: '#5db8ff', strokeWidth: 3, curve: true, dot: true }),
            createCanvasPointSeries({ selector: 'demo-canvas-point', displayName: 'Volume Points', xField: 'x', yField: 'volume', color: '#f3b45b', radius: (point: DemoPoint) => point.radius, stroke: 'rgba(255, 255, 255, 0.78)', strokeWidth: 1.5 })
        ];
    }
    if (kind === 'topology') {
        return [topologySeries];
    }
    if (kind === 'three-constellation') {
        return [
            createThreeConstellationSeries<DemoPoint>({
                selector: 'demo-three-constellation',
                displayName: 'Aries',
                idField: 'id',
                labelField: 'label',
                xField: 'x',
                yField: 'y',
                zField: 'z',
                sizeField: 'size',
                colorField: 'color',
                links: ariesLinks,
                autoRotate: true,
                onNodeClick: (node) => {
                    console.info(`[KChart Three] selected ${node.label}`);
                }
            })
        ];
    }
    if (kind === 'circle') {
        return [circleSeries];
    }
    if (kind === 'canvas-point') {
        return [createCanvasPointSeries({ selector: 'demo-canvas-point', displayName: 'Canvas Points', xField: 'x', yField: 'volume', color: '#56d08f', radius: (point: DemoPoint) => point.radius, stroke: 'rgba(255, 255, 255, 0.78)', strokeWidth: 1.5 })];
    }
    if (kind === 'webgl-point') {
        return [createWebglPointSeries({ selector: 'demo-webgl-point', displayName: 'WebGL Points', xField: 'x', yField: 'value', color: '#5db8ff', pointSize: (point: DemoPoint) => point.radius * 3 })];
    }
    return [
        createLineSeries({ selector: 'demo-line-value', displayName: 'Value', xField: 'x', yField: 'value', color: '#5db8ff', strokeWidth: 3, curve: true, dot: { radius: 4, stroke: '#f8fbff' } }),
        createLineSeries({ selector: 'demo-line-volume', displayName: 'Volume', xField: 'x', yField: 'volume', color: '#56d08f', strokeWidth: 3, curve: true, dot: { radius: 4, stroke: '#f8fbff' } }),
        createLineSeries({ selector: 'demo-line-extra', displayName: 'Extra', xField: 'x', yField: 'extra', color: '#f3b45b', strokeWidth: 3, curve: true, dot: { radius: 4, stroke: '#f8fbff' } })
    ];
};

const createOptions = (kind: DemoKind): KChartOption[] => {
    const isBigData = kind === 'webgl-large-line' || kind === 'canvas-bigdata-line';
    const hasSpecAreas = kind === 'webgl-large-line' || kind === 'canvas-bigdata-line' || kind === 'option-spec-area';
    const hasFixedGuideLines = kind === 'webgl-large-line' || kind === 'option-guide-line';
    const hasCursorGuide = kind === 'webgl-line'
        || kind === 'webgl-large-line'
        || kind === 'canvas-bigdata-line'
        || kind === 'line'
        || kind === 'option-cursor-line';
    const options: KChartOption[] = [];

    if (hasSpecAreas) {
        options.push(createSpecAreaOption([
            { start: isBigData ? 18000 : 2, end: isBigData ? 36000 : 3.5, label: 'STEP 02', color: 'rgba(216, 118, 255, 0.16)' },
            { start: isBigData ? 62000 : 4.5, end: isBigData ? 78000 : 5.8, label: 'STEP 05', color: 'rgba(93, 184, 255, 0.13)' },
            { start: isBigData ? 93000 : 6.2, end: isBigData ? 112000 : 7, label: 'STEP 08', color: 'rgba(243, 180, 91, 0.14)' }
        ]));
    }

    if (hasFixedGuideLines) {
        options.push(createGuideLineOption({
            visible: true,
            x: (kind === 'webgl-large-line'
                ? largeWebglGuideLines
                : [
                    { value: 2, label: 'A' },
                    { value: 4, label: 'B' },
                    { value: 6, label: 'C' }
                ]).map((item) => ({
                ...item,
                color: 'rgba(248, 251, 255, 0.24)',
                dasharray: 'none',
                labelBackground: 'rgba(10, 14, 20, 0.72)'
            })),
            y: kind === 'option-guide-line'
                ? [
                    { value: 36, label: 'LOW', color: 'rgba(93, 184, 255, 0.5)', dasharray: '4 6' },
                    { value: 58, label: 'HIGH', color: 'rgba(255, 107, 138, 0.55)', dasharray: '4 6' }
                ]
                : undefined
        }));
    }

    if (hasCursorGuide) {
        options.push(createCursorLineOption({
            visible: true,
            color: 'rgba(248, 251, 255, 0.72)',
            markerRadius: 3,
            valueFormat: (value: number) => Number(value).toFixed(1),
            xFormat: (value: number) => isBigData
                ? `${Math.round(Number(value) / 1000)}k`
                : String(value)
        }));
    }

    return options;
};

const createDemoChart = (kind: DemoKind, overrideData?: DemoPoint[]): KChartController<DemoPoint> => {
    const data = overrideData ?? resolveDemoData(kind);
    const isBigData = kind === 'webgl-large-line' || kind === 'canvas-bigdata-line';
    const hasInteractiveZoom = isBigData || kind === 'canvas-candlestick';
    const isTopology = kind === 'topology';
    const isThreeConstellation = kind === 'three-constellation';
    const isGlobeMap = isGlobeMapExample(kind);

    return createKChart<DemoPoint>({
        selector: chartRoot,
        data,
        width: kind === 'topology'
            ? Math.max(1400, chartRoot?.clientWidth || 760)
            : chartRoot?.clientWidth || 760,
        height: kind === 'topology'
            ? 620
            : isThreeConstellation
                ? 520
            : chartRoot?.clientHeight || 420,
        margin: kind === 'axis-custom-margin'
            ? { top: 82, right: 76, bottom: 70, left: 86 }
            : kind === 'topology'
                ? { top: 10, right: 10, bottom: 10, left: 10 }
                : isThreeConstellation
                    ? { top: 74, right: 20, bottom: 20, left: 20 }
                : isGlobeMap
                    ? { top: 74, right: 20, bottom: 20, left: 20 }
                    : kind === 'webgl-large-line'
                        ? { top: 170, right: 28, bottom: 44, left: 52 }
                        : { top: 104, right: 28, bottom: 44, left: 52 },
        title: kind === 'topology' ? undefined : {
            text: examples.find((example) => example.kind === kind)?.title ?? 'KChart Example',
            align: 'left',
            fontSize: 14
        },
        grid: {
            visible: !isTopology && !isGlobeMap && !isThreeConstellation,
            x: false,
            y: true,
            color: 'rgba(188, 206, 218, 0.18)',
            dasharray: '2 6'
        },
        options: createOptions(kind),
        legend: {
            visible: kind !== 'topology' && !isGlobeMap && !isThreeConstellation,
            placement: 'top'
        },
        tooltip: {
            visible: !isBigData && !isTopology && !isGlobeMap && !isThreeConstellation,
            formatter: kind === 'tooltip-template'
                ? ({ data: item }) => `<strong>${item.label}</strong><br/>Revenue ${item.value}<br/>Volume ${item.volume}`
                : kind === 'tooltip-custom'
                    ? ({ data: item, color }) => `<div style="color:${color};font-weight:700">Custom Tooltip</div><div>${item.label}: ${item.value} / ${item.volume}</div>`
                    : undefined
        },
        zoom: hasInteractiveZoom ? {
            enabled: true,
            mode: kind === 'canvas-candlestick' ? 'wheel' : 'both',
            direction: 'x',
            scaleExtent: kind === 'canvas-candlestick' ? [1, 120] : [1, 80],
            wheelZoom: { enabled: true, devices: 'pc', sensitivity: 0.85 },
            gestureZoom: { enabled: true, devices: 'mobile', minTouches: 1 },
            resetOnDoubleClick: true
        } : undefined,
        axes: isTopology || isThreeConstellation ? [] : createAxes(kind),
        series: createSeries(kind)
    });
};

const createSeriesSnippet = (kind: DemoKind): string => {
    if (kind === 'column') {
        return `createCustomSeries({
    selector: 'demo-column',
    xField: 'category',
    yField: 'value',
    render({ group, data, xScale, yScale }) {
        // draw SVG rect columns from chart scales
    }
})`;
    }
    if (kind === 'stacked-column') {
        return `createCustomSeries({
    selector: 'demo-stacked-column',
    render({ group, data, xScale, yScale }) {
        // draw stacked SVG rect segments
    }
})`;
    }
    if (kind === 'canvas-candlestick') {
        return `createCanvasCandlestickSeries({
    selector: 'demo-candlestick',
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
    wickColor: 'rgba(237, 243, 248, 0.78)'
})`;
    }
    if (kind === 'area') {
        return `createCustomSeries({
    selector: 'demo-area',
    xField: 'x',
    yField: 'value',
    render({ group, data, xScale, yScale, color }) {
        // draw d3-shape area path with the resolved scales
    }
})`;
    }
    if (kind === 'topology') {
        return `createCustomSeries({
    selector: 'demo-topology',
    render({ group, plotSize }) {
        // draw nodes and links inside the plot area
    }
})`;
    }
    if (kind === 'three-constellation') {
        return `createThreeConstellationSeries({
    selector: 'demo-three-constellation',
    displayName: 'Aries',
    idField: 'id',
    labelField: 'label',
    xField: 'x',
    yField: 'y',
    zField: 'z',
    sizeField: 'size',
    colorField: 'color',
    links: ariesLinks,
    autoRotate: true,
    onNodeClick: (node) => console.log(node.label)
})`;
    }
    if (isGlobeMapExample(kind)) {
        const drilldownMode = kind === 'globe-map-drilldown' ? 'external-map' : 'zoom';
        return `createSvgGlobeSeries({
    selector: 'demo-globe',
    displayName: 'Cities',
    latField: 'lat',
    lonField: 'lon',
    labelField: 'label',
    initialRotate: [-120, -18, 0],
    zoom: { enabled: true, min: 0.65, max: 3, controls: { visible: true, x: 6, y: 6 } },
    landFill: '#22c55e',
    landStroke: 'rgba(236, 253, 245, 0.72)',
    landOpacity: 0.58,
    countryBordersStroke: 'rgba(236, 253, 245, 0.28)',
    markerColor: '#5db8ff',
    markerRadius: (point) => Number(point.radius) || 5,
    drilldown: {
        enabled: true,
        mode: '${drilldownMode}',
        autoMapOnZoom: ${kind === 'globe-map-drilldown'},
        mapZoomThreshold: 2.4,
        globeZoomThreshold: 1.8,
        focusZoom: 2.7,
        zoomScale: 7,
        duration: 1200,
        resetControl: true,
        onEnter: mapBridge.onEnter,
        onExit: mapBridge.onExit,
        landFill: '#38bdf8',
        landStroke: 'rgba(240, 249, 255, 0.78)',
        landOpacity: 0.5
    }
})`;
    }
    if (kind === 'canvas-line' || kind === 'canvas-bigdata-line') {
        return `createCanvasLineSeries({
    selector: 'demo-${kind}-value',
    displayName: '${kind === 'canvas-bigdata-line' ? '50k Value' : 'Canvas Value'}',
    xField: 'x',
    yField: 'value',
    color: '#5db8ff',
    lineWidth: 2
}),
createCanvasLineSeries({
    selector: 'demo-${kind}-volume',
    displayName: '${kind === 'canvas-bigdata-line' ? '50k Volume' : 'Canvas Volume'}',
    xField: 'x',
    yField: 'volume',
    color: '#56d08f',
    lineWidth: 2
}),
createCanvasLineSeries({
    selector: 'demo-${kind}-extra',
    displayName: '${kind === 'canvas-bigdata-line' ? '50k Extra' : 'Canvas Extra'}',
    xField: 'x',
    yField: 'extra',
    color: '#f3b45b',
    lineWidth: 2
})`;
    }
    if (kind === 'webgl-line' || kind === 'webgl-large-line') {
        return `createWebglLineSeries({
    selector: 'demo-${kind}-value',
    displayName: '${kind === 'webgl-large-line' ? '120k Value' : 'WebGL Value'}',
    xField: 'x',
    yField: 'value',
    color: '#5db8ff',
    lineWidth: 1
}),
createWebglLineSeries({
    selector: 'demo-${kind}-volume',
    displayName: '${kind === 'webgl-large-line' ? '120k Volume' : 'WebGL Volume'}',
    xField: 'x',
    yField: 'volume',
    color: '#56d08f',
    lineWidth: 1
}),
createWebglLineSeries({
    selector: 'demo-${kind}-extra',
    displayName: '${kind === 'webgl-large-line' ? '120k Extra' : 'WebGL Extra'}',
    xField: 'x',
    yField: 'extra',
    color: '#f3b45b',
    lineWidth: 1
})`;
    }
    if (kind === 'canvas-point') {
        return `createCanvasPointSeries({
    selector: 'demo-canvas-point',
    xField: 'x',
    yField: 'volume',
    radius: (point) => point.radius
})`;
    }
    if (kind === 'webgl-point') {
        return `createWebglPointSeries({
    selector: 'demo-webgl-point',
    xField: 'x',
    yField: 'value',
    pointSize: (point) => point.radius * 3
})`;
    }
    if (kind === 'multi-options' || kind === 'update-series') {
        return `createLineSeries({ selector: 'demo-line', xField: 'x', yField: 'value', curve: true, dot: true }),
createCanvasPointSeries({ selector: 'demo-canvas-point', xField: 'x', yField: 'volume' })`;
    }
    if (kind === 'circle') {
        return `createCustomSeries({
    selector: 'demo-circle',
    render({ group, data, xScale, yScale, color }) {
        // draw SVG circles with injected scales
    }
})`;
    }
    return `createLineSeries({
    selector: 'demo-line-value',
    displayName: 'Value',
    xField: 'x',
    yField: 'value',
    curve: true,
    dot: true
}),
createLineSeries({
    selector: 'demo-line-volume',
    displayName: 'Volume',
    xField: 'x',
    yField: 'volume',
    curve: true,
    dot: true
}),
createLineSeries({
    selector: 'demo-line-extra',
    displayName: 'Extra',
    xField: 'x',
    yField: 'extra',
    curve: true,
    dot: true
})`;
};

const createUsageSnippet = (kind: DemoKind): string => {
    const selected = examples.find((example) => example.kind === kind);
    const isUsageGlobeMap = isGlobeMapExample(kind);
    const hasUsageSpecAreas = kind === 'webgl-large-line' || kind === 'canvas-bigdata-line' || kind === 'option-spec-area';
    const hasUsageGuideLines = kind === 'webgl-large-line' || kind === 'option-guide-line';
    const hasUsageCursorGuide = kind === 'webgl-line'
        || kind === 'webgl-large-line'
        || kind === 'canvas-bigdata-line'
        || kind === 'line'
        || kind === 'option-cursor-line';
    const dataExpression = kind === 'webgl-large-line'
        ? 'createLargeData(120000)'
        : kind === 'canvas-bigdata-line'
            ? 'createLargeData(50000)'
            : kind === 'canvas-candlestick'
                ? 'stockData'
                : kind === 'three-constellation'
                    ? 'ariesNodes'
                : isUsageGlobeMap
                    ? 'globeData'
                    : 'baseData';
    const dataSnippet = kind === 'three-constellation'
        ? `
type ConstellationNode = {
    id: string;
    label: string;
    x: number;
    y: number;
    z: number;
    size: number;
    color: string;
};

const ariesNodes: ConstellationNode[] = [
    { id: 'mesarthim', label: 'Mesarthim · γ Ari', x: -2.25, y: -0.78, z: 0.08, size: 0.82, color: '#f8fcff' },
    { id: 'sheratan', label: 'Sheratan · β Ari', x: -2.08, y: -0.34, z: -0.06, size: 1.15, color: '#e8f5ff' },
    { id: 'hamal', label: 'Hamal · α Ari', x: -1.05, y: 0.62, z: 0.1, size: 1.55, color: '#fff7e8' },
    { id: 'botein', label: 'Botein · δ Ari', x: 1.95, y: -0.62, z: 0.04, size: 0.78, color: '#f2f8ff' },
    { id: 'bharani', label: 'Bharani · 41 Ari', x: 0.82, y: 1.78, z: -0.12, size: 0.9, color: '#e1f2ff' }
];

const ariesLinks = [
    { source: 'mesarthim', target: 'sheratan' },
    { source: 'sheratan', target: 'hamal' },
    { source: 'hamal', target: 'botein' },
    { source: 'hamal', target: 'bharani' }
];
`
        : kind === 'canvas-candlestick'
        ? `
type StockPoint = {
    label: string;
    x: number;
    open: number;
    high: number;
    low: number;
    close: number;
    previousClose: number;
};

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
    let previousAdjustedClose = 104;

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
                label: formatDate(currentDate),
                x: index + 1,
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

    return data;
};

const stockData = createStockData(520);
const stockDomain = [
    formatDate(addDays(new Date(stockData[0].label), -4)),
    formatDate(addDays(new Date(stockData[stockData.length - 1].label), 4))
];
`
        : isUsageGlobeMap
        ? `
type GlobePoint = {
    label: string;
    lat: number;
    lon: number;
    radius: number;
    url: string;
};

const globeData: GlobePoint[] = [
    { label: 'Seoul', lat: 37.5665, lon: 126.9780, radius: 6, url: 'https://en.wikipedia.org/wiki/Seoul' },
    { label: 'New York', lat: 40.7128, lon: -74.0060, radius: 5, url: 'https://en.wikipedia.org/wiki/New_York_City' },
    { label: 'London', lat: 51.5072, lon: -0.1276, radius: 5, url: 'https://en.wikipedia.org/wiki/London' }
];
${kind === 'globe-map-drilldown' ? `
type Place = KChartMapLibrePlace & { city: string };

const placeApiData = [
    { id: 'palace', city: 'Seoul', title: 'Gyeongbokgung Palace', category: 'Attraction', address: '161 Sajik-ro, Jongno-gu, Seoul', latitude: '37.5796', longitude: '126.9770' },
    { id: 'market', city: 'Seoul', title: 'Gwangjang Market', category: 'Restaurant', address: '88 Changgyeonggung-ro, Jongno-gu, Seoul', latitude: '37.5700', longitude: '126.9996' }
];

const places = parseMapLibrePlaces<(typeof placeApiData)[number], Place>(
    placeApiData,
    (item) => ({
        id: item.id,
        city: item.city,
        name: item.title,
        category: item.category,
        address: item.address,
        lat: Number(item.latitude),
        lon: Number(item.longitude)
    })
);

const resolvePlaces = createMapLibrePlaceResolver<GlobePoint, Place>(places, {
    getCityKey: (city) => city.label,
    getPlaceCityKey: (place) => place.city
});

const flatMap = createMapLibreFlatMap({
    container: '#chart-div',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    initialZoom: 13
});

const mapBridge = createMapLibreGlobeBridge(
    flatMap,
    resolvePlaces,
    { getLabel: (city: GlobePoint) => \`\${city.label} places\` }
);
` : ''}
`
        : kind === 'webgl-large-line' || kind === 'canvas-bigdata-line'
        ? `
type DemoPoint = {
    label: string;
    x: number;
    value: number;
    volume: number;
    extra: number;
    [key: string]: string | number;
};

const createLargeData = (length: number): DemoPoint[] =>
    Array.from({ length }, (_, index) => {
        const point: DemoPoint = {
            label: String(index),
            x: index,
            value: 52 + Math.sin(index / 120) * 22,
            volume: 42 + Math.cos(index / 150) * 16,
            extra: 30 + Math.sin(index / 210) * 12
        };

        for (let signalIndex = 0; signalIndex < 10; signalIndex += 1) {
            point[\`signal\${signalIndex}\`] =
                48 + Math.sin(index / (80 + signalIndex * 18)) * (12 + signalIndex);
        }

        return point;
    });
`
        : `
type DemoPoint = {
    label: string;
    x: number;
    value: number;
    volume: number;
    extra: number;
};

const baseData = [
    { label: 'Jan', x: 1, value: 34, volume: 18, extra: 12 },
    { label: 'Feb', x: 2, value: 42, volume: 28, extra: 18 },
    { label: 'Mar', x: 3, value: 38, volume: 22, extra: 20 }
];
`;

    return `import {
    createCanvasLineSeries,
    createCanvasCandlestickSeries,
    createCanvasPointSeries,
    createCursorLineOption,
    createCustomSeries,
    createGuideLineOption,
    createKChart,
    createLineSeries,
    createSpecAreaOption,
    createSvgGlobeSeries,
    createWebglLineSeries,
    createWebglPointSeries
} from '@keneth80/k-chart';
${kind === 'three-constellation' ? `import {
    createThreeConstellationSeries
} from './three-constellation-series';
` : ''}${kind === 'globe-map-drilldown' ? `import {
    createMapLibreFlatMap,
    createMapLibreGlobeBridge,
    createMapLibrePlaceResolver,
    parseMapLibrePlaces
} from '@keneth80/k-chart-maplibre';
import type { KChartMapLibrePlace } from '@keneth80/k-chart-maplibre';
import '@keneth80/k-chart-maplibre/style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
` : ''}

// ${selected?.title ?? 'KChart example'}
${dataSnippet}
const chart = createKChart<${kind === 'canvas-candlestick' ? 'StockPoint' : isUsageGlobeMap ? 'GlobePoint' : 'DemoPoint'}>({
    selector: '#chart-div',
    data: ${dataExpression},
    margin: ${kind === 'axis-custom-margin' ? '{ top: 82, right: 76, bottom: 70, left: 86 }' : kind === 'webgl-large-line' ? '{ top: 170, right: 28, bottom: 44, left: 52 }' : '{ top: 104, right: 28, bottom: 44, left: 52 }'},
    title: { text: '${selected?.title ?? 'KChart Example'}', align: 'left' },
    grid: { visible: ${isUsageGlobeMap || kind === 'three-constellation' ? 'false' : 'true'}, y: true, x: false },
    legend: { visible: ${isUsageGlobeMap || kind === 'three-constellation' ? 'false' : 'true'}, placement: 'top', selectable: true },${hasUsageSpecAreas || hasUsageGuideLines || hasUsageCursorGuide ? `
    options: [
        ${[
            hasUsageSpecAreas ? `createSpecAreaOption([
            { start: ${kind === 'option-spec-area' ? '2' : '18000'}, end: ${kind === 'option-spec-area' ? '3.5' : '36000'}, label: 'STEP 02', color: 'rgba(216, 118, 255, 0.16)' },
            { start: ${kind === 'option-spec-area' ? '4.5' : '62000'}, end: ${kind === 'option-spec-area' ? '5.8' : '78000'}, label: 'STEP 05', color: 'rgba(93, 184, 255, 0.13)' }
        ])` : '',
            hasUsageGuideLines ? `createGuideLineOption({
            x: [
                { value: ${kind === 'option-guide-line' ? '2' : '1200'}, label: '${kind === 'option-guide-line' ? 'A' : '1'}' },
                { value: ${kind === 'option-guide-line' ? '4' : '6200'}, label: '${kind === 'option-guide-line' ? 'B' : '2'}' },
                { value: ${kind === 'option-guide-line' ? '6' : '24000'}, label: '${kind === 'option-guide-line' ? 'C' : '3'}' }
            ]${kind === 'option-guide-line' ? `,
            y: [
                { value: 36, label: 'LOW', color: 'rgba(93, 184, 255, 0.5)' },
                { value: 58, label: 'HIGH', color: 'rgba(255, 107, 138, 0.55)' }
            ]` : ''}
        })` : '',
            hasUsageCursorGuide ? `createCursorLineOption({
            valueFormat: (value: number) => Number(value).toFixed(1),
            xFormat: (value: number) => ${kind === 'webgl-large-line' || kind === 'canvas-bigdata-line' ? '`${Math.round(Number(value) / 1000)}k`' : 'String(value)'}
        })` : ''
        ].filter(Boolean).join(',\n        ')}
    ],` : ''}
    tooltip: {
        visible: ${kind === 'webgl-large-line' || kind === 'canvas-bigdata-line' || kind === 'topology' || kind === 'three-constellation' || isUsageGlobeMap ? 'false' : 'true'}${kind === 'tooltip-template' ? `,
        formatter: ({ data }) => \`<strong>\${data.label}</strong><br/>Revenue \${data.value}<br/>Volume \${data.volume}\`` : ''}${kind === 'tooltip-custom' ? `,
        formatter: ({ data, color }) => \`<div style="color:\${color};font-weight:700">Custom Tooltip</div><div>\${data.label}: \${data.value}</div>\`` : ''}
    },${kind === 'webgl-large-line' || kind === 'canvas-bigdata-line' || kind === 'canvas-candlestick' ? `
    zoom: {
        enabled: true,
        mode: '${kind === 'canvas-candlestick' ? 'wheel' : 'both'}',
        direction: 'x',
        scaleExtent: [1, ${kind === 'canvas-candlestick' ? '120' : '80'}],
        wheelZoom: { enabled: true, devices: 'pc', sensitivity: 0.85 },
        gestureZoom: { enabled: true, devices: 'mobile', minTouches: 1 },
        resetOnDoubleClick: true
    },` : ''}
    axes: ${kind === 'topology' || kind === 'three-constellation' || isUsageGlobeMap ? '[]' : kind === 'canvas-candlestick' ? `[
        { field: 'label', type: 'time', placement: 'bottom', title: 'Trading Day', tickCount: 8, domain: stockDomain },
        { field: 'close', type: 'number', placement: 'left', title: 'Price', domainFields: ['low', 'high'] }
    ]` : 'createAxesForExample()'},
    series: [
        ${createSeriesSnippet(kind)}
    ]
});

chart.render();${kind === 'update-data' ? `

chart.updateData(nextData);` : ''}${kind === 'update-series' ? `

chart.updateSeries(nextSeries);` : ''}${kind === 'real-time' ? `

setInterval(() => chart.updateData(nextRealtimeData()), 1000);` : ''}`;
};

const startExampleBehavior = (kind: DemoKind): void => {
    if (!chart) {
        return;
    }

    if (kind === 'update-data') {
        window.setTimeout(() => {
            const nextData = baseData.map((point, index) => ({
                ...point,
                value: point.value + (index % 2 === 0 ? 12 : -8),
                volume: point.volume + 6
            }));
            chart?.updateData(nextData);
        }, 900);
    }

    if (kind === 'update-series') {
        window.setTimeout(() => {
            chart?.updateSeries([
                createLineSeries({ selector: 'demo-updated-line', displayName: 'Updated Value', xField: 'x', yField: 'value', color: '#f3b45b', strokeWidth: 3, curve: true, dot: true }),
                svgColumnSeries('demo-updated-column', 'volume', '#56d08f')
            ]);
        }, 900);
    }

    if (kind === 'real-time') {
        let tick = 7;
        let realtimeData = baseData.slice();
        realtimeTimer = window.setInterval(() => {
            realtimeData = [
                ...realtimeData.slice(-9),
                {
                    label: String(tick),
                    x: tick,
                    value: 42 + Math.sin(tick / 2) * 18 + Math.random() * 8,
                    volume: 24,
                    extra: 12,
                    radius: 5,
                    category: String(tick)
                }
            ];
            chart?.updateAxes([
                { field: 'x', type: 'number', placement: 'bottom', min: Math.max(0, tick - 9), max: tick + 1, title: 'Tick' },
                { field: 'value', type: 'number', placement: 'left', min: 0, max: 72, title: 'Value' }
            ]);
            chart?.updateData(realtimeData);
            tick += 1;
        }, 1000);
    }
};

const renderExample = (kind: DemoKind): void => {
    if (!chartRoot) {
        return;
    }

    if (realtimeTimer) {
        window.clearInterval(realtimeTimer);
        realtimeTimer = undefined;
    }

    activeKind = kind;
    chart?.destroy();
    mapLibreController?.destroy();
    mapLibreController = undefined;
    mapLibreBridge = undefined;
    chartRoot.innerHTML = '';
    if (kind === 'globe-map-drilldown') {
        setupMapLibreDemo();
    }
    chartRoot.classList.toggle('topology-chart', kind === 'topology');
    chartExampleLayout?.classList.toggle('topology-example', kind === 'topology');
    chart = createDemoChart(kind).render();
    startExampleBehavior(kind);

    document.querySelectorAll<HTMLElement>('.example-card').forEach((button) => {
        button.classList.toggle('active', button.dataset.example === kind);
    });
    document.querySelectorAll<HTMLElement>('[data-sidebar-example]').forEach((button) => {
        button.classList.toggle('active', button.dataset.sidebarExample === kind);
    });

    const selectedExample = examples.find((example) => example.kind === kind);
    if (summary) {
        summary.textContent = selectedExample?.dataLabel
            ? `${selectedExample.title} (${selectedExample.dataLabel})`
            : selectedExample?.title ?? kind;
    }
    if (configView) {
        configView.textContent = createUsageSnippet(kind);
    }
};

const setupSidebarExampleButtons = (): void => {
    document.querySelectorAll<HTMLElement>('[data-sidebar-example]').forEach((button) => {
        const kind = button.dataset.sidebarExample as DemoKind | undefined;
        if (kind) {
            button.addEventListener('click', () => renderExample(kind));
        }
    });
};

const setupExampleButtons = (): void => {
    document.querySelectorAll<HTMLElement>('.example-card').forEach((button) => {
        const kind = button.dataset.example as DemoKind | undefined;
        if (kind) {
            button.addEventListener('click', () => renderExample(kind));
        }
    });
};

const setupThemeButtons = (): void => {
    document.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach((button) => {
        button.addEventListener('click', () => {
            const theme = button.dataset.themeOption ?? 'dark';
            document.body.classList.toggle('theme-light', theme === 'light');
            document.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach((item) => {
                item.classList.toggle('active', item === button);
            });
            if (themeLabel) {
                themeLabel.textContent = theme === 'light' ? 'Light metallic theme' : 'Dark metallic theme';
            }
        });
    });
};

window.addEventListener('resize', () => {
    chart?.resize({
        width: chartRoot?.clientWidth || 760,
        height: chartRoot?.clientHeight || 420
    });
    mapLibreController?.resize();
});

setupExampleButtons();
setupSidebarExampleButtons();
setupThemeButtons();
renderExample(activeKind);
