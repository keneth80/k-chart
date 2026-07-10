import {
    sankey,
    sankeyCenter,
    sankeyJustify,
    sankeyLeft,
    sankeyLinkHorizontal,
    sankeyRight
} from 'd3-sankey';
import type {
    KChartSankeyLink,
    KChartSankeyNode,
    KChartSankeyNodeAlign,
    KChartSankeySeriesConfiguration,
    KChartSeries
} from '../core/contracts';
import {createCustomSeries} from './custom';

const defaultSankeyPalette = [
    '#5db8ff',
    '#56d08f',
    '#f3b45b',
    '#d876ff',
    '#ff6b8a',
    '#72e4ff',
    '#a8d95f',
    '#ff9f5a'
];

let sankeySeriesInstanceSequence = 0;

export interface KChartResolvedSankey<T = any> {
    nodes: Array<KChartSankeyNode<T>>;
    links: Array<KChartSankeyLink<T>>;
}

type SankeyFieldConfiguration<T> = Pick<
    KChartSankeySeriesConfiguration<T>,
    'sourceField' | 'targetField' | 'valueField' | 'categoryField' | 'categorySide'
>;

const resolveMetric = (value: unknown): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
};

const assertAcyclic = <T = any>(
    nodes: Array<KChartSankeyNode<T>>,
    links: Array<KChartSankeyLink<T>>
): void => {
    const adjacency = new Map<string, string[]>();
    const indegree = new Map<string, number>();
    nodes.forEach((node) => adjacency.set(node.id, []));
    nodes.forEach((node) => indegree.set(node.id, 0));
    links.forEach((link) => {
        adjacency.get(link.source.id)?.push(link.target.id);
        indegree.set(link.target.id, (indegree.get(link.target.id) ?? 0) + 1);
    });
    const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
    let visitedCount = 0;
    for (let index = 0; index < queue.length; index += 1) {
        const nodeId = queue[index];
        visitedCount += 1;
        (adjacency.get(nodeId) ?? []).forEach((targetId) => {
            const nextIndegree = (indegree.get(targetId) ?? 0) - 1;
            indegree.set(targetId, nextIndegree);
            if (nextIndegree === 0) queue.push(targetId);
        });
    }
    if (visitedCount !== nodes.length) {
        const cycleNode = nodes.find((node) => (indegree.get(node.id) ?? 0) > 0)?.id ?? 'unknown';
        throw new Error(`KChart Sankey requires an acyclic flow; cycle detected at "${cycleNode}".`);
    }
};

export const resolveSankeyData = <T = any>(
    data: T[],
    configuration: SankeyFieldConfiguration<T>
): KChartResolvedSankey<T> => {
    const nodes = new Map<string, KChartSankeyNode<T>>();
    const links = new Map<string, KChartSankeyLink<T>>();
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();
    const categorySide = configuration.categorySide ?? 'source';
    const ensureNode = (id: string): KChartSankeyNode<T> => {
        const existing = nodes.get(id);
        if (existing) return existing;
        const node: KChartSankeyNode<T> = {
            id,
            label: id,
            value: 0,
            rows: [],
            x0: 0,
            x1: 0,
            y0: 0,
            y1: 0,
            depth: 0
        };
        nodes.set(id, node);
        return node;
    };

    data.forEach((row) => {
        const sourceId = String(row[configuration.sourceField] ?? '').trim();
        const targetId = String(row[configuration.targetField] ?? '').trim();
        if (!sourceId || !targetId) return;
        const value = resolveMetric(row[configuration.valueField]);
        const source = ensureNode(sourceId);
        const target = ensureNode(targetId);
        source.rows.push(row);
        if (target !== source) target.rows.push(row);
        outgoing.set(sourceId, (outgoing.get(sourceId) ?? 0) + value);
        incoming.set(targetId, (incoming.get(targetId) ?? 0) + value);

        if (configuration.categoryField) {
            const rawCategory = row[configuration.categoryField];
            const category = rawCategory === null || rawCategory === undefined ? 'N/A' : String(rawCategory);
            if (categorySide === 'source' || categorySide === 'both') source.category = source.category ?? category;
            if (categorySide === 'target' || categorySide === 'both') target.category = target.category ?? category;
        }

        const id = `${sourceId}\u0000${targetId}`;
        const existing = links.get(id);
        if (existing) {
            existing.value += value;
            existing.rows.push(row);
        } else {
            links.set(id, {
                id,
                source,
                target,
                value,
                rows: [row],
                width: 0,
                y0: 0,
                y1: 0
            });
        }
    });

    nodes.forEach((node) => {
        node.value = Math.max(incoming.get(node.id) ?? 0, outgoing.get(node.id) ?? 0);
    });
    const result = {nodes: Array.from(nodes.values()), links: Array.from(links.values())};
    assertAcyclic(result.nodes, result.links);
    return result;
};

const safeSvgId = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, '-');

const hashValue = (seed: number, value: unknown): number => {
    const text = String(value ?? '');
    let hash = seed;
    for (let index = 0; index < text.length; index += 1) {
        hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    }
    return hash;
};

const resolveDataSignature = <T = any>(data: T[], configuration: SankeyFieldConfiguration<T>): number => {
    let hash = Math.imul(2166136261, data.length + 1);
    data.forEach((row) => {
        hash = hashValue(hash, row[configuration.sourceField]);
        hash = hashValue(hash, row[configuration.targetField]);
        hash = hashValue(hash, row[configuration.valueField]);
        if (configuration.categoryField) hash = hashValue(hash, row[configuration.categoryField]);
    });
    return hash >>> 0;
};

const resolveAlignment = (alignment: KChartSankeyNodeAlign) => {
    switch (alignment) {
        case 'left': return sankeyLeft;
        case 'right': return sankeyRight;
        case 'center': return sankeyCenter;
        default: return sankeyJustify;
    }
};

export const createSankeySeries = <T = any>(
    configuration: KChartSankeySeriesConfiguration<T>
): KChartSeries<T> => {
    const instanceId = ++sankeySeriesInstanceSequence;
    let cachedGraph: KChartResolvedSankey<T> = {nodes: [], links: []};
    let lastSignature = -1;
    let lastWidth = -1;
    let lastHeight = -1;

    return createCustomSeries<T>({
        selector: configuration.selector,
        displayName: configuration.displayName,
        color: configuration.color,
        pointerEvents: 'series',
        render({group, data, plotSize, color, animation}) {
            const width = Math.max(1, plotSize.width);
            const height = Math.max(1, plotSize.height);
            const signature = resolveDataSignature(data, configuration);
            const layoutChanged = signature !== lastSignature || width !== lastWidth || height !== lastHeight;
            if (layoutChanged) {
                const resolved = resolveSankeyData(data, configuration);
                const labelGutter = Math.max(0, configuration.labelGutter ?? 88);
                const fitPadding = Math.max(0, configuration.fitPadding ?? 8);
                const layoutNodes = resolved.nodes.map((node) => ({...node}));
                const layoutLinks = resolved.links.map((link) => ({
                    ...link,
                    source: link.source.id,
                    target: link.target.id,
                    actualValue: link.value,
                    value: Math.max(link.value, 0.000001)
                }));
                const resolvedNodesById = new Map(resolved.nodes.map((node) => [node.id, node]));
                const generator = sankey<any, any>()
                    .nodeId((node: any) => node.id)
                    .nodeAlign(resolveAlignment(configuration.nodeAlign ?? 'justify'))
                    .nodeWidth(Math.max(1, configuration.nodeWidth ?? 18))
                    .nodePadding(Math.max(0, configuration.nodePadding ?? 14))
                    .iterations(Math.max(1, Math.floor(configuration.iterations ?? 12)))
                    .extent([
                        [fitPadding + labelGutter, fitPadding],
                        [Math.max(fitPadding + labelGutter + 1, width - fitPadding - labelGutter), Math.max(fitPadding + 1, height - fitPadding)]
                    ]);
                const layout = generator({nodes: layoutNodes, links: layoutLinks} as any);
                cachedGraph = {
                    nodes: layout.nodes.map((node: any) => {
                        const value = resolvedNodesById.get(node.id)?.value ?? node.value ?? 0;
                        const y0 = node.y0 ?? 0;
                        const y1 = node.y1 ?? 0;
                        const centerY = (y0 + y1) / 2;
                        return {
                            ...node,
                            x0: node.x0 ?? 0,
                            x1: node.x1 ?? 0,
                            y0: value === 0 ? centerY - 2 : y0,
                            y1: value === 0 ? centerY + 2 : y1,
                            depth: node.depth ?? 0,
                            value
                        };
                    }) as Array<KChartSankeyNode<T>>,
                    links: layout.links.map((link: any) => ({
                        ...link,
                        source: link.source,
                        target: link.target,
                        value: link.actualValue ?? link.value ?? 0,
                        width: (link.actualValue ?? 0) === 0 ? 0 : link.width ?? 0,
                        y0: link.y0 ?? 0,
                        y1: link.y1 ?? 0
                    })) as Array<KChartSankeyLink<T>>
                };
                lastSignature = signature;
                lastWidth = width;
                lastHeight = height;
            }

            const nodes = cachedGraph.nodes;
            const links = cachedGraph.links;
            const palette = configuration.palette?.length ? configuration.palette : defaultSankeyPalette;
            const categories = new Map<string, number>();
            const nodeColors = new Map<string, string>();
            nodes.forEach((node, index) => {
                const categoryKey = node.category ?? node.id;
                if (!categories.has(categoryKey)) categories.set(categoryKey, categories.size);
                const nodeColor = typeof configuration.nodeColor === 'function'
                    ? configuration.nodeColor(node, index)
                    : configuration.nodeColor
                        ?? (node.category ? palette[(categories.get(categoryKey) ?? 0) % palette.length] : configuration.color ?? color);
                nodeColors.set(node.id, nodeColor);
            });

            const defs = group.selectAll<SVGDefsElement, unknown>('defs.kchart-sankey-defs')
                .data([undefined])
                .join('defs')
                .attr('class', 'kchart-sankey-defs');
            const gradientPrefix = `kchart-sankey-${safeSvgId(configuration.selector)}-${instanceId}`;
            const useGradients = (configuration.linkColor ?? 'gradient') === 'gradient';
            const gradients = defs.selectAll<SVGLinearGradientElement, KChartSankeyLink<T>>('linearGradient.kchart-sankey-gradient')
                .data(useGradients ? links : [], (link) => link.id)
                .join('linearGradient')
                .attr('class', 'kchart-sankey-gradient')
                .attr('id', (_link, index) => `${gradientPrefix}-${index}`)
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', (link) => link.source.x1)
                .attr('x2', (link) => link.target.x0);
            gradients.selectAll<SVGStopElement, {offset: string; color: string}>('stop')
                .data((link) => [
                    {offset: '0%', color: nodeColors.get(link.source.id) ?? color},
                    {offset: '100%', color: nodeColors.get(link.target.id) ?? color}
                ])
                .join('stop')
                .attr('offset', (stop) => stop.offset)
                .attr('stop-color', (stop) => stop.color);

            const linkColor = (link: KChartSankeyLink<T>, index: number): string => {
                const configured = configuration.linkColor ?? 'gradient';
                if (configured === 'gradient') return `url(#${gradientPrefix}-${index})`;
                if (configured === 'source') return nodeColors.get(link.source.id) ?? color;
                if (configured === 'target') return nodeColors.get(link.target.id) ?? color;
                return configured;
            };
            const resetInteraction = (): void => {
                group.selectAll<SVGPathElement, KChartSankeyLink<T>>('path.kchart-sankey-link')
                    .style('opacity', configuration.linkOpacity ?? 0.58);
                group.selectAll<SVGGElement, KChartSankeyNode<T>>('g.kchart-sankey-node')
                    .style('opacity', 1);
            };
            const highlightNode = (nodeId: string): void => {
                group.selectAll<SVGPathElement, KChartSankeyLink<T>>('path.kchart-sankey-link')
                    .style('opacity', (link) => link.source.id === nodeId || link.target.id === nodeId
                        ? 0.94
                        : configuration.dimOpacity ?? 0.1);
                group.selectAll<SVGGElement, KChartSankeyNode<T>>('g.kchart-sankey-node')
                    .style('opacity', (node) => {
                        const connected = node.id === nodeId || links.some((link) => (
                            link.source.id === nodeId && link.target.id === node.id
                        ) || (
                            link.target.id === nodeId && link.source.id === node.id
                        ));
                        return connected ? 1 : configuration.dimOpacity ?? 0.1;
                    });
            };
            const highlightLink = (linkId: string): void => {
                const active = links.find((link) => link.id === linkId);
                group.selectAll<SVGPathElement, KChartSankeyLink<T>>('path.kchart-sankey-link')
                    .style('opacity', (link) => link.id === linkId ? 0.96 : configuration.dimOpacity ?? 0.1);
                group.selectAll<SVGGElement, KChartSankeyNode<T>>('g.kchart-sankey-node')
                    .style('opacity', (node) => active && (node.id === active.source.id || node.id === active.target.id)
                        ? 1
                        : configuration.dimOpacity ?? 0.1);
            };

            group.selectAll<SVGPathElement, KChartSankeyLink<T>>('path.kchart-sankey-link')
                .data(links, (link) => link.id)
                .join('path')
                .attr('class', 'kchart-sankey-link')
                .attr('d', sankeyLinkHorizontal() as any)
                .style('fill', 'none')
                .style('stroke', linkColor)
                .style('stroke-width', (link) => Math.max(configuration.minLinkWidth ?? 1, link.width) * (animation.enabled ? animation.progress : 1))
                .style('opacity', (configuration.linkOpacity ?? 0.58) * (animation.enabled ? animation.progress : 1))
                .style('cursor', configuration.onLinkClick ? 'pointer' : 'default')
                .on('mouseenter', (_event, link) => highlightLink(link.id))
                .on('mouseleave', resetInteraction)
                .on('click', (event: MouseEvent, link) => {
                    if (!configuration.onLinkClick) return;
                    event.stopPropagation();
                    configuration.onLinkClick({link, event});
                })
                .each(function appendLinkTitle(link) {
                    let title = this.querySelector<SVGTitleElement>('title');
                    if (!title) {
                        title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                        this.appendChild(title);
                    }
                    title.textContent = `${link.source.label} → ${link.target.label}: ${link.value}`;
                });

            const nodeGroups = group.selectAll<SVGGElement, KChartSankeyNode<T>>('g.kchart-sankey-node')
                .data(nodes, (node) => node.id)
                .join('g')
                .attr('class', 'kchart-sankey-node')
                .style('cursor', configuration.onNodeClick ? 'pointer' : 'default')
                .on('mouseenter', (_event, node) => highlightNode(node.id))
                .on('mouseleave', resetInteraction)
                .on('click', (event: MouseEvent, node) => {
                    if (!configuration.onNodeClick) return;
                    event.stopPropagation();
                    configuration.onNodeClick({node, event});
                });
            nodeGroups.selectAll<SVGRectElement, KChartSankeyNode<T>>('rect.kchart-sankey-node-rect')
                .data((node) => [node])
                .join('rect')
                .attr('class', 'kchart-sankey-node-rect')
                .attr('x', (node) => node.x0)
                .attr('y', (node) => node.y0)
                .attr('width', (node) => Math.max(1, node.x1 - node.x0))
                .attr('height', (node) => Math.max(1, node.y1 - node.y0))
                .attr('rx', 2)
                .style('fill', (node) => nodeColors.get(node.id) ?? color)
                .style('fill-opacity', (configuration.nodeOpacity ?? 0.94) * (animation.enabled ? animation.progress : 1))
                .style('stroke', configuration.nodeStroke ?? 'rgba(246, 250, 255, 0.84)')
                .style('stroke-width', configuration.nodeStrokeWidth ?? 1.2);
            nodeGroups.selectAll('title')
                .data((node) => [node])
                .join('title')
                .text((node) => `${node.label}: ${node.value}`);

            const labelConfiguration = typeof configuration.labels === 'boolean'
                ? {visible: configuration.labels}
                : configuration.labels ?? {visible: true};
            nodeGroups.selectAll<SVGTextElement, KChartSankeyNode<T>>('text.kchart-sankey-label')
                .data((node) => labelConfiguration.visible === false ? [] : [node])
                .join('text')
                .attr('class', 'kchart-sankey-label')
                .attr('x', (node) => node.x0 < width / 2
                    ? node.x1 + (labelConfiguration.offset ?? 7)
                    : node.x0 - (labelConfiguration.offset ?? 7))
                .attr('y', (node) => (node.y0 + node.y1) / 2)
                .attr('text-anchor', (node) => node.x0 < width / 2 ? 'start' : 'end')
                .attr('dominant-baseline', 'middle')
                .style('fill', labelConfiguration.color ?? '#edf3f8')
                .style('font-size', `${labelConfiguration.fontSize ?? 11}px`)
                .style('font-weight', labelConfiguration.fontWeight ?? 700)
                .style('pointer-events', 'none')
                .text((node) => labelConfiguration.formatter?.(node) ?? `${node.label} · ${node.value}`);

            resetInteraction();
        },
        destroy() {
            cachedGraph = {nodes: [], links: []};
            lastSignature = -1;
            lastWidth = -1;
            lastHeight = -1;
        }
    });
};
