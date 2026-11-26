# @keneth80/k-chart-three

Optional Three.js wrapper for KChart. It provides a small scene runtime and
reusable 3D monitoring objects without making Three.js part of the core KChart
bundle.

## Install

```bash
npm install @keneth80/k-chart @keneth80/k-chart-three three
```

Requires KChart 1.17.0 or later for series-owned pointer interaction and Three.js
0.160.0 or later. Browser bundlers are supported; direct CommonJS loading in
Node needs a version with synchronous ESM support (20.19+, 22.12+, or 24+).

Import the package styles once:

```ts
import "@keneth80/k-chart-three/style.css";
```

## Textured Day / Night Globe and Flat Map

`createThreeGlobeSeries` rotates around the geographic polar axis by default.
Latitude stays fixed while longitude advances at six degrees per second; the
camera does not orbit the globe. Set `autoRotate: false` for a static,
on-demand view.

```ts
import { createKChart } from "@keneth80/k-chart";
import {
  calculateSubsolarPoint,
  createThreeGlobeSeries
} from "@keneth80/k-chart-three";
import "@keneth80/k-chart-three/style.css";

const locations = [
  { name: "Seoul", lat: 37.5665, lon: 126.9780, priority: 3 },
  { name: "London", lat: 51.5072, lon: -0.1276, priority: 2 },
  { name: "New York", lat: 40.7128, lon: -74.0060, priority: 2 }
];

const globe = createThreeGlobeSeries<(typeof locations)[number]>({
  selector: "earth-at-night",
  dayTexture: "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
  nightTexture: "https://threejs.org/examples/textures/planets/earth_lights_2048.png",
  initialCenter: { lat: 37.57, lon: 126.98 },
  autoRotate: { speed: 6 }, // degrees per second; negative values reverse rotation
  flatMap: { lighting: "night" },
  subsolar: calculateSubsolarPoint(new Date()),
  atmosphere: {
    color: "#4f8dff",
    intensity: 1.15,
    power: 3.2
  },
  markers: {
    fields: { lat: "lat", lon: "lon" },
    color: "#ffcf70",
    radius: (point) => 0.01 + point.priority * 0.002,
    surfaceOffset: 0.012
  },
  onCenterChange: ({ lat, lon }) => {
    console.log("Drag settled", lat, lon);
  }
});

createKChart({
  selector: "#chart",
  data: locations,
  grid: { visible: false },
  legend: { visible: false },
  tooltip: { visible: false },
  axes: [],
  series: [globe]
}).render();

globe.setCenter({ lat: 48.86, lon: 2.35 }, { duration: 600 });
globe.setDate(new Date());

// Switch the same series and scene to a full-world equirectangular map.
globe.setFlatView({ center: { lat: 0, lon: 0 }, zoom: 1, lighting: "night" });
globe.setProjection("flat", { duration: 1000 });

// Regional close-up without reconstructing the chart or series.
globe.setFlatView({ center: { lat: 36, lon: 128 }, zoom: 4 });
globe.setFlatView({ lighting: "dynamic" });
globe.setProjection("globe");

globe.setAutoRotate(false);
globe.setAutoRotate({ speed: 6 });
globe.setProjection("flat", { animate: false }); // instant switch
```

### Rotation and Unfolding

The globe and geolocated markers share the same axial rotation. Rotation pauses
during drag, center animation, projection transitions, while the flat map is
active, and while the document is hidden. It resumes without catching up time
spent paused. `autoRotate` accepts `true`, `false`, or `{ speed: number }`.
`getAutoRotate()` returns the configured setting, not whether rotation is
temporarily paused.

`setProjection(mode, { duration?, animate? })` unfolds the textured surface into
a 2:1 equirectangular world map and folds it back. Markers follow the same
surface deformation, camera framing changes continuously, and the atmosphere
fades out. Reversing a transition continues from its current rendered state
instead of restarting at an endpoint. `getProjection()` reports the requested
destination; `getProjectionProgress()` reports the rendered position, from
`0` (globe) to `1` (flat).
The default full-length projection transition takes 900 ms. `duration` sets
the full-length duration; an interrupted reversal scales it to the remaining
distance. `transitionDuration` continues to configure center transitions.

Both projection modes share the full world's fitted screen height. The globe's
outer silhouette (including its optional atmosphere) uses 94% of that height
to balance its stronger visual weight. On narrow viewports the globe becomes
smaller instead of cropping or enlarging the world map past its horizontal
bounds. Intermediate surfaces remain fitted, including during a resize.
The flat projection renders one world, not adjacent world copies. Wide layouts
keep empty side gutters; changing longitude recenters the geographic UV seam
on that same surface so antimeridian views do not require duplicate maps.

The operating system's `prefers-reduced-motion` setting disables automatic
rotation and animated center/projection transitions. The configured settings
remain available when the preference changes. Destroying the series cancels
its animation frames and removes interaction, visibility, and media listeners.

`projection` accepts `"globe"` (the default) or `"flat"`. The optional
`flatMap` configuration accepts `center`, `zoom`, and `lighting`. Its default is
the full-world night map at
`{ center: { lat: 0, lon: 0 }, zoom: 1, lighting: "night" }`. Lighting accepts
`"night"`, `"day"`, or `"dynamic"`; partial `setFlatView()` updates retain the
other current values. The runtime handle exposes
`setProjection()`, `getProjection()`, `setFlatView()`, and `getFlatView()`.
Flat view changes and projection switches reuse the existing KChart series and
Three.js scene. Globe center state is retained while the flat map is active, so
`setCenter()` transitions and drag orientation remain available when switching
back. Atmosphere rendering fades out as the globe unfolds. Globe lighting always
uses the dynamic subsolar day/night blend. Flat-map markers keep their visual
size during regional zoom, while the same marker fields, colors, radii, and
textures are reused in both projections.

The example URLs are Three.js-hosted, NASA-derived Blue Marble and Earth at
Night textures. KChart does not bundle texture images; applications remain
responsible for asset attribution, licensing, availability, and CORS policy.
Textures created from URLs or `CanvasImageSource` values are disposed with the
series. A caller-supplied `THREE.Texture` remains caller-owned so it can be
shared safely; dispose it after its final consumer is destroyed.

The series keeps latitude within `-80..80`, wraps longitude to `-180..180`,
chooses the shortest longitude path for center transitions, and calls
`onCenterChange` only after a user drag moves more than three CSS pixels.
Marker records with invalid or out-of-range coordinates are ignored. Marker
radius and surface offset are relative to the configured globe radius, and a
single `InstancedMesh` keeps larger location sets inexpensive to draw.

## KChart Wafer Series

```ts
import { createKChart } from "@keneth80/k-chart";
import {
  createThreeWaferSeries,
  createWaferDies
} from "@keneth80/k-chart-three";
import "@keneth80/k-chart-three/style.css";

const waferDies = createWaferDies({ rows: 29, cols: 29 });

const chart = createKChart({
  selector: "#chart",
  data: waferDies,
  margin: { top: 74, right: 18, bottom: 18, left: 18 },
  title: { text: "Three.js wafer monitor", align: "left" },
  grid: { visible: false },
  legend: { visible: false },
  axes: [],
  tooltip: { visible: false },
  series: [
    createThreeWaferSeries({
      selector: "fab-wafer",
      displayName: "Wafer A-17",
      fields: {
        id: "id",
        row: "row",
        col: "col",
        status: "status",
        value: "value",
        label: "label"
      },
      wafer: {
        radius: 5.4,
        notch: true
      },
      onDieClick: ({ die }) => {
        console.log(die);
      }
    })
  ]
});

chart.render();
```

## Standalone Scene Wrapper

`createKThreeScene` can also be used without KChart:

```ts
const scene = createKThreeScene({
  container: "#three-panel",
  camera: { position: [0, 8, 11], lookAt: [0, 0, 0] },
  controls: { orbit: true, autoRotate: true },
  lights: "studio"
});

scene
  .add(createWaferMonitorObject({
    data: createWaferDies({ rows: 25, cols: 25 }),
    fields: {
      row: "row",
      col: "col",
      status: "status",
      value: "value"
    }
  }))
  .render();
```

## API Notes

- `createKThreeScene` owns renderer, camera, orbit controls, resize, render loop,
  pointer forwarding, and dispose.
- `createWaferMonitorObject` renders wafer dies with `InstancedMesh`, so hundreds
  or thousands of die cells stay cheap to draw.
- `createThreeWaferSeries` adapts the wrapper to KChart's functional series
  contract by using the chart WebGL canvas layer.
- `createThreeGlobeSeries` uses pausable axial rotation, reversible globe/flat
  transitions, optional city-light and
  atmosphere shaders, geolocated instanced markers, and an imperative center
  handle for application presets.
- The package is optional. KChart core users do not download Three.js unless
  they install this adapter.

## Verification

From the repository root:

```sh
npm run typecheck
npm test --prefix packages/k-chart-three
npm exec --prefix packages/k-chart-three -- playwright install chromium
npm run test:browser --prefix packages/k-chart-three
npm run test:demo --prefix packages/k-chart-three
```

Browser regressions use the real KChart/Three.js renderers with deterministic
local textures. They cover desktop/mobile rotation and dragging, marker motion,
projection reversal, resize, reduced motion, rendered canvas pixels and context
disposal. Screenshots are written to `dist/globe-test-results/`.
