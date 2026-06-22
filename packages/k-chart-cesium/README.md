# @keneth80/k-chart-cesium

Optional CesiumJS adapter for KChart. It renders token-free OSM imagery by
default and supports static or time-based movement routes.

## Install

```bash
npm install @keneth80/k-chart-cesium cesium
```

Import Cesium and adapter styles:

```ts
import "cesium/Build/Cesium/Widgets/widgets.css";
import "@keneth80/k-chart-cesium/style.css";
```

Cesium also requires `Workers`, `ThirdParty`, `Assets`, and `Widgets` from
`node_modules/cesium/Build/Cesium` to be served by the application. Set
`CESIUM_BASE_URL` to the public directory containing those folders.

## Animated route

```ts
import { createCesiumGlobe } from "@keneth80/k-chart-cesium";

const globe = createCesiumGlobe({
  container: "#chart",
  cesiumBaseUrl: "/cesium"
});

globe.addRoute({
  id: "seoul-food-tour",
  name: "Seoul food tour",
  data: [
    { time: "2026-06-22T09:00:00Z", lat: 37.5665, lon: 126.978 },
    { time: "2026-06-22T09:10:00Z", lat: 37.57, lon: 126.9996 },
    { time: "2026-06-22T09:20:00Z", lat: 37.5625, lon: 126.9856 }
  ],
  color: "#5db8ff",
  showSamples: true,
  animation: {
    enabled: true,
    speed: 20,
    trailSeconds: 900,
    trackCamera: false
  }
});
```

Custom records can map fields without reshaping the source data:

```ts
globe.addRoute({
  id: "custom-records",
  data: records,
  fields: {
    lat: "latitude",
    lon: "longitude",
    altitude: "height",
    time: "recordedAt",
    label: "placeName"
  }
});
```

GeoJSON `LineString` is supported for static routes:

```ts
globe.addRoute({
  id: "geojson-route",
  geoJson: {
    type: "LineString",
    coordinates: [
      [126.978, 37.5665, 0],
      [126.9996, 37.57, 0]
    ]
  },
  animation: false
});
```

Use `handle.addPoint(point)` for live samples and call `destroy()` when the
view is removed. Cesium ion is optional; pass `accessToken` only when using ion
terrain, buildings, or other ion assets.
