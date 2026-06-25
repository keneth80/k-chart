# @keneth80/k-chart-cesium

Optional CesiumJS adapter for KChart. It provides the rendering component and
route controller only; imagery, terrain, 3D Tiles, ion tokens, and provider
credentials are supplied by the application.

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
import { buildModuleUrl, TileMapServiceImageryProvider } from "cesium";
import { createCesiumGlobe } from "@keneth80/k-chart-cesium";

const globe = createCesiumGlobe({
  container: "#chart",
  cesiumBaseUrl: "/cesium",
  imageryProvider: await TileMapServiceImageryProvider.fromUrl(
    buildModuleUrl("Assets/Textures/NaturalEarthII")
  ),
  attribution: "Natural Earth II texture from CesiumJS assets",
  realisticAtmosphere: true
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
view is removed.

## Provider and license safety

KChart Cesium does not bundle map, satellite, terrain, building, or 3D Tiles
data. The package does not include a developer Cesium ion access token, map API
key, or paid provider key. Pass those explicitly from your application when you
need them:

```ts
import { OpenStreetMapImageryProvider, CesiumTerrainProvider } from "cesium";
import { createCesiumGlobe } from "@keneth80/k-chart-cesium";

const terrainProvider = await CesiumTerrainProvider.fromUrl(
  "https://your-terrain-provider.example/tiles"
);

const globe = createCesiumGlobe({
  container: "#chart",
  cesiumBaseUrl: "/cesium",
  ionAccessToken: userOwnedIonToken,
  imageryProvider: new OpenStreetMapImageryProvider({
    url: "https://tile.openstreetmap.org/",
    credit: "© OpenStreetMap contributors"
  }),
  terrainProvider,
  attribution: "© OpenStreetMap contributors",
  realisticAtmosphere: {
    baseColor: "#0b2d59",
    atmosphereLightIntensity: 14,
    skyAtmosphereLightIntensity: 18
  }
});
```

If `imageryProvider` is omitted, Cesium starts without a base imagery layer.
This keeps the npm package provider-neutral; demos may choose a public provider
separately. You can also pass an existing `ImageryLayer`, pass
`imageryProvider: false`, or use `viewerOptions` for advanced Cesium
configuration.

`realisticAtmosphere` is enabled by default. It only adjusts Cesium rendering
settings such as globe base color, sun lighting, ground atmosphere, and sky
atmosphere scattering. It does not fetch or bundle satellite imagery, terrain,
3D Tiles, or provider data. Set `realisticAtmosphere: false` to disable it, or
pass an object to tune the atmosphere values.

CesiumJS itself is Apache-2.0 licensed, but Cesium ion and third-party imagery,
terrain, satellite, vector, geocoding, place-search, or 3D Tiles services have
their own terms. Do not hard-code private tokens in reusable code. Keep Cesium
credits, provider attribution, copyright notices, and third-party license
notices visible; KChart does not remove Cesium's credit display. Users are
responsible for complying with the terms of whichever providers they connect.
