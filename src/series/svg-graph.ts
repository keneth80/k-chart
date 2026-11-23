import {
    forceCenter,
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation,
    forceX,
    forceY
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

export interface KChartGraphLayoutResult {
    positions: Array<{x: number; y: number}>;
    radiusScale: number;
}

export interface KChartGraphForceLayoutOptions<T = any> {
    width: number;
    height: number;
    radius: (node: KChartGraphNode<T>, index: number) => number;
    linkDistance: number;
    chargeStrength?: number;
    gravity?: number;
    collisionPadding?: number;
    iterations?: number;
}

export interface KChartGraphLayeredLayoutOptions<T = any> {
    width: number;
    height: number;
    radius: (node: KChartGraphNode<T>, index: number) => number;
    ranks: number[];
    collisionPadding?: number;
    rankGap?: number;
    labelWidth?: (node: KChartGraphNode<T>, index: number) => number;
    labelHeight?: (node: KChartGraphNode<T>, index: number) => number;
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

const estimateGraphLabelWidth = (value: string, fontSize: number): number => Array.from(value)
    .reduce((width, character) => {
        if (/\s/.test(character)) return width + fontSize * 0.35;
        return width + fontSize * (character.codePointAt(0)! > 0xff ? 1 : 0.62);
    }, fontSize * 0.4);

const hashGraphValue = (seed: number, value: unknown): number => {
    const text = String(value ?? '');
    // Include a length prefix so adjacent fields cannot collapse into the
    // same byte stream (for example A + BC versus AB + C).
    let hash = Math.imul(seed ^ text.length, 16777619);
    for (let index = 0; index < text.length; index += 1) {
        hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    }
    return Math.imul(hash ^ 0xff, 16777619);
};

const resolveGraphDataSignature = <T = any>(
    data: T[],
    configuration: GraphFieldConfiguration<T>
): number => {
    let hash = Math.imul(2166136261, data.length + 1);
    hash = hashGraphValue(hash, configuration.sourceField);
    hash = hashGraphValue(hash, configuration.targetField);
    hash = hashGraphValue(hash, configuration.valueField);
    hash = hashGraphValue(hash, configuration.categoryField);
    hash = hashGraphValue(hash, configuration.categorySide);
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

const resolveNodeRanks = <T = any>(
    nodes: Array<KChartGraphNode<T>>,
    edges: Array<KChartGraphEdge<T>>,
    configuredRank: KChartGraphSeriesConfiguration<T>['nodeRank']
): number[] => {
    if (configuredRank !== undefined) {
        return nodes.map((node, index) => {
            const rank = typeof configuredRank === 'function'
                ? configuredRank(node, index)
                : configuredRank;
            return Number.isFinite(rank) ? rank : 0;
        });
    }

    const nodeIndexes = new Map(nodes.map((node, index) => [node, index]));
    const outgoing = nodes.map(() => [] as number[]);
    edges.forEach((edge) => {
        const sourceIndex = nodeIndexes.get(edge.source);
        const targetIndex = nodeIndexes.get(edge.target);
        if (sourceIndex === undefined || targetIndex === undefined || sourceIndex === targetIndex) return;
        outgoing[sourceIndex].push(targetIndex);
    });

    // Collapse strongly-connected components first. Iterative Kosaraju avoids
    // overflowing the call stack on large production dependency graphs.
    const reverseOutgoing = nodes.map(() => [] as number[]);
    outgoing.forEach((targets, sourceIndex) => {
        targets.forEach((targetIndex) => reverseOutgoing[targetIndex].push(sourceIndex));
    });
    const visited = nodes.map(() => false);
    const finishOrder: number[] = [];
    nodes.forEach((_node, startIndex) => {
        if (visited[startIndex]) return;
        const walk = [{nodeIndex: startIndex, nextTarget: 0}];
        visited[startIndex] = true;
        while (walk.length) {
            const frame = walk[walk.length - 1];
            const targets = outgoing[frame.nodeIndex];
            if (frame.nextTarget < targets.length) {
                const targetIndex = targets[frame.nextTarget];
                frame.nextTarget += 1;
                if (!visited[targetIndex]) {
                    visited[targetIndex] = true;
                    walk.push({nodeIndex: targetIndex, nextTarget: 0});
                }
                continue;
            }
            finishOrder.push(frame.nodeIndex);
            walk.pop();
        }
    });
    const componentByNode = nodes.map(() => -1);
    let componentCount = 0;
    for (let orderIndex = finishOrder.length - 1; orderIndex >= 0; orderIndex -= 1) {
        const startIndex = finishOrder[orderIndex];
        if (componentByNode[startIndex] !== -1) continue;
        const members = [startIndex];
        componentByNode[startIndex] = componentCount;
        while (members.length) {
            const nodeIndex = members.pop() as number;
            reverseOutgoing[nodeIndex].forEach((sourceIndex) => {
                if (componentByNode[sourceIndex] !== -1) return;
                componentByNode[sourceIndex] = componentCount;
                members.push(sourceIndex);
            });
        }
        componentCount += 1;
    }

    const componentOutgoing = Array.from({length: componentCount}, () => new Set<number>());
    const componentIndegree = Array.from({length: componentCount}, () => 0);
    outgoing.forEach((targets, sourceIndex) => {
        targets.forEach((targetIndex) => {
            const sourceComponent = componentByNode[sourceIndex];
            const targetComponent = componentByNode[targetIndex];
            if (sourceComponent === targetComponent || componentOutgoing[sourceComponent].has(targetComponent)) return;
            componentOutgoing[sourceComponent].add(targetComponent);
            componentIndegree[targetComponent] += 1;
        });
    });
    const componentRanks = Array.from({length: componentCount}, () => 0);
    const queue = componentIndegree.reduce<number[]>((result, degree, index) => {
        if (degree === 0) result.push(index);
        return result;
    }, []);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const sourceComponent = queue[cursor];
        componentOutgoing[sourceComponent].forEach((targetComponent) => {
            componentRanks[targetComponent] = Math.max(
                componentRanks[targetComponent],
                componentRanks[sourceComponent] + 1
            );
            componentIndegree[targetComponent] -= 1;
            if (componentIndegree[targetComponent] === 0) queue.push(targetComponent);
        });
    }
    return componentByNode.map((component) => componentRanks[component] ?? 0);
};

const resolveLayoutSignature = <T = any>(
    configuration: KChartGraphSeriesConfiguration<T>,
    ranks: number[]
): number => {
    let hash = 2166136261;
    [
        configuration.layout ?? 'force',
        configuration.nodeMinRadius ?? 9,
        configuration.nodeMaxRadius ?? 28,
        configuration.chargeStrength ?? -360,
        configuration.gravity ?? 0,
        configuration.linkDistance ?? 'auto',
        configuration.collisionPadding ?? 8,
        configuration.iterations ?? 220
    ].forEach((value) => {
        hash = hashGraphValue(hash, value);
    });
    ranks.forEach((rank) => {
        hash = hashGraphValue(hash, rank);
    });
    return hash >>> 0;
};

const clampNodeCoordinate = (value: number, size: number, radius: number, padding: number): number => {
    const minimum = radius + padding;
    const maximum = size - radius - padding;
    return minimum <= maximum
        ? Math.max(minimum, Math.min(maximum, value))
        : size / 2;
};

export const applyForceLayout = <T = any>(
    nodes: Array<KChartGraphNode<T>>,
    edges: Array<KChartGraphEdge<T>>,
    options: KChartGraphForceLayoutOptions<T>
): KChartGraphLayoutResult => {
    const width = Math.max(1, options.width);
    const height = Math.max(1, options.height);
    const radii = nodes.map((node, index) => Math.max(0, options.radius(node, index)));
    const initialRadius = Math.max(24, Math.min(width, height) * 0.3);
    const simulationNodes = nodes.map((node, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length) - Math.PI / 2;
        return {
            ...node,
            x: width / 2 + Math.cos(angle) * initialRadius,
            y: height / 2 + Math.sin(angle) * initialRadius
        };
    });
    const cloneByNode = new Map(nodes.map((node, index) => [node, simulationNodes[index]]));
    const simulationEdges = edges.map((edge) => ({
        ...edge,
        source: cloneByNode.get(edge.source) as KChartGraphNode<T>,
        target: cloneByNode.get(edge.target) as KChartGraphNode<T>
    }));
    if (simulationNodes.length > 1) {
        const cloneIndexes = new Map(simulationNodes.map((node, index) => [node, index]));
        const simulation = forceSimulation(simulationNodes)
            .force('link', forceLink<KChartGraphNode<T>, KChartGraphEdge<T>>(simulationEdges)
                .distance(options.linkDistance)
                .strength(0.58))
            .force('charge', forceManyBody().strength(options.chargeStrength ?? -360))
            .force('center', forceCenter(width / 2, height / 2))
            .force('collision', forceCollide<KChartGraphNode<T>>()
                .radius((node) => radii[cloneIndexes.get(node) ?? 0] + (options.collisionPadding ?? 8)))
            .stop();
        const gravity = Math.max(0, options.gravity ?? 0);
        if (gravity > 0) {
            simulation
                .force('x', forceX(width / 2).strength(gravity))
                .force('y', forceY(height / 2).strength(gravity));
        }
        simulation.randomSource(() => 0.5);
        const iterations = Math.max(1, Math.floor(options.iterations ?? 220));
        for (let index = 0; index < iterations; index += 1) simulation.tick();
    }
    return {
        positions: simulationNodes.map((node, index) => ({
            x: clampNodeCoordinate(node.x, width, radii[index], 8),
            y: clampNodeCoordinate(node.y, height, radii[index], 8)
        })),
        radiusScale: 1
    };
};

const orderLayerIndexes = <T = any>(
    nodes: Array<KChartGraphNode<T>>,
    edges: Array<KChartGraphEdge<T>>,
    ranks: number[]
): number[][] => {
    const nodeIndexes = new Map(nodes.map((node, index) => [node, index]));
    const neighbors = nodes.map(() => [] as number[]);
    edges.forEach((edge) => {
        const sourceIndex = nodeIndexes.get(edge.source);
        const targetIndex = nodeIndexes.get(edge.target);
        if (sourceIndex === undefined || targetIndex === undefined || sourceIndex === targetIndex) return;
        neighbors[sourceIndex].push(targetIndex);
        neighbors[targetIndex].push(sourceIndex);
    });
    const layersByRank = new Map<number, number[]>();
    nodes.forEach((node, index) => {
        const rank = ranks[index] ?? 0;
        const layer = layersByRank.get(rank) ?? [];
        layer.push(index);
        layersByRank.set(rank, layer);
    });
    const orderedLayers = Array.from(layersByRank.entries())
        .sort(([left], [right]) => left - right)
        .map(([, layer]) => layer);
    const sweep = (start: number, end: number, step: number, towardEarlierRanks: boolean): void => {
        const positions = new Map<number, number>();
        orderedLayers.forEach((layer) => layer.forEach((nodeIndex, index) => positions.set(nodeIndex, index)));
        for (let layerIndex = start; layerIndex !== end; layerIndex += step) {
            const layer = orderedLayers[layerIndex];
            const priorPositions = new Map(layer.map((nodeIndex, index) => [nodeIndex, index]));
            layer.sort((left, right) => {
                const barycenter = (nodeIndex: number): number => {
                    const relevant = neighbors[nodeIndex].filter((neighborIndex) => towardEarlierRanks
                        ? (ranks[neighborIndex] ?? 0) < (ranks[nodeIndex] ?? 0)
                        : (ranks[neighborIndex] ?? 0) > (ranks[nodeIndex] ?? 0));
                    if (!relevant.length) return priorPositions.get(nodeIndex) ?? 0;
                    return relevant.reduce((sum, neighborIndex) => sum + (positions.get(neighborIndex) ?? 0), 0)
                        / relevant.length;
                };
                return barycenter(left) - barycenter(right)
                    || (priorPositions.get(left) ?? 0) - (priorPositions.get(right) ?? 0);
            });
            layer.forEach((nodeIndex, index) => positions.set(nodeIndex, index));
        }
    };
    for (let iteration = 0; iteration < 2; iteration += 1) {
        sweep(1, orderedLayers.length, 1, true);
        sweep(orderedLayers.length - 2, -1, -1, false);
    }
    return orderedLayers;
};

interface PackedLayerLine {
    indexes: number[];
    width: number;
    height: number;
    radius: number;
    bottomDepth: number;
}

interface PackedLayer {
    lines: PackedLayerLine[];
    height: number;
}

export const applyLayeredLayout = <T = any>(
    nodes: Array<KChartGraphNode<T>>,
    edges: Array<KChartGraphEdge<T>>,
    options: KChartGraphLayeredLayoutOptions<T>
): KChartGraphLayoutResult => {
    if (!nodes.length) return {positions: [], radiusScale: 1};
    const width = Math.max(1, options.width);
    const height = Math.max(1, options.height);
    const baseRadii = nodes.map((node, index) => Math.max(0, options.radius(node, index)));
    const footprintWidths = nodes.map((node, index) => Math.max(
        baseRadii[index] * 2,
        Math.max(0, options.labelWidth?.(node, index) ?? 0)
    ));
    const footprintHeights = nodes.map((node, index) => (
        baseRadii[index] * 2 + Math.max(0, options.labelHeight?.(node, index) ?? 0)
    ));
    const orderedLayers = orderLayerIndexes(nodes, edges, options.ranks);
    const collisionGap = Math.max(0, options.collisionPadding ?? 8) * 2;
    const rankGap = Math.max(0, options.rankGap ?? 72);
    const outerPadding = 8;
    const availableWidth = Math.max(0, width - outerPadding * 2);
    const layers = orderedLayers.map((layer) => {
        const lines: PackedLayerLine[] = [];
        layer.forEach((nodeIndex) => {
            const itemWidth = footprintWidths[nodeIndex];
            let line = lines[lines.length - 1];
            if (!line || line.width + collisionGap + itemWidth > availableWidth + Number.EPSILON) {
                line = {indexes: [], width: 0, height: 0, radius: 0, bottomDepth: 0};
                lines.push(line);
            }
            if (line.indexes.length) line.width += collisionGap;
            line.indexes.push(nodeIndex);
            line.width += itemWidth;
            line.radius = Math.max(line.radius, baseRadii[nodeIndex]);
            line.bottomDepth = Math.max(
                line.bottomDepth,
                footprintHeights[nodeIndex] - baseRadii[nodeIndex]
            );
            line.height = line.radius + line.bottomDepth;
        });
        return {
            lines,
            height: lines.reduce((sum, line) => sum + line.height, 0)
                + collisionGap * Math.max(0, lines.length - 1)
        };
    });
    const packedHeight = outerPadding * 2
        + layers.reduce((sum, layer) => sum + layer.height, 0)
        + rankGap * Math.max(0, layers.length - 1);
    const packedWidth = outerPadding * 2 + Math.max(
        0,
        ...layers.flatMap((layer) => layer.lines.map((line) => line.width))
    );
    const scale = Math.max(0, Math.min(1, width / packedWidth, height / packedHeight));
    const scaledHeight = packedHeight * scale;
    const positions = nodes.map(() => ({x: width / 2, y: height / 2}));
    const itemGap = collisionGap * scale;
    let yCursor = (height - scaledHeight) / 2 + outerPadding * scale;
    layers.forEach((layer, layerIndex) => {
        layer.lines.forEach((line, lineIndex) => {
            let xCursor = (width - line.width * scale) / 2;
            line.indexes.forEach((nodeIndex) => {
                const radius = baseRadii[nodeIndex] * scale;
                const itemWidth = footprintWidths[nodeIndex] * scale;
                positions[nodeIndex] = {x: xCursor + itemWidth / 2, y: yCursor + line.radius * scale};
                xCursor += itemWidth + itemGap;
            });
            yCursor += line.height * scale;
            if (lineIndex < layer.lines.length - 1) yCursor += itemGap;
        });
        if (layerIndex < layers.length - 1) yCursor += rankGap * scale;
    });
    return {positions, radiusScale: scale};
};

const applyCircularLayout = <T = any>(
    nodes: Array<KChartGraphNode<T>>,
    width: number,
    height: number,
    radius: (node: KChartGraphNode<T>) => number
): KChartGraphLayoutResult => {
    const initialRadius = Math.max(24, Math.min(width, height) * 0.3);
    return {
        positions: nodes.map((node, index) => {
            const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length) - Math.PI / 2;
            const nodeRadius = Math.max(0, radius(node));
            return {
                x: clampNodeCoordinate(width / 2 + Math.cos(angle) * initialRadius, width, nodeRadius, 8),
                y: clampNodeCoordinate(height / 2 + Math.sin(angle) * initialRadius, height, nodeRadius, 8)
            };
        }),
        radiusScale: 1
    };
};

export const createGraphSeries = <T = any>(
    configuration: KChartGraphSeriesConfiguration<T>
): KChartSeries<T> => {
    const instanceId = ++graphSeriesInstanceSequence;
    let resolvedGraph: KChartResolvedGraph<T> = {nodes: [], edges: []};
    let graphTransform: ZoomTransform = zoomIdentity;
    let lastData: T[] | undefined;
    let lastRows: T[] = [];
    let lastDataSignature = -1;
    let lastLayoutSignature = -1;
    let lastWidth = -1;
    let lastHeight = -1;
    let layeredNodeScale = 1;
    let nodeIndexById = new Map<string, number>();
    let edgeIndexById = new Map<string, number>();
    const selectedIds = new Set<string>();
    let hoveredId: string | undefined;
    let resolveNodeRadius: (node: KChartGraphNode<T>) => number = () => configuration.nodeMinRadius ?? 8;
    let resolveEdgeWidth: (edge: KChartGraphEdge<T>) => number = () => configuration.edgeMinWidth ?? 1;
    let resolveNodeColor: (node: KChartGraphNode<T>, index: number) => string = () => configuration.color ?? defaultGraphPalette[0];
    let resolveEdgeColor: (edge: KChartGraphEdge<T>, index: number) => string = () => (
        typeof configuration.edgeColor === 'string'
            ? configuration.edgeColor
            : 'rgba(158, 181, 199, 0.58)'
    );
    let resolveEdgeDash: (edge: KChartGraphEdge<T>, index: number) => string | null | undefined = () => (
        typeof configuration.edgeDash === 'string' ? configuration.edgeDash : undefined
    );
    let reapplyInteractionStyle: () => void = () => undefined;

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
            const rowsChanged = data !== lastData
                || data.length !== lastRows.length
                || data.some((row, index) => row !== lastRows[index]);
            const graphChanged = rowsChanged || dataSignature !== lastDataSignature;
            if (graphChanged) {
                resolvedGraph = resolveGraphData(data, configuration);
                lastData = data;
                lastRows = data.slice();
                lastDataSignature = dataSignature;
                selectedIds.forEach((id) => {
                    if (!resolvedGraph.nodes.some((node) => node.id === id)) selectedIds.delete(id);
                });
            }
            const nodes = resolvedGraph.nodes;
            const edges = resolvedGraph.edges;
            nodeIndexById = new Map(nodes.map((node, index) => [node.id, index]));
            edgeIndexById = new Map(edges.map((edge, index) => [edge.id, index]));
            const layout = configuration.layout ?? 'force';
            const nodeMinRadius = Math.max(0, configuration.nodeMinRadius ?? 9);
            const nodeMaxRadius = Math.max(nodeMinRadius, configuration.nodeMaxRadius ?? 28);
            const edgeMinWidth = configuration.edgeMinWidth ?? 1;
            const edgeMaxWidth = Math.max(edgeMinWidth, configuration.edgeMaxWidth ?? 7);
            const defaultEdgeColor = 'rgba(158, 181, 199, 0.58)';
            const edgeBaseColor = configuration.edgeColor ?? defaultEdgeColor;
            const markerColor = typeof edgeBaseColor === 'string' ? edgeBaseColor : defaultEdgeColor;
            const nodeStroke = configuration.nodeStroke ?? 'rgba(246, 250, 255, 0.92)';
            const palette = configuration.palette?.length ? configuration.palette : defaultGraphPalette;
            const categories = new Map<string, number>();
            const nodeRadiusScale = createLinearResolver(nodes.map((node) => node.value), nodeMinRadius, nodeMaxRadius, true);
            const baseNodeRadius = (node: KChartGraphNode<T>): number => nodeRadiusScale(node.value);
            const edgeWidthScale = createLinearResolver(edges.map((edge) => edge.value), edgeMinWidth, edgeMaxWidth);
            resolveEdgeWidth = (edge) => edgeWidthScale(edge.value);
            nodes.forEach((node) => {
                if (node.category && !categories.has(node.category)) {
                    categories.set(node.category, categories.size);
                }
            });
            resolveNodeColor = (node, index) => {
                if (typeof configuration.nodeColor === 'function') return configuration.nodeColor(node, index);
                if (configuration.nodeColor) return configuration.nodeColor;
                if (node.category) return palette[(categories.get(node.category) ?? 0) % palette.length];
                return configuration.color ?? color;
            };
            resolveEdgeColor = (edge, index) => (
                typeof edgeBaseColor === 'function' ? edgeBaseColor(edge, index) : edgeBaseColor
            );
            resolveEdgeDash = (edge, index) => (
                typeof configuration.edgeDash === 'function'
                    ? configuration.edgeDash(edge, index)
                    : configuration.edgeDash
            );

            const labelConfiguration = typeof configuration.labels === 'boolean'
                ? {visible: configuration.labels}
                : configuration.labels ?? {visible: true};
            const labelFontSize = labelConfiguration.fontSize ?? 11;
            const nodeLabelVisible = nodes.map((node) => (
                labelConfiguration.visible !== false
                && node.value >= (configuration.labelThreshold ?? 0)
            ));
            const nodeLabelText = nodes.map((node) => (
                labelConfiguration.formatter?.(node) ?? node.label
            ));

            const nodeRanks = layout === 'layered'
                ? resolveNodeRanks(nodes, edges, configuration.nodeRank)
                : [];
            const layoutSignature = resolveLayoutSignature(configuration, nodeRanks);
            const layoutChanged = graphChanged
                || layoutSignature !== lastLayoutSignature
                || width !== lastWidth
                || height !== lastHeight;
            const linkDistance = configuration.linkDistance ?? Math.max(72, Math.min(width, height) / 4);
            if (layoutChanged) {
                let layoutResult: KChartGraphLayoutResult;
                if (layout === 'layered') {
                    layoutResult = applyLayeredLayout(
                        nodes,
                        edges,
                        {
                            width,
                            height,
                            radius: baseNodeRadius,
                            ranks: nodeRanks,
                            collisionPadding: configuration.collisionPadding,
                            rankGap: linkDistance,
                            labelWidth: (_node, index) => nodeLabelVisible[index]
                                ? estimateGraphLabelWidth(nodeLabelText[index], labelFontSize)
                                : 0,
                            labelHeight: (_node, index) => nodeLabelVisible[index]
                                ? 15 + labelFontSize * 0.3
                                : 0
                        }
                    );
                } else if (layout === 'force') {
                    layoutResult = applyForceLayout(nodes, edges, {
                        width,
                        height,
                        radius: baseNodeRadius,
                        linkDistance,
                        chargeStrength: configuration.chargeStrength,
                        gravity: configuration.gravity,
                        collisionPadding: configuration.collisionPadding,
                        iterations: configuration.iterations
                    });
                } else {
                    layoutResult = applyCircularLayout(nodes, width, height, baseNodeRadius);
                }
                layeredNodeScale = layoutResult.radiusScale;
                layoutResult.positions.forEach((position, index) => {
                    nodes[index].x = position.x;
                    nodes[index].y = position.y;
                });
                resolveNodeRadius = (node) => nodeRadiusScale(node.value) * layeredNodeScale;
                lastLayoutSignature = layoutSignature;
                lastWidth = width;
                lastHeight = height;
            } else {
                resolveNodeRadius = (node) => nodeRadiusScale(node.value) * layeredNodeScale;
            }

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
                .style('fill', markerColor);

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
                .style('fill', markerColor);

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
                        : resolveEdgeColor(edge, edgeIndexById.get(edge.id) ?? 0));
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
            reapplyInteractionStyle = applyInteractionStyle;

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
                .style('stroke', (edge) => resolveEdgeColor(edge, edgeIndexById.get(edge.id) ?? 0))
                .style('stroke-dasharray', (edge) => resolveEdgeDash(edge, edgeIndexById.get(edge.id) ?? 0))
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
                .style('fill', (node) => resolveNodeColor(node, nodeIndexById.get(node.id) ?? 0))
                .style('fill-opacity', configuration.nodeOpacity ?? 0.92)
                .style('stroke', nodeStroke)
                .style('stroke-width', configuration.nodeStrokeWidth ?? 1.5);

            nodeGroups.selectAll('title')
                .data((node) => [node])
                .join('title')
                .text((node) => `${node.label}: ${node.value}`);

            nodeGroups.selectAll<SVGTextElement, KChartGraphNode<T>>('text.kchart-graph-node-label')
                .data((node) => nodeLabelVisible[nodeIndexById.get(node.id) ?? 0] ? [node] : [])
                .join('text')
                .attr('class', 'kchart-graph-node-label')
                .attr('y', (node) => resolveNodeRadius(node) + 15 * (layout === 'layered' ? layeredNodeScale : 1))
                .attr('text-anchor', 'middle')
                .style('fill', labelConfiguration.color ?? '#edf3f8')
                .style('font-size', `${labelFontSize * (layout === 'layered' ? layeredNodeScale : 1)}px`)
                .style('font-weight', labelConfiguration.fontWeight ?? 700)
                .style('pointer-events', 'none')
                .text((node) => nodeLabelText[nodeIndexById.get(node.id) ?? 0]);

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
            let activeNodeIndex = -1;
            let activeDistance = Number.POSITIVE_INFINITY;
            resolvedGraph.nodes.forEach((node, index) => {
                const x = graphTransform.applyX(node.x);
                const y = graphTransform.applyY(node.y);
                const distance = Math.hypot(mouseX - x, mouseY - y);
                if (distance <= resolveNodeRadius(node) * graphTransform.k + 8 && distance < activeDistance) {
                    activeNode = node;
                    activeNodeIndex = index;
                    activeDistance = distance;
                }
            });
            if (activeNode && activeNode.rows[0]) {
                return {
                    data: activeNode.rows[0],
                    x: graphTransform.applyX(activeNode.x),
                    y: graphTransform.applyY(activeNode.y),
                    distance: activeDistance,
                    color: resolveNodeColor(activeNode, activeNodeIndex),
                    html: `<strong>${activeNode.label}</strong><br/>Connected metric: ${activeNode.value}${activeNode.category ? `<br/>Category: ${activeNode.category}` : ''}`
                };
            }

            let activeEdge: KChartGraphEdge<T> | undefined;
            let activeEdgeIndex = -1;
            let edgeDistance = Number.POSITIVE_INFINITY;
            resolvedGraph.edges.forEach((edge, index) => {
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
                    activeEdgeIndex = index;
                    edgeDistance = distance;
                }
            });
            if (!activeEdge || !activeEdge.rows[0]) return undefined;
            return {
                data: activeEdge.rows[0],
                x: graphTransform.applyX((activeEdge.source.x + activeEdge.target.x) / 2),
                y: graphTransform.applyY((activeEdge.source.y + activeEdge.target.y) / 2),
                distance: edgeDistance,
                color: resolveEdgeColor(activeEdge, activeEdgeIndex),
                html: `<strong>${activeEdge.source.label} → ${activeEdge.target.label}</strong><br/>Metric: ${activeEdge.value}`
            };
        },
        clearTooltip({seriesGroup}: KChartLayerContext) {
            seriesGroup.selectAll(`g.${configuration.selector} path.kchart-graph-edge`)
                .style('stroke', (edge: KChartGraphEdge<T>) => resolveEdgeColor(edge, edgeIndexById.get(edge.id) ?? 0))
                .style('stroke-dasharray', (edge: KChartGraphEdge<T>) => (
                    resolveEdgeDash(edge, edgeIndexById.get(edge.id) ?? 0)
                ));
            reapplyInteractionStyle();
        },
        destroy({seriesGroup}: KChartLayerContext) {
            seriesGroup.selectAll(`g.${configuration.selector}`).on('.zoom', null);
            resolvedGraph = {nodes: [], edges: []};
            lastData = undefined;
            lastRows = [];
            lastDataSignature = -1;
            lastLayoutSignature = -1;
            lastWidth = -1;
            lastHeight = -1;
            layeredNodeScale = 1;
            nodeIndexById.clear();
            edgeIndexById.clear();
            reapplyInteractionStyle = () => undefined;
            selectedIds.clear();
            hoveredId = undefined;
            graphTransform = zoomIdentity;
        }
    });

    return series;
};
