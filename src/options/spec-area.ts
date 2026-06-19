import type {
    KChartResolvedScale,
    KChartSpecAreaConfiguration,
    KChartSpecAreaOption,
    KChartState
} from '../core/contracts';
import {resolveScalePosition} from '../series/support/scale';

export const createSpecAreaOption = (
    areas: KChartSpecAreaConfiguration[],
    config: Pick<KChartSpecAreaOption, 'visible'> = {}
): KChartSpecAreaOption => ({
    type: 'spec-area',
    ...config,
    areas
});

export const resolveSpecAreas = <T = any>(
    state: KChartState<T>
): KChartSpecAreaConfiguration[] => [
    ...(state.config.specAreas ?? []),
    ...(state.config.options ?? [])
        .filter(
            (option): option is KChartSpecAreaOption =>
                option.type === 'spec-area' && option.visible !== false
        )
        .flatMap((option) => option.areas)
].filter((area) => area.visible !== false);

export const renderSpecAreas = <T = any>(state: KChartState<T>): void => {
    const areas = resolveSpecAreas(state);
    const areaGroup = state.layers.plotGroup
        .selectAll<SVGGElement, unknown>('g.kchart-spec-areas')
        .data(areas.length ? [undefined] : [])
        .join('g')
        .attr('class', 'kchart-spec-areas');
    const labelGroup = state.layers.plotGroup
        .selectAll<SVGGElement, unknown>('g.kchart-spec-area-labels')
        .data(areas.length ? [undefined] : [])
        .join('g')
        .attr('class', 'kchart-spec-area-labels');

    if (!areas.length) {
        return;
    }

    const xScale = state.scales.find(
        (scale: KChartResolvedScale<T>) =>
            scale.placement === 'bottom' || scale.placement === 'top'
    );
    if (!xScale) {
        return;
    }

    const clamp = (value: number): number =>
        Math.max(0, Math.min(state.plotSize.width, value));
    const area = areaGroup
        .selectAll<SVGGElement, KChartSpecAreaConfiguration>(
            'g.kchart-spec-area'
        )
        .data(areas)
        .join('g')
        .attr('class', 'kchart-spec-area');

    area.selectAll<SVGRectElement, KChartSpecAreaConfiguration>('rect')
        .data((item) => [item])
        .join('rect')
        .attr('x', (item) => clamp(resolveScalePosition(xScale, item.start)))
        .attr('y', 0)
        .attr('width', (item) => Math.max(
            0,
            clamp(resolveScalePosition(xScale, item.end)) -
            clamp(resolveScalePosition(xScale, item.start))
        ))
        .attr('height', state.plotSize.height)
        .style('fill', (item) => item.color ?? 'rgba(249, 225, 250, 0.22)')
        .style('pointer-events', 'none');

    const labels = labelGroup
        .selectAll<SVGGElement, KChartSpecAreaConfiguration>(
            'g.kchart-spec-area-label'
        )
        .data(areas.filter((item) => item.label))
        .join('g')
        .attr('class', 'kchart-spec-area-label')
        .attr('transform', (item) => {
            const start = clamp(resolveScalePosition(xScale, item.start));
            const end = clamp(resolveScalePosition(xScale, item.end));
            return `translate(${start + Math.max(0, end - start) / 2}, -14)`;
        })
        .style('pointer-events', 'none');

    labels.selectAll<SVGRectElement, KChartSpecAreaConfiguration>('rect')
        .data((item) => [item])
        .join('rect')
        .attr(
            'x',
            (item) => -Math.max(46, (item.label?.length ?? 0) * 6.5) / 2
        )
        .attr('y', -11)
        .attr(
            'width',
            (item) => Math.max(46, (item.label?.length ?? 0) * 6.5)
        )
        .attr('height', 18)
        .attr('rx', 5)
        .style('fill', 'rgba(10, 14, 20, 0.82)')
        .style('stroke', 'rgba(248, 251, 255, 0.22)')
        .style('stroke-width', 1);

    labels.selectAll<SVGTextElement, KChartSpecAreaConfiguration>('text')
        .data((item) => [item])
        .join('text')
        .attr('x', 0)
        .attr('y', 2)
        .style('fill', '#b6c4cf')
        .style('font-size', '11px')
        .style('font-weight', 700)
        .style('text-anchor', 'middle')
        .text((item) => item.label ?? '');
};
