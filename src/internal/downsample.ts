import type {
    KChartDownsampleConfiguration,
    KChartDownsampleContext,
    KChartResolvedScale,
    KChartSeries,
    KChartSize
} from '../core/contracts';
import {resolveDownsampleAccessor, resolveDownsampleValue} from '../core/domain';
import {downsampleLTTB} from '../utils/downsample-lttb';

const isDownsampleFieldNumeric = <T = any>(
    data: T[],
    field: keyof T & string | undefined
): boolean => {
    if (!field) {
        return false;
    }

    for (let index = 0; index < data.length; index += 1) {
        const value = data[index]?.[field];
        if (value === undefined || value === null) {
            continue;
        }

        return typeof value === 'number';
    }

    return false;
};

const resolveDownsampleThreshold = <T = any>(
    downsample: boolean | KChartDownsampleConfiguration<T>,
    context: KChartDownsampleContext<T>
): number => {
    if (typeof downsample === 'boolean') {
        return Math.max(3, Math.floor(context.plotSize.width));
    }

    if (typeof downsample.threshold === 'function') {
        return downsample.threshold(context);
    }

    return downsample.threshold ?? Math.max(3, Math.floor(context.plotSize.width));
};

const resolveClassifiedAccessor = <T = any>(
    field: keyof T & string | undefined,
    scale: KChartResolvedScale<T> | undefined,
    data: T[],
    fieldIsNumeric: boolean | undefined
): ((point: T) => number) | undefined => {
    if (!field) {
        return undefined;
    }

    if (fieldIsNumeric === true) {
        return (point: T) => point[field] as any as number;
    }

    if (fieldIsNumeric === false) {
        return (point: T) => resolveDownsampleValue(point[field], scale);
    }

    return resolveDownsampleAccessor(field, scale, data);
};

/**
 * Numeric-field twin of the public accessor-based LTTB implementation.
 * Keep its control flow and arithmetic order aligned with downsampleLTTB:
 * this separate hot loop exists only so the runtime can optimize direct field
 * reads instead of invoking dynamic accessor closures roughly four times per point.
 */
const downsampleLTTBNumericFields = <T = any>(
    data: T[],
    threshold: number,
    xField: keyof T & string,
    yField: keyof T & string
): T[] => {
    const dataLength = data.length;
    const targetLength = Math.floor(threshold);

    if (dataLength <= 2 || !Number.isFinite(targetLength) || targetLength <= 0 || targetLength >= dataLength) {
        return data;
    }

    if (targetLength === 1) {
        return [data[0]];
    }

    if (targetLength === 2) {
        return [data[0], data[dataLength - 1]];
    }

    const sampled: T[] = [data[0]];
    const bucketSize = (dataLength - 2) / (targetLength - 2);
    let previousSelectedIndex = 0;

    for (let bucketIndex = 0; bucketIndex < targetLength - 2; bucketIndex += 1) {
        const averageStart = Math.floor((bucketIndex + 1) * bucketSize) + 1;
        const averageEnd = Math.min(Math.floor((bucketIndex + 2) * bucketSize) + 1, dataLength);
        const averageLength = Math.max(averageEnd - averageStart, 1);
        let averageX = 0;
        let averageY = 0;

        for (let index = averageStart; index < averageEnd; index += 1) {
            const point = data[index];
            averageX += point[xField] as any as number;
            averageY += point[yField] as any as number;
        }

        if (averageEnd <= averageStart) {
            const point = data[dataLength - 1];
            averageX = point[xField] as any as number;
            averageY = point[yField] as any as number;
        } else {
            averageX /= averageLength;
            averageY /= averageLength;
        }

        const rangeStart = Math.floor(bucketIndex * bucketSize) + 1;
        const rangeEnd = Math.min(Math.floor((bucketIndex + 1) * bucketSize) + 1, dataLength - 1);
        const pointA = data[previousSelectedIndex];
        const pointAX = pointA[xField] as any as number;
        const pointAY = pointA[yField] as any as number;
        let maxArea = -1;
        let maxAreaIndex = rangeStart;

        for (let index = rangeStart; index < rangeEnd; index += 1) {
            const pointB = data[index];
            const pointBX = pointB[xField] as any as number;
            const pointBY = pointB[yField] as any as number;
            const area = Math.abs(
                (pointAX - averageX) * (pointBY - pointAY)
                - (pointAX - pointBX) * (averageY - pointAY)
            ) * 0.5;

            if (Number.isFinite(area) && area > maxArea) {
                maxArea = area;
                maxAreaIndex = index;
            }
        }

        sampled.push(data[maxAreaIndex]);
        previousSelectedIndex = maxAreaIndex;
    }

    sampled.push(data[dataLength - 1]);

    return sampled;
};

export const resolveSeriesRenderData = <T = any>(
    data: T[],
    plotSize: KChartSize,
    series: KChartSeries<T>,
    xScale?: KChartResolvedScale<T>,
    yScale?: KChartResolvedScale<T>
): T[] => {
    const downsample = series.downsample;

    if (!downsample || (typeof downsample !== 'boolean' && downsample.enabled === false)) {
        return data;
    }

    const xField = series.xField;
    const yField = series.yField;
    const configuredXAccessor = typeof downsample === 'boolean' ? undefined : downsample.xAccessor;
    const configuredYAccessor = typeof downsample === 'boolean' ? undefined : downsample.yAccessor;
    const canClassifyDefaultFields = configuredXAccessor === undefined
        && configuredYAccessor === undefined
        && xField !== undefined
        && yField !== undefined;
    const xFieldIsNumeric = canClassifyDefaultFields
        ? isDownsampleFieldNumeric(data, xField)
        : undefined;
    const yFieldIsNumeric = canClassifyDefaultFields
        ? isDownsampleFieldNumeric(data, yField)
        : undefined;
    const useNumericFieldSampler = xFieldIsNumeric === true && yFieldIsNumeric === true;
    const xAccessor = useNumericFieldSampler
        ? undefined
        : configuredXAccessor ?? resolveClassifiedAccessor(xField, xScale, data, xFieldIsNumeric);
    const yAccessor = useNumericFieldSampler
        ? undefined
        : configuredYAccessor ?? resolveClassifiedAccessor(yField, yScale, data, yFieldIsNumeric);

    if (!useNumericFieldSampler && (!xAccessor || !yAccessor)) {
        return data;
    }

    const context: KChartDownsampleContext<T> = {
        data,
        plotSize,
        series,
        xField,
        yField
    };
    const threshold = resolveDownsampleThreshold(downsample, context);

    if (useNumericFieldSampler) {
        return downsampleLTTBNumericFields(data, threshold, xField, yField);
    }

    return downsampleLTTB(data, threshold, xAccessor!, yAccessor!);
};
