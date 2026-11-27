# Geographic Hierarchy Drilldown

`createGeoDrilldown(...)` is an opt-in, caller-owned country / city / region
controller. A country click opens a map dialog with city data. Selecting a city
fits the geographic view to that city's regional points. Regions are the final
level; they do not open another dialog.

The same controller can be passed as `geoDrilldown` to
`createThreeGlobeSeries`, `createSvgGlobeSeries`, `createGeoRegionMapSeries`,
and `createWorldCountryMapSeries`. The Three.js binding works in both settled
globe and flat-map projections. Omit the option or pass `false` to retain the
existing behavior. The older SVG globe `drilldown` option remains a separate
marker-focus / map-transition feature.

## Data And Configuration

```ts
import {createGeoDrilldown, createWorldCountryMapSeries} from '@keneth80/k-chart';
import {createThreeGlobeSeries} from '@keneth80/k-chart-three';

const drilldown = createGeoDrilldown({
    title: 'Regional operations',
    theme: 'dark',
    animation: true,
    valueLabel: 'Orders',
    countries: [{
        id: '410', label: 'South Korea',
        feature: countryFeature, // GeoJSON Polygon or MultiPolygon Feature
        cities: [{
            id: 'seoul', label: 'Seoul', lat: 37.5665, lon: 126.978,
            value: 1506,
            regions: [
                {id: 'jongno', label: 'Jongno', lat: 37.5735, lon: 126.9788, value: 428},
                {id: 'gangnam', label: 'Gangnam', lat: 37.5172, lon: 127.0473, value: 716},
                {id: 'mapo', label: 'Mapo', lat: 37.5638, lon: 126.9084, value: 362}
            ]
        }]
    }],
    valueFormatter: (value, node) => `${value.toLocaleString('en')} / ${node.label}`,
    onChange: path => console.info(path.map(item => [item.level, item.node.id])),
    onClose: () => console.info('Location details closed')
});

const globe = createThreeGlobeSeries({
    selector: 'earth', dayTexture, nightTexture, geoDrilldown: drilldown
});
const countryMap = createWorldCountryMapSeries({
    selector: 'countries', geoDrilldown: drilldown
});
```

- IDs must be stable and unique within their parent. Country IDs are independent
  of display labels; the example uses World Atlas numeric country IDs.
- Coordinates are WGS84 decimal degrees, explicitly named `lat` and `lon`.
  Supply actual GeoJSON country boundaries, rather than a country bounding
  rectangle. Standard GeoJSON and D3 ring winding are normalized internally
  without changing caller-owned coordinates.
- `value` and `data` are optional on every node. The formatter receives the
  original node, so application fields in `data` can be combined into labels.
  Values are displayed as provided; aggregate totals in application code.
- Country selection uses geographic containment, not the nearest city marker.
  Ocean clicks, unknown countries, and invalid coordinates do not open a dialog.
- Child data is supplied by the caller. This option does not geocode arbitrary
  points or download administrative boundaries or child datasets.
- `getSelection()` and `onChange` expose a readonly country / city path.
  The path is empty after closing. Regional points are displayed at the city
  level and are terminal data, not another navigation level.
- `theme` is `'light'` by default; select `'dark'` for dark dialog headers,
  controls, data panels, and SVG fallback maps. This does not change the custom
  renderer's basemap style or the surrounding application theme.
- `animation` defaults to `true`. Opening and country/city changes use short
  fades with a subtle data-panel entrance; the map canvas is not translated or
  scaled. Set `animation: false` to disable these effects. The operating system's
  reduced-motion preference also disables popup animations and transitions.
  Closing remains immediate so focus restoration and renderer disposal do not
  depend on animation callbacks or timers.

## Reuse And Lifecycle

```ts
drilldown.openCountry('410');          // External country menu
drilldown.openAt({lat: 36.5, lon: 127.7});
drilldown.selectCity('seoul');
drilldown.back();                     // City -> country; country -> closed
drilldown.close();
drilldown.setEnabled(false);          // Closes and disables all connected views
drilldown.setEnabled(true);

// After destroying every chart that shares it:
drilldown.destroy();
```

Series do not destroy a caller-owned shared controller. Destroy it when its last
consumer is removed. The dialog supports keyboard city selection, Escape,
backdrop dismissal, back navigation, zoom controls, and focus restoration. No
dialog or stylesheet is installed until it is opened.

For another renderer, call `openAt({lat, lon})` from its geographic click event
or `openCountry(id)` from a known country feature. Picking and projection remain
the responsibility of that renderer; no Three.js or MapLibre dependency is
introduced into the core controller.

## Textured Detail Maps

The example uses the same Three.js flat-map renderer, day/night textures, and
solar lighting for country detail. City detail uses the existing KChart
MapLibre adapter with OpenFreeMap Fiord vector tiles, so street names, roads,
and buildings remain visible at local zoom levels. Magnifying the global
2048px Earth bitmap alone cannot provide city-level detail. The reusable helper is
[three-geo-drilldown-map.ts](../examples/three-geo-drilldown-map.ts):

```ts
const drilldown = createGeoDrilldown({
    countries,
    mapRenderer: createThreeGeoDrilldownMap({
        dayTexture, nightTexture, lighting: 'dynamic',
        // Optional MapLibre style URL (or use the default Fiord style):
        cityMapStyle: 'https://tiles.openfreemap.org/styles/fiord'
    })
});
```

Omit `mapRenderer` to retain the lightweight built-in SVG map. A custom renderer
receives `container`, the original `country` and optional `city`, a normalized
country `feature`, visible `points`, and `selectCity(id)`. Return a synchronous
handle with `destroy()` and optional `setZoom(factor)`. The controller disposes
that handle on selection changes, back, close, disable, and destroy. A failed
factory falls back to SVG; factories must clean up their own partial resources
before throwing. Core does not import Three.js for this optional renderer.

The helper fits country bounds or local regional points, retains sharp country
outlines and labels over the texture, and releases its chart, map, observers,
animation frames, timers, and clock on removal. Regional markers stay terminal
data points; changing the basemap does not introduce another navigation level.

City detail requires network access to OpenFreeMap's style, vector tiles,
sprites, and fonts. It is a styled street map, not satellite imagery or a
photorealistic continuation of the Earth texture. Loading is shown explicitly;
failed or timed-out loading displays **Map unavailable** with a **Retry** button.
The map keeps OpenStreetMap/OpenFreeMap attribution visible. Applications can
set `cityMapStyle` to their own compatible hosted style; preserve attribution
and follow the chosen data provider's terms.

Three.js markers can be selected directly in both settled projections:

```ts
const globe = createThreeGlobeSeries({
    selector: 'earth', dayTexture, markers, geoDrilldown: drilldown,
    onMarkerClick: ({data, index, lat, lon, event}) => {
        console.info(data, index, lat, lon);
        // event.preventDefault() cancels the automatic geographic drilldown.
    }
});
```

Picking uses the original marker record and coordinates, with a minimum 8 CSS
pixel hit radius for small markers. Backside, occluded, and offscreen markers
are excluded; drag and in-flight projection/center transitions do not trigger
selection. `projectLocation({lat, lon})` returns canvas-relative CSS coordinates
and visibility for labels, or `null` while unmounted.

## Example

Run `npm ci`, then `npm run dev`, and open
`http://127.0.0.1:9003/?example=geo-hierarchy`.

- [Mountable example](../examples/geo-hierarchy-drilldown.ts)
- [Three countries, nine cities, and 27 regional points](../examples/geo-hierarchy-data.ts)

Country shapes come from the existing World Atlas 50m dataset. City and regional
locations are real, but all operation counts are synthetic. Regional markers are
geographic data points, not administrative district polygons. The example
switches between a textured globe, the unfolded world map, and an SVG country
map, all using the same opt-in controller.
