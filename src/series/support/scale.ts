import type {KChartResolvedScale} from '../../core/contracts';

export const resolveScalePosition = <T = any>(
    scale: KChartResolvedScale<T>,
    value: any
): number => {
    const scaleValue = scale.type === 'time' && !(value instanceof Date)
        ? new Date(value as any)
        : value;
    const position = scale.scale(scaleValue);

    return typeof scale.scale.bandwidth === 'function'
        ? position + scale.scale.bandwidth() / 2
        : position;
};
