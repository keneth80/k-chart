import type {
    KChartAccessibilityConfiguration,
    KChartAxis,
    KChartLegendPlacement,
    KChartSize,
    KChartStatusConfiguration,
    KChartThemeConfiguration
} from './contracts';

const positiveFinite = (value: number, fallback: number): number => Number.isFinite(value) && value > 0
    ? value
    : fallback;

/** Positive measured sizes, including small cards, must not be enlarged. */
export const resolveContainerSize = (
    measured: KChartSize,
    configured: Partial<KChartSize> = {}
): KChartSize => ({
    width: configured.width ?? positiveFinite(measured.width, 320),
    height: configured.height ?? positiveFinite(measured.height, 240)
});

export const resolveLegendLayout = (
    availableWidth: number,
    count: number,
    placement?: KChartLegendPlacement
): {itemWidth: number; itemHeight: number; columns: number; rows: number; height: number; textWidth: number} => {
    const width = positiveFinite(availableWidth, 0);
    const itemWidth = Math.min(148, width);
    const columns = placement === 'right' ? 1 : Math.max(1, Math.floor(width / (itemWidth || 1)));
    const rows = Math.ceil(Math.max(0, count) / columns);
    return {itemWidth, itemHeight: 22, columns, rows, height: rows * 22, textWidth: Math.max(0, itemWidth - 28)};
};

export const truncateLegendLabel = (
    label: string,
    availableWidth: number,
    measure: (text: string) => number = (text) => Array.from(text).length * 7
): string => {
    if (measure(label) <= availableWidth) {
        return label;
    }
    if (measure('...') > availableWidth) {
        return '';
    }
    const characters = Array.from(label);
    let low = 0;
    let high = characters.length;
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (measure(`${characters.slice(0, middle).join('')}...`) <= availableWidth) {
            low = middle;
        } else {
            high = middle - 1;
        }
    }
    return `${characters.slice(0, low).join('')}...`;
};

/** Feed this display-only hint to applyAxisTickCount, not to the scale domain. */
export const resolveResponsiveTickCount = <T = any>(
    axis: Pick<KChartAxis<T>, 'placement' | 'tickCount'>,
    plotSize: KChartSize
): number => {
    if (axis.tickCount !== undefined) {
        return axis.tickCount;
    }
    const horizontal = axis.placement === 'top' || axis.placement === 'bottom';
    const extent = positiveFinite(horizontal ? plotSize.width : plotSize.height, 0);
    return Math.max(2, Math.min(10, Math.floor(extent / (horizontal ? 88 : 48))));
};

export const resolveTooltipPosition = (
    anchor: {x: number; y: number},
    tooltipSize: KChartSize,
    bounds: KChartSize,
    gap = 12,
    padding = 8
): {left: number; top: number} => {
    const offset = positiveFinite(gap, 0);
    const inset = positiveFinite(padding, 0);
    const position = (coordinate: number, length: number, extent: number): number => {
        const available = positiveFinite(extent, 0);
        const content = positiveFinite(length, 0);
        const point = Number.isFinite(coordinate) ? coordinate : 0;
        const maximum = Math.max(0, available - content);
        const edge = Math.min(inset, maximum / 2);
        const preferred = point + offset;
        const flipped = preferred + content > available - edge
            ? point - offset - content
            : preferred;
        return Math.max(edge, Math.min(maximum - edge, flipped));
    };
    return {
        left: position(anchor.x, tooltipSize.width, bounds.width),
        top: position(anchor.y, tooltipSize.height, bounds.height)
    };
};

type LegendKeyboardEvent = Pick<KeyboardEvent,
    'key' | 'repeat' | 'altKey' | 'ctrlKey' | 'metaKey' | 'defaultPrevented' | 'preventDefault'>
    & {isComposing?: boolean};

/** Bind on keydown for SVG legend items; repeated Space must not scroll. */
export const activateLegendFromKeyboard = (
    event: LegendKeyboardEvent,
    activate: () => void,
    selectable = true
): boolean => {
    if (!selectable || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey
        || (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar')) {
        return false;
    }
    event.preventDefault();
    if (event.repeat) {
        return false;
    }
    activate();
    return true;
};

export const resolveChartTheme = (theme?: KChartThemeConfiguration): Required<KChartThemeConfiguration> => ({
    text: theme?.text ?? 'var(--kchart-text, #edf3f8)',
    muted: theme?.muted ?? 'var(--kchart-muted, #b6c4cf)',
    grid: theme?.grid ?? 'var(--kchart-grid, rgba(188, 206, 218, 0.18))'
});

export const resolveChartAccessibility = (
    accessibility?: KChartAccessibilityConfiguration,
    title?: string
): KChartAccessibilityConfiguration => ({
    label: accessibility?.label?.trim() || title?.trim() || 'Chart',
    description: accessibility?.description?.trim() || undefined
});

export const resolveChartStatus = (status?: KChartStatusConfiguration): {
    state: 'loading' | 'empty' | 'error';
    message: string;
    role: 'status' | 'alert';
} | undefined => {
    if (!status || status.state === 'ready') {
        return undefined;
    }
    const messages = {
        loading: 'Loading...',
        empty: 'No data available',
        error: 'Unable to load chart'
    };
    return {
        state: status.state,
        message: status.message ?? messages[status.state],
        role: status.state === 'error' ? 'alert' : 'status'
    };
};
