import {feature} from 'topojson-client';
import world from 'world-atlas/countries-50m.json';
import type {KChartGeoDrilldownCountry, KChartGeoDrilldownCity} from '../src/options/geo-drilldown';

type RegionSeed = readonly [string, number, number, number];

const city = (id: string, label: string, lat: number, lon: number, regions: readonly RegionSeed[]): KChartGeoDrilldownCity => ({
    id, label, lat, lon,
    value: regions.reduce((sum, region) => sum + region[3], 0),
    regions: regions.map(([label, lat, lon, value], index) => ({
        id: `${id}-${index + 1}`, label, lat, lon, value
    }))
});

// Locations are real; operation counts are synthetic demonstration data.
export const createGeoHierarchySample = (): KChartGeoDrilldownCountry[] => {
    const countries = (feature(world as any, (world as any).objects.countries) as any).features;
    const seeds: Array<{id: string; label: string; cities: KChartGeoDrilldownCity[]}> = [
        {id: '410', label: 'South Korea', cities: [
            city('seoul', 'Seoul', 37.5665, 126.978, [
                ['Jongno', 37.5735, 126.9788, 428], ['Gangnam', 37.5172, 127.0473, 716], ['Mapo', 37.5638, 126.9084, 362]
            ]),
            city('busan', 'Busan', 35.1796, 129.0756, [
                ['Haeundae', 35.1631, 129.1635, 389], ['Busanjin', 35.1629, 129.0532, 284], ['Yeongdo', 35.0912, 129.0679, 196]
            ]),
            city('daejeon', 'Daejeon', 36.3504, 127.3845, [
                ['Yuseong', 36.3622, 127.3561, 251], ['Seo', 36.3555, 127.3838, 217], ['Dong', 36.3115, 127.4548, 143]
            ])
        ]},
        {id: '392', label: 'Japan', cities: [
            city('tokyo', 'Tokyo', 35.6762, 139.6503, [
                ['Shinjuku', 35.6938, 139.7034, 624], ['Shibuya', 35.6618, 139.7041, 588], ['Chiyoda', 35.694, 139.7536, 473]
            ]),
            city('osaka', 'Osaka', 34.6937, 135.5023, [
                ['Kita', 34.7055, 135.5102, 341], ['Chuo', 34.6813, 135.5099, 398], ['Tennoji', 34.6579, 135.5195, 229]
            ]),
            city('fukuoka', 'Fukuoka', 33.5902, 130.4017, [
                ['Hakata', 33.5914, 130.4149, 326], ['Chuo', 33.5895, 130.393, 278], ['Higashi', 33.6174, 130.4176, 182]
            ])
        ]},
        {id: '276', label: 'Germany', cities: [
            city('berlin', 'Berlin', 52.52, 13.405, [
                ['Mitte', 52.5256, 13.3699, 462], ['Pankow', 52.568, 13.403, 319], ['Neukolln', 52.4811, 13.435, 287]
            ]),
            city('hamburg', 'Hamburg', 53.5511, 9.9937, [
                ['Altona', 53.5506, 9.9348, 246], ['Hamburg-Mitte', 53.5488, 9.9872, 371], ['Wandsbek', 53.575, 10.078, 214]
            ]),
            city('munich', 'Munich', 48.1351, 11.582, [
                ['Altstadt', 48.137, 11.5754, 396], ['Schwabing', 48.1665, 11.586, 308], ['Maxvorstadt', 48.1519, 11.5691, 263]
            ])
        ]}
    ];
    return seeds.map(seed => {
        const boundary = countries.find((country: any) => String(country.id) === seed.id);
        if (!boundary) throw new Error(`Missing world-atlas country ${seed.id}`);
        return {...seed, feature: boundary, value: seed.cities.reduce((sum, item) => sum + (item.value ?? 0), 0)};
    });
};
