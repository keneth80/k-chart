import {
    geoDistance,
    geoGraticule10,
    geoMercator,
    geoOrthographic,
    geoPath
} from 'd3-geo';
import {pointer} from 'd3-selection';
import {feature as topojsonFeature, mesh as topojsonMesh} from 'topojson-client';
import worldCountries110m from 'world-atlas/countries-110m.json';
import worldLand110m from 'world-atlas/land-110m.json';
import type {
    KChartGlobeDrilldownConfiguration,
    KChartGlobeDrilldownMode,
    KChartGlobeZoomConfiguration,
    KChartGlobeZoomControlsConfiguration,
    KChartSeries,
    KChartSvgGlobeSeriesConfiguration
} from '../core/contracts';
import {createCustomSeries} from './custom';

const clampNumber = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const resolveGlobePointValue = <T = any>(
    point: T,
    field: keyof T & string
): number => Number(point[field]);

const resolveGlobeMarkerRadius = <T = any>(
    point: T,
    configuration: Pick<KChartSvgGlobeSeriesConfiguration<T>, 'markerRadius'>
): number => typeof configuration.markerRadius === 'function'
    ? configuration.markerRadius(point)
    : configuration.markerRadius ?? 5;

const resolveGlobeMarkerColor = <T = any>(
    point: T,
    configuration: Pick<KChartSvgGlobeSeriesConfiguration<T>, 'markerColor'>,
    fallbackColor: string
): string => typeof configuration.markerColor === 'function'
    ? configuration.markerColor(point)
    : configuration.markerColor ?? fallbackColor;

const resolveGlobeLandStyle = (
    value: string | ((feature: any, index: number) => string) | undefined,
    feature: any,
    index: number,
    fallback: string
): string => typeof value === 'function'
    ? value(feature, index)
    : value ?? fallback;

const resolveGlobeLandOpacity = (
    value: number | ((feature: any, index: number) => number) | undefined,
    feature: any,
    index: number
): number => typeof value === 'function'
    ? value(feature, index)
    : value ?? 0.88;

const normalizeGlobeLandFeatures = (geoJson: any | any[]): any[] => {
    const values = Array.isArray(geoJson) ? geoJson : [geoJson];
    return values.flatMap((value) => {
        if (
            value?.type === 'FeatureCollection' &&
            Array.isArray(value.features)
        ) {
            return value.features;
        }
        return value ? [value] : [];
    });
};

const normalizeGlobeRotation = (
    rotation?: [number, number, number?]
): [number, number, number] => [
    rotation?.[0] ?? 0,
    rotation?.[1] ?? -12,
    rotation?.[2] ?? 0
];

const resolveGlobeZoomConfiguration = (
    zoom?: boolean | KChartGlobeZoomConfiguration
): Required<KChartGlobeZoomConfiguration> => {
    if (typeof zoom === 'boolean') {
        return {
            enabled: zoom,
            wheel: true,
            pinch: true,
            controls: false,
            min: 0.55,
            max: 3,
            wheelSensitivity: 0.0012
        };
    }
    return {
        enabled: zoom?.enabled ?? false,
        wheel: zoom?.wheel ?? true,
        pinch: zoom?.pinch ?? true,
        controls: zoom?.controls ?? false,
        min: zoom?.min ?? 0.55,
        max: zoom?.max ?? 3,
        wheelSensitivity: zoom?.wheelSensitivity ?? 0.0012
    };
};

const resolveGlobeZoomControlsConfiguration = (
    controls: boolean | KChartGlobeZoomControlsConfiguration | undefined
): Required<KChartGlobeZoomControlsConfiguration> => {
    if (typeof controls === 'boolean') {
        return {
            visible: controls,
            step: 0.22,
            x: 8,
            y: 8
        };
    }
    return {
        visible: controls?.visible ?? false,
        step: controls?.step ?? 0.22,
        x: controls?.x ?? 8,
        y: controls?.y ?? 8
    };
};

const resolveGlobeDrilldownConfiguration = <T = any>(
    drilldown?: boolean | KChartGlobeDrilldownConfiguration<T>
): Required<
    Omit<
        KChartGlobeDrilldownConfiguration<T>,
        'onEnter' | 'onExit' | 'landFill' | 'landStroke' | 'landOpacity'
    >
> & Pick<
    KChartGlobeDrilldownConfiguration<T>,
    'onEnter' | 'onExit' | 'landFill' | 'landStroke' | 'landOpacity'
> => {
    if (typeof drilldown === 'boolean') {
        return {
            enabled: drilldown,
            mode: 'map',
            autoMapOnZoom: false,
            mapZoomThreshold: 2.4,
            globeZoomThreshold: 1.8,
            focusZoom: 2.6,
            zoomScale: 6,
            duration: 720,
            resetControl: true
        };
    }
    return {
        enabled: drilldown?.enabled ?? false,
        mode: drilldown?.mode ?? 'map',
        autoMapOnZoom: drilldown?.autoMapOnZoom ?? false,
        mapZoomThreshold: drilldown?.mapZoomThreshold ?? 2.4,
        globeZoomThreshold: drilldown?.globeZoomThreshold ?? 1.8,
        focusZoom: drilldown?.focusZoom ?? 2.6,
        zoomScale: drilldown?.zoomScale ?? 6,
        duration: drilldown?.duration ?? 720,
        resetControl: drilldown?.resetControl ?? true,
        landFill: drilldown?.landFill,
        landStroke: drilldown?.landStroke,
        landOpacity: drilldown?.landOpacity,
        onEnter: drilldown?.onEnter,
        onExit: drilldown?.onExit
    };
};

const WORLD_COUNTRY_GEOJSON = topojsonFeature(
    worldCountries110m as any,
    (worldCountries110m as any).objects.countries
);
const WORLD_LAND_GEOJSON = topojsonFeature(
    worldLand110m as any,
    (worldLand110m as any).objects.land
);
const WORLD_COUNTRY_BORDERS_GEOJSON = topojsonMesh(
    worldCountries110m as any,
    (worldCountries110m as any).objects.countries,
    (left: any, right: any) => left !== right
);

const isGlobePointVisible = (
    lon: number,
    lat: number,
    rotation: [number, number, number]
): boolean => {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        return false;
    }
    return geoDistance([lon, lat], [-rotation[0], -rotation[1]]) <= Math.PI / 2;
};

export const createSvgGlobeSeries = <T = any>(
    configuration: KChartSvgGlobeSeriesConfiguration<T>
): KChartSeries<T> => {
    let rotation = normalizeGlobeRotation(configuration.initialRotate);
    let zoomLevel = 1;
    let dragging = false;
    let dragStart: [number, number] = [0, 0];
    let rotationStart: [number, number, number] = [...rotation];
    const activePointers = new Map<number, [number, number]>();
    let pinchStartDistance = 0;
    let pinchStartZoom = 1;
    let viewMode: 'globe' | 'map' | 'external-map' = 'globe';
    let focusedPoint: { data: T; lat: number; lon: number; projected: [number, number] } | undefined;
    let drilldownRestoreState: { rotation: [number, number, number]; zoomLevel: number } | undefined;
    let warpEffect: { x: number; y: number; startedAt: number; duration: number } | undefined;
    let warpTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
    let warpFrame: number | undefined;
    let wheelZoomReference: [number, number] | undefined;
    let wheelZoomReferenceTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
    let hoveredMarkerTarget: { data: T; lat: number; lon: number; projected: [number, number] } | undefined;
    let markerPress: {
        pointerId: number;
        startX: number;
        startY: number;
        moved: boolean;
        datum: { data: T; lat: number; lon: number; projected: [number, number] };
    } | undefined;
    let settledCenter: [number, number] = [-rotation[0], -rotation[1]];
    let externalMapTransitioning = false;

    return createCustomSeries<T>({
        selector: configuration.selector,
        displayName: configuration.displayName,
        xField: configuration.lonField,
        yField: configuration.latField,
        color: typeof configuration.markerColor === 'string' ? configuration.markerColor : undefined,
        render({ group, data, size, plotSize, margin, color }) {
            const width = plotSize.width;
            const height = plotSize.height;
            const centerX = width / 2;
            const centerY = height / 2;
            const zoomConfiguration = resolveGlobeZoomConfiguration(configuration.zoom);
            const minZoom = Math.min(zoomConfiguration.min, zoomConfiguration.max);
            const maxZoom = Math.max(zoomConfiguration.min, zoomConfiguration.max);
            const zoomControlsConfiguration = resolveGlobeZoomControlsConfiguration(zoomConfiguration.controls);
            const drilldownConfiguration = resolveGlobeDrilldownConfiguration(configuration.drilldown);
            zoomLevel = clampNumber(zoomLevel, minZoom, maxZoom);
            const baseScale = Math.max(1, Math.min(width, height) / 2 * (configuration.globeScale ?? 0.88));
            const globeProjection = geoOrthographic()
                .translate([centerX, centerY])
                .scale(baseScale * zoomLevel)
                .rotate(rotation)
                .clipAngle(90);
            const mapProjection = geoMercator()
                .translate([centerX, centerY])
                .scale(Math.max(1, Math.min(width, height) / Math.PI * drilldownConfiguration.zoomScale * zoomLevel))
                .center(focusedPoint ? [focusedPoint.lon, focusedPoint.lat] : [0, 0]);
            const path = geoPath(globeProjection);
            const mapPath = geoPath(mapProjection);
            const resolveGlobeCenter = (): [number, number] => {
                const inverted = globeProjection.invert?.([centerX, centerY]) as [number, number] | null | undefined;
                return inverted && Number.isFinite(inverted[0]) && Number.isFinite(inverted[1])
                    ? inverted
                    : [-rotation[0], -rotation[1]];
            };
            const getFirstTwoPointerDistance = (): number => {
                const points = Array.from(activePointers.values());
                if (points.length < 2) {
                    return 0;
                }
                const dx = points[0][0] - points[1][0];
                const dy = points[0][1] - points[1][1];
                return Math.hypot(dx, dy);
            };
            const cancelWarpFrame = (): void => {
                if (warpFrame !== undefined) {
                    globalThis.cancelAnimationFrame(warpFrame);
                    warpFrame = undefined;
                }
            };
            const clearWheelZoomReference = (): void => {
                wheelZoomReference = undefined;
                if (wheelZoomReferenceTimer !== undefined) {
                    globalThis.clearTimeout(wheelZoomReferenceTimer);
                    wheelZoomReferenceTimer = undefined;
                }
            };
            const easeInOutCubic = (progress: number): number => progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            const shortestAngleDelta = (from: number, to: number): number =>
                (to - from + 540) % 360 - 180;
            const enterDrilldown = (datum: {
                data: T;
                lat: number;
                lon: number;
                projected: [number, number];
            }, mode: KChartGlobeDrilldownMode = drilldownConfiguration.mode, restoreZoomLevel?: number, moveCamera = true): void => {
                if (!drilldownConfiguration.enabled || externalMapTransitioning) {
                    return;
                }
                clearWheelZoomReference();
                hoveredMarkerTarget = undefined;
                if (warpTimer !== undefined) {
                    globalThis.clearTimeout(warpTimer);
                    warpTimer = undefined;
                }
                cancelWarpFrame();
                if (!focusedPoint) {
                    drilldownRestoreState = {
                        rotation: [...rotation],
                        zoomLevel: clampNumber(restoreZoomLevel ?? zoomLevel, minZoom, maxZoom)
                    };
                }
                focusedPoint = datum;
                if (mode === 'zoom') {
                    viewMode = 'globe';
                    rotation = [
                        -datum.lon,
                        -datum.lat,
                        rotation[2]
                    ];
                    zoomLevel = clampNumber(drilldownConfiguration.focusZoom, minZoom, maxZoom);
                } else if (mode === 'external-map') {
                    externalMapTransitioning = true;
                    viewMode = 'globe';
                } else {
                    viewMode = mode;
                }
                warpEffect = mode === 'external-map'
                    ? undefined
                    : {
                        x: datum.projected[0],
                        y: datum.projected[1],
                        startedAt: Date.now(),
                        duration: drilldownConfiguration.duration
                    };
                const notifyEnter = (): void => {
                    drilldownConfiguration.onEnter?.({
                        data: datum.data,
                        lat: datum.lat,
                        lon: datum.lon,
                        exit: () => exitDrilldown()
                    });
                };

                if (mode === 'external-map') {
                    const cameraDuration = moveCamera
                        ? Math.min(460, Math.max(280, drilldownConfiguration.duration * 0.34))
                        : 0;
                    const warpDuration = Math.max(600, drilldownConfiguration.duration - cameraDuration);
                    const startRotation: [number, number, number] = [...rotation];
                    const targetRotation: [number, number, number] = [
                        -datum.lon,
                        -datum.lat,
                        rotation[2]
                    ];
                    const longitudeDelta = shortestAngleDelta(startRotation[0], targetRotation[0]);
                    const startedAt = globalThis.performance.now();

                    const revealExternalMap = (): void => {
                        warpTimer = globalThis.setTimeout(() => {
                            warpTimer = undefined;
                            externalMapTransitioning = false;
                            viewMode = 'external-map';
                            warpEffect = undefined;
                            notifyEnter();
                            draw();
                        }, warpDuration);
                    };
                    const startWarp = (): void => {
                        warpEffect = {
                            x: centerX,
                            y: centerY,
                            startedAt: Date.now(),
                            duration: warpDuration
                        };
                        draw();
                        revealExternalMap();
                    };

                    if (!moveCamera) {
                        draw();
                        startWarp();
                        return;
                    }

                    const animateCamera = (now: number): void => {
                        const progress = clampNumber((now - startedAt) / cameraDuration, 0, 1);
                        const easedProgress = easeInOutCubic(progress);
                        rotation = [
                            startRotation[0] + longitudeDelta * easedProgress,
                            startRotation[1] + (targetRotation[1] - startRotation[1]) * easedProgress,
                            startRotation[2]
                        ];
                        draw();

                        if (progress < 1) {
                            warpFrame = globalThis.requestAnimationFrame(animateCamera);
                            return;
                        }

                        warpFrame = undefined;
                        rotation = targetRotation;
                        startWarp();
                    };

                    draw();
                    warpFrame = globalThis.requestAnimationFrame(animateCamera);
                    return;
                }

                notifyEnter();
                warpTimer = globalThis.setTimeout(() => {
                    warpTimer = undefined;
                    warpEffect = undefined;
                    draw();
                }, drilldownConfiguration.duration);
                draw();
            };
            const exitDrilldown = (restoreState = true): void => {
                if (viewMode === 'globe' && !focusedPoint) {
                    return;
                }
                if (warpTimer !== undefined) {
                    globalThis.clearTimeout(warpTimer);
                    warpTimer = undefined;
                }
                cancelWarpFrame();
                hoveredMarkerTarget = undefined;
                externalMapTransitioning = false;
                viewMode = 'globe';
                focusedPoint = undefined;
                if (restoreState && drilldownRestoreState) {
                    rotation = [...drilldownRestoreState.rotation];
                    zoomLevel = clampNumber(drilldownRestoreState.zoomLevel, minZoom, maxZoom);
                }
                drilldownRestoreState = undefined;
                warpEffect = undefined;
                drilldownConfiguration.onExit?.();
                draw();
            };
            const resolveAutoMapTarget = (reference?: [number, number]): {
                data: T;
                lat: number;
                lon: number;
                projected: [number, number];
            } | undefined => {
                let nearest: {
                    data: T;
                    lat: number;
                    lon: number;
                    projected: [number, number];
                    distance: number;
                } | undefined;
                const center: [number, number] = reference
                    ?? settledCenter;

                data.forEach((point) => {
                    const lat = resolveGlobePointValue(point, configuration.latField);
                    const lon = resolveGlobePointValue(point, configuration.lonField);
                    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isGlobePointVisible(lon, lat, rotation)) {
                        return;
                    }
                    const projected = globeProjection([lon, lat]);
                    if (!projected) {
                        return;
                    }
                    const distance = geoDistance(center, [lon, lat]);
                    if (!nearest || distance < nearest.distance) {
                        nearest = {
                            data: point,
                            lat,
                            lon,
                            projected,
                            distance
                        };
                    }
                });

                return nearest;
            };
            const syncZoomViewMode = (
                reference?: [number, number],
                preferredTarget?: { data: T; lat: number; lon: number; projected: [number, number] }
            ): boolean => {
                if (!drilldownConfiguration.enabled || !drilldownConfiguration.autoMapOnZoom || externalMapTransitioning) {
                    return false;
                }
                const enterThreshold = Math.max(
                    drilldownConfiguration.mapZoomThreshold,
                    drilldownConfiguration.globeZoomThreshold
                );
                const exitThreshold = Math.min(
                    drilldownConfiguration.mapZoomThreshold,
                    drilldownConfiguration.globeZoomThreshold
                );
                if (viewMode === 'globe' && zoomLevel >= enterThreshold) {
                    const target = preferredTarget ?? resolveAutoMapTarget(settledCenter);
                    if (target) {
                        const automaticTarget = {
                            ...target,
                            lon: settledCenter[0],
                            lat: settledCenter[1],
                            projected: [centerX, centerY] as [number, number]
                        };
                        enterDrilldown(
                            automaticTarget,
                            drilldownConfiguration.mode,
                            Math.min(zoomLevel, exitThreshold),
                            false
                        );
                        return true;
                    }
                }
                if (viewMode === 'map' && zoomLevel <= exitThreshold) {
                    exitDrilldown(false);
                    return true;
                }
                return false;
            };
            const applyGlobeZoom = (
                nextZoom: number,
                reference?: [number, number],
                preferredTarget?: { data: T; lat: number; lon: number; projected: [number, number] }
            ): void => {
                if (externalMapTransitioning) {
                    return;
                }
                zoomLevel = clampNumber(nextZoom, minZoom, maxZoom);
                if (!syncZoomViewMode(reference, preferredTarget)) {
                    draw();
                }
            };

            const draw = (): void => {
                globeProjection.rotate(rotation);
                globeProjection.scale(baseScale * zoomLevel);
                if (focusedPoint) {
                    mapProjection.center([focusedPoint.lon, focusedPoint.lat]);
                }
                mapProjection.scale(Math.max(1, Math.min(width, height) / Math.PI * drilldownConfiguration.zoomScale * zoomLevel));

                const globeGroup = group.selectAll<SVGGElement, unknown>('g.kchart-globe-layer')
                    .data([undefined])
                    .join('g')
                    .attr('class', 'kchart-globe-layer')
                    .style('cursor', configuration.draggable === false || viewMode === 'map' ? 'default' : dragging ? 'grabbing' : 'grab')
                    .style('touch-action', configuration.draggable === false && !zoomConfiguration.enabled ? null : 'none');

                globeGroup.selectAll<SVGPathElement, unknown>('path.kchart-globe-sphere')
                    .data(viewMode === 'globe' ? [{ type: 'Sphere' }] : [])
                    .join('path')
                    .attr('class', 'kchart-globe-sphere')
                    .attr('d', (datum: any) => path(datum) ?? '')
                    .style('fill', configuration.sphereFill ?? 'rgba(15, 23, 42, 0.92)')
                    .style('stroke', configuration.sphereStroke ?? 'rgba(148, 163, 184, 0.62)')
                    .style('stroke-width', 1.2)
                    .style('pointer-events', 'all');

                const defaultLandGeoJson = configuration.landMode === 'countries'
                    ? WORLD_COUNTRY_GEOJSON
                    : WORLD_LAND_GEOJSON;
                const landData = configuration.landVisible === false
                    ? []
                    : viewMode === 'external-map'
                        ? []
                        : normalizeGlobeLandFeatures(configuration.landGeoJson ?? defaultLandGeoJson);
                const activePath = viewMode === 'map' ? mapPath : path;
                const activeLandFill = viewMode === 'map'
                    ? drilldownConfiguration.landFill ?? configuration.landFill
                    : configuration.landFill;
                const activeLandStroke = viewMode === 'map'
                    ? drilldownConfiguration.landStroke ?? configuration.landStroke
                    : configuration.landStroke;
                const activeLandOpacity = viewMode === 'map'
                    ? drilldownConfiguration.landOpacity ?? configuration.landOpacity
                    : configuration.landOpacity;

                globeGroup.selectAll<SVGRectElement, unknown>('rect.kchart-globe-map-background')
                    .data(viewMode === 'map' ? [undefined] : [])
                    .join('rect')
                    .attr('class', 'kchart-globe-map-background')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', width)
                    .attr('height', height)
                    .style('fill', configuration.sphereFill ?? 'rgba(15, 23, 42, 0.92)')
                    .style('pointer-events', 'all')
                    .lower();

                globeGroup.selectAll<SVGPathElement, any>('path.kchart-globe-land')
                    .data(landData)
                    .join('path')
                    .attr('class', 'kchart-globe-land')
                    .attr('d', (datum: any) => activePath(datum) ?? '')
                    .style('fill', (datum, index) => resolveGlobeLandStyle(activeLandFill, datum, index, '#2dd4bf'))
                    .style('fill-opacity', (datum, index) => resolveGlobeLandOpacity(activeLandOpacity, datum, index))
                    .style('stroke', (datum, index) => resolveGlobeLandStyle(activeLandStroke, datum, index, 'rgba(236, 253, 245, 0.9)'))
                    .style('stroke-width', 1)
                    .style('pointer-events', 'none');

                globeGroup.selectAll<SVGPathElement, any>('path.kchart-globe-country-borders')
                    .data(configuration.countryBordersVisible === false || configuration.landVisible === false ? [] : [WORLD_COUNTRY_BORDERS_GEOJSON])
                    .join('path')
                    .attr('class', 'kchart-globe-country-borders')
                    .attr('d', (datum: any) => activePath(datum) ?? '')
                    .style('fill', 'none')
                    .style('stroke', configuration.countryBordersStroke ?? 'rgba(236, 253, 245, 0.26)')
                    .style('stroke-width', configuration.countryBordersStrokeWidth ?? 0.55)
                    .style('pointer-events', 'none');

                globeGroup.selectAll<SVGPathElement, unknown>('path.kchart-globe-graticule')
                    .data(configuration.graticuleVisible === false || viewMode === 'external-map' ? [] : [geoGraticule10()])
                    .join('path')
                    .attr('class', 'kchart-globe-graticule')
                    .attr('d', (datum: any) => activePath(datum) ?? '')
                    .style('fill', 'none')
                    .style('stroke', configuration.graticuleStroke ?? 'rgba(148, 163, 184, 0.22)')
                    .style('stroke-width', 0.8)
                    .style('pointer-events', 'none');

                const markerData = (viewMode === 'external-map' ? [] : data).map((point) => {
                    const lat = resolveGlobePointValue(point, configuration.latField);
                    const lon = resolveGlobePointValue(point, configuration.lonField);
                    const projected = viewMode === 'map'
                        ? mapProjection([lon, lat])
                        : globeProjection([lon, lat]);
                    return {
                        data: point,
                        lat,
                        lon,
                        projected,
                        visible: Boolean(projected) && (
                            viewMode === 'map'
                                ? true
                                : isGlobePointVisible(lon, lat, rotation)
                        )
                    };
                }).filter((point) => point.visible && point.projected) as Array<{
                    data: T;
                    lat: number;
                    lon: number;
                    projected: [number, number];
                    visible: boolean;
                }>;
                const markerSelectable = Boolean(configuration.onMarkerClick || drilldownConfiguration.enabled);
                const activateMarker = (event: MouseEvent, datum: typeof markerData[number]): void => {
                    if (!markerSelectable) {
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    enterDrilldown(datum);
                    configuration.onMarkerClick?.({
                        data: datum.data,
                        event,
                        lat: datum.lat,
                        lon: datum.lon,
                        x: datum.projected[0],
                        y: datum.projected[1]
                    });
                };
                const handleMarkerPointerDown = (event: PointerEvent, datum: typeof markerData[number]): void => {
                    if (!markerSelectable || event.button !== 0) {
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    markerPress = {
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startY: event.clientY,
                        moved: false,
                        datum
                    };
                    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
                };
                const handleMarkerPointerMove = (event: PointerEvent): void => {
                    if (!markerPress || markerPress.pointerId !== event.pointerId) {
                        return;
                    }
                    if (Math.hypot(event.clientX - markerPress.startX, event.clientY - markerPress.startY) > 5) {
                        markerPress.moved = true;
                    }
                };
                const handleMarkerPointerUp = (event: PointerEvent): void => {
                    if (!markerPress || markerPress.pointerId !== event.pointerId) {
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    const pressed = markerPress;
                    markerPress = undefined;
                    (event.currentTarget as Element).releasePointerCapture?.(event.pointerId);
                    if (!pressed.moved) {
                        activateMarker(event, pressed.datum as typeof markerData[number]);
                    }
                };
                const handleMarkerPointerCancel = (event: PointerEvent): void => {
                    if (markerPress?.pointerId === event.pointerId) {
                        markerPress = undefined;
                    }
                };

                const markerHitAreas = globeGroup.selectAll<SVGCircleElement, typeof markerData[number]>('circle.kchart-globe-marker-hit-area')
                    .data(markerData, (datum: any) => String(configuration.labelField ? datum.data[configuration.labelField] : `${datum.lat},${datum.lon}`));

                markerHitAreas.exit().remove();

                markerHitAreas.enter()
                    .append('circle')
                    .attr('class', 'kchart-globe-marker-hit-area')
                    .merge(markerHitAreas as any)
                    .attr('cx', (datum) => datum.projected[0])
                    .attr('cy', (datum) => datum.projected[1])
                    .attr('r', (datum) => Math.max(resolveGlobeMarkerRadius(datum.data, configuration) + 10, 16))
                    .style('fill', 'transparent')
                    .style('stroke', 'transparent')
                    .style('cursor', markerSelectable ? 'pointer' : 'default')
                    .style('pointer-events', markerSelectable ? 'all' : 'none')
                    .on('mouseenter.kchart-globe-zoom-target', (_event, datum) => {
                        hoveredMarkerTarget = datum;
                    })
                    .on('mouseleave.kchart-globe-zoom-target', () => {
                        hoveredMarkerTarget = undefined;
                    })
                    .on('click', null)
                    .on('pointerdown.kchart-globe-marker-press', handleMarkerPointerDown)
                    .on('pointermove.kchart-globe-marker-press', handleMarkerPointerMove)
                    .on('pointerup.kchart-globe-marker-press', handleMarkerPointerUp)
                    .on('pointercancel.kchart-globe-marker-press', handleMarkerPointerCancel);

                const markers = globeGroup.selectAll<SVGCircleElement, typeof markerData[number]>('circle.kchart-globe-marker')
                    .data(markerData, (datum: any) => String(configuration.labelField ? datum.data[configuration.labelField] : `${datum.lat},${datum.lon}`));

                markers.exit().remove();

                markers.enter()
                    .append('circle')
                    .attr('class', 'kchart-globe-marker')
                    .style('cursor', markerSelectable ? 'pointer' : 'default')
                    .style('pointer-events', 'all')
                    .merge(markers as any)
                    .attr('cx', (datum) => datum.projected[0])
                    .attr('cy', (datum) => datum.projected[1])
                    .attr('r', (datum) => resolveGlobeMarkerRadius(datum.data, configuration))
                    .style('fill', (datum) => resolveGlobeMarkerColor(datum.data, configuration, color))
                    .style('stroke', configuration.markerStroke ?? 'rgba(248, 251, 255, 0.92)')
                    .style('stroke-width', configuration.markerStrokeWidth ?? 1.4)
                    .style('opacity', configuration.markerOpacity ?? 0.95)
                    .on('mouseenter.kchart-globe-zoom-target', (_event, datum) => {
                        hoveredMarkerTarget = datum;
                    })
                    .on('mouseleave.kchart-globe-zoom-target', () => {
                        hoveredMarkerTarget = undefined;
                    })
                    .on('click', null)
                    .on('pointerdown.kchart-globe-marker-press', handleMarkerPointerDown)
                    .on('pointermove.kchart-globe-marker-press', handleMarkerPointerMove)
                    .on('pointerup.kchart-globe-marker-press', handleMarkerPointerUp)
                    .on('pointercancel.kchart-globe-marker-press', handleMarkerPointerCancel);

                const labels = globeGroup.selectAll<SVGTextElement, typeof markerData[number]>('text.kchart-globe-marker-label')
                    .data(configuration.labelField ? markerData : [], (datum: any) => String(datum.data[configuration.labelField as keyof T & string]));

                labels.exit().remove();

                labels.enter()
                    .append('text')
                    .attr('class', 'kchart-globe-marker-label')
                    .merge(labels as any)
                    .attr('x', (datum) => datum.projected[0] + resolveGlobeMarkerRadius(datum.data, configuration) + 5)
                    .attr('y', (datum) => datum.projected[1] + 4)
                    .style('fill', 'rgba(248, 251, 255, 0.82)')
                    .style('font-size', '11px')
                    .style('font-weight', 700)
                    .style('cursor', markerSelectable ? 'pointer' : 'default')
                    .style('pointer-events', markerSelectable ? 'all' : 'none')
                    .text((datum) => String(datum.data[configuration.labelField as keyof T & string]))
                    .on('mouseenter.kchart-globe-zoom-target', (_event, datum) => {
                        hoveredMarkerTarget = datum;
                    })
                    .on('mouseleave.kchart-globe-zoom-target', () => {
                        hoveredMarkerTarget = undefined;
                    })
                    .on('click', null)
                    .on('pointerdown.kchart-globe-marker-press', handleMarkerPointerDown)
                    .on('pointermove.kchart-globe-marker-press', handleMarkerPointerMove)
                    .on('pointerup.kchart-globe-marker-press', handleMarkerPointerUp)
                    .on('pointercancel.kchart-globe-marker-press', handleMarkerPointerCancel);

                const activeWarpDuration = Math.max(480, warpEffect?.duration ?? drilldownConfiguration.duration);
                const warpData = warpEffect
                    ? [0, 1, 2].map((index) => ({...warpEffect, index}))
                    : [];
                const warpRings = globeGroup.selectAll<SVGCircleElement, typeof warpData[number]>('circle.kchart-globe-warp-ring')
                    .data(warpData, (datum: any) => datum.index);

                warpRings.exit().remove();

                const warpRingsEnter = warpRings.enter()
                    .append('circle')
                    .attr('class', 'kchart-globe-warp-ring')
                    .style('fill', 'none')
                    .style('pointer-events', 'none');

                warpRingsEnter.append('animate')
                    .attr('attributeName', 'r')
                    .attr('begin', (datum) => `${datum.index * 80}ms`)
                    .attr('dur', `${activeWarpDuration}ms`)
                    .attr('values', `12;${Math.max(width, height) * 0.78}`)
                    .attr('keyTimes', '0;1')
                    .attr('calcMode', 'spline')
                    .attr('keySplines', '0.18 0.72 0.2 1')
                    .attr('fill', 'freeze');

                warpRingsEnter.append('animate')
                    .attr('attributeName', 'opacity')
                    .attr('begin', (datum) => `${datum.index * 80}ms`)
                    .attr('dur', `${activeWarpDuration}ms`)
                    .attr('values', '0;1;0')
                    .attr('keyTimes', '0;0.16;1')
                    .attr('fill', 'freeze');

                warpRingsEnter.merge(warpRings as any)
                    .attr('cx', (datum) => datum.x)
                    .attr('cy', (datum) => datum.y)
                    .attr('r', 12)
                    .style('stroke', (datum) => datum.index === 0 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(93, 184, 255, 0.62)')
                    .style('stroke-width', (datum) => 3 - datum.index * 0.55)
                    .style('stroke-dasharray', (datum) => datum.index === 0 ? 'none' : '6 10')
                    .style('filter', 'drop-shadow(0 0 8px rgba(93, 184, 255, 0.9))');

                const warpFlash = globeGroup.selectAll<SVGCircleElement, typeof warpData[number]>('circle.kchart-globe-warp-flash')
                    .data(warpEffect ? [warpEffect] : []);

                warpFlash.exit().remove();

                const warpFlashEnter = warpFlash.enter()
                    .append('circle')
                    .attr('class', 'kchart-globe-warp-flash')
                    .style('fill', 'rgba(248, 251, 255, 0.96)')
                    .style('pointer-events', 'none')
                    .style('filter', 'drop-shadow(0 0 18px rgba(93, 184, 255, 1))');

                warpFlashEnter.append('animate')
                    .attr('attributeName', 'r')
                    .attr('dur', `${activeWarpDuration}ms`)
                    .attr('values', `5;${Math.max(width, height) * 0.42}`)
                    .attr('keyTimes', '0;1')
                    .attr('fill', 'freeze');

                warpFlashEnter.append('animate')
                    .attr('attributeName', 'opacity')
                    .attr('dur', `${activeWarpDuration}ms`)
                    .attr('values', '1;0.72;0')
                    .attr('keyTimes', '0;0.18;1')
                    .attr('fill', 'freeze');

                warpFlashEnter.merge(warpFlash as any)
                    .attr('cx', (datum) => datum.x)
                    .attr('cy', (datum) => datum.y)
                    .attr('r', 5);

                const warpLines = globeGroup.selectAll<SVGLineElement, number>('line.kchart-globe-warp-line')
                    .data(warpEffect ? Array.from({length: 18}, (_, index) => index) : []);

                warpLines.exit().remove();

                const warpLinesEnter = warpLines.enter()
                    .append('line')
                    .attr('class', 'kchart-globe-warp-line')
                    .style('stroke', 'rgba(248, 251, 255, 0.5)')
                    .style('stroke-width', 1.4)
                    .style('stroke-dasharray', '18 12')
                    .style('pointer-events', 'none');

                warpLinesEnter.append('animate')
                    .attr('attributeName', 'opacity')
                    .attr('dur', `${activeWarpDuration}ms`)
                    .attr('values', '0;0.85;0')
                    .attr('keyTimes', '0;0.22;1')
                    .attr('fill', 'freeze');

                warpLinesEnter.append('animate')
                    .attr('attributeName', 'stroke-dashoffset')
                    .attr('dur', `${activeWarpDuration}ms`)
                    .attr('from', '180')
                    .attr('to', '0')
                    .attr('fill', 'freeze');

                warpLinesEnter.merge(warpLines as any)
                    .attr('x1', (index) => (warpEffect?.x ?? centerX) + Math.cos(index / 18 * Math.PI * 2) * 18)
                    .attr('y1', (index) => (warpEffect?.y ?? centerY) + Math.sin(index / 18 * Math.PI * 2) * 18)
                    .attr('x2', (index) => (warpEffect?.x ?? centerX) + Math.cos(index / 18 * Math.PI * 2) * Math.max(width, height))
                    .attr('y2', (index) => (warpEffect?.y ?? centerY) + Math.sin(index / 18 * Math.PI * 2) * Math.max(width, height))
                    .style('filter', 'drop-shadow(0 0 5px rgba(93, 184, 255, 0.82))');

                const zoomControlsVisible = zoomConfiguration.enabled && zoomControlsConfiguration.visible;
                const drilldownResetVisible = Boolean(focusedPoint)
                    && drilldownConfiguration.resetControl
                    && !externalMapTransitioning;
                const controlsVisible = zoomControlsVisible || drilldownResetVisible;
                const controlsX = Math.max(
                    -margin.left,
                    size.width - margin.left - zoomControlsConfiguration.x - 34
                );
                const controlsY = Math.max(-margin.top, zoomControlsConfiguration.y - margin.top);
                const controlItems = [
                    ...(zoomControlsVisible ? [
                        { key: 'in', label: '+', title: 'Zoom in' },
                        { key: 'reset', label: `${Math.round(zoomLevel * 100)}%`, title: 'Reset zoom' },
                        { key: 'out', label: '-', title: 'Zoom out' }
                    ] : []),
                    ...(drilldownResetVisible ? [
                        { key: 'globe', label: 'G', title: 'Back to globe' }
                    ] : [])
                ].map((item, index) => ({...item, y: index * 31}));
                const zoomControls = globeGroup.selectAll<SVGGElement, unknown>('g.kchart-globe-zoom-controls')
                    .data(controlsVisible ? [undefined] : []);

                zoomControls.exit().remove();

                const zoomControlsEnter = zoomControls.enter()
                    .append('g')
                    .attr('class', 'kchart-globe-zoom-controls')
                    .style('pointer-events', 'all');

                const zoomControlsMerged = zoomControlsEnter
                    .merge(zoomControls as any)
                    .attr('transform', `translate(${controlsX},${controlsY})`);

                const controlButtons = zoomControlsMerged.selectAll<SVGGElement, typeof controlItems[number]>('g.kchart-globe-zoom-control')
                    .data(controlItems, (datum: any) => datum.key);

                controlButtons.exit().remove();

                const controlButtonsEnter = controlButtons.enter()
                    .append('g')
                    .attr('class', 'kchart-globe-zoom-control')
                    .style('cursor', 'pointer')
                    .on('pointerdown', (event: PointerEvent) => {
                        event.preventDefault();
                        event.stopPropagation();
                    })
                    .on('click', (event: MouseEvent, datum) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (datum.key === 'in') {
                            applyGlobeZoom(zoomLevel * (1 + zoomControlsConfiguration.step));
                            return;
                        }
                        if (datum.key === 'out') {
                            applyGlobeZoom(zoomLevel / (1 + zoomControlsConfiguration.step));
                            return;
                        }
                        if (datum.key === 'globe') {
                            exitDrilldown();
                            return;
                        }
                        applyGlobeZoom(1);
                    });

                controlButtonsEnter.append('rect')
                    .attr('class', 'kchart-globe-zoom-control-bg')
                    .attr('width', 34)
                    .attr('height', 27)
                    .attr('rx', 6);

                controlButtonsEnter.append('text')
                    .attr('class', 'kchart-globe-zoom-control-label')
                    .attr('x', 17)
                    .attr('y', 18)
                    .attr('text-anchor', 'middle');

                controlButtonsEnter.append('title');

                const controlButtonsMerged = controlButtonsEnter.merge(controlButtons as any)
                    .attr('transform', (datum) => `translate(0,${datum.y})`)
                    .style('opacity', (datum) => {
                        if (datum.key === 'in' && zoomLevel >= maxZoom) return 0.48;
                        if (datum.key === 'out' && zoomLevel <= minZoom) return 0.48;
                        return 1;
                    });

                controlButtonsMerged.select('rect.kchart-globe-zoom-control-bg')
                    .style('fill', 'rgba(15, 23, 42, 0.72)')
                    .style('stroke', 'rgba(226, 232, 240, 0.42)')
                    .style('stroke-width', 1);

                controlButtonsMerged.select('text.kchart-globe-zoom-control-label')
                    .style('fill', 'rgba(248, 251, 255, 0.92)')
                    .style('font-size', (datum) => datum.key === 'reset' ? '10px' : '17px')
                    .style('font-weight', 800)
                    .text((datum) => datum.label);

                controlButtonsMerged.select('title')
                    .text((datum) => datum.title);
            };

            draw();

            const globeLayer = group.select<SVGGElement>('g.kchart-globe-layer');
            globeLayer.on('.kchart-globe-drag', null);
            globeLayer.on('.kchart-globe-zoom', null);

            if (zoomConfiguration.enabled && zoomConfiguration.wheel) {
                globeLayer.on('wheel.kchart-globe-zoom', (event: WheelEvent) => {
                    event.preventDefault();
                    if (!wheelZoomReference) {
                        const currentPoint = pointer(event, globeLayer.node() as any) as [number, number];
                        const reference = globeProjection.invert?.(currentPoint) as [number, number] | null | undefined;
                        if (reference && Number.isFinite(reference[0]) && Number.isFinite(reference[1])) {
                            wheelZoomReference = reference;
                        }
                    }
                    if (wheelZoomReferenceTimer !== undefined) {
                        globalThis.clearTimeout(wheelZoomReferenceTimer);
                    }
                    wheelZoomReferenceTimer = globalThis.setTimeout(() => {
                        wheelZoomReference = undefined;
                        wheelZoomReferenceTimer = undefined;
                    }, 180);
                    const zoomDelta = Math.exp(-event.deltaY * zoomConfiguration.wheelSensitivity);
                    applyGlobeZoom(zoomLevel * zoomDelta, wheelZoomReference, hoveredMarkerTarget);
                });
            }

            if (configuration.draggable !== false || (zoomConfiguration.enabled && zoomConfiguration.pinch)) {
                globeLayer
                    .on('pointerdown.kchart-globe-drag', (event: PointerEvent) => {
                        const eventTarget = event.target as Element | null;
                        if (eventTarget?.closest(
                            '.kchart-globe-marker-hit-area, .kchart-globe-marker, .kchart-globe-marker-label'
                        )) {
                            return;
                        }
                        const currentPoint = pointer(event, group.node() as any) as [number, number];
                        if (zoomConfiguration.enabled && zoomConfiguration.pinch) {
                            activePointers.set(event.pointerId, currentPoint);
                        }
                        if (zoomConfiguration.enabled && zoomConfiguration.pinch && activePointers.size >= 2) {
                            dragging = false;
                            pinchStartDistance = getFirstTwoPointerDistance();
                            pinchStartZoom = zoomLevel;
                        } else if (configuration.draggable !== false && viewMode === 'globe') {
                            dragging = true;
                            dragStart = currentPoint;
                            rotationStart = [...rotation];
                        }
                        (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
                        event.preventDefault();
                        draw();
                    })
                    .on('pointermove.kchart-globe-drag', (event: PointerEvent) => {
                        if (zoomConfiguration.enabled && zoomConfiguration.pinch && activePointers.has(event.pointerId)) {
                            activePointers.set(event.pointerId, pointer(event, group.node() as any) as [number, number]);
                        }
                        if (zoomConfiguration.enabled && zoomConfiguration.pinch && activePointers.size >= 2) {
                            const distance = getFirstTwoPointerDistance();
                            if (pinchStartDistance > 0 && distance > 0) {
                                applyGlobeZoom(pinchStartZoom * distance / pinchStartDistance);
                            }
                            event.preventDefault();
                            return;
                        }
                        if (!dragging) {
                            return;
                        }
                        const [mouseX, mouseY] = pointer(event, group.node() as any);
                        const dx = mouseX - dragStart[0];
                        const dy = mouseY - dragStart[1];
                        rotation = [
                            rotationStart[0] + dx / Math.max(width, 1) * 360,
                            clampNumber(rotationStart[1] - dy / Math.max(height, 1) * 180, -89, 89),
                            rotationStart[2]
                        ];
                        event.preventDefault();
                        draw();
                    })
                    .on('pointerup.kchart-globe-drag pointercancel.kchart-globe-drag', (event: PointerEvent) => {
                        activePointers.delete(event.pointerId);
                        if (activePointers.size < 2) {
                            pinchStartDistance = 0;
                            pinchStartZoom = zoomLevel;
                        }
                        dragging = false;
                        settledCenter = resolveGlobeCenter();
                        (event.currentTarget as Element).releasePointerCapture?.(event.pointerId);
                        draw();
                    });
            }
        },
        destroy({ plotGroup }) {
            if (warpTimer !== undefined) {
                globalThis.clearTimeout(warpTimer);
                warpTimer = undefined;
            }
            if (warpFrame !== undefined) {
                globalThis.cancelAnimationFrame(warpFrame);
                warpFrame = undefined;
            }
            wheelZoomReference = undefined;
            hoveredMarkerTarget = undefined;
            markerPress = undefined;
            if (wheelZoomReferenceTimer !== undefined) {
                globalThis.clearTimeout(wheelZoomReferenceTimer);
                wheelZoomReferenceTimer = undefined;
            }
            externalMapTransitioning = false;
            plotGroup.selectAll(`g.series-${configuration.selector} g.kchart-globe-layer`).on('.kchart-globe-drag', null);
            plotGroup.selectAll(`g.series-${configuration.selector} g.kchart-globe-layer`).on('.kchart-globe-zoom', null);
        }
    });
};
