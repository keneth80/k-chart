import maplibregl from 'maplibre-gl';
import type {
    ExpressionSpecification,
    GeoJSONSource,
    LngLatBoundsLike,
    Map as MapLibreMap,
    MapGeoJSONFeature,
    MapLayerMouseEvent,
    MapMouseEvent,
    StyleSpecification
} from 'maplibre-gl';
import type {KChartMapLibrePlace} from './place-data';

export {
    createMapLibrePlaceResolver,
    parseMapLibrePlaces
} from './place-data';
export type {
    KChartMapLibrePlace,
    KChartMapLibrePlaceParserOptions,
    KChartMapLibrePlaceResolverOptions
} from './place-data';

export interface KChartMapLibreShowOptions<T extends KChartMapLibrePlace> {
    lat: number;
    lon: number;
    label?: string;
    zoom?: number;
    places?: T[];
    exit?: () => void;
}

export interface KChartMapLibreToolbarOptions {
    visible?: boolean;
    location?: boolean;
    backButton?: boolean;
}

export interface KChartMapLibreClusterStyleStep {
    minPointCount: number;
    color?: string;
    radius?: number;
}

export interface KChartMapLibreClusterStyle {
    color?: string;
    radius?: number;
    steps?: readonly KChartMapLibreClusterStyleStep[];
    strokeColor?: string;
    strokeWidth?: number;
    textColor?: string;
    textSize?: number;
}

export interface KChartMapLibreClusterContext {
    clusterId: number;
    pointCount: number;
    coordinates: [number, number];
    feature: MapGeoJSONFeature;
    event: MapLayerMouseEvent;
    map: MapLibreMap;
}

export interface KChartMapLibreClusterClickContext extends KChartMapLibreClusterContext {
    expansionZoom: number;
}

export interface KChartMapLibreClusterHoverContext extends KChartMapLibreClusterContext {
    type: 'enter' | 'leave';
    hovered: boolean;
}

export interface KChartMapLibreConfiguration<T extends KChartMapLibrePlace> {
    container: string | HTMLElement;
    style: string | StyleSpecification;
    initialZoom?: number;
    minZoom?: number;
    maxZoom?: number;
    renderWorldCopies?: boolean;
    maxBounds?: LngLatBoundsLike;
    cluster?: boolean;
    clusterRadius?: number;
    clusterStyle?: KChartMapLibreClusterStyle;
    markerColor?: string;
    toolbar?: KChartMapLibreToolbarOptions;
    onClusterClick?: (context: KChartMapLibreClusterClickContext) => void;
    onClusterHover?: (context: KChartMapLibreClusterHoverContext) => void;
    onPlaceClick?: (context: {
        place: T;
        event: MapMouseEvent;
        map: MapLibreMap;
    }) => void;
}

export interface KChartMapLibreController<T extends KChartMapLibrePlace> {
    show(options: KChartMapLibreShowOptions<T>): Promise<void>;
    hide(): void;
    setPlaces(places: T[]): void;
    addPlaces(places: T[]): void;
    flyTo(options: { lat: number; lon: number; zoom?: number }): void;
    resize(): void;
    destroy(): void;
    getMap(): MapLibreMap | undefined;
}

export interface KChartMapLibreGlobeBridge<TCity, TPlace extends KChartMapLibrePlace> {
    onEnter(context: {
        data: TCity;
        lat: number;
        lon: number;
        exit: () => void;
    }): void | Promise<void>;
    onExit(): void;
}

const SOURCE_ID = 'kchart-maplibre-places';
const CLUSTER_LAYER_ID = 'kchart-maplibre-place-clusters';
const CLUSTER_COUNT_LAYER_ID = 'kchart-maplibre-place-cluster-count';
const PLACE_LAYER_ID = 'kchart-maplibre-places';

const DEFAULT_CLUSTER_STYLE_STEPS: readonly KChartMapLibreClusterStyleStep[] = [
    {minPointCount: 20, radius: 24},
    {minPointCount: 60, radius: 30}
];

const createClusterStepExpression = <T extends string | number>(
    baseValue: T,
    steps: readonly KChartMapLibreClusterStyleStep[],
    getValue: (step: KChartMapLibreClusterStyleStep) => T | undefined
): T | ExpressionSpecification => {
    const valuesByThreshold = new Map<number, T>();
    steps.forEach((step) => {
        const value = getValue(step);
        if (
            Number.isFinite(step.minPointCount)
            && step.minPointCount > 0
            && value !== undefined
        ) {
            valuesByThreshold.set(step.minPointCount, value);
        }
    });
    const stops = Array.from(valuesByThreshold, ([minPointCount, value]) => ({
        minPointCount,
        value
    }))
        .sort((left, right) => left.minPointCount - right.minPointCount);
    if (stops.length === 0) {
        return baseValue;
    }
    return [
        'step',
        ['get', 'point_count'],
        baseValue,
        ...stops.flatMap(({minPointCount, value}) => [minPointCount, value])
    ] as ExpressionSpecification;
};

const resolveContainer = (container: string | HTMLElement): HTMLElement => {
    const node = typeof container === 'string'
        ? document.querySelector<HTMLElement>(container)
        : container;
    if (!node) {
        throw new Error('KChart MapLibre container not found.');
    }
    return node;
};

const toFeatureCollection = <T extends KChartMapLibrePlace>(places: T[]) => ({
    type: 'FeatureCollection' as const,
    features: places.map((place) => ({
        type: 'Feature' as const,
        id: place.id,
        geometry: {
            type: 'Point' as const,
            coordinates: [place.lon, place.lat]
        },
        properties: {
            id: place.id,
            name: place.name,
            category: place.category ?? '',
            address: place.address ?? '',
            description: place.description ?? ''
        }
    }))
});

const createPopupContent = (place: KChartMapLibrePlace): HTMLElement => {
    const content = document.createElement('article');
    content.className = 'kchart-maplibre-popup-content';
    const title = document.createElement('strong');
    title.textContent = place.name;
    content.appendChild(title);

    if (place.category) {
        const category = document.createElement('span');
        category.className = 'kchart-maplibre-popup-category';
        category.textContent = place.category;
        content.appendChild(category);
    }
    if (place.address) {
        const address = document.createElement('p');
        address.textContent = place.address;
        content.appendChild(address);
    }
    if (place.description) {
        const description = document.createElement('p');
        description.textContent = place.description;
        content.appendChild(description);
    }
    return content;
};

export const createMapLibreFlatMap = <T extends KChartMapLibrePlace>(
    configuration: KChartMapLibreConfiguration<T>
): KChartMapLibreController<T> => {
    const host = resolveContainer(configuration.container);
    const overlay = document.createElement('section');
    const mapContainer = document.createElement('div');
    const toolbar = document.createElement('div');
    const locationLabel = document.createElement('strong');
    const backButton = document.createElement('button');

    overlay.className = 'kchart-maplibre-overlay';
    overlay.hidden = true;
    mapContainer.className = 'kchart-maplibre-canvas';
    toolbar.className = 'kchart-maplibre-toolbar';
    locationLabel.className = 'kchart-maplibre-location';
    backButton.className = 'kchart-maplibre-back';
    backButton.type = 'button';
    backButton.setAttribute('aria-label', 'Back to globe');
    backButton.title = 'Back to globe';
    backButton.textContent = 'G';
    const showToolbar = configuration.toolbar?.visible ?? true;
    const showLocation = showToolbar && (configuration.toolbar?.location ?? true);
    const showBackButton = showToolbar && (configuration.toolbar?.backButton ?? true);
    toolbar.hidden = !showToolbar || (!showLocation && !showBackButton);
    locationLabel.hidden = !showLocation;
    backButton.hidden = !showBackButton;
    toolbar.append(locationLabel, backButton);
    overlay.append(mapContainer, toolbar);
    host.appendChild(overlay);

    let map: MapLibreMap | undefined;
    let places: T[] = [];
    let exit: (() => void) | undefined;
    let readyPromise: Promise<void> | undefined;
    let hoveredCluster: Omit<KChartMapLibreClusterContext, 'event' | 'map'> | undefined;
    let interactionGeneration = 0;
    let visible = false;

    const findPlace = (id: unknown): T | undefined =>
        places.find((place) => String(place.id) === String(id));

    const updateSource = (): void => {
        interactionGeneration += 1;
        const source = map?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        source?.setData(toFeatureCollection(places));
    };

    const resolveClusterContext = (
        event: MapLayerMouseEvent
    ): Omit<KChartMapLibreClusterContext, 'event' | 'map'> | undefined => {
        const feature = event.features?.[0]
            ?? map?.queryRenderedFeatures(event.point, {layers: [CLUSTER_LAYER_ID]})[0];
        const clusterId = Number(feature?.properties?.cluster_id);
        const pointCount = Number(feature?.properties?.point_count);
        if (
            !feature
            || feature.geometry.type !== 'Point'
            || !Number.isFinite(clusterId)
            || !Number.isFinite(pointCount)
        ) {
            return undefined;
        }
        const [lon, lat] = feature.geometry.coordinates;
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
            return undefined;
        }
        return {
            clusterId,
            pointCount,
            coordinates: [lon, lat],
            feature
        };
    };

    const addPlaceLayers = (): void => {
        if (!map || map.getSource(SOURCE_ID)) {
            return;
        }
        map.addSource(SOURCE_ID, {
            type: 'geojson',
            data: toFeatureCollection(places),
            cluster: configuration.cluster ?? true,
            clusterRadius: configuration.clusterRadius ?? 46
        });
        const clusterStyle = configuration.clusterStyle;
        const clusterStyleSteps = clusterStyle?.steps ?? DEFAULT_CLUSTER_STYLE_STEPS;
        map.addLayer({
            id: CLUSTER_LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': createClusterStepExpression(
                    clusterStyle?.color ?? '#0f766e',
                    clusterStyleSteps,
                    (step) => step.color
                ),
                'circle-radius': createClusterStepExpression(
                    clusterStyle?.radius ?? 18,
                    clusterStyleSteps,
                    (step) => step.radius
                ),
                'circle-stroke-color': clusterStyle?.strokeColor ?? '#ecfeff',
                'circle-stroke-width': clusterStyle?.strokeWidth ?? 2
            }
        });
        map.addLayer({
            id: CLUSTER_COUNT_LAYER_ID,
            type: 'symbol',
            source: SOURCE_ID,
            filter: ['has', 'point_count'],
            layout: {
                'text-field': ['get', 'point_count_abbreviated'],
                'text-size': clusterStyle?.textSize ?? 12
            },
            paint: {
                'text-color': clusterStyle?.textColor ?? '#f8fafc'
            }
        });
        map.addLayer({
            id: PLACE_LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': configuration.markerColor ?? '#38bdf8',
                'circle-radius': 8,
                'circle-stroke-color': '#f8fafc',
                'circle-stroke-width': 2
            }
        });

        map.on('click', CLUSTER_LAYER_ID, async (event) => {
            const cluster = resolveClusterContext(event);
            const source = map?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
            if (!map || !source || !cluster || !visible) {
                return;
            }
            const currentMap = map;
            const requestGeneration = interactionGeneration;
            let expansionZoom: number;
            try {
                expansionZoom = await source.getClusterExpansionZoom(cluster.clusterId);
            } catch {
                // Cluster ids can become stale while GeoJSON data or styles are refreshed.
                return;
            }
            if (
                map !== currentMap
                || !visible
                || interactionGeneration !== requestGeneration
            ) {
                return;
            }
            currentMap.easeTo({center: cluster.coordinates, zoom: expansionZoom});
            configuration.onClusterClick?.({
                ...cluster,
                expansionZoom,
                event,
                map: currentMap
            });
        });
        map.on('click', PLACE_LAYER_ID, (event) => {
            const place = findPlace(event.features?.[0]?.properties?.id);
            if (!place || !map) {
                return;
            }
            new maplibregl.Popup({offset: 14})
                .setLngLat([place.lon, place.lat])
                .setDOMContent(createPopupContent(place))
                .addTo(map);
            configuration.onPlaceClick?.({place, event, map});
        });
        const updateHoveredCluster = (event: MapLayerMouseEvent): void => {
            if (!map) return;
            map.getCanvas().style.cursor = 'pointer';
            const nextCluster = resolveClusterContext(event);
            if (!nextCluster || nextCluster.clusterId === hoveredCluster?.clusterId) {
                return;
            }
            if (hoveredCluster) {
                configuration.onClusterHover?.({
                    ...hoveredCluster,
                    type: 'leave',
                    hovered: false,
                    event,
                    map
                });
            }
            hoveredCluster = nextCluster;
            configuration.onClusterHover?.({
                ...nextCluster,
                type: 'enter',
                hovered: true,
                event,
                map
            });
        };
        map.on('mouseenter', CLUSTER_LAYER_ID, updateHoveredCluster);
        map.on('mousemove', CLUSTER_LAYER_ID, updateHoveredCluster);
        map.on('mouseleave', CLUSTER_LAYER_ID, (event) => {
            if (!map) return;
            map.getCanvas().style.cursor = '';
            if (hoveredCluster) {
                configuration.onClusterHover?.({
                    ...hoveredCluster,
                    type: 'leave',
                    hovered: false,
                    event,
                    map
                });
                hoveredCluster = undefined;
            }
        });
        map.on('mouseenter', PLACE_LAYER_ID, () => {
            if (map) map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', PLACE_LAYER_ID, () => {
            if (map) map.getCanvas().style.cursor = '';
        });
    };

    const ensureMap = (): Promise<void> => {
        if (readyPromise) {
            return readyPromise;
        }
        const worldOptions = {
            ...(configuration.renderWorldCopies === undefined
                ? {}
                : {renderWorldCopies: configuration.renderWorldCopies}),
            ...(configuration.maxBounds === undefined
                ? {}
                : {maxBounds: configuration.maxBounds})
        };
        map = new maplibregl.Map({
            container: mapContainer,
            style: configuration.style,
            center: [0, 0],
            zoom: configuration.initialZoom ?? 12,
            minZoom: configuration.minZoom ?? 2,
            maxZoom: configuration.maxZoom ?? 19,
            ...worldOptions
        });
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        readyPromise = new Promise((resolve, reject) => {
            map?.once('load', () => {
                addPlaceLayers();
                resolve();
            });
            map?.once('error', (event) => {
                if (!map?.loaded()) {
                    reject(event.error ?? new Error('MapLibre failed to load.'));
                }
            });
        });
        return readyPromise;
    };

    backButton.addEventListener('click', () => exit?.());

    return {
        async show(options) {
            interactionGeneration += 1;
            visible = true;
            places = options.places ?? places;
            exit = options.exit;
            locationLabel.textContent = options.label ?? '';
            const target = {
                center: [options.lon, options.lat] as [number, number],
                zoom: options.zoom ?? configuration.initialZoom ?? 12
            };
            map?.jumpTo(target);
            overlay.hidden = false;
            try {
                await ensureMap();
                updateSource();
                map?.jumpTo(target);
                map?.resize();
            } catch (error) {
                visible = false;
                interactionGeneration += 1;
                overlay.hidden = true;
                exit = undefined;
                map?.remove();
                map = undefined;
                readyPromise = undefined;
                throw error;
            }
        },
        hide() {
            visible = false;
            interactionGeneration += 1;
            overlay.hidden = true;
            exit = undefined;
        },
        setPlaces(nextPlaces) {
            places = [...nextPlaces];
            updateSource();
        },
        addPlaces(nextPlaces) {
            const byId = new Map(places.map((place) => [String(place.id), place]));
            nextPlaces.forEach((place) => byId.set(String(place.id), place));
            places = Array.from(byId.values());
            updateSource();
        },
        flyTo(options) {
            map?.flyTo({
                center: [options.lon, options.lat],
                zoom: options.zoom ?? configuration.initialZoom ?? 12,
                duration: 900,
                essential: true
            });
        },
        resize() {
            map?.resize();
        },
        destroy() {
            visible = false;
            interactionGeneration += 1;
            map?.remove();
            map = undefined;
            readyPromise = undefined;
            hoveredCluster = undefined;
            overlay.remove();
        },
        getMap() {
            return map;
        }
    };
};

export const createMapLibreGlobeBridge = <TCity, TPlace extends KChartMapLibrePlace>(
    controller: KChartMapLibreController<TPlace>,
    resolvePlaces: (city: TCity) => TPlace[] | Promise<TPlace[]>,
    options: {
        getLabel?: (city: TCity) => string;
        zoom?: number;
    } = {}
): KChartMapLibreGlobeBridge<TCity, TPlace> => ({
    async onEnter(context) {
        try {
            await controller.show({
                lat: context.lat,
                lon: context.lon,
                label: options.getLabel?.(context.data),
                zoom: options.zoom,
                places: await resolvePlaces(context.data),
                exit: context.exit
            });
        } catch (error) {
            controller.hide();
            context.exit();
            console.error('[KChart MapLibre] Failed to show the drilldown map.', error);
        }
    },
    onExit() {
        controller.hide();
    }
});
