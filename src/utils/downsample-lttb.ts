export const downsampleLTTB = <T = any>(
    data: T[],
    threshold: number,
    xAccessor: (point: T) => number,
    yAccessor: (point: T) => number
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
            averageX += xAccessor(data[index]);
            averageY += yAccessor(data[index]);
        }

        if (averageEnd <= averageStart) {
            averageX = xAccessor(data[dataLength - 1]);
            averageY = yAccessor(data[dataLength - 1]);
        } else {
            averageX /= averageLength;
            averageY /= averageLength;
        }

        const rangeStart = Math.floor(bucketIndex * bucketSize) + 1;
        const rangeEnd = Math.min(Math.floor((bucketIndex + 1) * bucketSize) + 1, dataLength - 1);
        const pointAX = xAccessor(data[previousSelectedIndex]);
        const pointAY = yAccessor(data[previousSelectedIndex]);
        let maxArea = -1;
        let maxAreaIndex = rangeStart;

        for (let index = rangeStart; index < rangeEnd; index += 1) {
            const pointBX = xAccessor(data[index]);
            const pointBY = yAccessor(data[index]);
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
