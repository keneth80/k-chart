# KChart Functional API

## Package Boundaries

The root package remains backward compatible. Internally, implementation is
separated into `core`, `series`, `options`, `worker`, and `utils` modules.
If you need a field-by-field option dictionary, see
[Configuration Reference](configuration-reference.md).

```ts
import {createKChart} from '@keneth80/k-chart/core';
import {createLineChart, chartConfig} from '@keneth80/k-chart/presets';
import {
    createLineSeries,
    createCanvasLineSeries,
    createWebglLineSeries
} from '@keneth80/k-chart/series';
import {
    createSpecAreaOption,
    createGuideLineOption,
    createCursorLineOption,
    createTooltipNoteOption
} from '@keneth80/k-chart/options';
```

Preset helpers are a thin beginner-friendly layer over the same core
configuration. Series implementations depend on shared core contracts. The core
runtime does not contain concrete line, point, candlestick, WebGL, or globe
series implementations.

## Goal

KChart의 새 public API는 class adapter가 아니라 class-free runtime입니다. UI에서는 `new BasicChart(...)` 같은 인스턴스를 직접 만들지 않고 `createKChart(...)`로 controller를 생성합니다.

차트 코어는 축, scale, layout, SVG/Canvas/WebGL layer를 준비합니다. Series는 `render(context)` 함수만 제공하고, 같은 scale 정보를 받아 SVG, Canvas, WebGL 중 원하는 방식으로 그립니다.

## Import Surface

```ts
import {
    chartConfig,
    createColumnChart,
    createKChart,
    createLineChart,
    createPieChart,
    createCursorLineOption,
    createGuideLineOption,
    createLineSeries,
    createCanvasCandlestickSeries,
    createCanvasLineSeries,
    createCanvasPointSeries,
    createBoxPlotSeries,
    createGaugeSeries,
    createHistogramSeries,
    createTreemapSeries,
    createWaterfallSeries,
    createSvgGlobeSeries,
    createSpecAreaOption,
    createTooltipNoteOption,
    createWebglPointSeries,
    createCustomSeries,
    KChartController,
    KChartSeries
} from '@keneth80/k-chart';
```

새 저장소 기준 root public export는 `src/index.ts`이며 `src/kchart.ts`는 기존
내부 import 호환성을 위한 barrel입니다. 기존 class 기반 구현은 패키지 API로
내보내지 않습니다.

## Beginner Preset API

Preset API는 축과 series boilerplate를 숨기고, 내부적으로 동일한 `KChartConfiguration`을 만들어 `createKChart(...)`에 전달합니다.

```ts
import {createLineChart} from '@keneth80/k-chart';

type SalesPoint = {
    month: string;
    revenue: number;
};

createLineChart<SalesPoint>({
    selector: '#chart',
    data: [
        {month: 'Jan', revenue: 42},
        {month: 'Feb', revenue: 48},
        {month: 'Mar', revenue: 45}
    ],
    x: {field: 'month', type: 'point', title: 'Month'},
    y: {field: 'revenue', type: 'number', title: 'Revenue'},
    title: 'Revenue Trend',
    animation: true
});
```

제공되는 얇은 preset 함수:

| Function | Purpose |
| --- | --- |
| `createLineChart(options)` | SVG/Canvas/WebGL line chart를 빠르게 생성합니다. `renderer: 'canvas' \| 'webgl'`로 renderer를 바꿀 수 있습니다. |
| `createColumnChart(options)` | category/point x축 기반 column chart를 생성합니다. |
| `createPieChart(options)` | `label`, `value` field만 지정해 pie chart를 생성합니다. |
| `createDoughnutChart(options)` | pie chart와 같은 옵션을 쓰고 기본 inner radius를 적용합니다. |

## Chart Builder API

여러 설정을 단계적으로 조립하고 싶다면 `chartConfig(data)` builder를 사용할 수 있습니다. `build()`는 advanced configuration을 반환하고, `render()`는 즉시 chart를 생성합니다.

```ts
import {chartConfig} from '@keneth80/k-chart';

const config = chartConfig(data)
    .x('month', 'point', {title: 'Month'})
    .y('orders', 'number', {title: 'Orders'})
    .column({color: '#56d08f'})
    .tooltip()
    .animation()
    .build({selector: '#chart'});

const chart = chartConfig(data)
    .selector('#chart')
    .title('Orders By Month')
    .x('month', 'point')
    .y('orders', 'number')
    .column()
    .render();
```

Builder는 `series(...)`와 `option(...)`도 제공하므로, 초보자용 흐름에서 시작해 기존 `createLineSeries(...)`, `createSpecAreaOption(...)` 같은 고급 함수와 섞어 사용할 수 있습니다.

## Axis Tick Density

`point`와 `string` 축에서 `tickCount`를 지정하면 전체 domain 중 표시할 tick을 균등하게 샘플링하고 첫 값과 마지막 값을 보존합니다. 이 설정은 axis에 표시되는 tick만 제한하며 scale domain이나 series의 데이터 위치를 변경하지 않습니다.

```ts
axes: [
    {field: 'month', type: 'point', placement: 'bottom', tickCount: 4},
    {field: 'revenue', type: 'number', placement: 'left', tickCount: 5}
]
```

`tickCount`를 생략하거나 domain 길이 이상으로 지정한 `point`/`string` 축은 모든 tick을 표시합니다. 여러 category가 있는 축에서 `tickCount: 1`은 첫 값과 마지막 값을 보존하기 위해 2개 라벨로 처리됩니다. `number`와 `time` 축의 `tickCount`는 기존처럼 D3 tick 생성에 전달되는 개수 힌트이며 실제 표시 개수와 정확히 일치하지 않을 수 있습니다.

## Built-In BI / Distribution Series

대시보드에서 자주 필요한 분포, 구성, KPI, 누적 흐름 차트도 class-free factory로 사용할 수 있습니다.

```ts
createKChart({
    selector: '#box-plot',
    data: [
        {team: 'A', min: 12, q1: 18, median: 24, q3: 31, max: 42, outliers: [48]},
        {team: 'B', min: 10, q1: 16, median: 22, q3: 28, max: 39, outliers: []}
    ],
    axes: [
        {field: 'team', type: 'point', placement: 'bottom'},
        {field: 'median', type: 'number', placement: 'left', domainFields: ['min', 'max']}
    ],
    series: [
        createBoxPlotSeries({
            selector: 'box',
            xField: 'team',
            minField: 'min',
            q1Field: 'q1',
            medianField: 'median',
            q3Field: 'q3',
            maxField: 'max',
            outliersField: 'outliers'
        })
    ]
});
```

```ts
createKChart({
    selector: '#kpi',
    data: [{label: 'SLA', value: 92}],
    axes: [],
    series: [
        createGaugeSeries({
            selector: 'sla',
            labelField: 'label',
            valueField: 'value',
            min: 0,
            max: 100,
            color: '#56d08f'
        })
    ]
});
```

| Factory | Purpose |
| --- | --- |
| `createBoxPlotSeries(options)` | min/q1/median/q3/max와 outlier를 표시합니다. |
| `createHistogramSeries(options)` | `binStart`, `binEnd`, `count` 형태의 binned 데이터를 막대로 표시합니다. |
| `createTreemapSeries(options)` | 값 비중을 tile 면적으로 표현합니다. |
| `createGaugeSeries(options)` | 단일 KPI 값을 arc/needle meter로 표현합니다. |
| `createWaterfallSeries(options)` | 증가/감소/합계 흐름을 누적 bar로 표현합니다. |

## Controller

```ts
const chart = createKChart({
    selector: '#chart',
    data,
    axes,
    series
});

chart.render();
chart.updateData(nextData);
chart.updateAxes(nextAxes);
chart.updateSeries(nextSeries);
chart.resize({ width: 960, height: 420 });
chart.destroy();
```

### Controller Contract

```ts
type KChartController<T> = {
    render(): KChartController<T>;
    updateData(data: T[]): KChartController<T>;
    updateAxes(axes: KChartAxis<T>[]): KChartController<T>;
    updateSeries(series: KChartSeries<T>[]): KChartController<T>;
    resize(size?: Partial<KChartSize>): KChartController<T>;
    destroy(): void;
    getState(): KChartState<T>;
};
```

반환값이 다시 controller이기 때문에 `render().updateData(...)`처럼 chaining할 수 있습니다.

## Built-In Line Series

```ts
const chart = createKChart<TrafficPoint>({
    selector: '#chart',
    data,
    axes: [
        { field: 'time', type: 'string', placement: 'bottom' },
        { field: 'value', type: 'number', placement: 'left' }
    ],
    series: [
        createLineSeries({
            selector: 'traffic',
            displayName: 'Traffic',
            xField: 'time',
            yField: 'value',
            curve: true,
            dot: true
        })
    ]
});

chart.render();
```

## Built-In SVG BI Series

일반 BI 화면에서 자주 쓰는 면적, 가로 막대, 그룹 막대, 산점도, 버블 차트는 SVG factory로 제공합니다.

```ts
createAreaSeries<Point>({
    selector: 'area',
    xField: 'month',
    yField: 'traffic',
    curve: true,
    fill: '#5db8ff',
    stroke: '#5db8ff'
});

createBarSeries<CategoryPoint>({
    selector: 'ranking',
    yField: 'name',
    xField: 'score',
    color: '#56d08f'
});

createGroupedColumnSeries<SalesPoint>({
    selector: 'grouped-sales',
    xField: 'month',
    segments: [
        {field: 'online', label: 'Online', color: '#5db8ff'},
        {field: 'store', label: 'Store', color: '#56d08f'}
    ]
});

createScatterSeries<Point>({
    selector: 'scatter',
    xField: 'temperature',
    yField: 'sales',
    color: '#f3b45b'
});

createBubbleSeries<Point>({
    selector: 'bubble',
    xField: 'growth',
    yField: 'margin',
    radiusField: 'revenue',
    minRadius: 5,
    maxRadius: 22,
    color: '#d876ff'
});
```

`createBarSeries()`는 horizontal bar 전용이므로 x축은 숫자, y축은 문자열/point/category 축을 사용합니다. `createGroupedColumnSeries()`는 같은 x 값 안에 여러 segment를 나란히 배치합니다. `createBubbleSeries()`는 `radiusField` 값의 최소/최대 범위를 `minRadius`와 `maxRadius`로 선형 매핑합니다.

## Built-In Graph Series

관계 데이터는 별도 node 배열을 만들지 않고 source-target 행 배열을 그대로 전달할 수 있습니다.

```ts
type Relation = {
    source: string;
    target: string;
    metric: number;
    category: string;
};

const data: Relation[] = [
    {source: 'Browser', target: 'API', metric: 46, category: 'Client'},
    {source: 'Mobile', target: 'API', metric: 34, category: 'Client'},
    {source: 'API', target: 'Orders', metric: 58, category: 'Platform'}
];

const chart = createKChart<Relation>({
    selector: '#chart',
    data,
    axes: [],
    grid: {visible: false},
    legend: {visible: false},
    tooltip: {visible: false},
    series: [
        createGraphSeries({
            selector: 'relations',
            sourceField: 'source',
            targetField: 'target',
            valueField: 'metric',
            categoryField: 'category',
            layout: 'force',
            edgeSymbols: 'circle-arrow',
            roam: 'both',
            selectMode: 'multiple'
        })
    ]
});

chart.render();
```

`layout: 'circular'`로 바꾸면 같은 데이터를 원형 배치로 비교할 수 있습니다. 중복 source-target 행은 하나의 edge로 합산되고, node metric은 연결된 edge metric의 합입니다.

## Built-In Tree Series

조직도나 분류 체계처럼 부모가 하나인 계층 데이터는 별도 nested object 변환 없이 id-parent 행 배열을 전달할 수 있습니다.

```ts
type OrganizationRow = {
    id: string;
    parentId: string | null;
    name: string;
    team: string;
    headcount: number;
};

const organization: OrganizationRow[] = [
    {id: 'company', parentId: null, name: 'KChart', team: 'Company', headcount: 42},
    {id: 'product', parentId: 'company', name: 'Product', team: 'Product', headcount: 14},
    {id: 'engineering', parentId: 'company', name: 'Engineering', team: 'Engineering', headcount: 24},
    {id: 'platform', parentId: 'engineering', name: 'Platform', team: 'Engineering', headcount: 8}
];

createKChart<OrganizationRow>({
    selector: '#chart',
    data: organization,
    axes: [],
    grid: {visible: false},
    legend: {visible: false},
    tooltip: {visible: true},
    zoom: {visible: false},
    series: [
        createTreeSeries({
            selector: 'organization-tree',
            idField: 'id',
            parentField: 'parentId',
            labelField: 'name',
            valueField: 'headcount',
            categoryField: 'team',
            layout: 'orthogonal',
            orientation: 'left-right',
            emphasis: 'descendant',
            roam: 'both'
        })
    ]
}).render();
```

`layout: 'radial'`은 같은 데이터를 중심에서 바깥으로 펼칩니다. 루트는 하나만 허용하며 모든 non-root node는 존재하는 부모를 가리켜야 합니다. 입력 오류는 렌더 전에 명확한 예외로 반환됩니다.

## Built-In Treemap Series

Treemap은 동일 metric을 여러 Dimension 항목으로 나누고, 전체에서 차지하는 비중을 tile 면적으로 비교할 때 사용합니다.

```ts
type ProductShare = {
    product: string;
    revenue: number;
    color: string;
};

const products: ProductShare[] = [
    {product: 'Analytics Cloud', revenue: 420, color: '#5db8ff'},
    {product: 'Commerce API', revenue: 310, color: '#56d08f'},
    {product: 'Data Platform', revenue: 245, color: '#f3b45b'},
    {product: 'Automation', revenue: 165, color: '#d876ff'}
];

createKChart<ProductShare>({
    selector: '#chart',
    data: products,
    axes: [],
    grid: {visible: false},
    legend: {visible: false},
    tooltip: {visible: true},
    animation: {enabled: true, duration: 720, mode: 'enter'},
    series: [
        createTreemapSeries({
            selector: 'product-share',
            labelField: 'product',
            valueField: 'revenue',
            colorField: 'color',
            gap: 5,
            radius: 4,
            minLabelArea: 1600,
            sort: true
        })
    ]
}).render();
```

`valueField`는 0보다 큰 숫자를 사용해야 하며 면적은 전체 양수 metric 합에 대한 상대 비율입니다. 현재 API는 단일 Dimension 항목 비교에 집중합니다.

## Built-In Sankey Series

Sankey는 방향성 비순환 flow에서 단계별 전환량과 이탈량을 비교할 때 사용합니다.

```ts
type FlowRow = {
    source: string;
    target: string;
    metric: number;
    category: string;
};

const flow: FlowRow[] = [
    {source: 'Visit', target: 'Signup', metric: 120, category: 'Acquisition'},
    {source: 'Visit', target: 'Browse', metric: 80, category: 'Acquisition'},
    {source: 'Signup', target: 'Trial', metric: 85, category: 'Activation'},
    {source: 'Signup', target: 'Drop off', metric: 35, category: 'Activation'},
    {source: 'Trial', target: 'Paid', metric: 72, category: 'Conversion'}
];

createKChart<FlowRow>({
    selector: '#chart',
    data: flow,
    axes: [],
    grid: {visible: false},
    legend: {visible: false},
    tooltip: {visible: false},
    series: [
        createSankeySeries({
            selector: 'customer-flow',
            sourceField: 'source',
            targetField: 'target',
            valueField: 'metric',
            categoryField: 'category',
            nodeAlign: 'justify',
            nodeWidth: 18,
            nodePadding: 16,
            linkColor: 'gradient'
        })
    ]
}).render();
```

동일 source-target 행은 하나의 flow로 합산됩니다. 순환 관계망은 `createGraphSeries()`를 사용하고, Sankey에는 단계가 앞으로 진행되는 DAG 데이터를 전달해야 합니다.

## Built-In Canvas Series

Canvas 2D line/point renderer는 별도 class 없이 factory로 생성합니다.

```ts
const chart = createKChart<Point>({
    selector: '#chart',
    data,
    axes: [
        { field: 'x', type: 'number', placement: 'bottom' },
        { field: 'y', type: 'number', placement: 'left' }
    ],
    series: [
        createCanvasLineSeries({
            selector: 'canvas-line',
            xField: 'x',
            yField: 'y',
            color: '#56d08f',
            lineWidth: 3
        }),
        createCanvasPointSeries({
            selector: 'canvas-points',
            xField: 'x',
            yField: 'y',
            radius: 4,
            color: '#5db8ff'
        })
    ]
});
```

## Built-In Canvas Candlestick Series

OHLC 주식 데이터는 `createCanvasCandlestickSeries`로 렌더링합니다. Y축은 보통 `close`를 기본 field로 두고, `domainFields`에 `low`와 `high`를 넣어 전체 캔들 범위가 축 domain에 포함되게 합니다.

```ts
interface StockPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    previousClose: number;
}

const chart = createKChart<StockPoint>({
    selector: '#chart',
    data: [
        { date: '2026-06-01', open: 101, high: 108, low: 98, close: 106, previousClose: 100 },
        { date: '2026-06-02', open: 106, high: 110, low: 102, close: 103, previousClose: 106 },
        { date: '2026-06-03', open: 103, high: 112, low: 101, close: 111, previousClose: 103 }
    ],
    axes: [
        { field: 'date', type: 'time', placement: 'bottom', tickCount: 5, domain: ['2026-05-31', '2026-06-04'] },
        {
            field: 'close',
            type: 'number',
            placement: 'left',
            domainFields: ['low', 'high'],
            title: 'Price'
        }
    ],
    tooltip: { visible: true },
    series: [
        createCanvasCandlestickSeries({
            selector: 'price',
            displayName: 'Price',
            xField: 'date',
            openField: 'open',
            highField: 'high',
            lowField: 'low',
            closeField: 'close',
            colorMode: 'previous-close',
            previousCloseField: 'previousClose',
            upColor: '#22c55e',
            downColor: '#ef4444'
        })
    ]
});
```

캔들 색상은 기본적으로 `colorMode: 'open-close'`로 동작하며 `close`와 `open`을 비교합니다. `colorMode: 'previous-close'`를 사용하면 현재 `close`와 전일 종가를 비교합니다. `previousCloseField`가 있으면 그 필드를 우선 사용하고, 없으면 렌더링 데이터에서 바로 앞 항목의 `closeField` 값을 전일 종가로 사용합니다.

## Built-In SVG Globe Series

지도/지구본 데이터는 `createSvgGlobeSeries`로 렌더링합니다. 좌표는 일반 위도/경도 값을 그대로 사용하며, 내부에서는 `projection([lon, lat])`로 변환합니다. 마커 클릭 시 원본 데이터, 위도/경도, 화면 좌표, 브라우저 이벤트를 callback으로 받을 수 있습니다. 기본값으로 World Atlas 110m land layer와 국가 경계 mesh가 표시되며, `landVisible: false`로 끄거나 `landGeoJson`으로 더 정교한 GeoJSON을 교체할 수 있습니다. 나라별 색상 지정이 필요하면 `landMode: 'countries'`를 사용하고 `landFill`, `landStroke`, `landOpacity` callback을 feature 기준으로 지정합니다. `zoom: { enabled: true }`를 지정하면 데스크톱에서는 wheel zoom, 터치 장치에서는 pinch zoom을 사용할 수 있습니다. 페이지 스크롤 때문에 wheel zoom을 쓰기 어려우면 `controls: true`로 차트 오른쪽 상단의 zoom control을 표시할 수 있습니다. `drilldown.enabled`를 켜면 마커 클릭 시 전환 효과와 함께 해당 좌표를 포커싱합니다. `transition`은 `'warp'`, `'cloud'`, `'none'`을 지원합니다. `cloud`는 Canvas 구름이 화면을 덮은 뒤 목적 화면으로 교체하고, 비동기 `onEnter`가 완료될 때까지 덮인 상태를 유지한 다음 구름을 걷어냅니다. `mode: 'zoom'`은 기존 지구본을 유지한 채 좌표로 줌인하고, `mode: 'map'`은 해당 좌표 중심의 Mercator 평면 지도 모드로 전환합니다. `autoMapOnZoom: true`를 사용하면 `mapZoomThreshold` 이상의 확대에서 현재 지구본 정면 중심과 가장 가까운 등록 도시를 선택해 평면 지도로 자동 전환하고, `globeZoomThreshold` 이하로 축소하면 지구본으로 돌아옵니다.

```ts
interface CityPoint {
    name: string;
    lat: number;
    lon: number;
    url: string;
}

const chart = createKChart<CityPoint>({
    selector: '#chart',
    data: [
        { name: 'Seoul', lat: 37.5665, lon: 126.9780, url: 'https://en.wikipedia.org/wiki/Seoul' },
        { name: 'New York', lat: 40.7128, lon: -74.0060, url: 'https://en.wikipedia.org/wiki/New_York_City' },
        { name: 'London', lat: 51.5072, lon: -0.1276, url: 'https://en.wikipedia.org/wiki/London' }
    ],
    grid: { visible: false },
    legend: { visible: false },
    tooltip: { visible: false },
    axes: [],
    series: [
        createSvgGlobeSeries({
            selector: 'cities',
            displayName: 'Cities',
            latField: 'lat',
            lonField: 'lon',
            labelField: 'name',
            initialRotate: [-120, -18, 0],
            zoom: { enabled: true, min: 0.65, max: 3, controls: { visible: true, x: 6, y: 6 } },
            landFill: '#22c55e',
            landStroke: 'rgba(236, 253, 245, 0.72)',
            landOpacity: 0.58,
            countryBordersStroke: 'rgba(236, 253, 245, 0.28)',
            drilldown: {
                enabled: true,
                mode: 'map',
                autoMapOnZoom: true,
                mapZoomThreshold: 2.4,
                globeZoomThreshold: 1.8,
                focusZoom: 2.7,
                zoomScale: 7,
                duration: 1200,
                transition: {
                    type: 'cloud',
                    duration: 5000,
                    coverDuration: 3200,
                    revealDuration: 1800,
                    respectReducedMotion: false,
                    color: '#f5f7fa',
                    density: 0.86,
                    blur: 20
                },
                resetControl: true
            },
            markerColor: '#5db8ff',
            onMarkerClick: ({ data }) => {
                window.open(data.url, '_blank', 'noopener,noreferrer');
            }
        })
    ]
});
```

`draggable` 기본값은 `true`입니다. `zoom` 기본값은 비활성화이며, `zoom: true` 또는 `zoom: { enabled: true }`로 켤 수 있습니다. `min`과 `max`는 기본 globe scale에 곱해지는 배율입니다. `controls: true`를 지정하면 `+`, 현재 배율, `-` 버튼이 표시되고 현재 배율 버튼은 1x로 리셋합니다. `controls: { visible: true, x, y }`의 `x`, `y`는 차트 전체 SVG의 오른쪽/위쪽 edge 기준 offset입니다. `drilldown` 기본값은 비활성화이며, `drilldown: { enabled: true, mode: 'zoom', focusZoom: 2.7 }`로 켜면 선택 좌표가 중앙에 오도록 지구본을 회전하고 확대합니다. `transition` 기본값은 `'warp'`입니다. 구름 전환은 `duration`으로 총 시간을 지정하거나 `coverDuration`과 `revealDuration`으로 덮이는 시간과 걷히는 시간을 각각 지정할 수 있습니다. `respectReducedMotion`의 기본값은 `true`이며 운영체제의 동작 줄이기 설정에서 최대 1.2초로 단축합니다. 지정한 시간을 항상 그대로 사용하려면 `respectReducedMotion: false`를 설정합니다. `color`, `density`, `blur`로 구름의 색상과 밀도를 조절할 수 있습니다. 기존 평면 지도 전환이 필요하면 `mode: 'map'`과 `zoomScale`을 사용합니다. 자동 전환은 `autoMapOnZoom`, `mapZoomThreshold`, `globeZoomThreshold`로 제어합니다. 두 임계값을 다르게 두는 이유는 경계 배율에서 지구본과 지도가 반복 전환되는 현상을 막기 위한 hysteresis입니다. `resetControl`이 true이면 포커스 상태에서 `G` 버튼으로 이전 지구본 상태로 돌아갑니다. `landGeoJson`에 GeoJSON feature, feature collection, 또는 feature 배열을 넘기면 기본 land layer 대신 해당 path를 구면 위에 그립니다. `landMode: 'countries'`를 지정하면 기본 fill layer도 국가 feature 단위로 분리되어 나라별 색상 callback을 적용할 수 있습니다.

실제 도로·건물 타일 지도가 필요한 경우 `mode: 'external-map'`을 사용합니다. 이 모드에서는 KChart가 내부 SVG 평면도를 그리지 않고 `onEnter` 콜백에 `{ data, lat, lon, exit }`를 전달합니다. `@keneth80/k-chart-maplibre` 어댑터는 이 컨텍스트를 받아 MapLibre 지도를 표시하며, 어댑터의 `G` 버튼은 `exit()`을 호출해 지구본으로 복귀합니다. MapLibre는 지도 렌더러이므로 주소 변환과 맛집 검색은 Kakao Local API, Naver Maps, MapTiler Geocoding 등 별도 공급자에서 받아 장소 좌표 데이터로 전달해야 합니다.

외부 장소 API 응답은 `parseMapLibrePlaces()`로 `id`, `name`, `lat`, `lon`을
검증·변환할 수 있습니다. `createMapLibrePlaceResolver()`는 변환된 장소를 도시별로
한 번 인덱싱하고 `createMapLibreGlobeBridge()`에 바로 전달할 resolver를 반환합니다.
완전히 실행 가능한 예제와 import 목록은
[`packages/k-chart-maplibre/README.md`](../packages/k-chart-maplibre/README.md)에 있습니다.

## Built-In WebGL Series

```ts
const chart = createKChart<Point>({
    selector: '#chart',
    data,
    axes: [
        { field: 'x', type: 'number', placement: 'bottom' },
        { field: 'y', type: 'number', placement: 'left' }
    ],
    series: [
        createWebglLineSeries({
            selector: 'webgl-large-line',
            displayName: '120k WebGL Line',
            xField: 'x',
            yField: 'y',
            color: '#5db8ff',
            lineWidth: 1,
            downsample: {
                enabled: true,
                threshold: ({ plotSize }) => Math.floor(plotSize.width)
            }
        }),
        createWebglPointSeries({
            selector: 'webgl-points',
            xField: 'x',
            yField: 'y',
            pointSize: 8,
            color: '#f3b45b'
        })
    ]
});
```

### Downsampling

`createLineSeries`, `createCanvasLineSeries`, `createWebglLineSeries`는 `downsample` 옵션을 지원합니다. `true`를 넘기면 현재 plot width를 기준으로 LTTB가 적용되고, 객체를 넘기면 threshold와 x/y accessor를 직접 지정할 수 있습니다.

```ts
createWebglLineSeries<Point>({
    selector: 'trace',
    xField: 'x',
    yField: 'signal',
    downsample: {
        enabled: true,
        threshold: ({ plotSize }) => Math.floor(plotSize.width * 1.5)
    }
});
```

알고리즘 자체도 export됩니다.

```ts
import { downsampleLTTB } from '@keneth80/k-chart';

const sampled = downsampleLTTB(data, 1000, (point) => point.x, (point) => point.signal);
```

### Animation

차트 레벨의 `animation` 옵션은 enter animation과 `updateData()` transition을 제어합니다. `animation: true`로 기본 enter animation을 켤 수 있고, 세부 옵션으로 duration/easing을 조절할 수 있습니다. `mode: 'update'`는 `number`/`time` 축 domain을 프레임 단위로 보간하므로 실시간 시계열의 타임라인 이동에 적합합니다.

```ts
createKChart<Point>({
    selector: '#chart',
    data,
    axes: [
        { field: 'x', type: 'number', placement: 'bottom' },
        { field: 'signal', type: 'number', placement: 'left' }
    ],
    series: [
        createLineSeries({ selector: 'signal', xField: 'x', yField: 'signal' })
    ],
    animation: {
        enabled: true,
        duration: 820,
        easing: 'easeOutCubic',
        mode: 'enter',
        respectReducedMotion: true
    }
});
```

실시간 데이터는 다음처럼 수신 주기와 transition 시간을 맞춥니다.

```ts
const intervalMs = 250;

const chart = createKChart<Point>({
    selector: '#chart',
    data,
    axes,
    series,
    animation: {
        enabled: true,
        duration: intervalMs,
        easing: 'linear',
        mode: 'update'
    }
}).render();

const timer = window.setInterval(() => {
    data.push(readNextPoint());
    if (data.length > 240) data.splice(0, data.length - 240);
    chart.updateData(data);
}, intervalMs);
```

Custom series에서는 `render(context)` 안에서 `context.animation.progress`를 읽어 직접 opacity, scale, arc sweep, draw count 등을 조절할 수 있습니다. Update transition에 참여할 동기 custom series는 `supportsUpdateAnimation: true`를 명시해야 합니다. Worker-backed Canvas/WebGL line은 메시지 큐 증가를 막기 위해 update transition을 자동 생략하고 수신 주기당 한 번만 렌더합니다. 대용량 차트에서는 필요한 화면에서만 animation을 켜고 downsampling을 함께 사용하는 것을 권장합니다.

### Zoom

차트 레벨의 `zoom` 옵션은 number/time 축의 domain을 갱신하고 기존 렌더 파이프라인을 다시 실행합니다. 별도 series API 없이 SVG, Canvas, WebGL renderer가 같은 확대 상태를 공유합니다.

```ts
createKChart<Point>({
    selector: '#chart',
    data,
    axes: [
        { field: 'x', type: 'number', placement: 'bottom' },
        { field: 'signal', type: 'number', placement: 'left' }
    ],
    series: [
        createWebglLineSeries({
            selector: 'trace',
            xField: 'x',
            yField: 'signal'
        })
    ],
    zoom: {
        enabled: true,
        mode: 'both',
        direction: 'x',
        scaleExtent: [1, 80],
        wheelZoom: { enabled: true, devices: 'pc', sensitivity: 0.85 },
        gestureZoom: { enabled: true, devices: 'mobile', minTouches: 1 },
        resetOnDoubleClick: true
    }
});
```

`mode`는 `'wheel'`, `'select'`, `'both'`를 지원합니다. `'wheel'`은 wheel/trackpad zoom과 drag pan, `'select'`는 드래그 영역 선택 zoom, `'both'`는 wheel/trackpad zoom과 드래그 영역 선택 zoom을 함께 사용합니다. `wheelZoom`은 PC wheel/trackpad 입력을, `gestureZoom`은 모바일 touch gesture 입력을 분리해서 제어합니다. `direction`은 `'x'`, `'y'`, `'xy'`를 지원합니다. string/point 축은 순서형 축이라 현재 zoom 대상에서 제외됩니다.

### OffscreenCanvas Worker Rendering

`createCanvasLineSeries`와 `createWebglLineSeries`는 `asyncRender` 옵션을 지원합니다. worker 파일에서는 `startKChartRenderWorker()`를 호출하고, series에는 worker를 만드는 factory를 넘깁니다.

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

OffscreenCanvas를 지원하지 않거나 worker 생성에 실패하면 기존 메인 스레드 렌더러로 fallback됩니다.

JSON 데이터를 `fetch()`로 읽고 worker 생성 여부를 화면에서 확인하는 전체 예제는
[Worker JSON Line StackBlitz](https://stackblitz.com/fork/github/keneth80/k-chart/tree/main/examples/stackblitz-worker-json-line?title=KChart%20Worker%20JSON%20Line&file=src/main.ts)를 참고하세요.
이 예제는 API/data URL과 worker module URL이 서로 다른 역할이라는 점을 보여줍니다.

### SVG Region Maps

`createGeoRegionMapSeries()`는 GeoJSON `FeatureCollection` 또는 TopoJSON `Topology`를 받아 각 region을 SVG path로 렌더링합니다. 한국 시도, 세계 국가, 사내 공장 구역처럼 경계 데이터가 있는 지도형 시각화에 사용할 수 있습니다. `dataKey`와 `featureKey`가 같은 값을 가리키면 chart data가 GeoJSON feature에 매핑됩니다. TopoJSON에 여러 object가 들어 있다면 `topoObjectName`으로 사용할 object 이름을 지정할 수 있고, 생략하면 첫 번째 object를 사용합니다.

```ts
import {createGeoRegionMapSeries, createKChart} from '@keneth80/k-chart';

type Region = {
    name: string;
    value: number;
    color: string;
};

createKChart<Region>({
    selector: '#chart',
    data: [
        {name: '서울특별시', value: 92, color: '#2f73b8'},
        {name: '부산광역시', value: 82, color: '#202b84'}
    ],
    axes: [],
    grid: {visible: false},
    legend: {visible: false},
    tooltip: {visible: true},
    series: [
        createGeoRegionMapSeries<Region>({
            selector: 'korea-region',
            geoJson: koreaProvinceGeoJson,
            topoObjectName: 'skorea_provinces_2018_geo',
            dataKey: 'name',
            featureKey: 'name',
            labelKey: 'name',
            valueField: 'value',
            colorField: 'color',
            zoom: {
                enabled: true,
                wheel: true,
                pan: true,
                scaleExtent: [1, 7],
                controls: {visible: true}
            },
            labels: {
                visible: true,
                mode: 'centroid',
                formatter: ({label, value}) => `${label} ${value}`
            },
            tooltip: {
                formatter: ({label, value}) => `<strong>${label}</strong><br/>value: ${value}`
            }
        })
    ]
}).render();
```

`zoom`은 지역 지도 전용 확대/이동 옵션입니다. `enabled: true`이면 mouse wheel로 확대/축소하고 drag로 지도를 이동할 수 있습니다. `controls: {visible: true}`를 지정하면 오른쪽 상단에 `+`, 현재 배율, `-` 버튼이 표시됩니다. `scaleExtent`는 최소/최대 배율이며, `wheel`과 `pan`을 각각 꺼서 입력 방식을 제한할 수 있습니다. 지도 라벨은 비교적 좁은 화면에서 `callout` 선이 복잡해질 수 있으므로, 한국 시도 choropleth처럼 경계 내부에 값을 보여줄 때는 `labels.mode: 'centroid'`를 권장합니다.

전세계 국가 지도는 `world-atlas` 110m country geometry를 내장한 `createWorldCountryMapSeries()`로 더 짧게 만들 수 있습니다. country 이름은 `world-atlas`의 `properties.name`과 맞춰야 합니다.

```ts
createWorldCountryMapSeries<Country>({
    selector: 'world-country',
    dataKey: 'name',
    valueField: 'visitors',
    colorField: 'color',
    missingFill: 'rgba(142, 160, 173, 0.18)'
});
```

지도 위에 좌표 기반 강조 요소가 필요하면 `bubbles`와 `markers`를 함께 사용할 수 있습니다. 둘 다 일반적인 위도/경도 값을 사용하며 내부에서 `projection([lon, lat])`로 화면 좌표를 계산합니다. `bubbles`는 지도 위 원형 분포/규모 표현에 적합하고, `markers`는 사진 썸네일, 라벨, 핀 형태의 지점 표시를 제공합니다. `imageUrl`에는 일반 이미지 URL이나 `data:image/...` URI를 넣을 수 있습니다. 마커별 `onClick`을 지정하면 원본 marker, 화면 좌표, mouse event를 받아 팝업이나 상세 이동을 연결할 수 있습니다.

```ts
createWorldCountryMapSeries<Country>({
    selector: 'world-branches',
    dataKey: 'name',
    colorField: 'color',
    backgroundFill: '#1f7daf',
    fill: '#f8fbff',
    missingFill: '#f8fbff',
    zoom: {
        enabled: true,
        wheel: true,
        pan: true,
        controls: {visible: true}
    },
    bubbles: [
        {id: 'seoul-bubble', lat: 37.5665, lon: 126.978, value: 56, color: '#ffd45a'},
        {id: 'us-bubble', lat: 39.8, lon: -98.5, value: 82, color: '#ff5a36'}
    ],
    markers: [
        {
            id: 'netherlands',
            label: '네덜란드교회',
            lat: 52.3676,
            lon: 4.9041,
            color: '#4ecfb0',
            size: 66,
            imageUrl: '/images/church/netherlands.jpg',
            labelPosition: 'top',
            onClick: ({marker}) => console.log(marker.id)
        }
    ]
});
```

전체 예제:

- [Korea Region Map StackBlitz](https://stackblitz.com/fork/github/keneth80/k-chart/tree/main/examples/stackblitz-korea-region-map-basic?title=KChart%20Korea%20Region%20Map&file=src/main.ts)
- [World Country Map StackBlitz](https://stackblitz.com/fork/github/keneth80/k-chart/tree/main/examples/stackblitz-world-country-map-basic?title=KChart%20World%20Country%20Map&file=src/main.ts)
- [World Photo Marker Map StackBlitz](https://stackblitz.com/fork/github/keneth80/k-chart/tree/main/examples/stackblitz-world-photo-marker-map?title=KChart%20World%20Photo%20Marker%20Map&file=src/main.ts)

## Display Options

```ts
createKChart({
    selector: '#chart',
    data,
    title: { text: 'Hybrid Revenue And Volume', align: 'left' },
    grid: { visible: true, y: true, x: false, dasharray: '2 6' },
    legend: { visible: true, placement: 'top' },
    tooltip: { visible: true },
    axes: [
        { field: 'x', type: 'number', placement: 'bottom', title: 'Month Index' },
        { field: 'value', type: 'number', placement: 'left', title: 'Value' },
        { field: 'volume', type: 'number', placement: 'right', title: 'Volume' }
    ],
    series: [
        createLineSeries({ selector: 'value', xField: 'x', yField: 'value' }),
        createCanvasPointSeries({ selector: 'volume', xField: 'x', yField: 'volume' })
    ]
});
```

The default tooltip shows the active series name and nearest x/y values. Provide `tooltip.formatter` for custom HTML/text.

### Pinned Tooltip Notes

Tooltip notes are opt-in. `createTooltipNoteOption()` adds a pin action to the normal hover tooltip and renders each pinned snapshot as an editable annotation card over the chart. Drag a card header to move it without changing the original data coordinates. Pinned cards do not replace or block later hover tooltips.

```ts
createKChart<Point>({
    selector: '#chart',
    data,
    axes,
    tooltip: {visible: true},
    options: [
        createTooltipNoteOption<Point>({
            maxNotes: 8,
            pinButtonLabel: 'Pin',
            notePlaceholder: 'Add context...',
            onChange: (notes) => saveNotes(notes)
        })
    ],
    series
});
```

The `onChange` callback receives `KChartTooltipNote<T>[]` whenever a note is pinned, edited, or deleted. Note state is scoped to the chart controller and is cleared by `destroy()`.

## Option Factories

Series는 `series: [...]`로 받고, chart 부가 기능은 `options: [...]`로 받습니다.

```ts
createKChart({
    selector: '#chart',
    data,
    axes,
    series,
    options: [
        createSpecAreaOption([
            { start: 2, end: 3.5, label: 'STEP 02' }
        ]),
        createGuideLineOption({
            x: [{ value: 4, label: 'A' }],
            y: [{ value: 58, label: 'HIGH' }]
        }),
        createCursorLineOption({
            valueFormat: (value: number) => Number(value).toFixed(1)
        }),
        createTooltipNoteOption<Point>({
            maxNotes: 8,
            onChange: (notes) => console.info(notes)
        })
    ]
});
```

기존 `specAreas`, `guideLines`, `cursorGuide`, `guideLine` 직접 필드도 호환됩니다. 새 코드에서는 option factory 사용을 권장합니다.

## Custom Series

기본 series가 부족하면 `createCustomSeries(...)`에 renderer 함수를 넘깁니다. Class 상속이나 interface 구현 없이 같은 확장 지점을 사용할 수 있습니다.

Renderer context 주요 필드:

- `group`: 이 series 전용 SVG group
- `data`: 현재 차트 데이터
- `scales`, `xScale`, `yScale`: 코어가 계산한 scale
- `size`, `plotSize`, `margin`: 전체 크기와 plot 영역
- `color`: series 기본 색상
- `getCanvas(name)`: Canvas 2D layer
- `getWebglCanvas(name)`: WebGL canvas layer

### Three.js renderer 연결

Three.js 같은 외부 렌더링 엔진도 동일한 함수형 확장 지점을 사용합니다. KChart는
plot 영역 크기와 WebGL canvas를 제공하고, custom series가 Three.js scene, camera,
controls, raycaster를 소유합니다.

```ts
import * as THREE from 'three';
import { createCustomSeries } from '@keneth80/k-chart';

let renderer: THREE.WebGLRenderer | undefined;

const series = createCustomSeries<Node>({
    selector: 'three-network',
    render({ getWebglCanvas, plotSize }) {
        const canvas = getWebglCanvas('three-network');
        renderer ??= new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(plotSize.width, plotSize.height, false);
        // Build or update THREE.Scene objects from chart data.
    },
    destroy() {
        renderer?.dispose();
        renderer = undefined;
    }
});
```

렌더러를 매 render마다 새로 생성하지 않도록 factory closure에 상태를 보관해야 합니다.
animation frame, controls, geometry, material도 `destroy()`에서 정리합니다. 전체 양자리
별자리 예제는 `examples/three-constellation-series.ts`를 참고합니다.

```ts
const circleSeries = createCustomSeries<CirclePoint>({
    selector: 'custom-circle',
    displayName: 'Custom Circle',
    xField: 'x',
    yField: 'y',
    render({ group, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        group.selectAll('.custom-circle')
            .data(data)
            .join('circle')
            .attr('class', 'custom-circle')
            .attr('cx', (point) => xScale.scale(point.x))
            .attr('cy', (point) => yScale.scale(point.y))
            .attr('r', (point) => point.radius)
            .style('fill', color);
    }
});
```

간단한 SVG 원 series 예제는 [examples/custom-circle-series.ts](../examples/custom-circle-series.ts)를 참고하세요.

## Canvas/WebGL Pattern

```ts
const canvasSeries = createCustomSeries<Point>({
    selector: 'canvas-points',
    xField: 'x',
    yField: 'y',
    render({ getCanvas, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getCanvas('points');
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = color;

        data.forEach((point) => {
            context.beginPath();
            context.arc(xScale.scale(point.x), yScale.scale(point.y), 3, 0, Math.PI * 2);
            context.fill();
        });
    }
});
```

## React / Next.js Pattern

DOM을 직접 사용하므로 Client Component에서 mount 이후 생성합니다. 자세한 wrapper 예제와 Next.js 설정은 [React And Next.js Guide](react-nextjs.md)를 참고합니다.

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { createKChart, createLineSeries, KChartController } from '@keneth80/k-chart';

export function TrafficChart({ data }) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<KChartController | null>(null);

    useEffect(() => {
        if (!rootRef.current) {
            return;
        }

        const chart = createKChart({
            selector: rootRef.current,
            data,
            axes: [
                { field: 'time', type: 'string', placement: 'bottom' },
                { field: 'value', type: 'number', placement: 'left' }
            ],
            series: [
                createLineSeries({
                    selector: 'traffic',
                    xField: 'time',
                    yField: 'value'
                })
            ]
        });

        chart.render();
        chartRef.current = chart;

        return () => {
            chart.destroy();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        chartRef.current?.updateData(data);
    }, [data]);

    return <div ref={rootRef} style={{ width: '100%', height: 420 }} />;
}
```

## Migration Checklist

1. `new BasicChart(...)` 호출을 `createKChart(...)`로 교체합니다.
2. class 상속 series를 `createCustomSeries({ render(context) { ... } })`로 옮깁니다.
3. 축/scale 계산은 runtime에 맡기고, renderer는 전달받은 `xScale`, `yScale`, `getCanvas`, `getWebglCanvas`만 사용합니다.
4. UI unmount 시 `chart.destroy()`를 호출합니다.
5. 새 패키지 public import는 `@keneth80/k-chart`의 함수형 API만 사용합니다.

## Refactor Status

완료:

- `src/kchart.ts` class-free runtime 추가
- SVG line series renderer 함수화
- Canvas line/point series renderer 함수화
- WebGL point series renderer 함수화
- title/grid/legend/axis title 옵션 추가
- 기본 nearest-point tooltip 옵션 추가
- Custom series renderer API 추가
- 새 public entry를 KChart runtime으로 축소

다음 단계:

- zoom을 runtime plugin 형태로 분리
- legacy demo를 새 runtime 예제로 교체
