import type {
    KChartAxis,
    KChartResolvedScale
} from './contracts';

export const resolveAxisDomain = <T = any>(
    axis: KChartAxis<T>,
    data: T[]
): any[] => {
    if (axis.domain) {
        return axis.domain;
    }

    if (axis.type === 'string' || axis.type === 'point') {
        return data.map((item: T) => item[axis.field]);
    }

    const hasMin = axis.min !== undefined;
    const hasMax = axis.max !== undefined;
    if (hasMin && hasMax) {
        return [axis.min, axis.max];
    }

    const domainFields = axis.domainFields?.length
        ? axis.domainFields
        : [axis.field];
    let minValue: any;
    let maxValue: any;
    let minComparable: number | undefined;
    let maxComparable: number | undefined;

    for (let dataIndex = 0; dataIndex < data.length; dataIndex += 1) {
        const item = data[dataIndex];
        for (let fieldIndex = 0; fieldIndex < domainFields.length; fieldIndex += 1) {
            const rawValue = item[domainFields[fieldIndex]];
            let value: any;
            let comparable: number;
            if (axis.type === 'time') {
                value = new Date(rawValue as any);
                comparable = value.getTime();
            } else {
                value = Number(rawValue);
                comparable = value;
            }

            if (!Number.isFinite(comparable)) {
                continue;
            }

            if (minComparable === undefined || comparable < minComparable) {
                minValue = value;
                minComparable = comparable;
            }
            if (maxComparable === undefined || comparable > maxComparable) {
                maxValue = value;
                maxComparable = comparable;
            }
        }
    }

    const resolvedMin = axis.min ?? minValue ?? 0;
    const resolvedMax = axis.max ?? maxValue ?? 1;
    const canApplyPadding = axis.padding !== undefined && axis.min === undefined && axis.max === undefined;

    if (canApplyPadding && axis.type === 'time') {
        const minTime = resolvedMin instanceof Date ? resolvedMin.getTime() : new Date(resolvedMin as any).getTime();
        const maxTime = resolvedMax instanceof Date ? resolvedMax.getTime() : new Date(resolvedMax as any).getTime();
        const span = Math.max(maxTime - minTime, 24 * 60 * 60 * 1000);
        const padding = span * Math.max(axis.padding ?? 0, 0);

        return [
            new Date(minTime - padding),
            new Date(maxTime + padding)
        ];
    }

    if (canApplyPadding && axis.type === 'number') {
        const minNumber = Number(resolvedMin);
        const maxNumber = Number(resolvedMax);
        const span = Math.max(maxNumber - minNumber, 1);
        const padding = span * Math.max(axis.padding ?? 0, 0);

        return [
            minNumber - padding,
            maxNumber + padding
        ];
    }

    return [
        resolvedMin,
        resolvedMax
    ];
};

export const resolveDownsampleValue = (value: any, scale?: KChartResolvedScale<any>): number => {
    if (value instanceof Date) {
        return value.getTime();
    }

    if (scale?.type === 'time' && typeof value === 'string') {
        return new Date(value).getTime();
    }

    return Number(value);
};

export const resolveDownsampleAccessor = <T = any>(
    field: keyof T & string | undefined,
    scale: KChartResolvedScale<T> | undefined,
    data?: T[]
): ((point: T) => number) | undefined => {
    if (!field) {
        return undefined;
    }

    if (data) {
        for (let index = 0; index < data.length; index += 1) {
            const value = data[index]?.[field];
            if (value === undefined || value === null) {
                continue;
            }
            if (typeof value === 'number') {
                return (point: T) => point[field] as any as number;
            }
            break;
        }
    }

    return (point: T) => resolveDownsampleValue(point[field], scale);
};
