import {stratify, tree} from 'd3-hierarchy';
import type {HierarchyPointNode} from 'd3-hierarchy';
import {zoom, zoomIdentity, ZoomTransform} from 'd3-zoom';
import type {
    KChartLayerContext,
    KChartSeries,
    KChartTreeEmphasis,
    KChartTreeLabelPosition,
    KChartTreeLink,
    KChartTreeNode,
    KChartTreeOrientation,
    KChartTreeSeriesConfiguration
} from '../core/contracts';
import {createCustomSeries} from './custom';

const defaultTreePalette = [
    '#5db8ff',
    '#56d08f',
    '#f3b45b',
    '#d876ff',
    '#ff6b8a',
    '#72e4ff',
    '#a8d95f',
    '#ff9f5a'
];

export interface KChartResolvedTree<T = any> {
    root: KChartTreeNode<T> | null;
    nodes: Array<KChartTreeNode<T>>;
    links: Array<KChartTreeLink<T>>;
}

type TreeFieldConfiguration<T> = Pick<
    KChartTreeSeriesConfiguration<T>,
    'idField' | 'parentField' | 'labelField' | 'valueField' | 'categoryField'
>;

interface TreeLayoutDatum<T> {
    node: KChartTreeNode<T>;
    id: string;
    parentId?: string;
}

const resolveMetric = (value: unknown): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeId = (value: unknown): string => String(value ?? '').trim();

const escapeTooltipHtml = (value: unknown): string => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const hashTreeValue = (seed: number, value: unknown): number => {
    const text = String(value ?? '');
    let hash = seed;
    for (let index = 0; index < text.length; index += 1) {
        hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    }
    return hash;
};

const resolveTreeDataSignature = <T = any>(
    data: T[],
    configuration: TreeFieldConfiguration<T>
): number => {
    let hash = Math.imul(2166136261, data.length + 1);
    data.forEach((row) => {
        hash = hashTreeValue(hash, row[configuration.idField]);
        hash = hashTreeValue(hash, row[configuration.parentField]);
        if (configuration.labelField) hash = hashTreeValue(hash, row[configuration.labelField]);
        if (configuration.valueField) hash = hashTreeValue(hash, row[configuration.valueField]);
        if (configuration.categoryField) hash = hashTreeValue(hash, row[configuration.categoryField]);
    });
    return hash >>> 0;
};

export const resolveTreeData = <T = any>(
    data: T[],
    configuration: TreeFieldConfiguration<T>
): KChartResolvedTree<T> => {
    if (data.length === 0) {
        return {root: null, nodes: [], links: []};
    }

    const nodes = new Map<string, KChartTreeNode<T>>();
    const parentIds = new Map<string, string | undefined>();
    data.forEach((row, index) => {
        const id = normalizeId(row[configuration.idField]);
        if (!id) {
            throw new Error(`KChart tree data requires a non-empty id at row ${index}.`);
        }
        if (nodes.has(id)) {
            throw new Error(`KChart tree data requires unique id values; duplicate id "${id}" found.`);
        }
        const parentId = normalizeId(row[configuration.parentField]) || undefined;
        const rawLabel = configuration.labelField ? row[configuration.labelField] : undefined;
        const rawCategory = configuration.categoryField ? row[configuration.categoryField] : undefined;
        nodes.set(id, {
            id,
            parentId,
            label: rawLabel === null || rawLabel === undefined || String(rawLabel).trim() === ''
                ? id
                : String(rawLabel),
            value: configuration.valueField ? resolveMetric(row[configuration.valueField]) : 0,
            category: rawCategory === null || rawCategory === undefined ? undefined : String(rawCategory),
            row,
            children: [],
            depth: 0,
            height: 0,
            x: 0,
            y: 0
        });
        parentIds.set(id, parentId);
    });

    const rootIds = Array.from(parentIds.entries())
        .filter(([, parentId]) => !parentId)
        .map(([id]) => id);
    if (rootIds.length !== 1) {
        throw new Error(`KChart tree data requires a single root node; found ${rootIds.length}.`);
    }

    parentIds.forEach((parentId, id) => {
        if (parentId && !nodes.has(parentId)) {
            throw new Error(`KChart tree data references missing parent "${parentId}" from node "${id}".`);
        }
    });

    // Validate parent chains iteratively so malformed or very deep business hierarchies
    // fail before D3 layout without risking a JavaScript call-stack overflow.
    const visited = new Set<string>();
    nodes.forEach((_node, startId) => {
        if (visited.has(startId)) return;
        const path: string[] = [];
        const pathIndexes = new Map<string, number>();
        let currentId: string | undefined = startId;
        while (currentId && !visited.has(currentId)) {
            const cycleStart = pathIndexes.get(currentId);
            if (cycleStart !== undefined) {
                const cycle = path.slice(cycleStart).concat(currentId);
                throw new Error(`KChart tree data must be acyclic; cycle detected in ${cycle.join(' -> ')}.`);
            }
            pathIndexes.set(currentId, path.length);
            path.push(currentId);
            currentId = parentIds.get(currentId);
        }
        path.forEach((id) => visited.add(id));
    });

    const layoutRows = Array.from(nodes.values()).map((node) => ({
        node,
        id: node.id,
        parentId: node.parentId
    }));
    const root = stratify<TreeLayoutDatum<T>>()
        .id((row) => row.id)
        .parentId((row) => row.parentId ?? null)(layoutRows);

    const links: Array<KChartTreeLink<T>> = [];
    root.each((hierarchyNode) => {
        const node = hierarchyNode.data.node;
        node.depth = hierarchyNode.depth;
        node.height = hierarchyNode.height;
        node.parent = hierarchyNode.parent?.data.node;
        node.children = (hierarchyNode.children ?? []).map((child) => child.data.node);
        if (node.parent) {
            links.push({
                id: `${node.parent.id}\u0000${node.id}`,
                source: node.parent,
                target: node,
                value: node.value,
                row: node.row
            });
        }
    });

    return {
        root: root.data.node,
        nodes: root.descendants().map((node) => node.data.node),
        links
    };
};

const resolveTreeLinkPath = <T = any>(
    link: KChartTreeLink<T>,
    layout: KChartTreeSeriesConfiguration<T>['layout'],
    orientation: KChartTreeOrientation
): string => {
    const source = link.source;
    const target = link.target;
    if (layout === 'radial') {
        return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
    }
    if (orientation === 'left-right' || orientation === 'right-left') {
        const midX = (source.x + target.x) / 2;
        return `M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`;
    }
    const midY = (source.y + target.y) / 2;
    return `M ${source.x} ${source.y} L ${source.x} ${midY} L ${target.x} ${midY} L ${target.x} ${target.y}`;
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

const distanceToLink = <T = any>(
    x: number,
    y: number,
    link: KChartTreeLink<T>,
    layout: KChartTreeSeriesConfiguration<T>['layout'],
    orientation: KChartTreeOrientation
): number => {
    const source = link.source;
    const target = link.target;
    if (layout === 'radial') {
        return distanceToSegment(x, y, source.x, source.y, target.x, target.y);
    }
    if (orientation === 'left-right' || orientation === 'right-left') {
        const midX = (source.x + target.x) / 2;
        return Math.min(
            distanceToSegment(x, y, source.x, source.y, midX, source.y),
            distanceToSegment(x, y, midX, source.y, midX, target.y),
            distanceToSegment(x, y, midX, target.y, target.x, target.y)
        );
    }
    const midY = (source.y + target.y) / 2;
    return Math.min(
        distanceToSegment(x, y, source.x, source.y, source.x, midY),
        distanceToSegment(x, y, source.x, midY, target.x, midY),
        distanceToSegment(x, y, target.x, midY, target.x, target.y)
    );
};

const createFocusSet = <T = any>(
    node: KChartTreeNode<T>,
    emphasis: KChartTreeEmphasis
): Set<string> => {
    const focus = new Set<string>([node.id]);
    if (emphasis === 'none') return focus;
    if (emphasis === 'ancestor' || emphasis === 'both') {
        let current = node.parent;
        while (current) {
            focus.add(current.id);
            current = current.parent;
        }
    }
    if (emphasis === 'descendant' || emphasis === 'both') {
        const queue = [...node.children];
        for (let index = 0; index < queue.length; index += 1) {
            const child = queue[index];
            focus.add(child.id);
            queue.push(...child.children);
        }
    }
    return focus;
};

const resolveLabelPosition = <T = any>(
    node: KChartTreeNode<T>,
    configured: KChartTreeLabelPosition,
    layout: KChartTreeSeriesConfiguration<T>['layout'],
    orientation: KChartTreeOrientation,
    width: number
): Exclude<KChartTreeLabelPosition, 'auto'> => {
    if (configured !== 'auto') return configured;
    if (layout === 'radial') return node.x < width / 2 ? 'left' : 'right';
    switch (orientation) {
        case 'right-left': return 'left';
        case 'top-bottom': return 'bottom';
        case 'bottom-top': return 'top';
        default: return 'right';
    }
};

const labelAnchor = (position: Exclude<KChartTreeLabelPosition, 'auto'>): string => {
    if (position === 'left') return 'end';
    if (position === 'right') return 'start';
    return 'middle';
};

const labelDx = (position: Exclude<KChartTreeLabelPosition, 'auto'>, size: number, offset: number): number => {
    if (position === 'left') return -(size / 2 + offset);
    if (position === 'right') return size / 2 + offset;
    return 0;
};

const labelDy = (position: Exclude<KChartTreeLabelPosition, 'auto'>, size: number, offset: number): number => {
    if (position === 'top') return -(size / 2 + offset);
    if (position === 'bottom') return size / 2 + offset;
    return 0;
};

export const createTreeSeries = <T = any>(
    configuration: KChartTreeSeriesConfiguration<T>
): KChartSeries<T> => {
    let cachedTree: KChartResolvedTree<T> = {root: null, nodes: [], links: []};
    let treeTransform: ZoomTransform = zoomIdentity;
    let hoveredId: string | undefined;
    let lastSignature = -1;
    let lastWidth = -1;
    let lastHeight = -1;
    let lastLayout = '';
    let lastOrientation = '';
    let resolveSymbolSize: (node: KChartTreeNode<T>) => number = () => 12;
    let resolveEdgeStrokeWidth: (link: KChartTreeLink<T>, index: number) => number = () => 1.5;

    const applyLayout = (width: number, height: number): void => {
        if (!cachedTree.root) return;
        const layout = configuration.layout ?? 'orthogonal';
        const orientation = configuration.orientation ?? 'left-right';
        const fitPadding = Math.max(0, configuration.fitPadding ?? 28);
        const layoutRows = cachedTree.nodes.map((node) => ({
            node,
            id: node.id,
            parentId: node.parentId
        }));
        const root = stratify<TreeLayoutDatum<T>>()
            .id((row) => row.id)
            .parentId((row) => row.parentId ?? null)(layoutRows);
        const hierarchyRoot = root as HierarchyPointNode<TreeLayoutDatum<T>>;

        // D3 returns logical breadth/depth coordinates. Convert them here so the
        // renderer and hit-test share one KChart plot-space coordinate system.
        if (layout === 'radial') {
            const radius = Math.max(1, Math.min(width, height) / 2 - fitPadding);
            tree<TreeLayoutDatum<T>>()
                .size([Math.PI * 2, radius])(hierarchyRoot);
            const centerX = width / 2;
            const centerY = height / 2;
            hierarchyRoot.each((hierarchyNode) => {
                const angle = hierarchyNode.x - Math.PI / 2;
                const node = hierarchyNode.data.node;
                node.x = centerX + Math.cos(angle) * hierarchyNode.y;
                node.y = centerY + Math.sin(angle) * hierarchyNode.y;
            });
            return;
        }

        const horizontal = orientation === 'left-right' || orientation === 'right-left';
        const breadth = Math.max(1, (horizontal ? height : width) - fitPadding * 2);
        const depth = Math.max(1, (horizontal ? width : height) - fitPadding * 2);
        tree<TreeLayoutDatum<T>>()
            .size([breadth, depth])(hierarchyRoot);
        hierarchyRoot.each((hierarchyNode) => {
            const node = hierarchyNode.data.node;
            if (horizontal) {
                node.x = orientation === 'left-right'
                    ? fitPadding + hierarchyNode.y
                    : width - fitPadding - hierarchyNode.y;
                node.y = fitPadding + hierarchyNode.x;
            } else {
                node.x = fitPadding + hierarchyNode.x;
                node.y = orientation === 'top-bottom'
                    ? fitPadding + hierarchyNode.y
                    : height - fitPadding - hierarchyNode.y;
            }
        });
        if (cachedTree.nodes.length === 1) {
            cachedTree.nodes[0].x = width / 2;
            cachedTree.nodes[0].y = height / 2;
        }
    };

    return createCustomSeries<T>({
        selector: configuration.selector,
        displayName: configuration.displayName,
        color: configuration.color,
        pointerEvents: 'series',
        render({group, data, plotSize, color, animation}) {
            hoveredId = undefined;
            const width = Math.max(1, plotSize.width);
            const height = Math.max(1, plotSize.height);
            const layout = configuration.layout ?? 'orthogonal';
            const orientation = configuration.orientation ?? 'left-right';
            // Layout is substantially more expensive than SVG style updates, so reuse it
            // until hierarchy fields, plot size, or the selected layout actually changes.
            const signature = resolveTreeDataSignature(data, configuration);
            const layoutChanged = signature !== lastSignature
                || width !== lastWidth
                || height !== lastHeight
                || layout !== lastLayout
                || orientation !== lastOrientation;
            if (layoutChanged) {
                cachedTree = resolveTreeData(data, configuration);
                applyLayout(width, height);
                lastSignature = signature;
                lastWidth = width;
                lastHeight = height;
                lastLayout = layout;
                lastOrientation = orientation;
            }

            const nodes = cachedTree.nodes;
            const links = cachedTree.links;
            const symbol = configuration.symbol ?? 'circle';
            const nodeStroke = configuration.nodeStroke ?? 'rgba(246, 250, 255, 0.9)';
            const edgeBaseColor = configuration.edgeColor ?? 'rgba(158, 181, 199, 0.62)';
            const palette = configuration.palette?.length ? configuration.palette : defaultTreePalette;
            const categories = new Map<string, number>();
            nodes.forEach((node) => {
                if (node.category && !categories.has(node.category)) {
                    categories.set(node.category, categories.size);
                }
            });
            resolveSymbolSize = (node) => Math.max(2, typeof configuration.symbolSize === 'function'
                ? configuration.symbolSize(node)
                : configuration.symbolSize ?? 13);
            resolveEdgeStrokeWidth = (link, index) => Math.max(0.5, typeof configuration.edgeStrokeWidth === 'function'
                ? configuration.edgeStrokeWidth(link, index)
                : configuration.edgeStrokeWidth ?? 1.45);
            const resolveNodeColor = (node: KChartTreeNode<T>, index: number): string => {
                if (typeof configuration.nodeColor === 'function') return configuration.nodeColor(node, index);
                if (configuration.nodeColor) return configuration.nodeColor;
                if (node.category) return palette[(categories.get(node.category) ?? 0) % palette.length];
                return configuration.color ?? color;
            };
            const resolveEdgeColor = (link: KChartTreeLink<T>, index: number): string => (
                typeof edgeBaseColor === 'function' ? edgeBaseColor(link, index) : edgeBaseColor
            );

            group.selectAll<SVGRectElement, unknown>('rect.kchart-tree-interaction')
                .data([undefined])
                .join('rect')
                .attr('class', 'kchart-tree-interaction')
                .attr('width', width)
                .attr('height', height)
                .style('fill', 'transparent')
                .style('pointer-events', 'all')
                .style('cursor', (configuration.roam ?? 'both') === 'disabled' ? 'default' : 'grab')
                .lower();

            const viewport = group.selectAll<SVGGElement, unknown>('g.kchart-tree-viewport')
                .data([undefined])
                .join('g')
                .attr('class', 'kchart-tree-viewport')
                .attr('transform', treeTransform.toString());
            const edgeLayer = viewport.selectAll<SVGGElement, unknown>('g.kchart-tree-edges')
                .data([undefined])
                .join('g')
                .attr('class', 'kchart-tree-edges');
            const nodeLayer = viewport.selectAll<SVGGElement, unknown>('g.kchart-tree-nodes')
                .data([undefined])
                .join('g')
                .attr('class', 'kchart-tree-nodes');

            const applyInteractionStyle = (): void => {
                const activeNode = hoveredId ? nodes.find((node) => node.id === hoveredId) : undefined;
                const emphasis = configuration.emphasis ?? 'both';
                const hasFocus = Boolean(activeNode) && emphasis !== 'none';
                const focusIds = activeNode ? createFocusSet(activeNode, emphasis) : new Set<string>();
                edgeLayer.selectAll<SVGPathElement, KChartTreeLink<T>>('path.kchart-tree-link')
                    .style('opacity', (link) => {
                        if (!hasFocus) return configuration.edgeOpacity ?? 0.64;
                        return focusIds.has(link.source.id) && focusIds.has(link.target.id)
                            ? 0.96
                            : configuration.dimOpacity ?? 0.12;
                    });
                nodeLayer.selectAll<SVGGElement, KChartTreeNode<T>>('g.kchart-tree-node')
                    .style('opacity', (node) => !hasFocus || focusIds.has(node.id)
                        ? 1
                        : configuration.dimOpacity ?? 0.12);
                nodeLayer.selectAll<SVGElement, KChartTreeNode<T>>('.kchart-tree-node-symbol')
                    .style('stroke', (node) => node.id === hoveredId ? '#ffffff' : nodeStroke)
                    .style('stroke-width', (node) => node.id === hoveredId
                        ? Math.max(2.4, configuration.nodeStrokeWidth ?? 1.4)
                        : configuration.nodeStrokeWidth ?? 1.4);
            };

            edgeLayer.selectAll<SVGPathElement, KChartTreeLink<T>>('path.kchart-tree-link')
                .data(links, (link) => link.id)
                .join('path')
                .attr('class', 'kchart-tree-link')
                .attr('d', (link) => resolveTreeLinkPath(link, layout, orientation))
                .style('fill', 'none')
                .style('stroke', resolveEdgeColor)
                .style('stroke-width', resolveEdgeStrokeWidth)
                .style('stroke-linecap', 'round')
                .style('stroke-linejoin', 'round')
                .style('opacity', (configuration.edgeOpacity ?? 0.64) * (animation.enabled ? animation.progress : 1))
                .each(function appendLinkTitle(link) {
                    let title = this.querySelector<SVGTitleElement>('title');
                    if (!title) {
                        title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                        this.appendChild(title);
                    }
                    title.textContent = `${link.source.label} → ${link.target.label}`;
                });

            const nodeGroups = nodeLayer.selectAll<SVGGElement, KChartTreeNode<T>>('g.kchart-tree-node')
                .data(nodes, (node) => node.id)
                .join('g')
                .attr('class', 'kchart-tree-node')
                .attr('transform', (node) => `translate(${node.x}, ${node.y})`)
                .style('cursor', configuration.onNodeClick ? 'pointer' : 'default')
                .on('mouseenter', (_event, node) => {
                    hoveredId = node.id;
                    applyInteractionStyle();
                })
                .on('mouseleave', () => {
                    hoveredId = undefined;
                    applyInteractionStyle();
                })
                .on('click', (event: MouseEvent, node) => {
                    if (!configuration.onNodeClick) return;
                    event.stopPropagation();
                    configuration.onNodeClick({node, event});
                });

            nodeGroups.selectAll<SVGCircleElement, KChartTreeNode<T>>('circle.kchart-tree-node-symbol')
                .data((node) => symbol === 'circle' ? [node] : [])
                .join('circle')
                .attr('class', 'kchart-tree-node-symbol')
                .attr('r', (node) => (resolveSymbolSize(node) / 2) * (animation.enabled ? animation.progress : 1))
                .style('fill', resolveNodeColor)
                .style('fill-opacity', configuration.nodeOpacity ?? 0.94)
                .style('stroke', nodeStroke)
                .style('stroke-width', configuration.nodeStrokeWidth ?? 1.4);

            nodeGroups.selectAll<SVGRectElement, KChartTreeNode<T>>('rect.kchart-tree-node-symbol')
                .data((node) => symbol === 'square' ? [node] : [])
                .join('rect')
                .attr('class', 'kchart-tree-node-symbol')
                .attr('x', (node) => -resolveSymbolSize(node) / 2)
                .attr('y', (node) => -resolveSymbolSize(node) / 2)
                .attr('width', (node) => resolveSymbolSize(node) * (animation.enabled ? animation.progress : 1))
                .attr('height', (node) => resolveSymbolSize(node) * (animation.enabled ? animation.progress : 1))
                .attr('rx', 2)
                .style('fill', resolveNodeColor)
                .style('fill-opacity', configuration.nodeOpacity ?? 0.94)
                .style('stroke', nodeStroke)
                .style('stroke-width', configuration.nodeStrokeWidth ?? 1.4);

            nodeGroups.selectAll<SVGPathElement, KChartTreeNode<T>>('path.kchart-tree-node-symbol')
                .data((node) => symbol === 'diamond' ? [node] : [])
                .join('path')
                .attr('class', 'kchart-tree-node-symbol')
                .attr('d', (node) => {
                    const half = (resolveSymbolSize(node) / 2) * (animation.enabled ? animation.progress : 1);
                    return `M 0 ${-half} L ${half} 0 L 0 ${half} L ${-half} 0 Z`;
                })
                .style('fill', resolveNodeColor)
                .style('fill-opacity', configuration.nodeOpacity ?? 0.94)
                .style('stroke', nodeStroke)
                .style('stroke-width', configuration.nodeStrokeWidth ?? 1.4);

            nodeGroups.selectAll('title')
                .data((node) => [node])
                .join('title')
                .text((node) => `${node.label}${configuration.valueField ? `: ${node.value}` : ''}`);

            const labelConfiguration = typeof configuration.labels === 'boolean'
                ? {visible: configuration.labels}
                : configuration.labels ?? {visible: true};
            nodeGroups.selectAll<SVGTextElement, KChartTreeNode<T>>('text.kchart-tree-label')
                .data((node) => labelConfiguration.visible === false ? [] : [node])
                .join('text')
                .attr('class', 'kchart-tree-label')
                .attr('x', (node) => {
                    const position = resolveLabelPosition(node, configuration.labelPosition ?? 'auto', layout, orientation, width);
                    return labelDx(position, resolveSymbolSize(node), labelConfiguration.offset ?? 8);
                })
                .attr('y', (node) => {
                    const position = resolveLabelPosition(node, configuration.labelPosition ?? 'auto', layout, orientation, width);
                    return labelDy(position, resolveSymbolSize(node), labelConfiguration.offset ?? 8);
                })
                .attr('text-anchor', (node) => {
                    const position = resolveLabelPosition(node, configuration.labelPosition ?? 'auto', layout, orientation, width);
                    return labelAnchor(position);
                })
                .attr('dominant-baseline', (node) => {
                    const position = resolveLabelPosition(node, configuration.labelPosition ?? 'auto', layout, orientation, width);
                    return position === 'top' ? 'text-after-edge' : position === 'bottom' ? 'text-before-edge' : 'middle';
                })
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
                    treeTransform = event.transform;
                    viewport.attr('transform', treeTransform.toString());
                });
            group.call(zoomBehavior as any);
            const groupNode = group.node();
            if (groupNode) {
                (groupNode as any).__zoom = treeTransform;
            }
        },
        tooltip({mouseX, mouseY}) {
            const layout = configuration.layout ?? 'orthogonal';
            const orientation = configuration.orientation ?? 'left-right';
            let activeNode: KChartTreeNode<T> | undefined;
            let activeDistance = Number.POSITIVE_INFINITY;
            cachedTree.nodes.forEach((node) => {
                const x = treeTransform.applyX(node.x);
                const y = treeTransform.applyY(node.y);
                const radius = (resolveSymbolSize(node) / 2) * treeTransform.k + 8;
                const distance = Math.hypot(mouseX - x, mouseY - y);
                if (distance <= radius && distance < activeDistance) {
                    activeNode = node;
                    activeDistance = distance;
                }
            });
            if (activeNode) {
                return {
                    data: activeNode.row,
                    x: treeTransform.applyX(activeNode.x),
                    y: treeTransform.applyY(activeNode.y),
                    distance: activeDistance,
                    color: configuration.color,
                    html: `<strong>${escapeTooltipHtml(activeNode.label)}</strong>${configuration.valueField ? `<br/>Value: ${activeNode.value}` : ''}${activeNode.category ? `<br/>Category: ${escapeTooltipHtml(activeNode.category)}` : ''}`
                };
            }

            // Roaming transforms SVG visually; applying the same transform to hit-test
            // geometry keeps node/link tooltips aligned after pan and zoom.
            let activeLink: KChartTreeLink<T> | undefined;
            let linkDistance = Number.POSITIVE_INFINITY;
            cachedTree.links.forEach((link, index) => {
                const transformedLink: KChartTreeLink<T> = {
                    ...link,
                    source: {
                        ...link.source,
                        x: treeTransform.applyX(link.source.x),
                        y: treeTransform.applyY(link.source.y)
                    },
                    target: {
                        ...link.target,
                        x: treeTransform.applyX(link.target.x),
                        y: treeTransform.applyY(link.target.y)
                    }
                };
                const distance = distanceToLink(mouseX, mouseY, transformedLink, layout, orientation);
                if (distance <= Math.max(7, resolveEdgeStrokeWidth(link, index) * treeTransform.k + 5) && distance < linkDistance) {
                    activeLink = link;
                    linkDistance = distance;
                }
            });
            if (!activeLink) return undefined;
            return {
                data: activeLink.row,
                x: treeTransform.applyX((activeLink.source.x + activeLink.target.x) / 2),
                y: treeTransform.applyY((activeLink.source.y + activeLink.target.y) / 2),
                distance: linkDistance,
                color: typeof configuration.edgeColor === 'string' ? configuration.edgeColor : undefined,
                html: `<strong>${escapeTooltipHtml(activeLink.source.label)} → ${escapeTooltipHtml(activeLink.target.label)}</strong>`
            };
        },
        destroy({seriesGroup}: KChartLayerContext) {
            seriesGroup.selectAll(`g.${configuration.selector}`).on('.zoom', null);
            cachedTree = {root: null, nodes: [], links: []};
            treeTransform = zoomIdentity;
            hoveredId = undefined;
            lastSignature = -1;
            lastWidth = -1;
            lastHeight = -1;
            lastLayout = '';
            lastOrientation = '';
        }
    });
};
