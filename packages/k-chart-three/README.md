# @keneth80/k-chart-three

Optional Three.js wrapper for KChart. It provides a small scene runtime and
reusable 3D monitoring objects without making Three.js part of the core KChart
bundle.

## Install

```bash
npm install @keneth80/k-chart @keneth80/k-chart-three three
```

Import the package styles once:

```ts
import "@keneth80/k-chart-three/style.css";
```

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
- The package is optional. KChart core users do not download Three.js unless
  they install this adapter.
