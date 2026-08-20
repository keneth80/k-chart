import type {
    KChartAxis,
    KChartMargin,
    KChartSize
} from './contracts';

export interface KChartAxisTitleAttributes {
    x: number;
    y: number;
    transform: string | null;
    textAnchor: 'start' | 'middle' | 'end';
}

export interface KChartAxisTitleLayoutContext {
    hasTopAxis?: boolean;
    hasTopAxisTitle?: boolean;
}

const axisTitleFontClearance = 12;
const topAxisClearance = 18;
const topAxisTitleClearance = 36;

const resolveOffset = (value: number | undefined, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, value)
        : fallback;

const negateOffset = (value: number): number => value === 0 ? 0 : -value;

/**
 * Resolves axis-title geometry without touching the DOM. Keeping this calculation
 * pure makes responsive axis layouts predictable and independently testable.
 */
export const resolveAxisTitleAttributes = (
    axis: Pick<KChartAxis<any>, 'placement' | 'titleLayout' | 'titleOffset'>,
    plotSize: KChartSize,
    context: KChartAxisTitleLayoutContext = {}
): KChartAxisTitleAttributes => {
    if (axis.placement === 'bottom') {
        return {
            x: plotSize.width / 2,
            y: resolveOffset(axis.titleOffset, 34),
            transform: null,
            textAnchor: 'middle'
        };
    }

    if (axis.placement === 'top') {
        const offset = resolveOffset(axis.titleOffset, 24);
        return {
            x: plotSize.width / 2,
            y: negateOffset(offset),
            transform: null,
            textAnchor: 'middle'
        };
    }

    if (axis.titleLayout === 'horizontal') {
        const topClearance = context.hasTopAxisTitle
            ? topAxisTitleClearance
            : context.hasTopAxis
                ? topAxisClearance
                : 0;
        const offset = resolveOffset(axis.titleOffset, 12) + topClearance;
        return {
            x: 0,
            y: negateOffset(offset),
            transform: null,
            textAnchor: axis.placement === 'left' ? 'start' : 'end'
        };
    }

    const offset = resolveOffset(axis.titleOffset, 36);
    if (axis.placement === 'left') {
        return {
            x: -plotSize.height / 2,
            y: negateOffset(offset),
            transform: 'rotate(-90)',
            textAnchor: 'middle'
        };
    }

    return {
        x: plotSize.height / 2,
        y: negateOffset(offset),
        transform: 'rotate(90)',
        textAnchor: 'middle'
    };
};

export const resolveHorizontalAxisTitleTopSpace = <T = any>(
    axes: KChartAxis<T>[]
): number => {
    const hasTopAxis = axes.some((axis) => axis.visible !== false && axis.placement === 'top');
    const hasTopAxisTitle = axes.some((axis) =>
        axis.visible !== false && axis.placement === 'top' && Boolean(axis.title)
    );
    let requiredSpace = 0;

    axes.forEach((axis) => {
        if (
            axis.visible === false
            || !axis.title
            || axis.titleLayout !== 'horizontal'
            || (axis.placement !== 'left' && axis.placement !== 'right')
        ) {
            return;
        }

        const clearance = hasTopAxisTitle
            ? topAxisTitleClearance
            : hasTopAxis
                ? topAxisClearance
                : 0;
        requiredSpace = Math.max(
            requiredSpace,
            resolveOffset(axis.titleOffset, 12) + clearance + axisTitleFontClearance
        );
    });

    return requiredSpace;
};

/**
 * Reserves enough outer SVG space for axis titles. Explicit chart margins are
 * still respected as minimums, while larger title offsets cannot clip content.
 */
export const resolveAxisTitleMargins = <T = any>(
    axes: KChartAxis<T>[],
    baseMargin: KChartMargin
): KChartMargin => {
    const margin = {...baseMargin};
    margin.top = Math.max(margin.top, resolveHorizontalAxisTitleTopSpace(axes));

    axes.forEach((axis) => {
        if (axis.visible === false || !axis.title) {
            return;
        }

        if (axis.placement === 'bottom') {
            margin.bottom = Math.max(
                margin.bottom,
                resolveOffset(axis.titleOffset, 34) + axisTitleFontClearance
            );
            return;
        }

        if (axis.placement === 'top') {
            margin.top = Math.max(
                margin.top,
                resolveOffset(axis.titleOffset, 24) + axisTitleFontClearance
            );
            return;
        }

        if (axis.titleLayout === 'horizontal') {
            return;
        }

        const side = axis.placement;
        margin[side] = Math.max(
            margin[side],
            resolveOffset(axis.titleOffset, 36) + axisTitleFontClearance
        );
    });

    return margin;
};
