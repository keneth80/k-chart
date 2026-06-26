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
  initialView: {
    lon: 165,
    lat: 14,
    height: 28000000
  },
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
  // Keep the initial Cesium home camera. Call handle.flyTo() later when needed.
  flyToOnAdd: false,
  animation: {
    enabled: true,
    speed: 20,
    trailSeconds: 900,
    trackCamera: false
  }
});
```

## First-view camera

Cesium's default home camera is intentionally generic. In a dashboard panel,
especially when `timeline` and `animation` controls are visible, the default
view can feel too close or visually low because the lower Cesium controls occupy
part of the canvas. Prefer setting `initialView` for production examples:

```ts
const globe = createCesiumGlobe({
  container: "#chart",
  cesiumBaseUrl: "/cesium",
  imageryProvider,
  timeline: true,
  animation: true,
  initialView: {
    // Ordinary longitude/latitude degrees.
    lon: 165,
    lat: 14,
    // Camera height in meters. Use a larger value when timeline controls are shown.
    height: 28000000
  }
});
```

Good starting points:

- Global route preview: `height` around `24_000_000` to `32_000_000`.
- City or regional preview: `height` around `2_000_000` to `8_000_000`.
- With `timeline: true` and `animation: true`, start farther out so the globe
  is not hidden behind the timeline and animation widget.

`flyToOnAdd` controls whether a route immediately changes the camera after it
is added. It defaults to `true` for compatibility. For curated demo screens,
set `flyToOnAdd: false`, keep a stable `initialView`, and call
`handle.flyTo()` or `controller.flyToRoute(id)` only when the user requests it:

```ts
const route = globe.addRoute({
  id: "pacific-route",
  data,
  flyToOnAdd: false,
  animation: true
});

// Later, for example from a button click:
await route.flyTo();
```

If the globe looks like a plain blue sphere, check three things before tuning
the shader values:

- The selected `initialView` is not centered over open ocean only.
- A real `imageryProvider` is passed and Cesium assets are being served.
- `realisticAtmosphere` intensity values are not so high that they wash out the
  Natural Earth or satellite texture.

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

Use `initialView` to control the first camera position. Values are ordinary
longitude/latitude degrees, plus an optional camera height in meters. This is
useful when Cesium timeline or animation controls are visible and the default
home camera feels too close to the lower UI.

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
    skyAtmosphereLightIntensity: 18,
    disableLightingInFlatModes: true
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

When the Cesium scene mode is switched to 2D or Columbus View, KChart disables
globe lighting, ground atmosphere, and sky atmosphere by default. This avoids
the 3D day/night terminator shadow being painted over flat maps. Set
`realisticAtmosphere.disableLightingInFlatModes: false` only when your
application intentionally wants Cesium lighting effects to remain in flat map
modes.

CesiumJS itself is Apache-2.0 licensed, but Cesium ion and third-party imagery,
terrain, satellite, vector, geocoding, place-search, or 3D Tiles services have
their own terms. Do not hard-code private tokens in reusable code. Keep Cesium
credits, provider attribution, copyright notices, and third-party license
notices visible; KChart does not remove Cesium's credit display. Users are
responsible for complying with the terms of whichever providers they connect.
