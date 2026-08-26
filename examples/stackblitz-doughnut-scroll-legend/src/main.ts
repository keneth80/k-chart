import {createDoughnutChart} from '@keneth80/k-chart/presets';
import './style.css';

interface ServicePoint {
  id: string;
  label: string;
  value: number;
  color: string;
}

const services: ServicePoint[] = [
  {id: 'monitoring', label: '실시간 모니터링', value: 68420, color: '#22d3ee'},
  {id: 'pipeline', label: '데이터 파이프라인', value: 57180, color: '#38bdf8'},
  {id: 'gateway', label: 'API 게이트웨이', value: 49360, color: '#60a5fa'},
  {id: 'analytics', label: '사용자 분석', value: 42640, color: '#818cf8'},
  {id: 'automation', label: '알림 자동화', value: 37120, color: '#a78bfa'},
  {id: 'search', label: '검색 인덱스', value: 32980, color: '#c084fc'},
  {id: 'storage', label: '파일 스토리지', value: 28410, color: '#e879f9'},
  {id: 'workspace', label: '협업 워크스페이스', value: 24680, color: '#f472b6'},
  {id: 'payments', label: '결제 처리', value: 21340, color: '#fb7185'},
  {id: 'reports', label: '보고서 빌더', value: 18720, color: '#fb923c'},
  {id: 'access', label: '접근 제어', value: 16290, color: '#fbbf24'},
  {id: 'archive', label: '백업 아카이브', value: 13980, color: '#a3e635'},
  {id: 'inference', label: '머신러닝 추론', value: 11860, color: '#4ade80'},
  {id: 'events', label: '이벤트 스트림', value: 9720, color: '#2dd4bf'},
  {id: 'audit', label: '감사 로그', value: 7640, color: '#14b8a6'},
  {id: 'utilities', label: '기타 운영 도구', value: 5260, color: '#94a3b8'}
];

const numberFormatter = new Intl.NumberFormat('ko-KR');
const total = services.reduce((sum, service) => sum + service.value, 0);
const legendList = document.querySelector<HTMLUListElement>('#legend-list');
const legendCount = document.querySelector<HTMLElement>('#legend-count');
const chartHost = document.querySelector<HTMLElement>('#chart');

if (!legendList || !legendCount || !chartHost) {
  throw new Error('The chart example container is missing.');
}

legendCount.textContent = `${services.length}개`;
legendList.replaceChildren(...services.map((service) => {
  const share = service.value / total * 100;
  const item = document.createElement('li');
  item.className = 'legend-item';
  item.innerHTML = `
    <span class="legend-swatch" style="--series-color:${service.color}"></span>
    <span class="legend-name">${service.label}</span>
    <span class="legend-metric">
      <strong>${numberFormatter.format(service.value)}</strong>
      <small>${share.toFixed(1)}%</small>
    </span>
  `;
  return item;
}));

const resolveChartHeight = (): number => window.innerWidth <= 720 ? 390 : 520;
const resolveChartWidth = (): number => Math.max(chartHost.clientWidth, 320);

// The preset owns the doughnut geometry, hit testing, tooltip, leader lines,
// and collision layout. The adjacent HTML legend only handles dense browsing.
const chart = createDoughnutChart<ServicePoint>({
  selector: '#chart',
  data: services,
  width: resolveChartWidth(),
  height: resolveChartHeight(),
  margin: {top: 86, right: 18, bottom: 18, left: 18},
  title: {text: '서비스 워크로드 구성', align: 'center', fontSize: 19},
  grid: false,
  legend: false,
  tooltip: true,
  label: 'label',
  value: 'value',
  displayName: '활성 세션',
  innerRadiusRatio: 0.62,
  palette: services.map((service) => service.color),
  sliceLabel: {
    position: 'outside',
    formatter: ({data, percentage}) => `${data.label} · ${percentage.toFixed(1)}%`,
    leaderLine: {visible: true, length: 18, width: 1.2},
    minPercentage: 2.2,
    maxVisible: 12,
    collision: {minGap: 10, padding: 8}
  }
});

let resizeFrame = 0;
const resizeChart = () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    chart.resize({width: resolveChartWidth(), height: resolveChartHeight()});
  });
};

const resizeObserver = new ResizeObserver(resizeChart);
resizeObserver.observe(chartHost);
window.addEventListener('resize', resizeChart);
