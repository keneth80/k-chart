import {
    Cartesian3,
    ClockRange,
    Color,
    Credit,
    ColorMaterialProperty,
    Entity,
    ImageryLayer,
    Ion,
    JulianDate,
    PathGraphics,
    PolylineGlowMaterialProperty,
    SampledPositionProperty,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    TimeInterval,
    TimeIntervalCollection,
    VelocityOrientationProperty,
    Viewer,
    type ImageryProvider,
    type TerrainProvider
} from 'cesium';

export interface KChartCesiumRoutePoint {
    lat: number;
    lon: number;
    altitude?: number;
    time?: string | number | Date;
    label?: string;
}

export interface KChartCesiumRouteFields<T> {
    lat: keyof T & string;
    lon: keyof T & string;
    altitude?: keyof T & string;
    time?: keyof T & string;
    label?: keyof T & string;
}

export interface KChartCesiumLineString {
    type: 'LineString';
    coordinates: number[][];
}

export interface KChartCesiumFeature {
    type: 'Feature';
    geometry: KChartCesiumLineString;
    properties?: Record<string, unknown>;
}

export interface KChartCesiumRouteAnimation {
    enabled?: boolean;
    speed?: number;
    sampleIntervalSeconds?: number;
    trailSeconds?: number;
    leadSeconds?: number;
    loop?: boolean;
    trackCamera?: boolean;
    autoPlay?: boolean;
}

export interface KChartCesiumRouteConfiguration<T = KChartCesiumRoutePoint> {
    id: string;
    name?: string;
    data?: readonly T[];
    fields?: KChartCesiumRouteFields<T>;
    geoJson?: KChartCesiumLineString | KChartCesiumFeature;
    color?: string;
    width?: number;
    glowPower?: number;
    clampToGround?: boolean;
    showSamples?: boolean;
    sampleColor?: string;
    sampleSize?: number;
    movingPointColor?: string;
    movingPointSize?: number;
    animation?: boolean | KChartCesiumRouteAnimation;
    onClick?: (context: {
        id: string;
        name?: string;
        viewer: Viewer;
        entity: Entity;
    }) => void;
}

export type KChartCesiumAttribution = string | Credit;

export interface KChartCesiumAtmosphereConfiguration {
    enabled?: boolean;
    baseColor?: string;
    enableLighting?: boolean;
    lambertDiffuseMultiplier?: number;
    showGroundAtmosphere?: boolean;
    atmosphereLightIntensity?: number;
    atmosphereRayleighCoefficient?: [number, number, number];
    atmosphereMieCoefficient?: [number, number, number];
    atmosphereRayleighScaleHeight?: number;
    atmosphereMieScaleHeight?: number;
    atmosphereMieAnisotropy?: number;
    atmosphereHueShift?: number;
    atmosphereSaturationShift?: number;
    atmosphereBrightnessShift?: number;
    skyAtmosphere?: boolean;
    skyAtmosphereLightIntensity?: number;
    skyAtmosphereRayleighCoefficient?: [number, number, number];
    skyAtmosphereMieCoefficient?: [number, number, number];
    skyAtmosphereSaturationShift?: number;
    skyAtmosphereBrightnessShift?: number;
}

export interface KChartCesiumConfiguration {
    container: string | HTMLElement;
    cesiumBaseUrl?: string;
    ionAccessToken?: string;
    /** @deprecated Use ionAccessToken to make the Cesium ion service dependency explicit. */
    accessToken?: string;
    imageryProvider?: ImageryProvider | ImageryLayer | false;
    terrainProvider?: TerrainProvider;
    attribution?: KChartCesiumAttribution | readonly KChartCesiumAttribution[];
    /** @deprecated Create and pass OpenStreetMapImageryProvider through imageryProvider instead. */
    osmUrl?: string | false;
    viewerOptions?: Viewer.ConstructorOptions;
    requestRenderMode?: boolean;
    timeline?: boolean;
    animation?: boolean;
    realisticAtmosphere?: boolean | KChartCesiumAtmosphereConfiguration;
}

export interface KChartCesiumRouteHandle<T = KChartCesiumRoutePoint> {
    id: string;
    addPoint(point: T): void;
    setData(data: readonly T[]): void;
    play(): void;
    pause(): void;
    track(): void;
    stopTracking(): void;
    flyTo(): Promise<boolean>;
    remove(): void;
}

export interface KChartCesiumController {
    addRoute<T = KChartCesiumRoutePoint>(
        configuration: KChartCesiumRouteConfiguration<T>
    ): KChartCesiumRouteHandle<T>;
    removeRoute(id: string): void;
    clearRoutes(): void;
    play(): void;
    pause(): void;
    resize(): void;
    flyToRoute(id: string): Promise<boolean>;
    getViewer(): Viewer;
    destroy(): void;
}

interface NormalizedRoutePoint<T> {
    source: T;
    lat: number;
    lon: number;
    altitude: number;
    time?: Date;
    label?: string;
}

interface RouteState<T = any> {
    configuration: KChartCesiumRouteConfiguration<T>;
    points: T[];
    normalized: NormalizedRoutePoint<T>[];
    lineEntity: Entity;
    movingEntity?: Entity;
    sampleEntities: Entity[];
}

const resolveContainer = (container: string | HTMLElement): HTMLElement => {
    const node = typeof container === 'string'
        ? document.querySelector<HTMLElement>(container)
        : container;
    if (!node) {
        throw new Error('KChart Cesium container not found.');
    }
    return node;
};

const resolveDate = (value: unknown): Date | undefined => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    const date = value instanceof Date ? value : new Date(value as string | number);
    return Number.isFinite(date.getTime()) ? date : undefined;
};

const normalizePoint = <T>(
    point: T,
    fields?: KChartCesiumRouteFields<T>
): NormalizedRoutePoint<T> => {
    const record = point as any;
    const lat = Number(fields ? record[fields.lat] : record.lat);
    const lon = Number(fields ? record[fields.lon] : record.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error('KChart Cesium route points require finite latitude and longitude values.');
    }
    const altitudeValue = fields?.altitude ? record[fields.altitude] : record.altitude;
    const timeValue = fields?.time ? record[fields.time] : record.time;
    const labelValue = fields?.label ? record[fields.label] : record.label;
    return {
        source: point,
        lat,
        lon,
        altitude: Number.isFinite(Number(altitudeValue)) ? Number(altitudeValue) : 0,
        time: resolveDate(timeValue),
        label: labelValue === undefined || labelValue === null ? undefined : String(labelValue)
    };
};

const geoJsonPoints = (
    geoJson: KChartCesiumLineString | KChartCesiumFeature
): KChartCesiumRoutePoint[] => {
    const geometry = geoJson.type === 'Feature' ? geoJson.geometry : geoJson;
    if (geometry.type !== 'LineString') {
        throw new Error('KChart Cesium currently supports GeoJSON LineString routes.');
    }
    return geometry.coordinates.map((coordinate) => ({
        lon: Number(coordinate[0]),
        lat: Number(coordinate[1]),
        altitude: Number(coordinate[2] ?? 0)
    }));
};

const resolveAnimation = (
    animation: KChartCesiumRouteConfiguration<any>['animation']
): Required<KChartCesiumRouteAnimation> => {
    if (typeof animation === 'boolean') {
        return {
            enabled: animation,
            speed: 20,
            sampleIntervalSeconds: 30,
            trailSeconds: 900,
            leadSeconds: 0,
            loop: true,
            trackCamera: false,
            autoPlay: animation
        };
    }
    return {
        enabled: animation?.enabled ?? true,
        speed: animation?.speed ?? 20,
        sampleIntervalSeconds: animation?.sampleIntervalSeconds ?? 30,
        trailSeconds: animation?.trailSeconds ?? 900,
        leadSeconds: animation?.leadSeconds ?? 0,
        loop: animation?.loop ?? true,
        trackCamera: animation?.trackCamera ?? false,
        autoPlay: animation?.autoPlay ?? true
    };
};

const toColor = (value: string | undefined, fallback: string): Color =>
    Color.fromCssColorString(value ?? fallback) ?? Color.WHITE;

const toBaseLayer = (
    provider: KChartCesiumConfiguration['imageryProvider']
): ImageryLayer | false => {
    if (!provider) return false;
    return provider instanceof ImageryLayer ? provider : new ImageryLayer(provider);
};

const toCredit = (attribution: KChartCesiumAttribution): Credit =>
    attribution instanceof Credit ? attribution : new Credit(attribution);

const toCartesian3 = (
    value: [number, number, number] | undefined,
    fallback: [number, number, number]
): Cartesian3 => new Cartesian3(...(value ?? fallback));

const applyRealisticAtmosphere = (
    viewer: Viewer,
    configuration: KChartCesiumConfiguration['realisticAtmosphere']
): void => {
    const options = typeof configuration === 'object'
        ? configuration
        : {};
    if (configuration === false || options.enabled === false) {
        return;
    }
    const globe = viewer.scene.globe;
    globe.baseColor = Color.fromCssColorString(options.baseColor ?? '#0b2d59') ?? Color.fromBytes(11, 45, 89);
    globe.enableLighting = options.enableLighting ?? true;
    globe.lambertDiffuseMultiplier = options.lambertDiffuseMultiplier ?? 0.92;
    globe.showGroundAtmosphere = options.showGroundAtmosphere ?? true;
    globe.atmosphereLightIntensity = options.atmosphereLightIntensity ?? 14;
    globe.atmosphereRayleighCoefficient = toCartesian3(
        options.atmosphereRayleighCoefficient,
        [5.5e-6, 13.0e-6, 28.4e-6]
    );
    globe.atmosphereMieCoefficient = toCartesian3(
        options.atmosphereMieCoefficient,
        [21e-6, 21e-6, 21e-6]
    );
    globe.atmosphereRayleighScaleHeight = options.atmosphereRayleighScaleHeight ?? 10000;
    globe.atmosphereMieScaleHeight = options.atmosphereMieScaleHeight ?? 3200;
    globe.atmosphereMieAnisotropy = options.atmosphereMieAnisotropy ?? 0.9;
    globe.atmosphereHueShift = options.atmosphereHueShift ?? 0;
    globe.atmosphereSaturationShift = options.atmosphereSaturationShift ?? 0.04;
    globe.atmosphereBrightnessShift = options.atmosphereBrightnessShift ?? 0.02;

    if (viewer.scene.skyAtmosphere && options.skyAtmosphere !== false) {
        viewer.scene.skyAtmosphere.show = true;
        viewer.scene.skyAtmosphere.perFragmentAtmosphere = true;
        viewer.scene.skyAtmosphere.atmosphereLightIntensity = options.skyAtmosphereLightIntensity ?? 18;
        viewer.scene.skyAtmosphere.atmosphereRayleighCoefficient = toCartesian3(
            options.skyAtmosphereRayleighCoefficient,
            [5.8e-6, 13.5e-6, 33.1e-6]
        );
        viewer.scene.skyAtmosphere.atmosphereMieCoefficient = toCartesian3(
            options.skyAtmosphereMieCoefficient,
            [21e-6, 21e-6, 21e-6]
        );
        viewer.scene.skyAtmosphere.saturationShift = options.skyAtmosphereSaturationShift ?? 0.08;
        viewer.scene.skyAtmosphere.brightnessShift = options.skyAtmosphereBrightnessShift ?? 0.03;
    }
};

export const createCesiumGlobe = (
    configuration: KChartCesiumConfiguration
): KChartCesiumController => {
    const host = resolveContainer(configuration.container);
    const container = document.createElement('div');
    container.className = 'kchart-cesium';
    host.style.position = host.style.position || 'relative';
    host.appendChild(container);

    if (configuration.cesiumBaseUrl) {
        (globalThis as any).CESIUM_BASE_URL = configuration.cesiumBaseUrl;
    }
    const ionAccessToken = configuration.ionAccessToken ?? configuration.accessToken;
    if (ionAccessToken) {
        Ion.defaultAccessToken = ionAccessToken;
    }

    const baseLayer = toBaseLayer(configuration.imageryProvider);
    const viewer = new Viewer(container, {
        animation: configuration.animation ?? true,
        timeline: configuration.timeline ?? true,
        baseLayerPicker: false,
        geocoder: false,
        sceneModePicker: true,
        navigationHelpButton: false,
        homeButton: true,
        fullscreenButton: false,
        selectionIndicator: true,
        infoBox: true,
        requestRenderMode: configuration.requestRenderMode ?? false,
        baseLayer,
        terrainProvider: configuration.terrainProvider,
        ...configuration.viewerOptions
    });
    const attributions = configuration.attribution === undefined
        ? []
        : Array.isArray(configuration.attribution)
            ? configuration.attribution
            : [configuration.attribution];
    attributions.forEach((attribution) => {
        viewer.creditDisplay.addStaticCredit(toCredit(attribution));
    });
    applyRealisticAtmosphere(viewer, configuration.realisticAtmosphere ?? true);
    const routes = new Map<string, RouteState>();
    const clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    const removeRoute = (id: string): void => {
        const route = routes.get(id);
        if (!route) return;
        viewer.entities.remove(route.lineEntity);
        if (route.movingEntity) viewer.entities.remove(route.movingEntity);
        route.sampleEntities.forEach((entity) => viewer.entities.remove(entity));
        if (viewer.trackedEntity === route.movingEntity) {
            viewer.trackedEntity = undefined;
        }
        routes.delete(id);
    };

    const renderRoute = <T>(
        routeConfiguration: KChartCesiumRouteConfiguration<T>,
        points: readonly T[]
    ): RouteState<T> => {
        removeRoute(routeConfiguration.id);
        const sourcePoints = routeConfiguration.geoJson
            ? geoJsonPoints(routeConfiguration.geoJson) as T[]
            : [...points];
        if (sourcePoints.length < 2) {
            throw new Error('KChart Cesium routes require at least two points.');
        }
        const normalized = sourcePoints.map((point) =>
            normalizePoint(point, routeConfiguration.geoJson ? undefined : routeConfiguration.fields)
        );
        const positions = normalized.map((point) =>
            Cartesian3.fromDegrees(point.lon, point.lat, point.altitude)
        );
        const color = toColor(routeConfiguration.color, '#5db8ff');
        const lineEntity = viewer.entities.add({
            id: `${routeConfiguration.id}:line`,
            name: routeConfiguration.name ?? routeConfiguration.id,
            properties: {
                kchartRouteId: routeConfiguration.id
            },
            polyline: {
                positions,
                width: routeConfiguration.width ?? 4,
                clampToGround: routeConfiguration.clampToGround ?? false,
                material: routeConfiguration.glowPower === 0
                    ? new ColorMaterialProperty(color)
                    : new PolylineGlowMaterialProperty({
                        color,
                        glowPower: routeConfiguration.glowPower ?? 0.18
                    })
            }
        });
        const sampleEntities = routeConfiguration.showSamples
            ? normalized.map((point, index) => viewer.entities.add({
                id: `${routeConfiguration.id}:sample:${index}`,
                name: point.label ?? `${routeConfiguration.name ?? routeConfiguration.id} ${index + 1}`,
                position: positions[index],
                point: {
                    pixelSize: routeConfiguration.sampleSize ?? 7,
                    color: toColor(routeConfiguration.sampleColor, '#ffffff'),
                    outlineColor: color,
                    outlineWidth: 2
                },
                properties: {
                    kchartRouteId: routeConfiguration.id
                }
            }))
            : [];

        const animation = resolveAnimation(routeConfiguration.animation);
        let movingEntity: Entity | undefined;
        if (animation.enabled) {
            const startDate = normalized.find((point) => point.time)?.time ?? new Date();
            const start = JulianDate.fromDate(startDate);
            const sampledPosition = new SampledPositionProperty();
            normalized.forEach((point, index) => {
                const sampleTime = point.time
                    ? JulianDate.fromDate(point.time)
                    : JulianDate.addSeconds(start, index * animation.sampleIntervalSeconds, new JulianDate());
                sampledPosition.addSample(sampleTime, positions[index]);
            });
            const lastPoint = normalized[normalized.length - 1];
            const stop = lastPoint.time
                ? JulianDate.fromDate(lastPoint.time)
                : JulianDate.addSeconds(
                    start,
                    (normalized.length - 1) * animation.sampleIntervalSeconds,
                    new JulianDate()
                );
            movingEntity = viewer.entities.add({
                id: `${routeConfiguration.id}:moving`,
                name: routeConfiguration.name ?? routeConfiguration.id,
                availability: new TimeIntervalCollection([
                    new TimeInterval({start, stop})
                ]),
                position: sampledPosition,
                orientation: new VelocityOrientationProperty(sampledPosition),
                point: {
                    pixelSize: routeConfiguration.movingPointSize ?? 13,
                    color: toColor(routeConfiguration.movingPointColor, '#f8fbff'),
                    outlineColor: color,
                    outlineWidth: 3
                },
                path: new PathGraphics({
                    width: routeConfiguration.width ?? 4,
                    material: color,
                    trailTime: animation.trailSeconds,
                    leadTime: animation.leadSeconds
                }),
                properties: {
                    kchartRouteId: routeConfiguration.id
                }
            });
            viewer.clock.startTime = start.clone();
            viewer.clock.stopTime = stop.clone();
            viewer.clock.currentTime = start.clone();
            viewer.clock.clockRange = animation.loop ? ClockRange.LOOP_STOP : ClockRange.CLAMPED;
            viewer.clock.multiplier = animation.speed;
            viewer.clock.shouldAnimate = animation.autoPlay;
            viewer.timeline?.zoomTo(start, stop);
            if (animation.trackCamera) {
                viewer.trackedEntity = movingEntity;
            }
        }

        const state: RouteState<T> = {
            configuration: routeConfiguration,
            points: sourcePoints,
            normalized,
            lineEntity,
            movingEntity,
            sampleEntities
        };
        routes.set(routeConfiguration.id, state);
        void viewer.flyTo([lineEntity, ...sampleEntities]);
        return state;
    };

    const createHandle = <T>(state: RouteState<T>): KChartCesiumRouteHandle<T> => ({
        id: state.configuration.id,
        addPoint(point) {
            const next = [...state.points, point];
            const updated = renderRoute(state.configuration, next);
            Object.assign(state, updated);
        },
        setData(data) {
            const updated = renderRoute(state.configuration, data);
            Object.assign(state, updated);
        },
        play() {
            viewer.clock.shouldAnimate = true;
        },
        pause() {
            viewer.clock.shouldAnimate = false;
        },
        track() {
            if (state.movingEntity) viewer.trackedEntity = state.movingEntity;
        },
        stopTracking() {
            if (viewer.trackedEntity === state.movingEntity) viewer.trackedEntity = undefined;
        },
        flyTo() {
            return viewer.flyTo([
                state.lineEntity,
                ...state.sampleEntities,
                ...(state.movingEntity ? [state.movingEntity] : [])
            ]);
        },
        remove() {
            removeRoute(state.configuration.id);
        }
    });

    clickHandler.setInputAction((movement: {position: any}) => {
        const picked = viewer.scene.pick(movement.position);
        const entity = picked?.id instanceof Entity ? picked.id : undefined;
        const routeId = entity?.properties?.kchartRouteId?.getValue(viewer.clock.currentTime);
        if (!entity || !routeId) return;
        const route = routes.get(String(routeId));
        route?.configuration.onClick?.({
            id: route.configuration.id,
            name: route.configuration.name,
            viewer,
            entity
        });
    }, ScreenSpaceEventType.LEFT_CLICK);

    return {
        addRoute<T>(routeConfiguration: KChartCesiumRouteConfiguration<T>) {
            const points = routeConfiguration.data ?? [];
            return createHandle(renderRoute(routeConfiguration, points));
        },
        removeRoute,
        clearRoutes() {
            Array.from(routes.keys()).forEach(removeRoute);
        },
        play() {
            viewer.clock.shouldAnimate = true;
        },
        pause() {
            viewer.clock.shouldAnimate = false;
        },
        resize() {
            viewer.resize();
        },
        flyToRoute(id) {
            const route = routes.get(id);
            return route
                ? viewer.flyTo([
                    route.lineEntity,
                    ...route.sampleEntities,
                    ...(route.movingEntity ? [route.movingEntity] : [])
                ])
                : Promise.resolve(false);
        },
        getViewer() {
            return viewer;
        },
        destroy() {
            clickHandler.destroy();
            routes.clear();
            if (!viewer.isDestroyed()) viewer.destroy();
            container.remove();
        }
    };
};
