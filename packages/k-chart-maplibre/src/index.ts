import maplibregl, {
    GeoJSONSource,
    Map as MapLibreMap,
    MapMouseEvent,
    StyleSpecification
} from 'maplibre-gl';

export interface KChartMapLibrePlace {
    id: string;
    name: string;
    lat: number;
    lon: number;
    category?: string;
    address?: string;
    description?: string;
}

export interface KChartMapLibreShowOptions<T extends KChartMapLibrePlace> {
    lat: number;
    lon: number;
    label?: string;
    zoom?: number;
    places?: T[];
    exit?: () => void;
}

export interface KChartMapLibreConfiguration<T extends KChartMapLibrePlace> {
    container: string | HTMLElement;
    style: string | StyleSpecification;
    initialZoom?: number;
    minZoom?: number;
    maxZoom?: number;
    cluster?: boolean;
    clusterRadius?: number;
    markerColor?: string;
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
    toolbar.append(locationLabel, backButton);
    overlay.append(mapContainer, toolbar);
    host.appendChild(overlay);

    let map: MapLibreMap | undefined;
    let places: T[] = [];
    let exit: (() => void) | undefined;
    let readyPromise: Promise<void> | undefined;

    const findPlace = (id: unknown): T | undefined =>
        places.find((place) => String(place.id) === String(id));

    const updateSource = (): void => {
        const source = map?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        source?.setData(toFeatureCollection(places));
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
        map.addLayer({
            id: CLUSTER_LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': '#0f766e',
                'circle-radius': ['step', ['get', 'point_count'], 18, 20, 24, 60, 30],
                'circle-stroke-color': '#ecfeff',
                'circle-stroke-width': 2
            }
        });
        map.addLayer({
            id: CLUSTER_COUNT_LAYER_ID,
            type: 'symbol',
            source: SOURCE_ID,
            filter: ['has', 'point_count'],
            layout: {
                'text-field': ['get', 'point_count_abbreviated'],
                'text-size': 12
            },
            paint: {
                'text-color': '#f8fafc'
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
            const feature = map?.queryRenderedFeatures(event.point, {layers: [CLUSTER_LAYER_ID]})[0];
            const clusterId = Number(feature?.properties?.cluster_id);
            const source = map?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
            const coordinates = feature?.geometry.type === 'Point'
                ? feature.geometry.coordinates as [number, number]
                : undefined;
            if (!source || !coordinates || !Number.isFinite(clusterId)) {
                return;
            }
            const zoom = await source.getClusterExpansionZoom(clusterId);
            map?.easeTo({center: coordinates, zoom});
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
        [CLUSTER_LAYER_ID, PLACE_LAYER_ID].forEach((layerId) => {
            map?.on('mouseenter', layerId, () => {
                if (map) map.getCanvas().style.cursor = 'pointer';
            });
            map?.on('mouseleave', layerId, () => {
                if (map) map.getCanvas().style.cursor = '';
            });
        });
    };

    const ensureMap = (): Promise<void> => {
        if (readyPromise) {
            return readyPromise;
        }
        map = new maplibregl.Map({
            container: mapContainer,
            style: configuration.style,
            center: [0, 0],
            zoom: configuration.initialZoom ?? 12,
            minZoom: configuration.minZoom ?? 2,
            maxZoom: configuration.maxZoom ?? 19
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
            places = options.places ?? places;
            exit = options.exit;
            locationLabel.textContent = options.label ?? '';
            overlay.hidden = false;
            await ensureMap();
            updateSource();
            map?.resize();
            map?.flyTo({
                center: [options.lon, options.lat],
                zoom: options.zoom ?? configuration.initialZoom ?? 12,
                duration: 1100,
                essential: true
            });
        },
        hide() {
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
            map?.remove();
            map = undefined;
            readyPromise = undefined;
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
        await controller.show({
            lat: context.lat,
            lon: context.lon,
            label: options.getLabel?.(context.data),
            zoom: options.zoom,
            places: await resolvePlaces(context.data),
            exit: context.exit
        });
    },
    onExit() {
        controller.hide();
    }
});
