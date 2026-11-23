import {frameStats, type FieldFrame} from './model';
import {makeFrame, SELECTED_CELL_ID} from './synthetic';
import type {
  HeatmapOptions,
  SubcellHeatmapController
} from './heatmap-demo-core';

export type SubcellHeatmapFactory = (
  container: string | HTMLElement,
  options?: HeatmapOptions
) => Promise<SubcellHeatmapController>;

export interface MountedSubcellHeatmapApp {
  demo: SubcellHeatmapController;
  destroy(): void;
}

export interface MountSubcellHeatmapOptions {
  signal?: AbortSignal;
}

function appMarkup(): string {
  return `
    <section class="subcell-app" aria-label="셀 내부 히트맵 예제">
      <header class="subcell-header">
        <div>
          <p class="subcell-eyebrow">KCHART + MAPLIBRE</p>
          <h2>0.5° 셀 내부 강도 분포</h2>
          <p>한 격자 안의 51 × 51 관측 노드를 연속 스칼라 필드로 표현합니다.</p>
        </div>
        <span class="subcell-tag">Synthetic · 0–100</span>
      </header>
      <div class="subcell-toolbar">
        <div class="subcell-segmented" aria-label="지도 보기 범위">
          <button type="button" data-subcell-view="world">세계</button>
          <button type="button" data-subcell-view="region">지역</button>
          <button type="button" data-subcell-view="cell">선택 셀</button>
        </div>
        <div class="subcell-actions">
          <button class="subcell-toggle" type="button" role="switch" aria-checked="false" data-subcell-grid>격자선</button>
          <button class="subcell-toggle" type="button" role="switch" aria-checked="false" data-subcell-outline>셀 테두리</button>
          <button class="subcell-toggle" type="button" role="switch" aria-checked="false" data-subcell-background>배경 채움</button>
          <button class="subcell-toggle" type="button" role="switch" aria-checked="false" data-subcell-samples>표본점</button>
          <button type="button" data-subcell-next>다음 프레임</button>
        </div>
      </div>
      <div class="subcell-layout">
        <div class="subcell-map-panel">
          <div class="subcell-map" data-subcell-map aria-label="MapLibre 스칼라 필드 지도"></div>
          <output class="subcell-status" data-subcell-status aria-live="polite">지도와 외부 타일을 불러오는 중입니다.</output>
        </div>
        <aside class="subcell-details">
          <p class="subcell-kicker">SELECTED CELL</p>
          <h3>셀 내부 분포</h3>
          <p class="subcell-bounds" data-subcell-bounds></p>
          <div class="subcell-stats" data-subcell-stats></div>
          <div class="subcell-legend" aria-label="강도 색상 범례"></div>
          <div class="subcell-legend-label"><span>0 낮음</span><span>50</span><span>100 높음</span></div>
          <div class="subcell-missing-key"><span aria-hidden="true"></span>미관측 · 투명</div>
          <hr />
          <p class="subcell-small" data-subcell-clock></p>
          <p class="subcell-small" data-subcell-picked>지도를 클릭하면 보간된 표시값을 확인할 수 있습니다.</p>
          <p class="subcell-note">합성 데이터이며 재난 확률이나 실제 관측값이 아닙니다.</p>
        </aside>
      </div>
    </section>`;
}

export async function mountSubcellHeatmapApp(
  host: HTMLElement,
  createDemo: SubcellHeatmapFactory,
  options: MountSubcellHeatmapOptions = {}
): Promise<MountedSubcellHeatmapApp> {
  host.innerHTML = appMarkup();
  host.dataset.subcellReady = 'loading';
  const query = <T extends HTMLElement>(selector: string): T => {
    const node = host.querySelector<T>(selector);
    if (!node) throw new Error(`Missing example element: ${selector}`);
    return node;
  };

  const root = query<HTMLElement>('.subcell-app');

  const mapHost = query<HTMLElement>('[data-subcell-map]');
  const status = query<HTMLOutputElement>('[data-subcell-status]');
  const bounds = query<HTMLElement>('[data-subcell-bounds]');
  const stats = query<HTMLElement>('[data-subcell-stats]');
  const clock = query<HTMLElement>('[data-subcell-clock]');
  const picked = query<HTMLElement>('[data-subcell-picked]');
  const grid = query<HTMLButtonElement>('[data-subcell-grid]');
  const outline = query<HTMLButtonElement>('[data-subcell-outline]');
  const background = query<HTMLButtonElement>('[data-subcell-background]');
  const samples = query<HTMLButtonElement>('[data-subcell-samples]');
  const next = query<HTMLButtonElement>('[data-subcell-next]');
  let step = 0;
  let selectedId = SELECTED_CELL_ID;
  let lastFrame: FieldFrame = makeFrame(0);

  const updateDetails = (): void => {
    const cell = lastFrame.cells.find((candidate) => candidate.id === selectedId)
      ?? lastFrame.cells[0];
    const summary = frameStats(cell);
    bounds.textContent = `${cell.bounds.west}–${cell.bounds.east}°E / ${cell.bounds.south}–${cell.bounds.north}°N`;
    stats.innerHTML = `
      <div><span>최솟값</span><b>${summary.min?.toFixed(1) ?? '—'}</b></div>
      <div><span>표본 평균</span><b>${summary.sampleMean?.toFixed(1) ?? '—'}</b></div>
      <div><span>최댓값</span><b>${summary.max?.toFixed(1) ?? '—'}</b></div>`;
  };

  let demo: SubcellHeatmapController;
  try {
    demo = await createDemo(mapHost, {
      showGrid: false,
      showCellOutline: false,
      showLowValueBackground: false,
      signal: options.signal,
      onFrame(frame) {
        lastFrame = frame;
        clock.textContent = `합성 프레임 · ${frame.time} · 전환 중간값도 동일한 고정 범례를 사용합니다.`;
        updateDetails();
        host.dataset.subcellFrame = frame.time;
      },
      onPick(selection) {
        if (selection.cellId) selectedId = selection.cellId;
        updateDetails();
        picked.textContent = `경도 ${selection.longitude.toFixed(4)}, 위도 ${selection.latitude.toFixed(4)} · 보간 강도 ${selection.value?.toFixed(1) ?? '미관측'} · ${selection.cellId ?? '데이터 범위 밖'}`;
      },
      onError(error) {
        if (root.parentElement !== host) return;
        host.dataset.subcellReady = 'warning';
        status.textContent = `지도 타일 또는 스타일 오류: ${error.message}. 네트워크와 외부 타일 접근을 확인하세요.`;
      }
    });
  } catch (error) {
    if (root.parentElement === host) {
      host.dataset.subcellReady = 'error';
    }
    status.textContent = `지도 초기화 실패: ${error instanceof Error ? error.message : String(error)}. 네트워크, 외부 타일 접근, WebGL 지원을 확인하세요.`;
    throw error;
  }

  // A slower MapLibre load may finish after the playground has selected another
  // example. Release that stale map without touching the newer host contents.
  if (root.parentElement !== host) {
    demo.destroy();
    throw new Error('Subcell heatmap mount was superseded.');
  }

  status.textContent = 'KChart MapLibre 어댑터 연결 완료 · 셀 내부 스칼라 분포';
  host.dataset.subcellReady = 'true';
  host.dataset.subcellGrid = grid.getAttribute('aria-checked') ?? 'false';
  host.dataset.subcellOutline = outline.getAttribute('aria-checked') ?? 'false';
  host.dataset.subcellBackground = background.getAttribute('aria-checked') ?? 'false';
  updateDetails();

  grid.addEventListener('click', () => {
    const visible = grid.getAttribute('aria-checked') !== 'true';
    grid.setAttribute('aria-checked', String(visible));
    demo.setGridVisible(visible);
    host.dataset.subcellGrid = String(visible);
    status.textContent = visible
      ? '격자선을 표시했습니다. 내부 분포와 지점은 유지됩니다.'
      : '격자선만 숨겼습니다. 내부 분포와 지점은 유지됩니다.';
  });
  samples.addEventListener('click', () => {
    const visible = samples.getAttribute('aria-checked') !== 'true';
    samples.setAttribute('aria-checked', String(visible));
    demo.setSamplesVisible(visible);
    host.dataset.subcellSamples = String(visible);
  });
  outline.addEventListener('click', () => {
    const visible = outline.getAttribute('aria-checked') !== 'true';
    outline.setAttribute('aria-checked', String(visible));
    demo.setCellOutlineVisible(visible);
    host.dataset.subcellOutline = String(visible);
    status.textContent = visible
      ? '선택 셀 테두리를 표시했습니다.'
      : '선택 셀 테두리를 숨겼습니다. 내부 분포는 유지됩니다.';
  });
  background.addEventListener('click', () => {
    const visible = background.getAttribute('aria-checked') !== 'true';
    background.setAttribute('aria-checked', String(visible));
    demo.setLowValueBackgroundVisible(visible);
    host.dataset.subcellBackground = String(visible);
    status.textContent = visible
      ? '낮은 값의 배경 채움을 표시했습니다.'
      : '낮은 값의 알파를 낮춰 사각형 배경을 숨겼습니다.';
  });
  next.addEventListener('click', () => {
    step = (step + 1) % 3;
    demo.setFrame(makeFrame(step));
  });
  host.querySelectorAll<HTMLButtonElement>('[data-subcell-view]').forEach((button) => {
    button.addEventListener('click', () => {
      demo.focus(button.dataset.subcellView as 'world' | 'region' | 'cell');
    });
  });

  let destroyed = false;
  return {
    demo,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      demo.destroy();
      if (root.parentElement === host) {
        host.dataset.subcellReady = 'destroyed';
        root.remove();
      }
    }
  };
}
