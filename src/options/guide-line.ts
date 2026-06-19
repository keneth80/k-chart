import type {
    KChartFixedGuideLine,
    KChartGuideLineOption,
    KChartResolvedScale,
    KChartState
} from '../core/contracts';
import {resolveScalePosition} from '../series/support/scale';

export const createGuideLineOption = (
    config: Omit<KChartGuideLineOption, 'type'>
): KChartGuideLineOption => ({
    type: 'guide-line',
    ...config
});

export const resolveFixedGuideLines = <T = any>(
    state: KChartState<T>
): KChartFixedGuideLine[] => {
    const config = state.config.guideLines;
    if (config?.visible === false) {
        return [];
    }

    return [
        ...(config?.x ?? []).map((item) => ({...item, axis: 'x' as const})),
        ...(config?.y ?? []).map((item) => ({...item, axis: 'y' as const})),
        ...(state.config.options ?? [])
            .filter(
                (option): option is KChartGuideLineOption =>
                    option.type === 'guide-line' && option.visible !== false
            )
            .flatMap((option) => [
                ...(option.x ?? []).map(
                    (item) => ({...item, axis: 'x' as const})
                ),
                ...(option.y ?? []).map(
                    (item) => ({...item, axis: 'y' as const})
                )
            ])
    ].filter((item) => item.visible !== false);
};

export const renderGuideLines = <T = any>(state: KChartState<T>): void => {
    const guideLines = resolveFixedGuideLines(state);
    const guideGroup = state.layers.plotGroup
        .selectAll<SVGGElement, unknown>('g.kchart-fixed-guide-lines')
        .data(guideLines.length ? [undefined] : [])
        .join('g')
        .attr('class', 'kchart-fixed-guide-lines');

    if (!guideLines.length) {
        return;
    }

    const xScale = state.scales.find(
        (scale: KChartResolvedScale<T>) =>
            scale.placement === 'bottom' || scale.placement === 'top'
    );
    const yScale = state.scales.find(
        (scale: KChartResolvedScale<T>) =>
            scale.placement === 'left' || scale.placement === 'right'
    );
    const positioned = guideLines
        .map((item) => {
            const scale = item.axis === 'y' ? yScale : xScale;
            if (!scale) {
                return null;
            }

            const position = resolveScalePosition(scale, item.value);
            return Number.isFinite(position) ? {...item, position} : null;
        })
        .filter(
            (
                item
            ): item is KChartFixedGuideLine & {
                axis: 'x' | 'y';
                position: number;
            } => Boolean(item)
        );

    const guide = guideGroup
        .selectAll<SVGGElement, typeof positioned[number]>(
            'g.kchart-fixed-guide-line'
        )
        .data(
            positioned,
            (item) => `${item.axis}-${String(item.value)}-${item.label ?? ''}`
        )
        .join('g')
        .attr(
            'class',
            (item) =>
                `kchart-fixed-guide-line kchart-fixed-guide-line-${item.axis}`
        );

    guide.selectAll<SVGLineElement, typeof positioned[number]>('line')
        .data((item) => [item])
        .join('line')
        .attr('x1', (item) => item.axis === 'x' ? item.position : 0)
        .attr(
            'x2',
            (item) =>
                item.axis === 'x' ? item.position : state.plotSize.width
        )
        .attr('y1', (item) => item.axis === 'x' ? 0 : item.position)
        .attr(
            'y2',
            (item) =>
                item.axis === 'x' ? state.plotSize.height : item.position
        )
        .style(
            'stroke',
            (item) => item.color ?? 'rgba(248, 251, 255, 0.46)'
        )
        .style('stroke-width', (item) => item.width ?? 1)
        .style('stroke-dasharray', (item) => item.dasharray ?? '4 6')
        .style('shape-rendering', 'crispEdges')
        .style('pointer-events', 'none');

    const labels = guide
        .selectAll<SVGGElement, typeof positioned[number]>(
            'g.kchart-fixed-guide-line-label'
        )
        .data((item) => item.label ? [item] : [])
        .join('g')
        .attr('class', 'kchart-fixed-guide-line-label')
        .attr(
            'transform',
            (item) => item.axis === 'x'
                ? `translate(${item.position}, -20)`
                : `translate(-12, ${item.position})`
        );

    labels.selectAll<SVGRectElement, typeof positioned[number]>('rect')
        .data((item) => [item])
        .join('rect')
        .attr('x', (item) => {
            const width = Math.max(28, String(item.label).length * 7 + 14);
            return item.axis === 'x' ? -width / 2 : -width;
        })
        .attr('y', -12)
        .attr(
            'width',
            (item) => Math.max(28, String(item.label).length * 7 + 14)
        )
        .attr('height', 18)
        .attr('rx', 5)
        .style(
            'fill',
            (item) => item.labelBackground ?? 'rgba(10, 14, 20, 0.84)'
        )
        .style(
            'stroke',
            (item) => item.color ?? 'rgba(248, 251, 255, 0.46)'
        )
        .style('stroke-width', 1);

    labels.selectAll<SVGTextElement, typeof positioned[number]>('text')
        .data((item) => [item])
        .join('text')
        .attr('x', (item) => item.axis === 'x'
            ? 0
            : -Math.max(28, String(item.label).length * 7 + 14) / 2
        )
        .attr('y', 1)
        .style('fill', (item) => item.labelColor ?? '#edf3f8')
        .style('font-size', '11px')
        .style('font-weight', 700)
        .style('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .text((item) => item.label ?? '');
};
