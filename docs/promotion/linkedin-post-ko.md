# LinkedIn 게시문

차트 렌더러는 SVG, Canvas, WebGL 중 하나를 골라야 할까요?

KChart를 만들면서 내린 결론은 “하나를 고르는 것이 아니라 책임을 분리하자”였습니다.

KChart의 코어는 축, scale, layout을 계산합니다. 실제 시리즈는 같은 좌표계를 전달받아 SVG, Canvas 또는 WebGL 중 필요한 방식으로 렌더링합니다.

- 소수의 인터랙티브 요소는 SVG
- 실시간으로 갱신되는 시계열은 Canvas
- 수십만~백만 단위 line/point는 WebGL
- 업무 전용 표현은 함수형 custom series

따라서 대량 데이터는 WebGL로 그리고, 선택된 포인트는 SVG로 올리는 식의 하이브리드 구성이 가능합니다. 차트 타입을 상속할 필요 없이 renderer 함수가 scale과 layer를 받아 표현만 담당합니다.

이번 글에서는 다음 내용을 정리했습니다.

1. 축과 renderer를 분리한 이유
2. SVG, Canvas, WebGL의 선택 기준
3. 동일한 좌표계에서 여러 renderer를 조합하는 방법
4. LTTB, Worker, 실시간 데이터의 역할
5. 커스텀 시각화를 함수로 확장하는 구조

라이브 예제와 재현 가능한 벤치마크도 함께 공개하고 있습니다.

Playground: https://k-chart-playground.vercel.app/
Benchmark: https://k-chart-bench.vercel.app/
GitHub: https://github.com/keneth80/k-chart

직접 사용해 보시고 API나 구조에서 불편한 점을 Issue로 남겨주시면 다음 개선에 반영하겠습니다.

#TypeScript #DataVisualization #WebGL #Canvas #SVG #D3js #OpenSource #Frontend #KChart

