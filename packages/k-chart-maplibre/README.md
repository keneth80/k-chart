# @keneth80/k-chart-maplibre

MapLibre GL JS adapter for KChart globe drilldown. It replaces the internal SVG flat map with an interactive tile map while keeping the KChart globe lightweight.

```ts
import { createSvgGlobeSeries } from '@keneth80/k-chart';
import {
    createMapLibreFlatMap,
    createMapLibreGlobeBridge
} from '@keneth80/k-chart-maplibre';
import '@keneth80/k-chart-maplibre/style.css';
import 'maplibre-gl/dist/maplibre-gl.css';

const map = createMapLibreFlatMap({
    container: '#chart',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    initialZoom: 13
});

const bridge = createMapLibreGlobeBridge(
    map,
    (city) => loadPlaces(city.id),
    {getLabel: (city) => city.name}
);

createSvgGlobeSeries({
    selector: 'cities',
    latField: 'lat',
    lonField: 'lon',
    drilldown: {
        enabled: true,
        mode: 'external-map',
        autoMapOnZoom: true,
        onEnter: bridge.onEnter,
        onExit: bridge.onExit
    }
});
```

MapLibre renders map tiles and place markers. Address or restaurant search should be supplied separately through a geocoding/place-search provider such as Kakao Local API, Naver Maps, MapTiler Geocoding, or another regional provider.
