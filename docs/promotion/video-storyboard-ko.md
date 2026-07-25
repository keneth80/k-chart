# KChart 하이브리드 렌더링 60초 영상 구성

## 사양

- 길이: 60초
- 화면: 1280×720, 16:9
- 오디오: 없음
- 전달 방식: 큰 자막 + 실제 Playground 화면 + 부드러운 확대/전환
- CTA: Playground, Benchmark, GitHub

## 장면

| 시간 | 화면 | 자막 |
| --- | --- | --- |
| 0–8초 | KChart 타이틀과 세 renderer 키워드 | 하나의 좌표계. 세 가지 렌더러. |
| 8–18초 | SVG Line 실제 화면 | SVG · 선명한 축과 정교한 interaction |
| 18–28초 | Canvas Line 실제 화면 | Canvas · 많은 도형과 실시간 업데이트 |
| 28–40초 | WebGL BigData 실제 화면 | WebGL · 대용량 line/point를 GPU로 |
| 40–50초 | Realtime Line 실제 화면 | 데이터는 흐르고, window와 메모리는 고정 |
| 50–60초 | 공통 scale 구조와 링크 | Scale은 공유하고 표현은 교체한다 |

## 게시용 설명

KChart는 축과 scale을 코어에서 계산하고 SVG, Canvas, WebGL renderer가 같은 좌표계를 공유합니다. 데이터 크기와 interaction 요구에 맞춰 renderer를 선택하거나 한 차트에서 함께 사용할 수 있습니다.

- Playground: https://k-chart-playground.vercel.app/
- Benchmark: https://k-chart-bench.vercel.app/
- GitHub: https://github.com/keneth80/k-chart

