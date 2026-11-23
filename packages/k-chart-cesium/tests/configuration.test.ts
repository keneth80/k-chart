import type {KChartCesiumConfiguration} from '../src';

const configuration = {
    container: '#globe',
    realisticAtmosphere: false,
    onMoveEnd: ({lon, lat, x, y}) => {
        const nullableCoordinates: Array<number | null> = [lon, lat];
        const screenCoordinates: number[] = [x, y];
        void [nullableCoordinates, screenCoordinates];
    }
} satisfies KChartCesiumConfiguration;

const defaultsRemainOptional = {
    container: '#globe'
} satisfies KChartCesiumConfiguration;

void [configuration, defaultsRemainOptional];
