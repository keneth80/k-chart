# @keneth80/k-chart-maplibre

MapLibre GL JS adapter for KChart globe drilldown. It replaces the internal SVG flat map with an interactive tile map while keeping the KChart globe lightweight.

```bash
npm install @keneth80/k-chart @keneth80/k-chart-maplibre maplibre-gl
```

## Complete Example

```ts
import {
    createKChart,
    createSvgGlobeSeries
} from '@keneth80/k-chart';
import {
    createMapLibreFlatMap,
    createMapLibreGlobeBridge,
    createMapLibrePlaceResolver,
    parseMapLibrePlaces
} from '@keneth80/k-chart-maplibre';
import type { KChartMapLibrePlace } from '@keneth80/k-chart-maplibre';
import '@keneth80/k-chart-maplibre/style.css';
import 'maplibre-gl/dist/maplibre-gl.css';

interface City {
    id: string;
    name: string;
    lat: number;
    lon: number;
}

interface PlaceApiRecord {
    placeId: string;
    cityId: string;
    title: string;
    latitude: string;
    longitude: string;
    roadAddress?: string;
    type?: string;
}

interface Place extends KChartMapLibrePlace {
    cityId: string;
}

const cities: City[] = [
    { id: 'seoul', name: 'Seoul', lat: 37.5665, lon: 126.9780 },
    { id: 'new-york', name: 'New York', lat: 40.7128, lon: -74.0060 }
];

const placeApiData: PlaceApiRecord[] = [
    {
        placeId: 'gyeongbokgung',
        cityId: 'seoul',
        title: 'Gyeongbokgung Palace',
        latitude: '37.5796',
        longitude: '126.9770',
        roadAddress: '161 Sajik-ro, Jongno-gu, Seoul',
        type: 'Attraction'
    },
    {
        placeId: 'central-park',
        cityId: 'new-york',
        title: 'Central Park',
        latitude: '40.7829',
        longitude: '-73.9654',
        type: 'Attraction'
    }
];

const places = parseMapLibrePlaces<PlaceApiRecord, Place>(
    placeApiData,
    (item) => ({
        id: item.placeId,
        cityId: item.cityId,
        name: item.title,
        lat: Number(item.latitude),
        lon: Number(item.longitude),
        address: item.roadAddress,
        category: item.type
    })
);

const resolvePlaces = createMapLibrePlaceResolver<City, Place>(places, {
    getCityKey: (city) => city.id,
    getPlaceCityKey: (place) => place.cityId
});

const map = createMapLibreFlatMap({
    container: '#chart',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    initialZoom: 13
});

const bridge = createMapLibreGlobeBridge(
    map,
    resolvePlaces,
    {getLabel: (city) => city.name}
);

createKChart<City>({
    selector: '#chart',
    data: cities,
    grid: {visible: false},
    legend: {visible: false},
    tooltip: {visible: false},
    axes: [],
    series: [
        createSvgGlobeSeries({
            selector: 'cities',
            latField: 'lat',
            lonField: 'lon',
            labelField: 'name',
            drilldown: {
                enabled: true,
                mode: 'external-map',
                autoMapOnZoom: true,
                onEnter: bridge.onEnter,
                onExit: bridge.onExit
            }
        })
    ]
}).render();
```

MapLibre renders map tiles and place markers. Address or restaurant search should be supplied separately through a geocoding/place-search provider such as Kakao Local API, Naver Maps, MapTiler Geocoding, or another regional provider.

`parseMapLibrePlaces()` converts provider-specific records and validates the required
`id`, `name`, `lat`, and `lon` fields. Pass `{invalid: 'skip'}` as the third argument
when malformed provider records should be ignored instead of throwing an error.
`createMapLibrePlaceResolver()` indexes places once and returns the resolver expected
by `createMapLibreGlobeBridge()`.

## Place Data Utilities

### `parseMapLibrePlaces(data, parser, options?)`

- Converts arbitrary API records into `KChartMapLibrePlace` objects.
- Converts and validates `id`, `name`, `lat`, and `lon`.
- Rejects coordinates outside latitude `-90..90` and longitude `-180..180`.
- Throws for malformed records by default. Use `{invalid: 'skip'}` to omit them.
- Preserves extra fields returned by the parser, such as `cityId`.

### `createMapLibrePlaceResolver(places, options)`

- Groups places once by the value returned from `getPlaceCityKey`.
- Returns a `(city) => places` function compatible with
  `createMapLibreGlobeBridge`.
- Returns a new array on each lookup so callers cannot mutate the internal index.
