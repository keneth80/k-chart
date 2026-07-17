import type {KChartResolvedScale} from './contracts';

const clampProgress = (progress: number): number => Math.max(0, Math.min(progress, 1));

const toFiniteNumber = (value: unknown): number | undefined => {
    const number = value instanceof Date ? value.getTime() : value;
    return typeof number === 'number' && Number.isFinite(number) ? number : undefined;
};

const interpolateDomainValue = (
    from: unknown,
    to: unknown,
    progress: number
): number | Date | undefined => {
    const fromNumber = toFiniteNumber(from);
    const toNumber = toFiniteNumber(to);
    if (fromNumber === undefined || toNumber === undefined) {
        return undefined;
    }

    const value = fromNumber + (toNumber - fromNumber) * clampProgress(progress);
    return to instanceof Date ? new Date(value) : value;
};

/**
 * Creates frame-local scale copies whose continuous domains sit between the
 * previous and next render. Series stay renderer-agnostic and simply receive
 * a normal scale on every frame.
 */
export const interpolateResolvedScales = <T = any>(
    previousScales: KChartResolvedScale<T>[],
    nextScales: KChartResolvedScale<T>[],
    progress: number
): KChartResolvedScale<T>[] => {
    if (progress >= 1) {
        return nextScales;
    }

    return nextScales.map((nextScale) => {
        if (nextScale.type !== 'number' && nextScale.type !== 'time') {
            return nextScale;
        }

        const previousScale = previousScales.find((candidate) => (
            candidate.field === nextScale.field
            && candidate.placement === nextScale.placement
            && candidate.type === nextScale.type
        ));
        if (!previousScale
            || typeof previousScale.scale?.domain !== 'function'
            || typeof nextScale.scale?.domain !== 'function'
            || typeof nextScale.scale?.copy !== 'function') {
            return nextScale;
        }

        const previousDomain = previousScale.scale.domain();
        const nextDomain = nextScale.scale.domain();
        if (previousDomain.length !== 2 || nextDomain.length !== 2) {
            return nextScale;
        }

        const start = interpolateDomainValue(previousDomain[0], nextDomain[0], progress);
        const end = interpolateDomainValue(previousDomain[1], nextDomain[1], progress);
        if (start === undefined || end === undefined) {
            return nextScale;
        }

        return {
            ...nextScale,
            scale: nextScale.scale.copy().domain([start, end])
        };
    });
};
