# 하나의 좌표계, 세 가지 렌더러: KChart의 하이브리드 렌더링 설계

운영 대시보드의 차트는 처음에는 단순하다. 축을 그리고, 선을 하나 올리고, 툴팁을 붙이면 된다. 하지만 데이터가 많아지고 표현 방식이 다양해지면 선택지가 갈린다.

- SVG는 선명하고 DOM 이벤트를 다루기 쉽지만 요소가 많아질수록 부담이 커진다.
- Canvas는 많은 도형을 빠르게 그릴 수 있지만 축, 범례, 접근성 UI를 직접 관리하기가 번거롭다.
- WebGL은 더 큰 데이터를 GPU로 처리할 수 있지만 일반적인 업무 차트 UI까지 모두 구현하기에는 비용이 크다.

KChart는 셋 중 하나를 고르는 대신, **축과 scale을 공통 코어가 계산하고 각 시리즈가 필요한 렌더러를 선택하도록** 설계했다.

> KChart는 SVG, Canvas, WebGL을 한 차트에서 조합하고 같은 scale을 공유하는 TypeScript 기반 함수형 시각화 런타임이다.

- Playground: <https://k-chart-playground.vercel.app/>
- Benchmark: <https://k-chart-bench.vercel.app/>
- GitHub: <https://github.com/keneth80/k-chart>

## 왜 렌더러를 분리했나

차트에서 좌표를 결정하는 일과 픽셀을 그리는 일은 서로 다른 책임이다.

코어는 다음을 담당한다.

1. 데이터와 축 설정으로 domain을 계산한다.
2. 차트 크기와 margin으로 range를 계산한다.
3. SVG, Canvas, WebGL 레이어를 같은 plot 영역에 정렬한다.
4. 계산한 scale과 렌더링 context를 각 series에 전달한다.
5. resize, update, tooltip, option 생명주기를 관리한다.

시리즈는 전달받은 좌표계를 사용해 실제 표현만 담당한다.

```text
createKChart(configuration)
 ├─ axis/domain/layout 계산
 ├─ 공통 xScale, yScale 생성
 ├─ SVG layer
 ├─ Canvas layer
 ├─ WebGL layer
 └─ series[].render(context)
      ├─ SVG line
      ├─ Canvas line
      ├─ WebGL line
      └─ custom renderer
```

이 구조의 핵심은 렌더러가 바뀌어도 데이터의 의미와 좌표계는 바뀌지 않는다는 점이다.

## 같은 API로 SVG, Canvas, WebGL 선택하기

아래 세 시리즈는 모두 `xField`, `yField`를 사용하고 같은 축 설정을 공유한다. 차이는 픽셀을 그리는 방법뿐이다.

```ts
import {
  createCanvasLineSeries,
  createKChart,
  createLineSeries,
  createWebglLineSeries
} from '@keneth80/k-chart';

const chart = createKChart({
  selector: '#chart',
  data,
  axes: [
    { field: 'time', type: 'time', placement: 'bottom' },
    { field: 'value', type: 'number', placement: 'left' }
  ],
  series: [
    createLineSeries({
      selector: 'selected-points',
      xField: 'time',
      yField: 'selectedValue',
      color: '#f3b45b',
      dot: true
    }),
    createCanvasLineSeries({
      selector: 'recent-window',
      xField: 'time',
      yField: 'recentValue',
      color: '#56d08f'
    }),
    createWebglLineSeries({
      selector: 'full-history',
      xField: 'time',
      yField: 'value',
      color: '#5db8ff',
      downsample: {
        enabled: true,
        threshold: ({ plotSize }) => Math.floor(plotSize.width)
      }
    })
  ]
}).render();
```

예를 들어 전체 이력은 WebGL로 렌더링하고, 최근 구간은 Canvas로 강조하고, 사용자가 선택한 소수의 점은 SVG로 올릴 수 있다. 세 표현은 별도의 차트가 아니라 동일한 축과 plot 영역을 사용하는 하나의 차트다.

## SVG가 적합한 경우

SVG는 각 도형이 DOM 노드이므로 다음 상황에 적합하다.

- 데이터 포인트가 많지 않다.
- 각 요소에 개별 hover, focus, click 처리가 필요하다.
- CSS로 상태를 꾸미거나 DOM을 검사해야 한다.
- 선명한 텍스트와 벡터 출력이 중요하다.

KChart의 축, 범례, 가이드 라인처럼 상호작용과 의미 구조가 중요한 요소도 SVG와 잘 맞는다.

## Canvas가 적합한 경우

Canvas는 하나의 bitmap surface에 명령형으로 그리므로 수천에서 수만 개의 도형을 표현할 때 유리하다.

- 실시간으로 갱신되는 시계열
- 많은 선과 점
- SVG DOM 노드 생성 비용을 피해야 하는 화면
- 복잡한 그래픽보다 빠른 반복 렌더가 중요한 화면

KChart의 실시간 예제는 고정된 1시간 window를 유지하면서 `updateData()`로 데이터를 갱신한다. 오래된 데이터를 제거하므로 실행 시간이 길어져도 배열이 무한히 증가하지 않는다.

```ts
const WINDOW_POINTS = 121;

window.setInterval(() => {
  realtimeData.push(createNextPoint());

  if (realtimeData.length > WINDOW_POINTS) {
    realtimeData.shift();
  }

  chart.updateData(realtimeData.slice());
}, 500);
```

## WebGL이 적합한 경우

WebGL은 대량의 정점 데이터를 GPU buffer에 올리고 draw call로 렌더링한다.

- 수십만에서 백만 단위의 line/point 데이터
- 빠른 pan과 zoom이 필요한 시계열
- CPU의 개별 도형 렌더링 비용이 병목인 경우
- 다운샘플링과 GPU 렌더링을 함께 적용할 수 있는 경우

KChart의 WebGL 시리즈는 interleaved buffer 경로와 LTTB 다운샘플링을 제공한다. LTTB는 화면 폭보다 훨씬 많은 점을 모두 그리지 않고도 주요 peak와 valley의 형태를 유지하는 데 사용한다.

Web Worker와 OffscreenCanvas는 지원 여부와 데이터 구조에 따라 선택적으로 적용한다. Worker를 사용한다고 네트워크 API를 자동 호출하는 것은 아니다. 애플리케이션이 데이터를 준비한 뒤 worker에 전달하고, worker는 계산과 렌더링을 메인 스레드에서 분리하는 역할을 한다.

## 커스텀 시각화가 핵심인 이유

KChart의 목적은 미리 만들어진 차트 타입만 제공하는 것이 아니다. `createCustomSeries()`는 코어가 만든 scale과 레이어를 사용자 함수에 전달한다.

```ts
const circles = createCustomSeries({
  selector: 'alerts',
  xField: 'time',
  yField: 'value',
  render({ group, data, xScale, yScale }) {
    if (!xScale || !yScale) return;

    group
      .selectAll('circle.alert')
      .data(data)
      .join('circle')
      .attr('class', 'alert')
      .attr('cx', point => xScale.scale(point.time))
      .attr('cy', point => yScale.scale(point.value))
      .attr('r', point => point.severity * 2)
      .attr('fill', '#ff6b8a');
  }
});
```

사용자는 축, margin, resize, scale 계산을 다시 만들 필요가 없다. 업무 도메인에 필요한 표현만 구현하면 된다. 반도체 웨이퍼, 토폴로지, 지도 marker, spec area 같은 시각화도 이 분리 원칙에서 출발한다.

## 하이브리드 렌더링이 항상 정답은 아니다

렌더러가 많다고 자동으로 빨라지는 것은 아니다.

- 작은 데이터라면 SVG 하나가 가장 단순하다.
- Canvas의 hit-test는 별도 인덱싱 전략이 필요할 수 있다.
- WebGL은 buffer 생성과 전송 비용이 있으므로 작은 데이터에는 과하다.
- 서로 다른 레이어를 섞을수록 dispose와 interaction 우선순위를 명확하게 관리해야 한다.

KChart는 모든 데이터를 무조건 WebGL로 보내지 않는다. 데이터 크기, 상호작용 수준, 업데이트 빈도에 따라 렌더러를 고르는 것이 기본 전략이다.

| 상황 | 권장 renderer |
| --- | --- |
| 소수 요소와 정교한 DOM interaction | SVG |
| 수천~수만 개 요소와 잦은 갱신 | Canvas |
| 더 큰 line/point 데이터 | WebGL |
| 축은 SVG, 대량 시리즈는 GPU | SVG + WebGL |
| 업무 전용 표현 추가 | Custom series |

## 성능 수치는 재현 조건과 함께 봐야 한다

차트 성능은 데이터 형태, renderer 설정, animation, viewport, 브라우저와 측정 종점에 따라 달라진다. 그래서 단일 숫자를 라이브러리 전체의 절대 순위로 사용하면 안 된다.

KChart Benchmark는 데이터 크기, 라이브러리 버전, 실행 환경과 반복 측정값을 함께 공개한다.

- <https://k-chart-bench.vercel.app/>

벤치마크는 홍보 문구를 증명하기 위한 장식이 아니라, 병목을 찾고 다음 최적화를 결정하기 위한 도구로 사용한다.

## 마무리

KChart의 하이브리드 렌더링은 세 가지 렌더러를 한꺼번에 자랑하기 위한 기능이 아니다. **좌표 계산과 표현을 분리해 데이터 규모와 업무 요구에 맞는 렌더러를 선택하는 구조**다.

축과 scale은 한 번 계산하고, 표현은 함수로 교체한다. 작은 차트는 SVG로 단순하게 시작하고, 데이터가 커지면 Canvas나 WebGL로 이동한다. 그래도 기존 축, 옵션, 데이터 계약은 유지된다.

직접 실행해 보기:

```bash
npm install @keneth80/k-chart
```

- Playground: <https://k-chart-playground.vercel.app/>
- GitHub: <https://github.com/keneth80/k-chart>

