import type {
    KChartMapLibreConfiguration,
    KChartMapLibrePlace
} from '../src';

interface TestPlace extends KChartMapLibrePlace {
    region: string;
}

const configuration = {
    container: '#map',
    style: {version: 8, sources: {}, layers: []},
    renderWorldCopies: false,
    maxBounds: [[-180, -85], [180, 85]],
    toolbar: {
        visible: true,
        location: false,
        backButton: false
    },
    clusterStyle: {
        color: '#2563eb',
        radius: 16,
        steps: [
            {minPointCount: 10, color: '#0f766e'},
            {minPointCount: 50, radius: 28}
        ],
        strokeColor: '#ffffff',
        strokeWidth: 2,
        textColor: '#ffffff',
        textSize: 13
    },
    onClusterClick: (context) => {
        const clusterId: number = context.clusterId;
        const expansionZoom: number = context.expansionZoom;
        const coordinates: [number, number] = context.coordinates;
        void [clusterId, expansionZoom, coordinates, context.feature, context.event, context.map];
    },
    onClusterHover: (context) => {
        const type: 'enter' | 'leave' = context.type;
        const hovered: boolean = context.hovered;
        void [type, hovered, context.clusterId, context.pointCount, context.feature];
    },
    onPlaceClick: ({place}) => {
        const region: string = place.region;
        void region;
    }
} satisfies KChartMapLibreConfiguration<TestPlace>;

const defaultsRemainOptional = {
    container: '#map',
    style: {version: 8, sources: {}, layers: []}
} satisfies KChartMapLibreConfiguration<TestPlace>;

void [configuration, defaultsRemainOptional];
