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

interface MinMaxDomain {
    min: number;
    max: number;
}

const resolveMinMaxDomain = <T = any>(
    scale: KChartResolvedScale<T> | undefined
): MinMaxDomain | undefined => {
    if (!scale || (scale.type !== 'number' && scale.type !== 'time')) {
        return undefined;
    }

    const domain = typeof scale.scale?.domain === 'function'
        ? scale.scale.domain()
        : scale.domain;
    if (!Array.isArray(domain) || domain.length < 2) {
        return undefined;
    }

    const first = domain[0] instanceof Date ? domain[0].getTime() : Number(domain[0]);
    const lastValue = domain[domain.length - 1];
    const last = lastValue instanceof Date ? lastValue.getTime() : Number(lastValue);
    if (!Number.isFinite(first) || !Number.isFinite(last) || first === last) {
        return undefined;
    }

    return first < last ? {min: first, max: last} : {min: last, max: first};
};

const resolveContinuousX = (value: unknown, type: 'number' | 'time'): number => {
    if (type === 'time') {
        if (value instanceof Date) {
            return value.getTime();
        }
        if (typeof value === 'string') {
            return Date.parse(value);
        }
    }

    return typeof value === 'number' ? value : Number.NaN;
};

const resolveContinuousWindowData = <T = any>(
    data: T[],
    xField: keyof T & string,
    xScale: KChartResolvedScale<T> & {type: 'number' | 'time'}
): T[] => {
    const domain = resolveMinMaxDomain(xScale);
    if (!domain) {
        return data;
    }

    let nearestBeforeIndex = -1;
    let nearestBeforeX = -Infinity;
    let nearestAfterIndex = -1;
    let nearestAfterX = Infinity;
    const selectedIndices: number[] = [];

    for (let index = 0; index < data.length; index += 1) {
        const x = resolveContinuousX(data[index][xField], xScale.type);
        if (!Number.isFinite(x)) {
            continue;
        }
        if (x < domain.min) {
            if (x > nearestBeforeX) {
                nearestBeforeX = x;
                nearestBeforeIndex = index;
            }
            continue;
        }
        if (x > domain.max) {
            if (x < nearestAfterX) {
                nearestAfterX = x;
                nearestAfterIndex = index;
            }
            continue;
        }
        selectedIndices.push(index);
    }

    if (nearestBeforeIndex >= 0) selectedIndices.push(nearestBeforeIndex);
    if (nearestAfterIndex >= 0) selectedIndices.push(nearestAfterIndex);
    if (selectedIndices.length === 0) {
        return data;
    }

    selectedIndices.sort((left, right) => left - right);
    const windowData: T[] = [];
    let previousIndex = -1;
    for (let index = 0; index < selectedIndices.length; index += 1) {
        const sourceIndex = selectedIndices[index];
        if (sourceIndex !== previousIndex) {
            windowData.push(data[sourceIndex]);
            previousIndex = sourceIndex;
        }
    }
    return windowData;
};

const pushMinMaxCandidates = <T = any>(
    data: T[],
    sampled: T[],
    candidates: Int32Array,
    candidateCount: number
): void => {
    for (let index = 1; index < candidateCount; index += 1) {
        const value = candidates[index];
        let insertion = index - 1;
        while (insertion >= 0 && candidates[insertion] > value) {
            candidates[insertion + 1] = candidates[insertion];
            insertion -= 1;
        }
        candidates[insertion + 1] = value;
    }

    let previous = -1;
    for (let index = 0; index < candidateCount; index += 1) {
        const sourceIndex = candidates[index];
        if (sourceIndex !== previous) {
            sampled.push(data[sourceIndex]);
            previous = sourceIndex;
        }
    }
};

const tryDownsampleMinMaxFields = <T = any>(
    data: T[],
    plotWidth: number,
    xField: keyof T & string,
    yField: keyof T & string,
    xScale: KChartResolvedScale<T> & {type: 'number' | 'time'},
    pointsPerPixel: number
): T[] | undefined => {
    const domain = resolveMinMaxDomain(xScale);
    const columnCount = Math.max(1, Math.floor(plotWidth));
    if (!domain || !Number.isFinite(columnCount)) {
        return undefined;
    }
    if (data.length <= 2) {
        return data;
    }

    const density = Number.isFinite(pointsPerPixel)
        ? Math.max(1, pointsPerPixel)
        : 4;
    const sampled: T[] = [];
    // One reusable fixed buffer keeps the hot loop allocation-free while the
    // source indices are sorted at flush time to preserve line traversal order.
    const candidates = new Int32Array(4);
    let currentColumn = -1;
    let firstIndex = -1;
    let minimumIndex = -1;
    let maximumIndex = -1;
    let lastIndex = -1;
    let minimumY = Infinity;
    let maximumY = -Infinity;
    let previousVisibleX = -Infinity;
    let beforeVisibleIndex = -1;
    let afterVisibleIndex = -1;
    let windowStart = -1;
    let windowEnd = -1;
    const columnScale = columnCount / (domain.max - domain.min);

    const flush = (): void => {
        let count = 0;
        if (firstIndex >= 0) candidates[count++] = firstIndex;
        if (minimumIndex >= 0) candidates[count++] = minimumIndex;
        if (maximumIndex >= 0) candidates[count++] = maximumIndex;
        if (lastIndex >= 0) candidates[count++] = lastIndex;
        pushMinMaxCandidates(data, sampled, candidates, count);
    };

    for (let index = 0; index < data.length; index += 1) {
        const point = data[index];
        const x = resolveContinuousX(point[xField], xScale.type);
        const rawY = point[yField] as any as number;
        if (!Number.isFinite(x)) {
            return undefined;
        }

        if (x < domain.min) {
            if (windowStart >= 0 || afterVisibleIndex >= 0) {
                return undefined;
            }
            beforeVisibleIndex = index;
            continue;
        }
        if (x > domain.max) {
            if (afterVisibleIndex < 0) afterVisibleIndex = index;
            continue;
        }
        if (afterVisibleIndex >= 0 || x < previousVisibleX || !Number.isFinite(rawY)) {
            return undefined;
        }
        previousVisibleX = x;

        const column = x <= domain.min
            ? 0
            : x >= domain.max
                ? columnCount - 1
                : Math.floor((x - domain.min) * columnScale);

        if (currentColumn !== column) {
            if (currentColumn >= 0) flush();
            currentColumn = column;
            firstIndex = -1;
            minimumIndex = -1;
            maximumIndex = -1;
            lastIndex = -1;
            minimumY = Infinity;
            maximumY = -Infinity;
        }

        if (windowStart < 0) windowStart = index;
        windowEnd = index + 1;
        if (firstIndex < 0) firstIndex = index;
        lastIndex = index;
        if (rawY < minimumY) {
            minimumY = rawY;
            minimumIndex = index;
        }
        if (rawY > maximumY) {
            maximumY = rawY;
            maximumIndex = index;
        }
    }

    if (currentColumn >= 0) flush();

    const visibleLength = Math.max(0, windowEnd - windowStart);
    if (visibleLength === 0) {
        const boundaryData: T[] = [];
        if (beforeVisibleIndex >= 0) boundaryData.push(data[beforeVisibleIndex]);
        if (afterVisibleIndex >= 0 && afterVisibleIndex !== beforeVisibleIndex) {
            boundaryData.push(data[afterVisibleIndex]);
        }
        return boundaryData.length > 0 ? boundaryData : data;
    }
    if (visibleLength <= columnCount * density) {
        const sliceStart = beforeVisibleIndex >= 0 ? beforeVisibleIndex : windowStart;
        const sliceEnd = afterVisibleIndex >= 0 ? afterVisibleIndex + 1 : windowEnd;
        return sliceStart === 0 && sliceEnd === data.length
            ? data
            : data.slice(sliceStart, sliceEnd);
    }
    if (beforeVisibleIndex >= 0) sampled.unshift(data[beforeVisibleIndex]);
    if (afterVisibleIndex >= 0) sampled.push(data[afterVisibleIndex]);
    return sampled;
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
    const strategy = typeof downsample === 'boolean' ? 'lttb' : downsample.strategy ?? 'lttb';
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

    if (
        strategy !== 'lttb'
        && configuredXAccessor === undefined
        && configuredYAccessor === undefined
        && xField !== undefined
        && yField !== undefined
        && xScale !== undefined
        && (xScale.type === 'number' || xScale.type === 'time')
    ) {
        const minMaxData = tryDownsampleMinMaxFields(
            data,
            plotSize.width,
            xField,
            yField,
            xScale as KChartResolvedScale<T> & {type: 'number' | 'time'},
            typeof downsample === 'boolean' ? 4 : downsample.pointsPerPixel ?? 4
        );
        if (minMaxData) {
            return minMaxData;
        }
    }

    // An explicit min-max request must not silently switch algorithms. Keep
    // the original renderer input when pixel columns cannot be computed safely;
    // `auto` remains the opt-in strategy for an LTTB fallback.
    if (strategy === 'min-max') {
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
    const lttbData = strategy === 'auto'
        && configuredXAccessor === undefined
        && xField !== undefined
        && xScale !== undefined
        && (xScale.type === 'number' || xScale.type === 'time')
        ? resolveContinuousWindowData(
            data,
            xField,
            xScale as KChartResolvedScale<T> & {type: 'number' | 'time'}
        )
        : data;

    if (useNumericFieldSampler) {
        return downsampleLTTBNumericFields(lttbData, threshold, xField, yField);
    }

    return downsampleLTTB(lttbData, threshold, xAccessor!, yAccessor!);
};
