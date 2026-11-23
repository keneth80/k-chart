import type {KChartMapMoveEndContext} from '../core/contracts';

type InvertibleProjection = {
    invert?: (point: [number, number]) => [number, number] | null;
};

export const resolveProjectedMapMoveEndContext = (
    projection: InvertibleProjection,
    width: number,
    height: number,
    toProjectionPoint: (point: [number, number]) => [number, number] = (point) => point
): KChartMapMoveEndContext => {
    const x = width / 2;
    const y = height / 2;
    const coordinate = projection.invert?.(toProjectionPoint([x, y]));
    return {
        lon: coordinate && Number.isFinite(coordinate[0]) ? coordinate[0] : null,
        lat: coordinate && Number.isFinite(coordinate[1]) ? coordinate[1] : null,
        x,
        y
    };
};

export const hasNumericViewChanged = (
    previous: readonly number[],
    next: readonly number[],
    epsilon = 1e-9
): boolean => previous.length !== next.length
    || previous.some((value, index) => {
        const nextValue = next[index];
        if (Object.is(value, nextValue)) {
            return false;
        }
        if (!Number.isFinite(value) || !Number.isFinite(nextValue)) {
            return true;
        }
        return Math.abs(value - nextValue) > epsilon;
    });
