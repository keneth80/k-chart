import type {KChartResolvedScale, KChartScaleType} from './contracts';

type AxisTickFactory = {
    ticks?: (count: number) => unknown;
    tickValues?: (values: unknown[]) => unknown;
};

/**
 * Selects display-only ticks for categorical axes without shrinking the scale domain.
 * Keeping the full domain is important because series positions and tooltip hit tests
 * still need every category even when only a subset of labels is visible.
 */
export const resolveCategoricalTickValues = (
    type: KChartScaleType,
    domain: unknown[],
    tickCount?: number
): unknown[] | undefined => {
    if ((type !== 'point' && type !== 'string') || tickCount === undefined) {
        return undefined;
    }

    if (!Number.isFinite(tickCount) || tickCount <= 0 || domain.length <= 1) {
        return undefined;
    }

    // A categorical axis needs both endpoints to communicate the displayed range.
    const targetCount = Math.min(domain.length, Math.max(2, Math.floor(tickCount)));
    if (targetCount >= domain.length) {
        return undefined;
    }

    const lastIndex = domain.length - 1;
    const sampled: unknown[] = [];
    for (let index = 0; index < targetCount; index += 1) {
        const domainIndex = Math.round(index * lastIndex / (targetCount - 1));
        sampled.push(domain[domainIndex]);
    }

    return sampled;
};

export const applyAxisTickCount = <T = any>(
    axisFactory: AxisTickFactory,
    resolvedScale: Pick<KChartResolvedScale<T>, 'scale' | 'tickCount' | 'type'>
): void => {
    const categoricalTicks = resolveCategoricalTickValues(
        resolvedScale.type,
        resolvedScale.scale.domain(),
        resolvedScale.tickCount
    );

    if (categoricalTicks) {
        axisFactory.tickValues?.(categoricalTicks);
        return;
    }

    // Continuous D3 scales implement ticks(); point/band scales intentionally do not.
    if (resolvedScale.tickCount && typeof axisFactory.ticks === 'function') {
        axisFactory.ticks(resolvedScale.tickCount);
    }
};
