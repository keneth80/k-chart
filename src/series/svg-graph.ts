import {
    forceCenter,
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation
} from 'd3-force';
import {zoom, zoomIdentity, ZoomTransform} from 'd3-zoom';
import type {
    KChartGraphEdge,
    KChartGraphNode,
    KChartGraphSeriesConfiguration,
    KChartLayerContext,
    KChartSeries
} from '../core/contracts';
import {createCustomSeries} from './custom';

const defaultGraphPalette = [
    '#5db8ff',
    '#56d08f',
    '#f3b45b',
    '#d876ff',
    '#ff6b8a',
    '#72e4ff',
    '#a8d95f',
    '#ff9f5a'
];

let graphSeriesInstanceSequence = 0;

export interface KChartResolvedGraph<T = any> {
    nodes: Array<KChartGraphNode<T>>;
    edges: Array<KChartGraphEdge<T>>;
}

type GraphFieldConfiguration<T> = Pick<
    KChartGraphSeriesConfiguration<T>,
    'sourceField' | 'targetField' | 'valueField' | 'categoryField' | 'categorySide'
>;

const resolveMetric = (value: unknown): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

export const resolveGraphData = <T = any>(
    data: T[],
    configuration: GraphFieldConfiguration<T>
): KChartResolvedGraph<T> => {
    const nodes = new Map<string, KChartGraphNode<T>>();
    const edges = new Map<string, KChartGraphEdge<T>>();
    const categorySide = configuration.categorySide ?? 'source';
    const ensureNode = (id: string): KChartGraphNode<T> => {
        const existing = nodes.get(id);
        if (existing) {
            return existing;
        }
        const node: KChartGraphNode<T> = {
            id,
            label: id,
            value: 0,
            rows: [],
            x: 0,
            y: 0
        };
        nodes.set(id, node);
        return node;
    };

    data.forEach((row) => {
        const sourceId = String(row[configuration.sourceField] ?? '').trim();
        const targetId = String(row[configuration.targetField] ?? '').trim();
        if (!sourceId || !targetId) {
            return;
        }

        const value = resolveMetric(row[configuration.valueField]);
        const source = ensureNode(sourceId);
        const target = ensureNode(targetId);
        source.value += value;
        source.rows.push(row);
        if (target !== source) {
            target.value += value;
            target.rows.push(row);
        }

        if (configuration.categoryField) {
            const categoryValue = row[configuration.categoryField];
            const category = categoryValue === null || categoryValue === undefined
                ? 'N/A'
                : String(categoryValue);
            if (categorySide === 'source' || categorySide === 'both') {
                source.category = source.category ?? category;
            }
            if (categorySide === 'target' || categorySide === 'both') {
                target.category = target.category ?? category;
            }
        }

        const edgeId = `${sourceId}\u0000${targetId}`;
        const existingEdge = edges.get(edgeId);
        if (existingEdge) {
            existingEdge.value += value;
            existingEdge.rows.push(row);
        } else {
            edges.set(edgeId, {
                id: edgeId,
                source,
                target,
                value,
                rows: [row]
            });
        }
    });

    return {
        nodes: Array.from(nodes.values()),
        edges: Array.from(edges.values())
    };
};

const createLinearResolver = (
    values: number[],
    minOutput: number,
    maxOutput: number,
    squareRoot = false
): ((value: number) => number) => {
    let minValue = values.length ? Number.POSITIVE_INFINITY : 0;
    let maxValue = values.length ? Number.NEGATIVE_INFINITY : 0;
    values.forEach((value) => {
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
    });
    const span = Math.max(Number.EPSILON, maxValue - minValue);
    return (value) => {
        const ratio = Math.max(0, Math.min(1, (value - minValue) / span));
        const normalized = squareRoot ? Math.sqrt(ratio) : ratio;
        return minOutput + normalized * (maxOutput - minOutput);
    };
};

const resolveEdgePath = <T = any>(
    edge: KChartGraphEdge<T>,
    radius: (node: KChartGraphNode<T>) => number
): string => {
    const source = edge.source;
    const target = edge.target;
    if (source === target) {
        const loopRadius = radius(source) * 1.8;
        return `M ${source.x} ${source.y - radius(source)} a ${loopRadius} ${loopRadius} 0 1 1 1 0`;
    }
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const sourceRadius = radius(source);
    const targetRadius = radius(target);
    const startX = source.x + (dx / distance) * sourceRadius;
    const startY = source.y + (dy / distance) * sourceRadius;
    const endX = target.x - (dx / distance) * targetRadius;
    const endY = target.y - (dy / distance) * targetRadius;
    return `M ${startX} ${startY} L ${endX} ${endY}`;
};

const distanceToSegment = (
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
        return Math.hypot(x - x1, y - y1);
    }
    const ratio = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
    return Math.hypot(x - (x1 + ratio * dx), y - (y1 + ratio * dy));
};

const safeSvgId = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, '-');

const hashGraphValue = (seed: number, value: unknown): number => {
    const text = String(value ?? '');
    let hash = seed;
    for (let index = 0; index < text.length; index += 1) {
        hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    }
    return hash;
};

const resolveGraphDataSignature = <T = any>(
    data: T[],
    configuration: GraphFieldConfiguration<T>
): number => {
    let hash = Math.imul(2166136261, data.length + 1);
    data.forEach((row) => {
        hash = hashGraphValue(hash, row[configuration.sourceField]);
        hash = hashGraphValue(hash, row[configuration.targetField]);
        hash = hashGraphValue(hash, row[configuration.valueField]);
        if (configuration.categoryField) {
            hash = hashGraphValue(hash, row[configuration.categoryField]);
        }
    });
    return hash >>> 0;
};

export const createGraphSeries = <T = any>(
    configuration: KChartGraphSeriesConfiguration<T>
): KChartSeries<T> => {
    const instanceId = ++graphSeriesInstanceSequence;
    let resolvedGraph: KChartResolvedGraph<T> = {nodes: [], edges: []};
    let graphTransform: ZoomTransform = zoomIdentity;
    let lastData: T[] | undefined;
    let lastDataSignature = -1;
    let lastWidth = -1;
    let lastHeight = -1;
    const selectedIds = new Set<string>();
    let hoveredId: string | undefined;
    let resolveNodeRadius: (node: KChartGraphNode<T>) => number = () => configuration.nodeMinRadius ?? 8;
    let resolveEdgeWidth: (edge: KChartGraphEdge<T>) => number = () => configuration.edgeMinWidth ?? 1;

    const series = createCustomSeries<T>({
        selector: configuration.selector,
        displayName: configuration.displayName,
        color: configuration.color,
        pointerEvents: 'series',
        render({group, data, plotSize, color, animation}) {
            // The core recreates series DOM on every render, so a DOM hover
            // cannot remain active even when the cached layout is reused.
            hoveredId = undefined;
            const width = Math.max(1, plotSize.width);
            const height = Math.max(1, plotSize.height);
            const dataSignature = resolveGraphDataSignature(data, configuration);
            const layoutChanged = data !== lastData
                || dataSignature !== lastDataSignature
                || width !== lastWidth
                || height !== lastHeight;
            if (layoutChanged) {
                resolvedGraph = resolveGraphData(data, configuration);
                lastData = data;
                lastDataSignature = dataSignature;
                lastWidth = width;
                lastHeight = height;
                selectedIds.forEach((id) => {
                    if (!resolvedGraph.nodes.some((node) => node.id === id)) selectedIds.delete(id);
                });
            }
            const nodes = resolvedGraph.nodes;
            const edges = resolvedGraph.edges;
            const nodeMinRadius = configuration.nodeMinRadius ?? 9;
            const nodeMaxRadius = Math.max(nodeMinRadius, configuration.nodeMaxRadius ?? 28);
            const edgeMinWidth = configuration.edgeMinWidth ?? 1;
            const edgeMaxWidth = Math.max(edgeMinWidth, configuration.edgeMaxWidth ?? 7);
            const edgeColor = configuration.edgeColor ?? 'rgba(158, 181, 199, 0.58)';
            const nodeStroke = configuration.nodeStroke ?? 'rgba(246, 250, 255, 0.92)';
            const palette = configuration.palette?.length ? configuration.palette : defaultGraphPalette;
            const categories = new Map<string, number>();
            const nodeRadiusScale = createLinearResolver(nodes.map((node) => node.value), nodeMinRadius, nodeMaxRadius, true);
            const edgeWidthScale = createLinearResolver(edges.map((edge) => edge.value), edgeMinWidth, edgeMaxWidth);
            resolveNodeRadius = (node) => nodeRadiusScale(node.value);
            resolveEdgeWidth = (edge) => edgeWidthScale(edge.value);

            nodes.forEach((node, index) => {
                if (node.category && !categories.has(node.category)) {
                    categories.set(node.category, categories.size);
                }
                if (!layoutChanged) return;
                const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length) - Math.PI / 2;
                const initialRadius = Math.max(24, Math.min(width, height) * 0.3);
                node.x = width / 2 + Math.cos(angle) * initialRadius;
                node.y = height / 2 + Math.sin(angle) * initialRadius;
            });

            if (layoutChanged && (configuration.layout ?? 'force') === 'force' && nodes.length > 1) {
                const simulation = forceSimulation(nodes)
                    .force('link', forceLink<KChartGraphNode<T>, KChartGraphEdge<T>>(edges)
                        .distance(configuration.linkDistance ?? Math.max(72, Math.min(width, height) / 4))
                        .strength(0.58))
                    .force('charge', forceManyBody().strength(configuration.chargeStrength ?? -360))
                    .force('center', forceCenter(width / 2, height / 2))
                    .force('collision', forceCollide<KChartGraphNode<T>>()
                        .radius((node) => resolveNodeRadius(node) + (configuration.collisionPadding ?? 8)))
                    .stop();
                simulation.randomSource(() => 0.5);
                const iterations = Math.max(1, Math.floor(configuration.iterations ?? 220));
                for (let index = 0; index < iterations; index += 1) {
                    simulation.tick();
                }
            }

            nodes.forEach((node) => {
                const radius = resolveNodeRadius(node);
                node.x = Math.max(radius + 8, Math.min(width - radius - 8, node.x));
                node.y = Math.max(radius + 8, Math.min(height - radius - 8, node.y));
            });

            const markerPrefix = `kchart-graph-${safeSvgId(configuration.selector)}-${instanceId}`;
            const symbols = configuration.edgeSymbols ?? (configuration.directed ? 'none-arrow' : 'none-none');
            const showStartCircle = symbols === 'circle-circle' || symbols === 'circle-arrow';
            const showEndCircle = symbols === 'circle-circle';
            const showEndArrow = symbols === 'none-arrow' || symbols === 'circle-arrow';
            const defs = group.selectAll<SVGDefsElement, unknown>('defs.kchart-graph-defs')
                .data([undefined])
                .join('defs')
                .attr('class', 'kchart-graph-defs');

            defs.selectAll<SVGMarkerElement, unknown>(`marker#${markerPrefix}-arrow`)
                .data(showEndArrow ? [undefined] : [])
                .join('marker')
                .attr('id', `${markerPrefix}-arrow`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 8)
                .attr('refY', 0)
                .attr('markerWidth', 7)
                .attr('markerHeight', 7)
                .attr('orient', 'auto')
                .attr('markerUnits', 'userSpaceOnUse')
                .selectAll<SVGPathElement, unknown>('path')
                .data([undefined])
                .join('path')
                .attr('d', 'M0,-5L10,0L0,5Z')
                .style('fill', edgeColor);

            defs.selectAll<SVGMarkerElement, unknown>(`marker#${markerPrefix}-circle`)
                .data(showStartCircle || showEndCircle ? [undefined] : [])
                .join('marker')
                .attr('id', `${markerPrefix}-circle`)
                .attr('viewBox', '-5 -5 10 10')
                .attr('refX', 0)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .attr('markerUnits', 'userSpaceOnUse')
                .selectAll<SVGCircleElement, unknown>('circle')
                .data([undefined])
                .join('circle')
                .attr('r', 3)
                .style('fill', edgeColor);

            group.selectAll<SVGRectElement, unknown>('rect.kchart-graph-interaction')
                .data([undefined])
                .join('rect')
                .attr('class', 'kchart-graph-interaction')
                .attr('width', width)
                .attr('height', height)
                .style('fill', 'transparent')
                .style('pointer-events', 'all')
                .style('cursor', (configuration.roam ?? 'both') === 'disabled' ? 'default' : 'grab')
                .lower();

            const viewport = group.selectAll<SVGGElement, unknown>('g.kchart-graph-viewport')
                .data([undefined])
                .join('g')
                .attr('class', 'kchart-graph-viewport')
                .attr('transform', graphTransform.toString());
            const edgeLayer = viewport.selectAll<SVGGElement, unknown>('g.kchart-graph-edges')
                .data([undefined])
                .join('g')
                .attr('class', 'kchart-graph-edges');
            const nodeLayer = viewport.selectAll<SVGGElement, unknown>('g.kchart-graph-nodes')
                .data([undefined])
                .join('g')
                .attr('class', 'kchart-graph-nodes');

            const isConnected = (nodeId: string, activeIds: Set<string>): boolean => {
                if (activeIds.has(nodeId)) return true;
                return edges.some((edge) => (
                    activeIds.has(edge.source.id) && edge.target.id === nodeId
                ) || (
                    activeIds.has(edge.target.id) && edge.source.id === nodeId
                ));
            };
            const applyInteractionStyle = (): void => {
                const focusIds = hoveredId ? new Set([hoveredId]) : selectedIds;
                const hasFocus = focusIds.size > 0;
                edgeLayer.selectAll<SVGPathElement, KChartGraphEdge<T>>('path.kchart-graph-edge')
                    .style('opacity', (edge) => {
                        if (!hasFocus) return configuration.edgeOpacity ?? 0.72;
                        return focusIds.has(edge.source.id) || focusIds.has(edge.target.id)
                            ? 1
                            : configuration.dimOpacity ?? 0.12;
                    })
                    .style('stroke', (edge) => hasFocus && (focusIds.has(edge.source.id) || focusIds.has(edge.target.id))
                        ? '#eaf7ff'
                        : edgeColor);
                nodeLayer.selectAll<SVGGElement, KChartGraphNode<T>>('g.kchart-graph-node')
                    .style('opacity', (node) => !hasFocus || isConnected(node.id, focusIds)
                        ? 1
                        : configuration.dimOpacity ?? 0.12);
                nodeLayer.selectAll<SVGCircleElement, KChartGraphNode<T>>('circle.kchart-graph-node-circle')
                    .style('stroke', (node) => focusIds.has(node.id) ? '#ffffff' : nodeStroke)
                    .style('stroke-width', (node) => focusIds.has(node.id)
                        ? Math.max(3, configuration.nodeStrokeWidth ?? 1.5)
                        : configuration.nodeStrokeWidth ?? 1.5);
            };

            edgeLayer.selectAll<SVGPathElement, KChartGraphEdge<T>>('path.kchart-graph-edge')
                .data(edges, (edge) => edge.id)
                .join('path')
                .attr('class', 'kchart-graph-edge')
                .attr('d', (edge) => resolveEdgePath(edge, resolveNodeRadius))
                .attr('marker-start', showStartCircle ? `url(#${markerPrefix}-circle)` : null)
                .attr('marker-end', showEndArrow
                    ? `url(#${markerPrefix}-arrow)`
                    : showEndCircle
                        ? `url(#${markerPrefix}-circle)`
                        : null)
                .style('fill', 'none')
                .style('stroke', edgeColor)
                .style('stroke-width', (edge) => resolveEdgeWidth(edge))
                .style('opacity', (configuration.edgeOpacity ?? 0.72) * (animation.enabled ? animation.progress : 1))
                .each(function appendEdgeTitle(edge) {
                    let title = this.querySelector<SVGTitleElement>('title');
                    if (!title) {
                        title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                        this.appendChild(title);
                    }
                    title.textContent = `${edge.source.label} → ${edge.target.label}: ${edge.value}`;
                });

            const nodeGroups = nodeLayer.selectAll<SVGGElement, KChartGraphNode<T>>('g.kchart-graph-node')
                .data(nodes, (node) => node.id)
                .join('g')
                .attr('class', 'kchart-graph-node')
                .attr('transform', (node) => `translate(${node.x}, ${node.y})`)
                .style('cursor', (configuration.selectMode ?? 'single') === 'disabled' && !configuration.onNodeClick ? 'default' : 'pointer')
                .on('mouseenter', (_event, node) => {
                    hoveredId = node.id;
                    applyInteractionStyle();
                })
                .on('mouseleave', () => {
                    hoveredId = undefined;
                    applyInteractionStyle();
                })
                .on('click', (event: MouseEvent, node) => {
                    event.stopPropagation();
                    const selectMode = configuration.selectMode ?? 'single';
                    if (selectMode === 'disabled') {
                        configuration.onNodeClick?.({
                            node,
                            selected: false,
                            selectedIds: Array.from(selectedIds),
                            event
                        });
                        return;
                    }
                    if (selectMode === 'single') {
                        const wasSelected = selectedIds.has(node.id);
                        selectedIds.clear();
                        if (!wasSelected) selectedIds.add(node.id);
                    } else if (selectedIds.has(node.id)) {
                        selectedIds.delete(node.id);
                    } else {
                        selectedIds.add(node.id);
                    }
                    applyInteractionStyle();
                    configuration.onNodeClick?.({
                        node,
                        selected: selectedIds.has(node.id),
                        selectedIds: Array.from(selectedIds),
                        event
                    });
                });

            nodeGroups.selectAll<SVGCircleElement, KChartGraphNode<T>>('circle.kchart-graph-node-circle')
                .data((node) => [node])
                .join('circle')
                .attr('class', 'kchart-graph-node-circle')
                .attr('r', (node) => resolveNodeRadius(node) * (animation.enabled ? animation.progress : 1))
                .style('fill', (node) => {
                    if (!node.category) return configuration.color ?? color;
                    const categoryIndex = categories.get(node.category) ?? 0;
                    return palette[categoryIndex % palette.length];
                })
                .style('fill-opacity', configuration.nodeOpacity ?? 0.92)
                .style('stroke', nodeStroke)
                .style('stroke-width', configuration.nodeStrokeWidth ?? 1.5);

            nodeGroups.selectAll('title')
                .data((node) => [node])
                .join('title')
                .text((node) => `${node.label}: ${node.value}`);

            const labelConfiguration = typeof configuration.labels === 'boolean'
                ? {visible: configuration.labels}
                : configuration.labels ?? {visible: true};
            nodeGroups.selectAll<SVGTextElement, KChartGraphNode<T>>('text.kchart-graph-node-label')
                .data((node) => labelConfiguration.visible !== false && node.value >= (configuration.labelThreshold ?? 0)
                    ? [node]
                    : [])
                .join('text')
                .attr('class', 'kchart-graph-node-label')
                .attr('y', (node) => resolveNodeRadius(node) + 15)
                .attr('text-anchor', 'middle')
                .style('fill', labelConfiguration.color ?? '#edf3f8')
                .style('font-size', `${labelConfiguration.fontSize ?? 11}px`)
                .style('font-weight', labelConfiguration.fontWeight ?? 700)
                .style('pointer-events', 'none')
                .text((node) => labelConfiguration.formatter?.(node) ?? node.label);

            applyInteractionStyle();

            const roam = configuration.roam ?? 'both';
            const canMove = roam === 'move' || roam === 'both';
            const canScale = roam === 'scale' || roam === 'both';
            if (roam === 'disabled') {
                group.on('.zoom', null);
                return;
            }
            const zoomBehavior = zoom<SVGGElement, unknown>()
                .scaleExtent(configuration.scaleExtent ?? [0.45, 5])
                .filter((event: any) => {
                    if (event.type === 'wheel') return canScale;
                    if (event.type === 'mousedown' || event.type === 'touchstart' || event.type === 'touchmove') {
                        return canMove;
                    }
                    return true;
                })
                .on('zoom', (event) => {
                    graphTransform = event.transform;
                    viewport.attr('transform', graphTransform.toString());
                });
            group.call(zoomBehavior as any);
            const groupNode = group.node();
            if (groupNode) {
                (groupNode as any).__zoom = graphTransform;
            }
        },
        tooltip({mouseX, mouseY}) {
            let activeNode: KChartGraphNode<T> | undefined;
            let activeDistance = Number.POSITIVE_INFINITY;
            resolvedGraph.nodes.forEach((node) => {
                const x = graphTransform.applyX(node.x);
                const y = graphTransform.applyY(node.y);
                const distance = Math.hypot(mouseX - x, mouseY - y);
                if (distance <= resolveNodeRadius(node) * graphTransform.k + 8 && distance < activeDistance) {
                    activeNode = node;
                    activeDistance = distance;
                }
            });
            if (activeNode && activeNode.rows[0]) {
                return {
                    data: activeNode.rows[0],
                    x: graphTransform.applyX(activeNode.x),
                    y: graphTransform.applyY(activeNode.y),
                    distance: activeDistance,
                    color: configuration.color,
                    html: `<strong>${activeNode.label}</strong><br/>Connected metric: ${activeNode.value}${activeNode.category ? `<br/>Category: ${activeNode.category}` : ''}`
                };
            }

            let activeEdge: KChartGraphEdge<T> | undefined;
            let edgeDistance = Number.POSITIVE_INFINITY;
            resolvedGraph.edges.forEach((edge) => {
                const distance = distanceToSegment(
                    mouseX,
                    mouseY,
                    graphTransform.applyX(edge.source.x),
                    graphTransform.applyY(edge.source.y),
                    graphTransform.applyX(edge.target.x),
                    graphTransform.applyY(edge.target.y)
                );
                if (distance <= Math.max(7, resolveEdgeWidth(edge) * graphTransform.k + 4) && distance < edgeDistance) {
                    activeEdge = edge;
                    edgeDistance = distance;
                }
            });
            if (!activeEdge || !activeEdge.rows[0]) return undefined;
            return {
                data: activeEdge.rows[0],
                x: graphTransform.applyX((activeEdge.source.x + activeEdge.target.x) / 2),
                y: graphTransform.applyY((activeEdge.source.y + activeEdge.target.y) / 2),
                distance: edgeDistance,
                color: configuration.edgeColor,
                html: `<strong>${activeEdge.source.label} → ${activeEdge.target.label}</strong><br/>Metric: ${activeEdge.value}`
            };
        },
        clearTooltip({seriesGroup}: KChartLayerContext) {
            seriesGroup.selectAll(`g.${configuration.selector} path.kchart-graph-edge`)
                .style('stroke', configuration.edgeColor ?? 'rgba(158, 181, 199, 0.58)');
        },
        destroy({seriesGroup}: KChartLayerContext) {
            seriesGroup.selectAll(`g.${configuration.selector}`).on('.zoom', null);
            resolvedGraph = {nodes: [], edges: []};
            lastData = undefined;
            lastDataSignature = -1;
            lastWidth = -1;
            lastHeight = -1;
            selectedIds.clear();
            hoveredId = undefined;
            graphTransform = zoomIdentity;
        }
    });

    return series;
};
