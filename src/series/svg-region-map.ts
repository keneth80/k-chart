import {
    geoMercator,
    geoPath
} from 'd3-geo';
import {
    zoom,
    zoomIdentity,
    ZoomTransform
} from 'd3-zoom';
import {feature as topojsonFeature} from 'topojson-client';
import worldCountries110m from 'world-atlas/countries-110m.json';
import type {
    KChartGeoRegionMapContext,
    KChartGeoRegionMapLabelConfiguration,
    KChartGeoRegionMapZoomControlsConfiguration,
    KChartGeoRegionMapSeriesConfiguration,
    KChartSeries
} from '../core/contracts';
import {createCustomSeries} from './custom';

const WORLD_COUNTRY_GEOJSON = topojsonFeature(
    worldCountries110m as any,
    (worldCountries110m as any).objects.countries
);

const defaultRegionPalette = [
    '#5db8ff',
    '#56d08f',
    '#f3b45b',
    '#d876ff',
    '#ff6b8a',
    '#72e4ff',
    '#a8d95f',
    '#ff9f5a',
    '#2f73b8',
    '#9b5de5'
];

type RegionRenderDatum<T> = KChartGeoRegionMapContext<T> & {
    centroid: [number, number];
};

type ResolvedRegionZoomControls = {
    visible: boolean;
    x: number;
    y: number;
    step: number;
};

type ResolvedRegionZoom = {
    enabled: boolean;
    wheel: boolean;
    pan: boolean;
    controls: ResolvedRegionZoomControls;
    scaleExtent: [number, number];
};

const normalizeGeoFeatures = (geoJson: any | any[] | undefined): any[] => {
    const values = Array.isArray(geoJson) ? geoJson : [geoJson];
    return values.flatMap((value) => {
        if (!value) {
            return [];
        }
        if (value.type === 'FeatureCollection' && Array.isArray(value.features)) {
            return value.features;
        }
        if (value.type === 'Feature') {
            return [value];
        }
        return [];
    });
};

const getPropertyValue = (
    feature: any,
    key: string | ((feature: any) => string) | undefined,
    fallback = ''
): string => {
    if (typeof key === 'function') {
        return String(key(feature) ?? fallback);
    }
    if (!key) {
        return fallback;
    }
    if (key === 'id') {
        return String(feature?.id ?? fallback);
    }
    return String(feature?.properties?.[key] ?? feature?.[key] ?? fallback);
};

const resolveLabels = <T = any>(
    labels?: boolean | KChartGeoRegionMapLabelConfiguration<T>
): Required<KChartGeoRegionMapLabelConfiguration<T>> => {
    if (typeof labels === 'boolean') {
        return {
            visible: labels,
            mode: 'centroid',
            formatter: (context) => context.label,
            fill: '#edf3f8',
            fontSize: 11,
            fontWeight: 800,
            stroke: 'rgba(10, 15, 22, 0.68)',
            strokeWidth: 3,
            calloutStroke: 'rgba(188, 206, 218, 0.48)',
            calloutOpacity: 0.72,
            side: 'auto',
            offset: 18
        };
    }

    return {
        visible: labels?.visible ?? false,
        mode: labels?.mode ?? 'centroid',
        formatter: labels?.formatter ?? ((context) => context.label),
        fill: labels?.fill ?? '#edf3f8',
        fontSize: labels?.fontSize ?? 11,
        fontWeight: labels?.fontWeight ?? 800,
        stroke: labels?.stroke ?? 'rgba(10, 15, 22, 0.68)',
        strokeWidth: labels?.strokeWidth ?? 3,
        calloutStroke: labels?.calloutStroke ?? 'rgba(188, 206, 218, 0.48)',
        calloutOpacity: labels?.calloutOpacity ?? 0.72,
        side: labels?.side ?? 'auto',
        offset: labels?.offset ?? 18
    };
};

const resolveRegionZoomControls = (
    controls: boolean | KChartGeoRegionMapZoomControlsConfiguration
): ResolvedRegionZoomControls => {
    if (typeof controls === 'boolean') {
        return {
            visible: controls,
            x: 8,
            y: 8,
            step: 0.28
        };
    }

    return {
        visible: controls?.visible ?? false,
        x: controls?.x ?? 8,
        y: controls?.y ?? 8,
        step: controls?.step ?? 0.28
    };
};

const resolveRegionZoom = (
    zoomConfiguration: KChartGeoRegionMapSeriesConfiguration<any>['zoom']
): ResolvedRegionZoom => {
    if (typeof zoomConfiguration === 'boolean') {
        return {
            enabled: zoomConfiguration,
            wheel: true,
            pan: true,
            controls: resolveRegionZoomControls(zoomConfiguration),
            scaleExtent: [1, 8]
        };
    }

    return {
        enabled: zoomConfiguration?.enabled ?? false,
        wheel: zoomConfiguration?.wheel ?? true,
        pan: zoomConfiguration?.pan ?? true,
        controls: resolveRegionZoomControls(zoomConfiguration?.controls ?? false),
        scaleExtent: zoomConfiguration?.scaleExtent ?? [1, 8]
    };
};

const clampNumber = (
    value: number,
    min: number,
    max: number
): number => Math.max(min, Math.min(max, value));

const resolveRegionFill = <T = any>(
    context: KChartGeoRegionMapContext<T>,
    configuration: KChartGeoRegionMapSeriesConfiguration<T>
): string => {
    if (context.data && configuration.colorField) {
        const color = context.data[configuration.colorField];
        if (typeof color === 'string' && color) {
            return color;
        }
    }
    if (typeof configuration.fill === 'function') {
        return configuration.fill(context);
    }
    if (typeof configuration.fill === 'string') {
        return configuration.fill;
    }
    if (!context.data) {
        return configuration.missingFill ?? 'rgba(142, 160, 173, 0.24)';
    }
    return defaultRegionPalette[context.index % defaultRegionPalette.length];
};

const resolveRegionStroke = <T = any>(
    context: KChartGeoRegionMapContext<T>,
    configuration: KChartGeoRegionMapSeriesConfiguration<T>
): string => typeof configuration.stroke === 'function'
    ? configuration.stroke(context)
    : configuration.stroke ?? '#f8fbff';

const resolveRegionOpacity = <T = any>(
    context: KChartGeoRegionMapContext<T>,
    configuration: KChartGeoRegionMapSeriesConfiguration<T>
): number => typeof configuration.opacity === 'function'
    ? configuration.opacity(context)
    : configuration.opacity ?? 0.88;

const pointHitsPath = (
    path: SVGPathElement,
    x: number,
    y: number
): boolean => {
    const geometryPath = path as SVGGeometryElement & {
        isPointInFill?: (point: DOMPointInit) => boolean;
    };

    if (typeof geometryPath.isPointInFill === 'function') {
        try {
            return geometryPath.isPointInFill({x, y});
        } catch {
            // Fall back to a coarse bounding box check in older browsers.
        }
    }

    const bounds = path.getBBox();
    return x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height;
};

const createTooltipHtml = <T = any>(
    context: KChartGeoRegionMapContext<T>,
    configuration: KChartGeoRegionMapSeriesConfiguration<T>
): string => {
    if (typeof configuration.tooltip === 'object' && configuration.tooltip.formatter) {
        return configuration.tooltip.formatter(context);
    }

    const valueText = context.value === undefined ? '' : `<br/>value: ${context.value}`;
    return `<strong>${context.label}</strong>${valueText}`;
};

export const createGeoRegionMapSeries = <T = any>(
    configuration: KChartGeoRegionMapSeriesConfiguration<T>
): KChartSeries<T> => {
    let regionZoomTransform: ZoomTransform = zoomIdentity;

    const getLocalPoint = (x: number, y: number): [number, number] => [
        (x - regionZoomTransform.x) / regionZoomTransform.k,
        (y - regionZoomTransform.y) / regionZoomTransform.k
    ];

    const getScreenPoint = (point: [number, number]): [number, number] => [
        point[0] * regionZoomTransform.k + regionZoomTransform.x,
        point[1] * regionZoomTransform.k + regionZoomTransform.y
    ];

    return createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    color: typeof configuration.fill === 'string' ? configuration.fill : undefined,
    render({group, data, plotSize, overlayGroup}) {
        const width = plotSize.width;
        const height = plotSize.height;
        const zoomConfiguration = resolveRegionZoom(configuration.zoom);
        const [minZoom, maxZoom] = [
            Math.min(zoomConfiguration.scaleExtent[0], zoomConfiguration.scaleExtent[1]),
            Math.max(zoomConfiguration.scaleExtent[0], zoomConfiguration.scaleExtent[1])
        ];
        regionZoomTransform = zoomIdentity
            .translate(regionZoomTransform.x, regionZoomTransform.y)
            .scale(clampNumber(regionZoomTransform.k, minZoom, maxZoom));
        const features = normalizeGeoFeatures(configuration.geoJson);
        const featureCollection = {
            type: 'FeatureCollection',
            features
        };
        const projection = geoMercator()
            .fitExtent(
                [
                    [configuration.fitPadding ?? 16, configuration.fitPadding ?? 16],
                    [Math.max(1, width - (configuration.fitPadding ?? 16)), Math.max(1, height - (configuration.fitPadding ?? 16))]
                ],
                featureCollection as any
            );
        const path = geoPath(projection);
        const dataKey = configuration.dataKey ?? ('name' as keyof T & string);
        const featureKey = configuration.featureKey ?? 'name';
        const labelKey = configuration.labelKey ?? featureKey;
        const dataByKey = new Map<string, T>();

        data.forEach((point) => {
            dataByKey.set(String(point[dataKey]), point);
        });

        const regions: Array<RegionRenderDatum<T>> = features.map((featureItem, index) => {
            const key = getPropertyValue(featureItem, featureKey, String(featureItem?.id ?? index));
            const label = getPropertyValue(featureItem, labelKey, key);
            const datum = dataByKey.get(key);
            const value = datum && configuration.valueField ? datum[configuration.valueField] : undefined;
            const centroid = path.centroid(featureItem) as [number, number];

            return {
                feature: featureItem,
                data: datum,
                index,
                key,
                label,
                value,
                centroid
            };
        });

        group.selectAll<SVGRectElement, [number, number]>('rect.kchart-region-map-background')
            .data(configuration.backgroundFill ? [[width, height]] : [])
            .join('rect')
            .attr('class', 'kchart-region-map-background')
            .attr('width', width)
            .attr('height', height)
            .style('fill', configuration.backgroundFill ?? 'transparent');

        const mapLayer = group.selectAll<SVGGElement, unknown>('g.kchart-region-map-layer')
            .data([undefined])
            .join('g')
            .attr('class', 'kchart-region-map-layer')
            .attr('transform', regionZoomTransform.toString());

        mapLayer.selectAll<SVGPathElement, RegionRenderDatum<T>>(`path.${configuration.selector}`)
            .data(regions, (item) => item.key)
            .join('path')
            .attr('class', configuration.selector)
            .attr('d', (item) => path(item.feature) ?? '')
            .style('fill', (item) => resolveRegionFill(item, configuration))
            .style('fill-opacity', (item) => resolveRegionOpacity(item, configuration))
            .style('stroke', (item) => resolveRegionStroke(item, configuration))
            .style('stroke-width', configuration.strokeWidth ?? 1.2)
            .style('stroke-linejoin', 'round')
            .style('cursor', configuration.onRegionClick ? 'pointer' : 'default')
            .on('click', (event: MouseEvent, item) => {
                configuration.onRegionClick?.({
                    ...item,
                    event
                });
            });

        const labelConfiguration = resolveLabels(configuration.labels);
        const labelItems = labelConfiguration.visible ? regions
            .filter((item) => Number.isFinite(item.centroid[0]) && Number.isFinite(item.centroid[1]))
            .map((item) => {
                const side = labelConfiguration.side === 'auto'
                    ? item.centroid[0] < width / 2 ? 'left' : 'right'
                    : labelConfiguration.side;
                return {
                    ...item,
                    side,
                    labelX: labelConfiguration.mode === 'callout'
                        ? side === 'left' ? labelConfiguration.offset : width - labelConfiguration.offset
                        : item.centroid[0],
                    labelY: item.centroid[1],
                    anchor: labelConfiguration.mode === 'callout'
                        ? side === 'left' ? 'end' : 'start'
                        : 'middle'
                };
            }) : [];

        if (labelConfiguration.visible && labelConfiguration.mode === 'callout') {
            const minGap = labelConfiguration.fontSize + 6;
            (['left', 'right'] as const).forEach((side) => {
                const sideItems = labelItems
                    .filter((item) => item.side === side)
                    .sort((a, b) => a.labelY - b.labelY);
                sideItems.forEach((item, index) => {
                    const previous = sideItems[index - 1];
                    if (previous && item.labelY - previous.labelY < minGap) {
                        item.labelY = previous.labelY + minGap;
                    }
                    item.labelY = Math.max(labelConfiguration.offset, Math.min(height - labelConfiguration.offset, item.labelY));
                });
            });
        }

        mapLayer.selectAll<SVGPathElement, typeof labelItems[number]>(`path.${configuration.selector}-callout`)
            .data(labelConfiguration.mode === 'callout' ? labelItems : [], (item) => item.key)
            .join('path')
            .attr('class', `${configuration.selector}-callout`)
            .attr('d', (item) => `M${item.centroid[0]},${item.centroid[1]} L${item.labelX},${item.labelY}`)
            .style('fill', 'none')
            .style('stroke', labelConfiguration.calloutStroke)
            .style('stroke-width', 1)
            .style('stroke-opacity', labelConfiguration.calloutOpacity)
            .style('pointer-events', 'none');

        mapLayer.selectAll<SVGTextElement, typeof labelItems[number]>(`text.${configuration.selector}-label`)
            .data(labelItems, (item) => item.key)
            .join('text')
            .attr('class', `${configuration.selector}-label`)
            .attr('x', (item) => item.labelX)
            .attr('y', (item) => item.labelY)
            .attr('text-anchor', (item) => item.anchor)
            .attr('dominant-baseline', 'middle')
            .style('fill', labelConfiguration.fill)
            .style('font-size', `${labelConfiguration.fontSize}px`)
            .style('font-weight', labelConfiguration.fontWeight)
            .style('paint-order', 'stroke')
            .style('stroke', labelConfiguration.stroke)
            .style('stroke-width', labelConfiguration.strokeWidth)
            .style('pointer-events', 'none')
            .text((item) => labelConfiguration.formatter(item));

        const applyZoomTransform = (transform: ZoomTransform): void => {
            regionZoomTransform = transform;
            group.select<SVGGElement>('g.kchart-region-map-layer')
                .attr('transform', regionZoomTransform.toString());
            overlayGroup.selectAll<SVGGElement, unknown>(`g.${configuration.selector}-zoom-controls`).raise();
        };

        const renderZoomControls = (): void => {
            const controls = zoomConfiguration.controls;
            const controlItems = controls.visible ? [
                {key: 'in', label: '+', title: 'Zoom in'},
                {key: 'reset', label: `${Math.round(regionZoomTransform.k * 100)}%`, title: 'Reset zoom'},
                {key: 'out', label: '-', title: 'Zoom out'}
            ] : [];
            const controlsGroup = overlayGroup.selectAll<SVGGElement, unknown>(`g.${configuration.selector}-zoom-controls`)
                .data(controlItems.length ? [undefined] : [])
                .join('g')
                .attr('class', `${configuration.selector}-zoom-controls`)
                .attr('transform', `translate(${Math.max(0, width - controls.x - 48)}, ${controls.y})`)
                .style('pointer-events', 'all');

            const buttons = controlsGroup.selectAll<SVGGElement, typeof controlItems[number]>('g.kchart-region-map-zoom-control')
                .data(controlItems, (item) => item.key)
                .join('g')
                .attr('class', 'kchart-region-map-zoom-control')
                .attr('transform', (_item, index) => `translate(0, ${index * 34})`)
                .style('cursor', 'pointer')
                .style('opacity', (item) => {
                    if (item.key === 'in' && regionZoomTransform.k >= maxZoom) return 0.45;
                    if (item.key === 'out' && regionZoomTransform.k <= minZoom) return 0.45;
                    return 1;
                })
                .on('click', (event: MouseEvent, item) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const nextScale = item.key === 'in'
                        ? regionZoomTransform.k * (1 + controls.step)
                        : item.key === 'out'
                            ? regionZoomTransform.k / (1 + controls.step)
                            : 1;
                    const centerX = width / 2;
                    const centerY = height / 2;
                    const scale = clampNumber(nextScale, minZoom, maxZoom);
                    const nextTransform = item.key === 'reset'
                        ? zoomIdentity
                        : zoomIdentity
                            .translate(centerX, centerY)
                            .scale(scale)
                            .translate(
                                -(centerX - regionZoomTransform.x) / regionZoomTransform.k,
                                -(centerY - regionZoomTransform.y) / regionZoomTransform.k
                            );
                    applyZoomTransform(nextTransform);
                    renderZoomControls();
                });

            buttons.selectAll<SVGRectElement, unknown>('rect')
                .data([undefined])
                .join('rect')
                .attr('width', 48)
                .attr('height', 30)
                .attr('rx', 7)
                .style('fill', 'rgba(16, 23, 33, 0.86)')
                .style('stroke', 'rgba(226, 236, 249, 0.55)')
                .style('stroke-width', 1);

            buttons.selectAll<SVGTextElement, typeof controlItems[number]>('text')
                .data((item) => [item])
                .join('text')
                .attr('x', 24)
                .attr('y', 16)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .style('fill', '#f8fbff')
                .style('font-size', (item) => item.key === 'reset' ? '10px' : '18px')
                .style('font-weight', 800)
                .style('pointer-events', 'none')
                .text((item) => item.label);

            controlsGroup.raise();
        };

        if (!zoomConfiguration.enabled) {
            overlayGroup.selectAll(`g.${configuration.selector}-zoom-controls`).remove();
            return;
        }

        const attachZoom = (): void => {
            let overlay = overlayGroup.select<SVGRectElement>('rect.kchart-tooltip-overlay');
            if (!overlay.node()) {
                overlay = overlayGroup.selectAll<SVGRectElement, unknown>(`rect.${configuration.selector}-zoom-overlay`)
                    .data([undefined])
                    .join('rect')
                    .attr('class', `${configuration.selector}-zoom-overlay`)
                    .attr('width', width)
                    .attr('height', height)
                    .style('fill', 'transparent')
                    .style('pointer-events', 'all');
            }
            const overlayNode = overlay.node();
            if (!overlayNode) {
                return;
            }
            const zoomBehavior = zoom<SVGRectElement, unknown>()
                .scaleExtent([minZoom, maxZoom])
                .filter((event: any) => {
                    if (event.type === 'wheel') return zoomConfiguration.wheel;
                    if (event.type === 'mousedown') return zoomConfiguration.pan && event.button === 0;
                    if (event.type === 'touchstart' || event.type === 'touchmove') return zoomConfiguration.pan;
                    return true;
                })
                .on('zoom', (event) => {
                    applyZoomTransform(event.transform);
                    renderZoomControls();
                });

            overlay.call(zoomBehavior as any);
            (overlayNode as any).__zoom = regionZoomTransform;
            renderZoomControls();
        };

        if (typeof queueMicrotask === 'function') {
            queueMicrotask(attachZoom);
        } else {
            setTimeout(attachZoom, 0);
        }
    },
    tooltip({seriesGroup, mouseX, mouseY}) {
        if (configuration.tooltip === false) {
            return undefined;
        }

        let active: RegionRenderDatum<T> | undefined;
        const [localMouseX, localMouseY] = getLocalPoint(mouseX, mouseY);
        seriesGroup.selectAll<SVGPathElement, RegionRenderDatum<T>>(`path.${configuration.selector}`)
            .style('fill', (item) => resolveRegionFill(item, configuration))
            .style('stroke', (item) => resolveRegionStroke(item, configuration))
            .style('stroke-width', configuration.strokeWidth ?? 1.2)
            .each(function findHit(item) {
                if (!active && pointHitsPath(this, localMouseX, localMouseY)) {
                    active = item;
                }
            });

        if (!active) {
            return undefined;
        }

        seriesGroup.selectAll<SVGPathElement, RegionRenderDatum<T>>(`path.${configuration.selector}`)
            .filter((item) => item.key === active?.key)
            .style('fill', typeof configuration.hoverFill === 'function'
                ? configuration.hoverFill(active)
                : configuration.hoverFill ?? resolveRegionFill(active, configuration))
            .style('stroke', configuration.hoverStroke ?? '#ffffff')
            .style('stroke-width', configuration.hoverStrokeWidth ?? Math.max(2, configuration.strokeWidth ?? 1.2));

        const [tooltipX, tooltipY] = getScreenPoint(active.centroid);
        return {
            data: active.data ?? (active as unknown as T),
            x: tooltipX,
            y: tooltipY,
            distance: 0,
            color: resolveRegionFill(active, configuration),
            html: createTooltipHtml(active, configuration)
        };
    },
    clearTooltip({seriesGroup}) {
        seriesGroup.selectAll<SVGPathElement, RegionRenderDatum<T>>(`path.${configuration.selector}`)
            .style('fill', (item) => resolveRegionFill(item, configuration))
            .style('stroke', (item) => resolveRegionStroke(item, configuration))
            .style('stroke-width', configuration.strokeWidth ?? 1.2);
    },
    destroy({overlayGroup}) {
        overlayGroup.selectAll(`g.${configuration.selector}-zoom-controls`).remove();
    }
    });
};

export const createWorldCountryMapSeries = <T = any>(
    configuration: Omit<KChartGeoRegionMapSeriesConfiguration<T>, 'geoJson'>
): KChartSeries<T> => createGeoRegionMapSeries<T>({
    featureKey: 'name',
    labelKey: 'name',
    missingFill: 'rgba(142, 160, 173, 0.2)',
    ...configuration,
    geoJson: WORLD_COUNTRY_GEOJSON
});
