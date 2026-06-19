import type {KChartSeries} from '../core/contracts';

export const createCustomSeries = <T = any>(
    series: KChartSeries<T>
): KChartSeries<T> => series;
