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
    initialZoom: 13,
    toolbar: {
        visible: true,
        location: true,
        backButton: true
    }
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

## World Clusters

`createMapLibreFlatMap()` can also be used as a standalone clustered world map. Set
`renderWorldCopies: false` to prevent repeated worlds and use `maxBounds` to constrain
panning. When `renderWorldCopies` is omitted, the MapLibre default is preserved.

```ts
const map = createMapLibreFlatMap({
    container: '#world-map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    initialZoom: 1.5,
    minZoom: 1,
    renderWorldCopies: false,
    maxBounds: [[-180, -85], [180, 85]],
    toolbar: {visible: false},
    clusterStyle: {
        color: '#2563eb',
        radius: 16,
        steps: [
            {minPointCount: 10, color: '#0f766e', radius: 20},
            {minPointCount: 50, color: '#ca8a04', radius: 26},
            {minPointCount: 200, color: '#dc2626', radius: 32}
        ],
        strokeColor: '#ffffff',
        strokeWidth: 2,
        textColor: '#ffffff',
        textSize: 12
    },
    onClusterClick: ({clusterId, pointCount, coordinates, expansionZoom, map}) => {
        console.log('Expanded cluster', {clusterId, pointCount, coordinates, expansionZoom});
    },
    onClusterHover: ({type, hovered, clusterId, pointCount, event, feature, map}) => {
        console.log(type, {hovered, clusterId, pointCount, event, feature, map});
    }
});

map.setPlaces(worldPlaces);
await map.show({lat: 20, lon: 0, zoom: 1.5});
```

Cluster clicks always retain the built-in expansion animation. `onClusterClick` runs
after the expansion zoom has been resolved and receives the cluster feature, center,
point count, expansion zoom, original layer event, and map. `onClusterHover` runs for
both enter and leave transitions and includes `type` and `hovered` state.

Cluster styling uses `color` and `radius` as values below the first threshold. Each
`steps` entry applies at `minPointCount` and may change the color, radius, or both.
Thresholds are sorted before they are passed to MapLibre. Omitting `steps` preserves
the existing radius thresholds at 20 and 60 points. When a threshold is repeated,
the last color or radius specified for that threshold wins.

Toolbar controls remain fully visible by default for backward compatibility.
`toolbar.visible` hides the entire toolbar, while `toolbar.location` and
`toolbar.backButton` independently hide the location label or globe-back button.

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
