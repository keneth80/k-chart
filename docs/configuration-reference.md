# KChart Configuration Reference

이 문서는 KChart를 적용할 때 자주 헷갈리는 configuration 항목을 한 곳에서 확인하기 위한 참조 문서입니다. 실제 public type은 `src/core/contracts.ts`를 기준으로 하며, 아래 표는 각 옵션의 역할과 기본 동작을 설명합니다.

## Quick Mental Model

```ts
createKChart({
    selector,
    data,
    axes,
    series,
    options
});
```

- `createKChart(...)`: container, data, axis, layout, layer, interaction을 준비합니다.
- `axes`: scale과 axis를 정의합니다. `number`와 `time` 축은 zoom 대상이 될 수 있고, `string`과 `point` 축은 순서형 축이므로 zoom 대상에서 제외됩니다.
- `series`: 실제 데이터를 그리는 renderer입니다. SVG, Canvas, WebGL, custom renderer를 섞어 사용할 수 있습니다.
- `options`: spec area, fixed guide line, cursor line, tooltip note 같은 부가 기능입니다.
- Canvas/WebGL line series는 `asyncRender`를 켜면 OffscreenCanvas + Web Worker로 line draw를 넘길 수 있습니다.

## Core Chart Configuration

| Field | Type | Required | Default | Description |
| --- | --- | ---: | --- | --- |
| `selector` | `string \| HTMLElement` | yes | - | 차트를 붙일 DOM container입니다. 문자열이면 CSS selector로 찾습니다. |
| `data` | `T[]` | yes | - | 차트 전체 데이터입니다. 모든 series와 axis domain 계산이 이 배열을 기준으로 동작합니다. |
| `axes` | `KChartAxis<T>[]` | yes | - | x/y/top/right scale과 axis 정의입니다. |
| `series` | `KChartSeries<T>[]` | yes | - | 렌더링할 series 목록입니다. |
| `options` | `KChartOption<T>[]` | no | `[]` | spec area, guide line, cursor line, tooltip note 등 plugin형 옵션입니다. |
| `width` | `number` | no | container width or `320` | 전체 SVG/canvas width입니다. |
| `height` | `number` | no | container height or `240` | 전체 SVG/canvas height입니다. |
| `margin` | `Partial<KChartMargin>` | no | `{ top: 24, right: 24, bottom: 36, left: 44 }` | plot 영역 바깥 여백입니다. title, top legend, option label이 있으면 top margin은 자동 보정될 수 있습니다. |
| `colors` | `string[]` | no | D3 `schemeCategory10` | series별 기본 색상 팔레트입니다. series `color`가 없을 때 순서대로 사용됩니다. |
| `className` | `string` | no | - | root container에 추가할 class입니다. |
| `title` | `KChartTitleConfiguration` | no | - | 차트 제목 설정입니다. |
| `grid` | `KChartGridConfiguration` | no | `{ visible: true }` equivalent | plot grid 표시 설정입니다. |
| `legend` | `KChartLegendConfiguration` | no | visible top legend | series 표시/숨김 범례 설정입니다. |
| `tooltip` | `KChartTooltipConfiguration<T>` | no | basic tooltip | nearest point tooltip 설정입니다. |
| `zoom` | `KChartZoomConfiguration<T>` | no | disabled | number/time 축 zoom, pan, 영역 선택 zoom 설정입니다. |
| `animation` | `boolean \| KChartAnimationConfiguration` | no | disabled | series enter animation 설정입니다. 현재 SVG/Canvas/WebGL line 계열 renderer가 기본 지원합니다. |
| `specAreas` | `KChartSpecAreaConfiguration[]` | no | `[]` | 기존 호환 필드입니다. 새 코드는 `createSpecAreaOption(...)` 사용을 권장합니다. |
| `guideLines` | `KChartGuideLinesConfiguration` | no | - | 기존 호환 필드입니다. 새 코드는 `createGuideLineOption(...)` 사용을 권장합니다. |
| `cursorGuide` | `KChartCursorGuideConfiguration` | no | - | 기존 호환 필드입니다. 새 코드는 `createCursorLineOption(...)` 사용을 권장합니다. |
| `guideLine` | `KChartCursorGuideConfiguration` | no | - | `cursorGuide`의 legacy alias입니다. |

## Axis Configuration

| Field | Type | Required | Description |
| --- | --- | ---: | --- |
| `field` | `keyof T & string` | yes | domain을 계산할 데이터 field입니다. |
| `type` | `'number' \| 'time' \| 'string' \| 'point'` | yes | scale 종류입니다. zoom은 `number`, `time`만 지원합니다. |
| `placement` | `'top' \| 'right' \| 'bottom' \| 'left'` | yes | axis 위치입니다. bottom/top은 x축, left/right는 y축으로 해석됩니다. |
| `domainFields` | `Array<keyof T & string>` | no | number/time domain 계산에 여러 field를 포함합니다. 캔들차트에서는 `['low', 'high']`처럼 사용합니다. |
| `min` / `max` | `number \| Date` | no | domain의 최소/최대값을 고정합니다. 지정하면 자동 padding은 적용되지 않습니다. |
| `domain` | `Array<string \| number \| Date>` | no | scale domain을 직접 지정합니다. |
| `visible` | `boolean` | no | `false`이면 axis를 숨깁니다. scale 자체는 여전히 series 계산에 사용할 수 있습니다. |
| `padding` | `number` | no | number/time domain 양끝에 비율 padding을 추가합니다. `min`, `max`가 없을 때만 적용됩니다. |
| `title` | `string` | no | axis title입니다. |
| `tickCount` | `number` | no | tick 개수 힌트입니다. |
| `tickFormat` | `(value: any) => string` | no | tick label formatter입니다. |

## Title, Grid, Legend, Tooltip

### `title`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `text` | `string` | required | 제목 텍스트입니다. 빈 문자열이면 title 영역이 실질적으로 사라집니다. |
| `align` | `'left' \| 'center' \| 'right'` | implementation default | 제목 정렬입니다. |
| `color` | `string` | theme default | 제목 색상입니다. |
| `fontSize` | `number` | theme default | 제목 글자 크기입니다. |
| `fontWeight` | `number \| string` | theme default | 제목 굵기입니다. |

### `grid`

| Field | Type | Description |
| --- | --- | --- |
| `visible` | `boolean` | 전체 grid 표시 여부입니다. |
| `x` | `boolean` | x 방향 grid line 표시 여부입니다. |
| `y` | `boolean` | y 방향 grid line 표시 여부입니다. |
| `color` | `string` | grid line 색상입니다. |
| `dasharray` | `string` | SVG `stroke-dasharray` 값입니다. |

### `legend`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `visible` | `boolean` | `true` | 범례 표시 여부입니다. |
| `placement` | `'top' \| 'right' \| 'bottom'` | `top` | 범례 위치입니다. |
| `itemGap` | `number` | implementation default | 범례 item 사이 간격입니다. |
| `selectable` | `boolean` | `true` style behavior | 체크박스로 series 표시/숨김을 제어할지 여부입니다. |

### `tooltip`

| Field | Type | Description |
| --- | --- | --- |
| `visible` | `boolean` | tooltip 표시 여부입니다. |
| `formatter` | `(context) => string` | tooltip HTML/text를 직접 생성합니다. `context`에는 `data`, `series`, `x`, `y`, `color`가 들어옵니다. |

## Animation Configuration

차트 레벨 `animation`은 series renderer에 `animation.progress`를 전달합니다. `animation: true`로 기본 enter animation을 켤 수 있고, 세부 옵션으로 duration과 easing을 조절할 수 있습니다. 현재 1차 지원 대상은 `createLineSeries`, `createCanvasLineSeries`, `createWebglLineSeries`입니다. Custom series에서는 `render(context)`의 `context.animation.progress`를 사용해 직접 애니메이션을 구현할 수 있습니다.

```ts
createKChart({
    selector: '#chart',
    data,
    axes,
    series,
    animation: {
        enabled: true,
        duration: 820,
        easing: 'easeOutCubic',
        mode: 'enter'
    }
});
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `false` | animation을 켭니다. `animation: true`와 동일하게 사용할 수 있습니다. |
| `duration` | `number` | `720` | enter animation 지속 시간(ms)입니다. |
| `easing` | `'linear' \| 'easeOutCubic' \| 'easeInOutCubic'` | `easeOutCubic` | progress easing 함수입니다. |
| `mode` | `'enter' \| 'update' \| 'both'` | `enter` | 현재는 `enter` animation을 지원합니다. `update`/`both`는 향후 data transition 확장을 위한 public contract입니다. |
| `respectReducedMotion` | `boolean` | `true` | OS의 reduced motion 설정이 켜져 있으면 animation을 생략합니다. |

## Zoom Configuration

차트 레벨 zoom은 `number` 또는 `time` axis domain을 갱신한 뒤 기존 render pipeline을 다시 실행합니다. `string`/`point` 축은 순서형 축이라 zoom 대상에서 제외됩니다.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `false` | zoom 기능을 켭니다. |
| `mode` | `'wheel' \| 'select' \| 'both'` | implementation default | wheel/pan, drag selection zoom, 둘 다 중 어떤 입력을 사용할지 정합니다. |
| `direction` | `'x' \| 'y' \| 'xy'` | implementation default | zoom 대상 축 방향입니다. 대용량 time-series는 보통 `'x'`를 사용합니다. |
| `scaleExtent` | `[number, number]` | implementation default | 최소/최대 zoom 배율입니다. |
| `wheelZoom` | `boolean \| KChartWheelZoomConfiguration` | enabled by mode | PC wheel/trackpad zoom 입력 설정입니다. |
| `gestureZoom` | `boolean \| KChartGestureZoomConfiguration` | enabled by mode | 모바일 touch/pinch 입력 설정입니다. |
| `resetOnDoubleClick` | `boolean` | `true` style behavior | 더블클릭으로 zoom reset을 허용할지 정합니다. |
| `onZoom` | `(context) => void` | - | zoom 후 현재 `xDomain`, `yDomain`, `transform`을 받을 수 있습니다. |

`wheelZoom` 세부 옵션:

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | wheel zoom 입력을 켭니다. |
| `devices` | `'pc' \| 'mobile' \| 'all'` | `pc` | 어떤 입력 장치에서 반응할지 정합니다. |
| `sensitivity` | `number` | `1` | wheel zoom 민감도입니다. 0보다 커야 합니다. |

`gestureZoom` 세부 옵션:

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | touch gesture zoom 입력을 켭니다. |
| `devices` | `'pc' \| 'mobile' \| 'all'` | `mobile` | 어떤 입력 장치에서 반응할지 정합니다. |
| `minTouches` | `number` | `1` | gesture 처리에 필요한 최소 touch 수입니다. |

## Series Common Contract

모든 series factory는 최종적으로 `KChartSeries<T>`를 반환합니다.

| Field | Type | Description |
| --- | --- | --- |
| `selector` | `string` | series의 DOM/canvas class, legend key, hidden key로 사용됩니다. 같은 chart 안에서 고유해야 합니다. |
| `displayName` | `string` | legend와 tooltip에 표시할 이름입니다. 없으면 `selector`를 사용합니다. |
| `xField` / `yField` | `keyof T & string` | 기본 tooltip, scale 선택, downsample에 쓰이는 field입니다. |
| `color` | `string` | series 색상입니다. 없으면 chart `colors` 팔레트에서 할당됩니다. |
| `downsample` | `boolean \| KChartDownsampleConfiguration<T>` | line 계열 renderer에서 LTTB downsampling을 적용합니다. |
| `render(context)` | `function` | 실제 렌더링 함수입니다. custom series의 핵심 확장 지점입니다. |
| `tooltip(context)` | `function` | custom tooltip hit-test를 구현할 수 있습니다. |
| `clearTooltip(context)` | `function` | hover 종료 시 series highlight를 되돌릴 수 있습니다. |
| `destroy(context)` | `function` | chart destroy/update 시 canvas, WebGL resource, animation frame 등을 정리합니다. |

## Built-In Series Configuration

### SVG Line: `createLineSeries`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `selector` | `string` | required | series id/class입니다. |
| `displayName` | `string` | `selector` | legend/tooltip 이름입니다. |
| `xField` / `yField` | `keyof T & string` | required | line 좌표 field입니다. |
| `color` | `string` | chart color | stroke 색상입니다. |
| `strokeWidth` | `number` | `2` | SVG path stroke width입니다. |
| `curve` | `boolean` | `false` | `true`이면 `curveMonotoneX`를 사용합니다. |
| `dot` | `boolean \| { radius; fill; stroke }` | `false` | 각 point에 SVG circle을 표시합니다. |
| `downsample` | `boolean \| object` | disabled | LTTB를 적용합니다. |

### Canvas Line: `createCanvasLineSeries`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `selector` | `string` | required | series id입니다. |
| `xField` / `yField` | `keyof T & string` | required | line 좌표 field입니다. |
| `color` | `string` | chart color | stroke 색상입니다. |
| `lineWidth` | `number` | `2` | Canvas line width입니다. |
| `canvasName` | `string` | `selector` | canvas layer 이름입니다. 여러 series가 같은 canvas를 공유할 때 지정합니다. |
| `downsample` | `boolean \| object` | disabled | LTTB를 적용합니다. |
| `asyncRender` | `KChartAsyncRenderConfiguration` | disabled | OffscreenCanvas + Worker line draw를 사용합니다. |

### Canvas Point: `createCanvasPointSeries`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `selector` | `string` | required | series id입니다. |
| `xField` / `yField` | `keyof T & string` | required | point 좌표 field입니다. |
| `color` | `string` | chart color | fill fallback 색상입니다. |
| `radius` | `number \| (point) => number` | `3` | point 반지름입니다. |
| `fill` | `string` | `color` | point fill 색상입니다. |
| `stroke` | `string` | `rgba(255, 255, 255, 0.78)` | point stroke 색상입니다. |
| `strokeWidth` | `number` | `1.5` | point stroke width입니다. |
| `canvasName` | `string` | `selector` | canvas layer 이름입니다. |

### Canvas Candlestick: `createCanvasCandlestickSeries`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `selector` | `string` | required | series id입니다. |
| `xField` | `keyof T & string` | required | candle x 위치 field입니다. |
| `openField` / `highField` / `lowField` / `closeField` | `keyof T & string` | required | OHLC 값 field입니다. |
| `colorMode` | `'open-close' \| 'previous-close'` | `open-close` | 색상 기준입니다. 전일 종가 기준이면 `previous-close`를 사용합니다. |
| `previousCloseField` | `keyof T & string` | previous data close | `previous-close` 모드에서 비교 기준 field입니다. 없으면 이전 row의 close를 사용합니다. |
| `upColor` | `string` | `#22c55e` | 상승 candle 색상입니다. |
| `downColor` | `string` | `#ef4444` | 하락 candle 색상입니다. |
| `neutralColor` | `string` | chart color | 보합 또는 계산 불가 색상입니다. |
| `wickColor` | `string` | candle color | wick stroke 색상입니다. |
| `borderColor` | `string` | candle color | body border 색상입니다. |
| `candleWidth` | `number \| ({ data, xScale, plotSize }) => number` | auto | candle body width입니다. |
| `minCandleWidth` | `number` | `3` | 자동 width 최소값입니다. |
| `maxCandleWidth` | `number` | `18` | 자동 width 최대값입니다. |
| `strokeWidth` | `number` | `1.4` | wick/body stroke width입니다. |
| `canvasName` | `string` | `selector` | canvas layer 이름입니다. |

### WebGL Line: `createWebglLineSeries`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `selector` | `string` | required | series id입니다. |
| `xField` / `yField` | `keyof T & string` | required | line 좌표 field입니다. |
| `color` | `string` | chart color | line 색상입니다. |
| `lineWidth` | `number` | `1` | WebGL line width입니다. 브라우저/드라이버에 따라 1보다 큰 값이 제한될 수 있습니다. |
| `canvasName` | `string` | `selector` | WebGL canvas layer 이름입니다. |
| `downsample` | `boolean \| object` | disabled | LTTB를 적용합니다. |
| `asyncRender` | `KChartAsyncRenderConfiguration` | disabled | OffscreenCanvas + Worker line draw를 사용합니다. |

### WebGL Point: `createWebglPointSeries`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `selector` | `string` | required | series id입니다. |
| `xField` / `yField` | `keyof T & string` | required | point 좌표 field입니다. |
| `color` | `string` | chart color | point 색상입니다. |
| `pointSize` | `number \| (point) => number` | `8` | `gl_PointSize`로 전달되는 point 크기입니다. |
| `canvasName` | `string` | `selector` | WebGL canvas layer 이름입니다. |

WebGL point는 현재 interleaved buffer `[x, y, size]` 구조로 GPU에 전달합니다. Worker async path는 line series에만 구현되어 있습니다.

### SVG Region Map: `createGeoRegionMapSeries`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `geoJson` | `FeatureCollection \| Feature \| Feature[] \| Topology` | required | 지도 경계 GeoJSON 또는 TopoJSON입니다. 한국 시도, 세계 국가, 사내 구역처럼 polygon feature를 넣습니다. |
| `topoObjectName` | `string` | first object | TopoJSON을 넘겼을 때 사용할 object 이름입니다. 생략하면 첫 번째 object를 사용합니다. |
| `dataKey` | `keyof T & string` | `name` | chart data에서 region key로 사용할 field입니다. |
| `featureKey` | `string \| (feature) => string` | `name` | GeoJSON feature에서 region key로 사용할 property입니다. |
| `labelKey` | `string \| (feature) => string` | `featureKey` | label에 사용할 feature property입니다. |
| `valueField` | `keyof T & string` | - | tooltip/label에 표시할 값 field입니다. |
| `colorField` | `keyof T & string` | - | data row별 fill color field입니다. |
| `fitPadding` | `number` | `16` | projection fit 시 plot edge와 지도 사이 여백입니다. |
| `backgroundFill` | `string` | transparent | 지도 배경색입니다. |
| `fill` / `missingFill` | `string \| (context) => string` | palette / translucent gray | data가 있는 region과 없는 region의 채움색입니다. |
| `stroke` / `strokeWidth` | `string \| (context) => string`, `number` | white, `1.2` | region 경계선입니다. |
| `hoverFill` / `hoverStroke` / `hoverStrokeWidth` | mixed | - | tooltip hit region hover style입니다. |
| `labels` | `boolean \| KChartGeoRegionMapLabelConfiguration<T>` | disabled | `centroid` 또는 `callout` 라벨을 표시합니다. |
| `zoom` | `boolean \| KChartGeoRegionMapZoomConfiguration` | disabled | 지도 내부 wheel zoom, drag pan, zoom button control을 켭니다. |
| `tooltip` | `boolean \| { formatter }` | enabled | region tooltip입니다. |

`zoom: {enabled: true, controls: {visible: true}, scaleExtent: [1, 7]}`처럼 지정하면 축이 없는 지도에서도 확대/축소와 drag 이동을 사용할 수 있습니다. `wheel`은 mouse wheel zoom, `pan`은 drag pan 입력을 제어합니다. `labels.mode: 'callout'`은 작은 지도의 라벨 선이 복잡해질 수 있으므로, choropleth 지도에서는 `centroid`와 짧은 label formatter를 우선 권장합니다.

### SVG Globe: `createSvgGlobeSeries`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `latField` / `lonField` | `keyof T & string` | required | 일반 위도/경도 좌표입니다. 내부에서 `projection([lon, lat])`로 변환합니다. |
| `labelField` | `keyof T & string` | - | marker label field입니다. |
| `initialRotate` | `[number, number, number?]` | implementation default | 초기 지구본 회전값입니다. |
| `draggable` | `boolean` | `true` | mouse drag로 지구본을 회전할지 정합니다. |
| `globeScale` | `number` | auto | 지구본 기본 scale입니다. |
| `zoom` | `boolean \| KChartGlobeZoomConfiguration` | disabled | wheel/pinch/control zoom을 켭니다. |
| `drilldown` | `boolean \| KChartGlobeDrilldownConfiguration<T>` | disabled | marker click 또는 zoom threshold 기반 focus/map 전환입니다. |
| `landMode` | `'land' \| 'countries'` | `land` | land layer를 단일 land 또는 국가 feature 단위로 그릴지 정합니다. |
| `landGeoJson` | `any \| any[]` | world-atlas land | custom GeoJSON입니다. |
| `markerRadius` | `number \| (point) => number` | implementation default | marker 크기입니다. |
| `markerColor` | `string \| (point) => string` | implementation default | marker 색상입니다. |
| `onMarkerClick` | `(context) => void` | - | marker click callback입니다. `data`, `lat`, `lon`, `x`, `y`, `event`를 받습니다. |

## Downsampling Configuration

`createLineSeries`, `createCanvasLineSeries`, `createWebglLineSeries`에서 사용할 수 있습니다.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` when object exists | false이면 downsampling을 끕니다. |
| `threshold` | `number \| (context) => number` | plot width | 줄이고자 하는 목표 point 수입니다. 보통 chart plot width를 사용합니다. |
| `xAccessor` | `(point) => number` | field 기반 | LTTB x 값 추출 함수입니다. |
| `yAccessor` | `(point) => number` | field 기반 | LTTB y 값 추출 함수입니다. |

## Worker Rendering

KChart의 Worker 렌더링은 opt-in입니다. 현재 파악된 실제 동작 범위는 다음과 같습니다.

- 지원 series: `createCanvasLineSeries`, `createWebglLineSeries`
- 지원 작업: line draw 호출을 OffscreenCanvas + Web Worker로 이동
- main thread에 남는 작업: axis/scale/layout 계산, legend/tooltip DOM, `data -> Float32Array` point 변환
- fallback: `workerFactory`가 없거나 `transferControlToOffscreen`을 지원하지 않거나 worker 생성이 실패하면 main-thread renderer로 실행
- 미지원: `createWebglPointSeries`, candlestick, SVG series, tooltip hit-test의 worker 이동

```ts
// kchart-render.worker.ts
import { startKChartRenderWorker } from '@keneth80/k-chart';

startKChartRenderWorker();
```

```ts
createWebglLineSeries<Point>({
    selector: 'trace',
    xField: 'x',
    yField: 'signal',
    asyncRender: {
        enabled: true,
        workerFactory: () => new Worker(
            new URL('./kchart-render.worker.ts', import.meta.url),
            { type: 'module' }
        )
    }
});
```

현재 demo에서는 `Canvas BigData` 50k line과 `WebGL BigData` 120k line examples에 `asyncRender`가 적용되어 있습니다. 브라우저 콘솔에서 `[KChart Demo] creating render worker #...` 로그가 보이면 worker가 생성된 것입니다.

StackBlitz에서 data fetch와 worker 실행 여부를 같이 확인하려면
[`examples/stackblitz-worker-json-line`](../examples/stackblitz-worker-json-line)를 참고합니다.
이 예제는 `/data/large-line.json`을 `fetch()`로 읽고, `workerFactory` 호출 횟수와
OffscreenCanvas 지원 여부를 화면에 표시합니다.

## Option Factories

새 코드에서는 chart root field보다 option factory 사용을 권장합니다.

```ts
createKChart({
    selector: '#chart',
    data,
    axes,
    series,
    options: [
        createSpecAreaOption([{ start: 2, end: 4, label: 'STEP 01' }]),
        createGuideLineOption({ x: [{ value: 3, label: 'A' }] }),
        createCursorLineOption(),
        createTooltipNoteOption()
    ]
});
```

### Spec Area: `createSpecAreaOption`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `visible` | `boolean` | `true` | 전체 option 또는 area별 표시 여부입니다. |
| `start` / `end` | `number \| Date \| string` | required | x축 기준 영역 시작/끝입니다. |
| `color` | `string` | `rgba(249, 225, 250, 0.22)` | 영역 fill 색상입니다. |
| `label` | `string` | - | plot 상단에 표시할 영역 label입니다. |

### Fixed Guide Line: `createGuideLineOption`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `visible` | `boolean` | `true` | 전체 option 또는 line별 표시 여부입니다. |
| `x` / `y` | `KChartFixedGuideLine[]` | `[]` | x축 또는 y축 기준 고정 guide line입니다. |
| `value` | `number \| Date \| string` | required | line 위치 값입니다. |
| `label` | `string` | - | line label입니다. |
| `color` | `string` | `rgba(248, 251, 255, 0.46)` | line과 label stroke 색상입니다. |
| `width` | `number` | `1` | line width입니다. |
| `dasharray` | `string` | `4 6` | SVG dash pattern입니다. |
| `labelColor` | `string` | `#edf3f8` | label text 색상입니다. |
| `labelBackground` | `string` | `rgba(10, 14, 20, 0.84)` | label 배경색입니다. |

### Cursor Line: `createCursorLineOption`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `visible` | `boolean` | `true` | cursor guide 표시 여부입니다. |
| `color` | `string` | implementation default | cursor line 색상입니다. |
| `markerRadius` | `number` | implementation default | cursor marker 반지름입니다. |
| `valueFormat` | `(value) => string` | - | 공통 value formatter입니다. |
| `xFormat` | `(value) => string` | - | x축 value formatter입니다. |

### Tooltip Note: `createTooltipNoteOption`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | tooltip pin 기능을 켭니다. |
| `maxNotes` | `number` | `8` | 고정 가능한 note 최대 개수입니다. 초과하면 오래된 note가 제거됩니다. |
| `pinButtonLabel` | `string` | `Pin` | tooltip 안 pin 버튼 label입니다. |
| `notePlaceholder` | `string` | `Add a note...` | textarea placeholder입니다. |
| `onChange` | `(notes) => void` | - | note 추가/수정/삭제 시 호출됩니다. |

## Configuration Checklist

- x축이 문자열 category라면 chart zoom은 켜지 않는 것이 좋습니다. 현재 zoom은 `number`/`time` 축 중심입니다.
- 대용량 line은 `createWebglLineSeries` + `downsample` + `asyncRender` 조합부터 검토합니다.
- Canvas/WebGL series는 `canvasName`을 같게 주면 layer를 공유할 수 있지만, clear timing이 겹칠 수 있으므로 같은 renderer끼리 의도적으로만 공유합니다.
- OHLC chart는 y axis에 `domainFields: ['low', 'high']`를 넣어 wick이 잘리지 않게 합니다.
- 지구본/지도/Three.js/Cesium/MapLibre는 기능은 제공하지만, 외부 tile/provider/API key와 license는 애플리케이션에서 관리해야 합니다.
