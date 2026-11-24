import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {
    createCustomSeries,
    type KChartSeries
} from '@keneth80/k-chart';
import {
    bindGlobeDrag,
    calculateSubsolarPoint,
    cubicEaseOut,
    latLonToEquirectangular,
    latLonToVector,
    normalizeCenter,
    normalizeFlatMapView,
    normalizeProjection,
    prepareGlobeMarkers,
    rotationFor,
    shortestLongitudeDelta,
    type KThreeFlatMapConfiguration,
    type KThreeFlatMapLighting,
    type KThreeFlatMapView,
    type KThreeGlobeProjection,
    type KThreeGlobeMarkerConfiguration,
    type KThreePreparedGlobeMarker,
    type LatLon
} from './globe-utils';

export {
    calculateSubsolarPoint,
    dragCenter,
    latLonToEquirectangular,
    latLonToVector,
    normalizeFlatMapView,
    prepareGlobeMarkers,
    rotationFor,
    wrapLon
} from './globe-utils';
export type {
    KThreeFlatMapConfiguration,
    KThreeFlatMapLighting,
    KThreeFlatMapView,
    KThreeGlobeProjection,
    KThreeGlobeMarkerAccessor,
    KThreeGlobeMarkerConfiguration,
    KThreeGlobeMarkerFields,
    KThreePreparedGlobeMarker,
    LatLon
} from './globe-utils';

export type KThreeTuple3 = [number, number, number];

export interface KThreeSceneConfiguration {
    container?: string | HTMLElement;
    canvas?: HTMLCanvasElement;
    width?: number;
    height?: number;
    backgroundColor?: string | number;
    alpha?: boolean;
    antialias?: boolean;
    pixelRatio?: number;
    canvasCursor?: string;
    camera?: {
        fov?: number;
        near?: number;
        far?: number;
        position?: KThreeTuple3;
        lookAt?: KThreeTuple3;
    };
    controls?: boolean | {
        orbit?: boolean;
        autoRotate?: boolean;
        autoRotateSpeed?: number;
        enablePan?: boolean;
        minDistance?: number;
        maxDistance?: number;
    };
    lights?: 'none' | 'basic' | 'studio';
    autoStart?: boolean;
}

export interface KThreeSceneContext<T = unknown> {
    host: HTMLElement;
    canvas: HTMLCanvasElement;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls?: OrbitControls;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    data: readonly T[];
    requestRender(): void;
}

export interface KThreeObject<T = unknown> {
    attach(context: KThreeSceneContext<T>): void;
    setData?(data: readonly T[], context: KThreeSceneContext<T>): void;
    resize?(context: KThreeSceneContext<T>): void;
    beforeRender?(context: KThreeSceneContext<T>): void;
    pointerMove?(event: PointerEvent, context: KThreeSceneContext<T>): void;
    click?(event: MouseEvent, context: KThreeSceneContext<T>): void;
    destroy?(): void;
}

export interface KThreeSceneController<T = unknown> {
    add(object: KThreeObject<T>): KThreeSceneController<T>;
    setData(data: readonly T[]): void;
    resize(width?: number, height?: number): void;
    render(): void;
    start(): void;
    stop(): void;
    destroy(): void;
    getContext(): KThreeSceneContext<T>;
}

export interface KThreeWaferDie {
    id: string;
    row: number;
    col: number;
    status: 'pass' | 'warn' | 'fail' | 'empty' | string;
    value?: number;
    label?: string;
}

export interface KThreeWaferFields<T> {
    id?: keyof T & string;
    row: keyof T & string;
    col: keyof T & string;
    status?: keyof T & string;
    value?: keyof T & string;
    label?: keyof T & string;
}

export interface KThreeWaferMonitorConfiguration<T = KThreeWaferDie> {
    data?: readonly T[];
    fields: KThreeWaferFields<T>;
    wafer?: {
        radius?: number;
        thickness?: number;
        color?: string;
        edgeColor?: string;
        gridColor?: string;
        notch?: boolean;
    };
    die?: {
        width?: number;
        height?: number;
        gap?: number;
        maxExtrude?: number;
        opacity?: number;
    };
    colors?: Record<string, string>;
    valueRange?: [number, number];
    label?: {
        visible?: boolean;
        title?: string;
        emptyText?: string;
    };
    onDieClick?: (context: {
        die: T;
        index: number;
        event: MouseEvent;
    }) => void;
    onDieHover?: (context: {
        die: T | undefined;
        index: number;
        event: PointerEvent;
    }) => void;
}

export interface KThreeWaferSeriesConfiguration<T = KThreeWaferDie>
    extends Omit<KThreeWaferMonitorConfiguration<T>, 'data'> {
    selector: string;
    displayName?: string;
    canvasName?: string;
    scene?: Omit<KThreeSceneConfiguration, 'canvas' | 'container' | 'width' | 'height'>;
}

export type KThreeGlobeTexture = string | CanvasImageSource | THREE.Texture;

export interface KThreeGlobeAtmosphereConfiguration {
    color?: THREE.ColorRepresentation;
    intensity?: number;
    power?: number;
}

export interface KThreeGlobeSeriesConfiguration<T = unknown> {
    selector: string;
    displayName?: string;
    canvasName?: string;
    dayTexture: KThreeGlobeTexture;
    nightTexture?: KThreeGlobeTexture;
    projection?: KThreeGlobeProjection;
    flatMap?: KThreeFlatMapConfiguration;
    initialCenter?: LatLon;
    subsolar?: Date | LatLon | null;
    onCenterChange?: (center: LatLon) => void;
    transitionDuration?: number;
    atmosphere?: boolean | KThreeGlobeAtmosphereConfiguration;
    globeScale?: number;
    markers?: KThreeGlobeMarkerConfiguration<T>;
}

export interface KThreeGlobeTransitionOptions {
    duration?: number;
    animate?: boolean;
}

export interface KThreeGlobeSeriesHandle<T = unknown> extends KChartSeries<T> {
    getCenter(): LatLon;
    setCenter(center: LatLon, options?: KThreeGlobeTransitionOptions): void;
    getProjection(): KThreeGlobeProjection;
    setProjection(projection: KThreeGlobeProjection): void;
    getFlatView(): KThreeFlatMapView;
    setFlatView(view: KThreeFlatMapConfiguration): void;
    setSubsolar(point: LatLon | null): void;
    setDate(date: Date | null): void;
}

const DEFAULT_STATUS_COLORS: Record<string, string> = {
    pass: '#22f59a',
    warn: '#ffd166',
    fail: '#ff3d71',
    empty: '#475569',
    unknown: '#7dd3fc'
};

const resolveContainer = (container?: string | HTMLElement): HTMLElement => {
    const node = typeof container === 'string'
        ? document.querySelector<HTMLElement>(container)
        : container;
    if (!node) {
        throw new Error('KChart Three container not found.');
    }
    return node;
};

const disposeObject = (object: THREE.Object3D): void => {
    object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.filter(Boolean).forEach((material) => {
            const typed = material as THREE.Material & {map?: THREE.Texture};
            typed.map?.dispose();
            typed.dispose();
        });
    });
};

const setPointerFromEvent = (
    pointer: THREE.Vector2,
    canvas: HTMLCanvasElement,
    event: PointerEvent | MouseEvent
): void => {
    const bounds = canvas.getBoundingClientRect();
    pointer.set(
        ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1,
        -((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 + 1
    );
};

const addLights = (scene: THREE.Scene, mode: KThreeSceneConfiguration['lights']): void => {
    if (mode === 'none') {
        return;
    }
    const ambient = new THREE.HemisphereLight(0xf8fbff, 0x1f2937, mode === 'studio' ? 2.4 : 1.6);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, mode === 'studio' ? 2.2 : 1.2);
    key.position.set(4, 8, 6);
    scene.add(key);
    if (mode === 'studio') {
        const rim = new THREE.DirectionalLight(0x80d8ff, 1.3);
        rim.position.set(-6, 3, -4);
        scene.add(rim);
    }
};

const activateThreeCanvasInteraction = (
    canvas: HTMLCanvasElement,
    cursor = 'grab'
): void => {
    canvas.classList.add('kchart-three-canvas');
    canvas.style.position = canvas.style.position || 'absolute';
    canvas.style.pointerEvents = 'auto';
    canvas.style.setProperty('z-index', '8', 'important');
    canvas.style.touchAction = 'none';
    canvas.style.cursor = cursor;
};

const scheduleThreeCanvasInteraction = (
    canvas: HTMLCanvasElement,
    cursor?: string
): (() => void) => {
    const scheduledCursor = cursor ?? 'grab';
    const restoreInteraction = (): void => {
        // Do not overwrite a projection switch that changed the cursor after scheduling.
        if (!canvas.style.cursor || canvas.style.cursor === scheduledCursor) {
            activateThreeCanvasInteraction(canvas, scheduledCursor);
        }
    };
    activateThreeCanvasInteraction(canvas, scheduledCursor);
    const frame = window.requestAnimationFrame(restoreInteraction);
    const timeout = window.setTimeout(restoreInteraction, 0);
    return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timeout);
    };
};

export const createKThreeScene = <T = unknown>(
    configuration: KThreeSceneConfiguration
): KThreeSceneController<T> => {
    const host = configuration.canvas?.parentElement
        ?? resolveContainer(configuration.container);
    const canvas = configuration.canvas ?? document.createElement('canvas');
    if (!configuration.canvas) {
        host.appendChild(canvas);
    }
    host.style.position = host.style.position || 'relative';
    canvas.classList.add('kchart-three-canvas');
    const cancelScheduledCanvasInteraction = scheduleThreeCanvasInteraction(
        canvas,
        configuration.canvasCursor
    );

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: configuration.antialias ?? true,
        alpha: configuration.alpha ?? true
    });
    const resolvePixelRatio = (): number =>
        configuration.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(resolvePixelRatio());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(configuration.backgroundColor ?? '#08111f', configuration.alpha === false ? 1 : 0);

    const scene = new THREE.Scene();
    const backgroundColor = configuration.backgroundColor;
    if (backgroundColor !== undefined && configuration.alpha === false) {
        scene.background = new THREE.Color(backgroundColor);
    }

    const camera = new THREE.PerspectiveCamera(
        configuration.camera?.fov ?? 44,
        1,
        configuration.camera?.near ?? 0.1,
        configuration.camera?.far ?? 1000
    );
    camera.position.set(...(configuration.camera?.position ?? [0, 8, 11]));
    camera.lookAt(new THREE.Vector3(...(configuration.camera?.lookAt ?? [0, 0, 0])));

    addLights(scene, configuration.lights ?? 'studio');

    const controlsConfig = configuration.controls;
    const controlsEnabled = controlsConfig === undefined
        || controlsConfig === true
        || (typeof controlsConfig === 'object' && controlsConfig.orbit !== false);
    const controls = controlsEnabled
        ? new OrbitControls(camera, canvas)
        : undefined;
    if (controls) {
        const objectControls = typeof controlsConfig === 'object' ? controlsConfig : {};
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.enablePan = objectControls.enablePan ?? false;
        controls.autoRotate = objectControls.autoRotate ?? false;
        controls.autoRotateSpeed = objectControls.autoRotateSpeed ?? 0.32;
        controls.minDistance = objectControls.minDistance ?? 4;
        controls.maxDistance = objectControls.maxDistance ?? 40;
    }

    let animationFrame = 0;
    let data: readonly T[] = [];
    const objects: KThreeObject<T>[] = [];
    const context: KThreeSceneContext<T> = {
        host,
        canvas,
        scene,
        camera,
        renderer,
        controls,
        raycaster: new THREE.Raycaster(),
        pointer: new THREE.Vector2(),
        data,
        requestRender: () => controller.render()
    };

    const handlePointerMove = (event: PointerEvent): void => {
        objects.forEach((object) => object.pointerMove?.(event, context));
    };
    const handleClick = (event: MouseEvent): void => {
        objects.forEach((object) => object.click?.(event, context));
    };
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('click', handleClick);

    const controller: KThreeSceneController<T> = {
        add(object) {
            objects.push(object);
            object.attach(context);
            object.setData?.(data, context);
            return controller;
        },
        setData(nextData) {
            data = nextData;
            context.data = data;
            objects.forEach((object) => object.setData?.(data, context));
            controller.render();
        },
        resize(width = host.clientWidth || configuration.width || 640, height = host.clientHeight || configuration.height || 420) {
            renderer.setPixelRatio(resolvePixelRatio());
            renderer.setSize(width, height, false);
            camera.aspect = width / Math.max(height, 1);
            camera.updateProjectionMatrix();
            objects.forEach((object) => object.resize?.(context));
            controller.render();
        },
        render() {
            controls?.update();
            objects.forEach((object) => object.beforeRender?.(context));
            renderer.render(scene, camera);
        },
        start() {
            if (animationFrame) {
                return;
            }
            const animate = (): void => {
                controller.render();
                animationFrame = window.requestAnimationFrame(animate);
            };
            animate();
        },
        stop() {
            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame);
                animationFrame = 0;
            }
        },
        destroy() {
            controller.stop();
            cancelScheduledCanvasInteraction();
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('click', handleClick);
            objects.forEach((object) => object.destroy?.());
            controls?.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
            if (!configuration.canvas) {
                canvas.remove();
            }
        },
        getContext() {
            return context;
        }
    };

    controller.resize(configuration.width, configuration.height);
    if (configuration.autoStart ?? true) {
        controller.start();
    }
    return controller;
};

interface KThreeGlobeObject<T> extends KThreeObject<T> {
    getDiameter(): number;
    setCenter(center: LatLon): void;
    setProjection(projection: KThreeGlobeProjection): void;
    setFlatView(view: KThreeFlatMapView): void;
    setSubsolar(point: LatLon | null): void;
}

const GLOBE_VERTEX_SHADER = `
    varying vec2 vUv;
    varying vec3 vDir;

    void main() {
        vUv = uv;
        float latitude = (uv.y - 0.5) * 3.141592653589793;
        float longitude = (uv.x - 0.5) * 6.283185307179586;
        float cosLatitude = cos(latitude);
        vDir = vec3(
            cosLatitude * cos(longitude),
            sin(latitude),
            -cosLatitude * sin(longitude)
        );
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const GLOBE_FRAGMENT_SHADER = `
    uniform sampler2D uDayTexture;
    uniform sampler2D uNightTexture;
    uniform float uHasNightTexture;
    uniform float uHasSubsolar;
    uniform float uLightingMode;
    uniform vec3 uSubsolarDirection;
    varying vec2 vUv;
    varying vec3 vDir;

    void main() {
        vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
        vec3 fallbackNight = dayColor * 0.16 + vec3(0.004, 0.008, 0.020);
        vec3 nightColor = uHasNightTexture > 0.5
            ? texture2D(uNightTexture, vUv).rgb
            : fallbackNight;
        float daylight = uHasSubsolar > 0.5
            ? smoothstep(-0.08, 0.12, dot(normalize(vDir), normalize(uSubsolarDirection)))
            : 1.0;
        if (uLightingMode < 0.5) {
            daylight = 0.0;
        } else if (uLightingMode < 1.5) {
            daylight = 1.0;
        }
        gl_FragColor = vec4(mix(nightColor, dayColor, daylight), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

const ATMOSPHERE_VERTEX_SHADER = `
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uPower;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float rim = pow(max(0.0, 1.0 - abs(dot(normalize(vWorldNormal), viewDirection))), uPower);
        gl_FragColor = vec4(uColor, rim * uIntensity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

const isThreeTexture = (value: KThreeGlobeTexture): value is THREE.Texture =>
    Boolean((value as THREE.Texture).isTexture);

const resolveSubsolar = (value: Date | LatLon | null | undefined): LatLon | null => {
    if (value instanceof Date) {
        return calculateSubsolarPoint(value);
    }
    return value ? normalizeCenter(value, 90) : null;
};

const createThreeGlobeObject = <T>(
    configuration: KThreeGlobeSeriesConfiguration<T>,
    initialCenter: LatLon,
    initialSubsolar: LatLon | null,
    initialProjection: KThreeGlobeProjection,
    initialFlatView: KThreeFlatMapView,
    requestRender: () => void
): KThreeGlobeObject<T> => {
    const globeScale = Number.isFinite(configuration.globeScale)
        ? Math.max(0.1, configuration.globeScale as number)
        : 1;
    const ownedTextures = new Set<THREE.Texture>();
    let context: KThreeSceneContext<T> | undefined;
    let rootGroup: THREE.Group | undefined;
    let globeGroup: THREE.Group | undefined;
    let flatGroup: THREE.Group | undefined;
    let globeGeometry: THREE.SphereGeometry | undefined;
    let flatGeometry: THREE.PlaneGeometry | undefined;
    let earthMaterial: THREE.ShaderMaterial | undefined;
    let atmosphereGeometry: THREE.SphereGeometry | undefined;
    let atmosphereMaterial: THREE.ShaderMaterial | undefined;
    let markerGeometry: THREE.SphereGeometry | undefined;
    let markerMaterial: THREE.MeshBasicMaterial | undefined;
    let markerMesh: THREE.InstancedMesh | undefined;
    let markerData: readonly T[] | undefined;
    let markers: KThreePreparedGlobeMarker<T>[] = [];
    let center = initialCenter;
    let subsolar = initialSubsolar;
    let projection = initialProjection;
    let flatView = initialFlatView;
    let globeDiameter = 1;
    let destroyed = false;

    const textureLoader = new THREE.TextureLoader();
    const resolveTexture = (source: KThreeGlobeTexture): THREE.Texture => {
        if (isThreeTexture(source)) {
            return source;
        }
        if (typeof source === 'string') {
            const texture = textureLoader.load(
                source,
                (loadedTexture) => {
                    loadedTexture.colorSpace = THREE.SRGBColorSpace;
                    if (destroyed) {
                        loadedTexture.dispose();
                        return;
                    }
                    requestRender();
                },
                undefined,
                () => {
                    if (!destroyed) {
                        requestRender();
                    }
                }
            );
            texture.colorSpace = THREE.SRGBColorSpace;
            ownedTextures.add(texture);
            return texture;
        }
        const texture = new THREE.Texture(source);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        ownedTextures.add(texture);
        return texture;
    };

    const updateRotation = (): void => {
        globeGroup?.quaternion.copy(rotationFor(center));
    };

    const updateSubsolarUniform = (): void => {
        if (!earthMaterial) {
            return;
        }
        earthMaterial.uniforms.uHasSubsolar.value = subsolar ? 1 : 0;
        if (subsolar) {
            (earthMaterial.uniforms.uSubsolarDirection.value as THREE.Vector3)
                .copy(latLonToVector(subsolar));
        }
    };

    const updateLightingUniform = (): void => {
        if (!earthMaterial) {
            return;
        }
        const lighting: KThreeFlatMapLighting = projection === 'globe'
            ? 'dynamic'
            : flatView.lighting;
        earthMaterial.uniforms.uLightingMode.value = lighting === 'night'
            ? 0
            : lighting === 'day'
                ? 1
                : 2;
    };

    const updateFlatTransform = (): void => {
        if (!flatGroup) {
            return;
        }
        const centerPosition = latLonToEquirectangular(
            flatView.center,
            globeScale * 2
        );
        flatGroup.scale.set(flatView.zoom, flatView.zoom, 1);
        flatGroup.position.set(
            -centerPosition.x * flatView.zoom,
            -centerPosition.y * flatView.zoom,
            0
        );
    };

    const removeMarkerMesh = (): void => {
        if (!markerMesh) {
            return;
        }
        markerMesh.parent?.remove(markerMesh);
        markerMesh.dispose();
        markerMesh = undefined;
    };

    const updateMarkerMatrices = (): void => {
        if (!markerMesh) {
            return;
        }
        const matrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        markers.forEach((marker, index) => {
            let position: THREE.Vector3;
            if (projection === 'globe') {
                position = latLonToVector(
                    marker,
                    globeScale * (1 + marker.surfaceOffset)
                );
            } else {
                position = latLonToEquirectangular(
                    {lat: marker.lat, lon: flatView.center.lon},
                    globeScale * 2,
                    globeScale * (0.008 + marker.surfaceOffset)
                );
                position.x += shortestLongitudeDelta(
                    flatView.center.lon,
                    marker.lon
                ) * globeScale * 2 / 360;
            }
            const markerScale = globeScale * marker.radius;
            if (projection === 'flat') {
                scale.set(
                    markerScale / flatView.zoom,
                    markerScale / flatView.zoom,
                    markerScale
                );
            } else {
                scale.setScalar(markerScale);
            }
            matrix.compose(position, quaternion, scale);
            markerMesh?.setMatrixAt(index, matrix);
        });
        markerMesh.instanceMatrix.needsUpdate = true;
        markerMesh.computeBoundingSphere();
    };

    const updateProjectionGroups = (): void => {
        updateLightingUniform();
        if (globeGroup) {
            globeGroup.visible = projection === 'globe';
        }
        if (flatGroup) {
            flatGroup.visible = projection === 'flat';
        }
        if (markerMesh) {
            markerMesh.parent?.remove(markerMesh);
            (projection === 'globe' ? globeGroup : flatGroup)?.add(markerMesh);
            updateMarkerMatrices();
        }
    };

    const updateMarkers = (data: readonly T[]): void => {
        if (
            !configuration.markers
            || !globeGroup
            || !flatGroup
            || !markerGeometry
            || !markerMaterial
        ) {
            return;
        }
        markers = prepareGlobeMarkers(data, configuration.markers);
        removeMarkerMesh();
        if (!markers.length) {
            return;
        }

        markerMesh = new THREE.InstancedMesh(markerGeometry, markerMaterial, markers.length);
        markerMesh.name = 'kchart-three-globe-markers';
        const color = new THREE.Color();
        markers.forEach((marker, index) => {
            markerMesh?.setColorAt(index, color.set(marker.color));
        });
        if (markerMesh.instanceColor) {
            markerMesh.instanceColor.needsUpdate = true;
        }
        (projection === 'globe' ? globeGroup : flatGroup).add(markerMesh);
        updateMarkerMatrices();
    };

    const updateCameraAndDiameter = (nextContext: KThreeSceneContext<T>): void => {
        const bounds = nextContext.canvas.getBoundingClientRect();
        const pixelRatio = Math.max(nextContext.renderer.getPixelRatio(), 1);
        const width = bounds.width || nextContext.canvas.width / pixelRatio || 1;
        const height = bounds.height || nextContext.canvas.height / pixelRatio || 1;
        const tangent = Math.tan(THREE.MathUtils.degToRad(nextContext.camera.fov) / 2);
        if (projection === 'flat') {
            const aspect = width / Math.max(height, 1);
            const fittedHeight = Math.max(globeScale, globeScale * 2 / aspect);
            const cameraDistance = fittedHeight / (2 * tangent) * 1.02;
            nextContext.camera.position.set(0, 0, cameraDistance);
            nextContext.camera.near = Math.max(0.001, cameraDistance / 100);
            nextContext.camera.far = cameraDistance + globeScale * 4;
            nextContext.camera.lookAt(0, 0, 0);
            nextContext.camera.updateProjectionMatrix();
            return;
        }

        const unitDiameter = Math.max(1, Math.min(width, height) * 0.82);
        const projectionRatio = Math.max(unitDiameter * tangent / height, 0.001);
        const cameraDistance = globeScale * Math.sqrt(
            1 + 1 / (projectionRatio * projectionRatio)
        );
        nextContext.camera.position.set(0, 0, cameraDistance);
        nextContext.camera.near = Math.max(0.01, cameraDistance - globeScale * 2);
        nextContext.camera.far = cameraDistance + globeScale * 4;
        nextContext.camera.lookAt(0, 0, 0);
        nextContext.camera.updateProjectionMatrix();
        const tangentDistance = Math.sqrt(Math.max(
            cameraDistance * cameraDistance - globeScale * globeScale,
            0.001
        ));
        globeDiameter = globeScale / tangentDistance * height / tangent;
    };

    return {
        attach(nextContext) {
            context = nextContext;
            destroyed = false;
            rootGroup = new THREE.Group();
            rootGroup.name = 'kchart-three-earth';
            globeGroup = new THREE.Group();
            globeGroup.name = 'kchart-three-globe';
            flatGroup = new THREE.Group();
            flatGroup.name = 'kchart-three-flat-map';
            rootGroup.add(globeGroup, flatGroup);

            const dayTexture = resolveTexture(configuration.dayTexture);
            const nightTexture = configuration.nightTexture
                ? resolveTexture(configuration.nightTexture)
                : dayTexture;
            globeGeometry = new THREE.SphereGeometry(globeScale, 96, 64);
            flatGeometry = new THREE.PlaneGeometry(globeScale * 2, globeScale, 1, 1);
            earthMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uDayTexture: {value: dayTexture},
                    uNightTexture: {value: nightTexture},
                    uHasNightTexture: {value: configuration.nightTexture ? 1 : 0},
                    uHasSubsolar: {value: subsolar ? 1 : 0},
                    uLightingMode: {value: 2},
                    uSubsolarDirection: {value: new THREE.Vector3(1, 0, 0)}
                },
                vertexShader: GLOBE_VERTEX_SHADER,
                fragmentShader: GLOBE_FRAGMENT_SHADER,
                depthWrite: true,
                depthTest: true,
                toneMapped: false
            });
            const globeMesh = new THREE.Mesh(globeGeometry, earthMaterial);
            globeMesh.name = 'kchart-three-globe-surface';
            globeGroup.add(globeMesh);
            const flatMesh = new THREE.Mesh(flatGeometry, earthMaterial);
            flatMesh.name = 'kchart-three-flat-map-surface';
            flatGroup.add(flatMesh);
            [-1, 1].forEach((worldOffset) => {
                const wrappedMesh = new THREE.Mesh(flatGeometry, earthMaterial);
                wrappedMesh.name = `kchart-three-flat-map-wrap-${worldOffset}`;
                wrappedMesh.position.x = worldOffset * globeScale * 2;
                flatGroup?.add(wrappedMesh);
            });

            if (configuration.atmosphere) {
                const atmosphere = configuration.atmosphere === true
                    ? {}
                    : configuration.atmosphere;
                atmosphereGeometry = new THREE.SphereGeometry(globeScale * 1.045, 96, 64);
                atmosphereMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        uColor: {value: new THREE.Color(atmosphere.color ?? '#68a7ff')},
                        uIntensity: {value: atmosphere.intensity ?? 0.72},
                        uPower: {value: atmosphere.power ?? 3}
                    },
                    vertexShader: ATMOSPHERE_VERTEX_SHADER,
                    fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
                    transparent: true,
                    depthWrite: false,
                    depthTest: true,
                    side: THREE.BackSide,
                    blending: THREE.AdditiveBlending,
                    toneMapped: false
                });
                const atmosphereMesh = new THREE.Mesh(
                    atmosphereGeometry,
                    atmosphereMaterial
                );
                atmosphereMesh.name = 'kchart-three-globe-atmosphere';
                globeGroup.add(atmosphereMesh);
            }

            if (configuration.markers) {
                markerGeometry = new THREE.SphereGeometry(1, 12, 8);
                markerMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    toneMapped: false
                });
            }

            nextContext.scene.add(rootGroup);
            updateRotation();
            updateFlatTransform();
            updateSubsolarUniform();
            updateProjectionGroups();
            updateCameraAndDiameter(nextContext);
        },
        resize(nextContext) {
            updateCameraAndDiameter(nextContext);
        },
        setData(nextData) {
            if (nextData === markerData) {
                return;
            }
            markerData = nextData;
            updateMarkers(nextData);
        },
        getDiameter() {
            return globeDiameter;
        },
        setCenter(nextCenter) {
            center = normalizeCenter(nextCenter);
            updateRotation();
        },
        setProjection(nextProjection) {
            projection = normalizeProjection(nextProjection);
            updateProjectionGroups();
            if (context) {
                updateCameraAndDiameter(context);
            }
        },
        setFlatView(nextFlatView) {
            flatView = normalizeFlatMapView(nextFlatView, flatView);
            updateFlatTransform();
            updateLightingUniform();
            if (projection === 'flat') {
                updateMarkerMatrices();
            }
        },
        setSubsolar(nextSubsolar) {
            subsolar = nextSubsolar ? normalizeCenter(nextSubsolar, 90) : null;
            updateSubsolarUniform();
        },
        destroy() {
            destroyed = true;
            if (rootGroup) {
                context?.scene.remove(rootGroup);
            }
            removeMarkerMesh();
            globeGeometry?.dispose();
            flatGeometry?.dispose();
            earthMaterial?.dispose();
            atmosphereGeometry?.dispose();
            atmosphereMaterial?.dispose();
            markerGeometry?.dispose();
            markerMaterial?.dispose();
            ownedTextures.forEach((texture) => texture.dispose());
            ownedTextures.clear();
            rootGroup = undefined;
            globeGroup = undefined;
            flatGroup = undefined;
            globeGeometry = undefined;
            flatGeometry = undefined;
            earthMaterial = undefined;
            atmosphereGeometry = undefined;
            atmosphereMaterial = undefined;
            markerGeometry = undefined;
            markerMaterial = undefined;
            markerData = undefined;
            markers = [];
            context = undefined;
        }
    };
};

export const createThreeGlobeSeries = <T = unknown>(
    configuration: KThreeGlobeSeriesConfiguration<T>
): KThreeGlobeSeriesHandle<T> => {
    const transitionDuration = Math.max(0, configuration.transitionDuration ?? 600);
    let center = normalizeCenter(configuration.initialCenter ?? {lat: 0, lon: 0});
    let subsolar = resolveSubsolar(configuration.subsolar);
    let projection = normalizeProjection(configuration.projection);
    let flatView = normalizeFlatMapView(configuration.flatMap);
    let controller: KThreeSceneController<T> | undefined;
    let globeObject: KThreeGlobeObject<T> | undefined;
    let canvas: HTMLCanvasElement | undefined;
    let removeDragListeners: (() => void) | undefined;
    let renderFrame = 0;
    let tweenFrame = 0;
    let currentData: readonly T[] | undefined;
    let destroyed = false;

    const cancelTween = (): void => {
        if (tweenFrame) {
            window.cancelAnimationFrame(tweenFrame);
            tweenFrame = 0;
        }
    };

    const requestRender = (): void => {
        if (destroyed || !controller || renderFrame) {
            return;
        }
        renderFrame = window.requestAnimationFrame(() => {
            renderFrame = 0;
            if (!destroyed) {
                controller?.render();
            }
        });
    };

    const applyCenter = (nextCenter: LatLon): void => {
        center = normalizeCenter(nextCenter);
        globeObject?.setCenter(center);
    };

    const syncCanvasInteraction = (): void => {
        if (canvas) {
            activateThreeCanvasInteraction(
                canvas,
                projection === 'globe' ? 'grab' : 'default'
            );
        }
    };

    const teardownScene = (): void => {
        cancelTween();
        if (renderFrame) {
            window.cancelAnimationFrame(renderFrame);
            renderFrame = 0;
        }
        removeDragListeners?.();
        removeDragListeners = undefined;
        controller?.destroy();
        controller = undefined;
        globeObject = undefined;
        canvas = undefined;
        currentData = undefined;
    };

    const setCenter = (
        nextCenter: LatLon,
        options: KThreeGlobeTransitionOptions = {}
    ): void => {
        const target = normalizeCenter(nextCenter);
        const duration = Math.max(0, options.duration ?? transitionDuration);
        const animate = options.animate ?? duration > 0;
        cancelTween();
        if (!animate || duration === 0 || !controller) {
            applyCenter(target);
            requestRender();
            return;
        }

        const start = {...center};
        const longitudeDelta = shortestLongitudeDelta(start.lon, target.lon);
        const startedAt = performance.now();
        const step = (now: number): void => {
            const progress = Math.min(1, (now - startedAt) / duration);
            const eased = cubicEaseOut(progress);
            applyCenter({
                lat: start.lat + (target.lat - start.lat) * eased,
                lon: start.lon + longitudeDelta * eased
            });
            controller?.render();
            if (progress < 1 && !destroyed) {
                tweenFrame = window.requestAnimationFrame(step);
            } else {
                tweenFrame = 0;
                applyCenter(target);
                controller?.render();
            }
        };
        tweenFrame = window.requestAnimationFrame(step);
    };

    const series = createCustomSeries<T>({
        selector: configuration.selector,
        displayName: configuration.displayName,
        pointerEvents: 'series',
        render({getWebglCanvas, data, plotSize}) {
            destroyed = false;
            const nextCanvas = getWebglCanvas(configuration.canvasName ?? configuration.selector);
            // KChart normalizes shared canvas styles before each series render.
            // Re-apply the interaction layer so repeated chart renders keep drag input enabled.
            activateThreeCanvasInteraction(
                nextCanvas,
                projection === 'globe' ? 'grab' : 'default'
            );
            if (!controller || canvas !== nextCanvas) {
                teardownScene();
                canvas = nextCanvas;
                controller = createKThreeScene<T>({
                    canvas,
                    width: plotSize.width,
                    height: plotSize.height,
                    alpha: true,
                    backgroundColor: 0x000000,
                    antialias: true,
                    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
                    camera: {
                        fov: 40,
                        near: 0.01,
                        far: 100,
                        position: [0, 0, 3.2],
                        lookAt: [0, 0, 0]
                    },
                    controls: false,
                    lights: 'none',
                    canvasCursor: projection === 'globe' ? 'grab' : 'default',
                    autoStart: false
                });
                globeObject = createThreeGlobeObject(
                    configuration,
                    center,
                    subsolar,
                    projection,
                    flatView,
                    requestRender
                );
                controller.add(globeObject);
                removeDragListeners = bindGlobeDrag(nextCanvas, {
                    getCenter: () => center,
                    getDiameter: () => globeObject?.getDiameter() ?? 1,
                    setCenter: applyCenter,
                    cancelTween,
                    requestRender,
                    isEnabled: () => projection === 'globe',
                    onCenterChange: configuration.onCenterChange
                });
                syncCanvasInteraction();
            }
            if (configuration.markers && currentData !== data) {
                currentData = data;
                controller.setData(data);
            }
            // KChart may reset a reused canvas even when plot dimensions are unchanged.
            // Reassert DPR/backing size and draw once without starting an animation loop.
            controller.resize(plotSize.width, plotSize.height);
        },
        destroy() {
            destroyed = true;
            teardownScene();
        }
    });

    return Object.assign(series, {
        getCenter: (): LatLon => ({...center}),
        setCenter,
        getProjection: (): KThreeGlobeProjection => projection,
        setProjection(nextProjection: KThreeGlobeProjection): void {
            const normalized = normalizeProjection(nextProjection);
            if (projection === normalized) {
                return;
            }
            projection = normalized;
            globeObject?.setProjection(projection);
            syncCanvasInteraction();
            requestRender();
        },
        getFlatView: (): KThreeFlatMapView => ({
            center: {...flatView.center},
            zoom: flatView.zoom,
            lighting: flatView.lighting
        }),
        setFlatView(nextFlatView: KThreeFlatMapConfiguration): void {
            const normalized = normalizeFlatMapView(nextFlatView, flatView);
            if (
                normalized.zoom === flatView.zoom
                && normalized.center.lat === flatView.center.lat
                && normalized.center.lon === flatView.center.lon
                && normalized.lighting === flatView.lighting
            ) {
                return;
            }
            flatView = normalized;
            globeObject?.setFlatView(flatView);
            requestRender();
        },
        setSubsolar(nextSubsolar: LatLon | null): void {
            subsolar = nextSubsolar ? normalizeCenter(nextSubsolar, 90) : null;
            globeObject?.setSubsolar(subsolar);
            requestRender();
        },
        setDate(date: Date | null): void {
            subsolar = date ? calculateSubsolarPoint(date) : null;
            globeObject?.setSubsolar(subsolar);
            requestRender();
        }
    });
};

const normalizeValue = (value: number | undefined, range: [number, number]): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }
    const [min, max] = range;
    if (max <= min) {
        return 0;
    }
    return Math.max(0, Math.min(1, ((value as number) - min) / (max - min)));
};

const resolveFieldValue = <T>(die: T, field: keyof T & string | undefined): unknown =>
    field ? (die as Record<string, unknown>)[field] : undefined;

export const createWaferMonitorObject = <T = KThreeWaferDie>(
    configuration: KThreeWaferMonitorConfiguration<T>
): KThreeObject<T> => {
    let context: KThreeSceneContext<T> | undefined;
    let group: THREE.Group | undefined;
    let dieMeshes: Array<{
        mesh: THREE.InstancedMesh;
        indexes: number[];
    }> = [];
    let label: HTMLDivElement | undefined;
    let data: readonly T[] = configuration.data ?? [];
    let activeIndex = -1;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    const colors = {
        ...DEFAULT_STATUS_COLORS,
        ...configuration.colors
    };

    const getStatus = (die: T): string =>
        String(resolveFieldValue(die, configuration.fields.status) ?? 'unknown');

    const getValue = (die: T): number | undefined => {
        const value = Number(resolveFieldValue(die, configuration.fields.value));
        return Number.isFinite(value) ? value : undefined;
    };

    const getLabel = (die: T): string => {
        const explicit = resolveFieldValue(die, configuration.fields.label);
        if (explicit !== undefined && explicit !== null) {
            return String(explicit);
        }
        const id = resolveFieldValue(die, configuration.fields.id);
        if (id !== undefined && id !== null) {
            return String(id);
        }
        return `R${resolveFieldValue(die, configuration.fields.row)} C${resolveFieldValue(die, configuration.fields.col)}`;
    };

    const setDieColors = (): void => {
        dieMeshes.forEach(({mesh, indexes}) => {
            const material = mesh.material as THREE.MeshBasicMaterial;
            const firstDie = data[indexes[0]];
            const baseColor = new THREE.Color(colors[firstDie ? getStatus(firstDie) : 'unknown'] ?? colors.unknown);
            if (indexes.includes(activeIndex)) {
                baseColor.lerp(new THREE.Color('#ffffff'), 0.22);
            }
            material.color.copy(baseColor);
            material.needsUpdate = true;
        });
    };

    const updateLabel = (die: T | undefined): void => {
        if (!label) {
            return;
        }
        if (!die) {
            label.textContent = configuration.label?.emptyText ?? 'Hover a die · drag to rotate';
            return;
        }
        const status = getStatus(die).toUpperCase();
        const value = getValue(die);
        label.textContent = `${getLabel(die)} · ${status}${value === undefined ? '' : ` · ${value.toFixed(1)}`}`;
    };

    const pickIndex = (event: PointerEvent | MouseEvent): number => {
        if (!context || dieMeshes.length === 0) {
            return -1;
        }
        setPointerFromEvent(context.pointer, context.canvas, event);
        context.raycaster.setFromCamera(context.pointer, context.camera);
        for (const {mesh, indexes} of dieMeshes) {
            const hit = context.raycaster.intersectObject(mesh, false)[0];
            if (hit?.instanceId !== undefined) {
                return indexes[hit.instanceId] ?? -1;
            }
        }
        return -1;
    };

    const rebuild = (): void => {
        if (!context || !group) {
            return;
        }
        dieMeshes.forEach(({mesh}) => {
            group?.remove(mesh);
            disposeObject(mesh);
        });
        dieMeshes = [];

        const waferRadius = configuration.wafer?.radius ?? 5.2;
        const dieWidth = configuration.die?.width ?? 0.34;
        const dieHeight = configuration.die?.height ?? 0.34;
        const dieGap = configuration.die?.gap ?? 0.055;
        const maxExtrude = configuration.die?.maxExtrude ?? 0.8;
        const valueRange = configuration.valueRange ?? [0, 100];
        const cellX = dieWidth + dieGap;
        const cellZ = dieHeight + dieGap;
        const validData = data.filter((die) => {
            const x = Number(resolveFieldValue(die, configuration.fields.col)) * cellX;
            const z = Number(resolveFieldValue(die, configuration.fields.row)) * cellZ;
            return Math.hypot(x, z) <= waferRadius - Math.max(dieWidth, dieHeight) * 0.42;
        });

        data = validData;
        const grouped = new Map<string, number[]>();
        data.forEach((die, index) => {
            const status = getStatus(die);
            grouped.set(status, [...(grouped.get(status) ?? []), index]);
        });
        grouped.forEach((indexes, status) => {
            const dieGeometry = new THREE.BoxGeometry(dieWidth, 0.08, dieHeight);
            const dieMaterial = new THREE.MeshBasicMaterial({
                color: colors[status] ?? colors.unknown,
                transparent: true,
                opacity: configuration.die?.opacity ?? 0.96,
                toneMapped: false
            });
            const mesh = new THREE.InstancedMesh(dieGeometry, dieMaterial, indexes.length);
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            indexes.forEach((dataIndex, instanceIndex) => {
                const die = data[dataIndex];
                const col = Number(resolveFieldValue(die, configuration.fields.col));
                const row = Number(resolveFieldValue(die, configuration.fields.row));
                const extrude = normalizeValue(getValue(die), valueRange) * maxExtrude;
                position.set(col * cellX, 0.09 + extrude * 0.5, row * cellZ);
                scale.set(1, 1 + extrude / 0.08, 1);
                matrix.compose(position, quaternion, scale);
                mesh.setMatrixAt(instanceIndex, matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
            dieMeshes.push({mesh, indexes});
            group?.add(mesh);
        });
        setDieColors();
    };

    return {
        attach(nextContext) {
            context = nextContext;
            group = new THREE.Group();
            context.scene.add(group);

            const radius = configuration.wafer?.radius ?? 5.2;
            const thickness = configuration.wafer?.thickness ?? 0.12;
            const waferGeometry = new THREE.CylinderGeometry(radius, radius, thickness, 128);
            const waferMaterial = new THREE.MeshStandardMaterial({
                color: configuration.wafer?.color ?? '#263346',
                roughness: 0.38,
                metalness: 0.62,
                transparent: true,
                opacity: 0.96
            });
            const wafer = new THREE.Mesh(waferGeometry, waferMaterial);
            wafer.position.y = -0.04;
            group.add(wafer);

            const edge = new THREE.Mesh(
                new THREE.TorusGeometry(radius, 0.035, 12, 160),
                new THREE.MeshBasicMaterial({color: configuration.wafer?.edgeColor ?? '#8bd3ff'})
            );
            edge.rotation.x = Math.PI / 2;
            edge.position.y = 0.04;
            group.add(edge);

            if (configuration.wafer?.notch ?? true) {
                const notch = new THREE.Mesh(
                    new THREE.BoxGeometry(0.56, 0.08, 0.16),
                    new THREE.MeshBasicMaterial({color: '#08111f'})
                );
                notch.position.set(0, 0.08, -radius + 0.04);
                group.add(notch);
            }

            label = document.createElement('div');
            label.className = 'kchart-three-label';
            label.textContent = configuration.label?.title ?? 'Wafer Monitor';
            label.hidden = configuration.label?.visible === false;
            context.host.appendChild(label);

            rebuild();
        },
        setData(nextData) {
            data = nextData;
            activeIndex = -1;
            updateLabel(undefined);
            rebuild();
        },
        pointerMove(event, nextContext) {
            const nextIndex = pickIndex(event);
            if (nextIndex === activeIndex) {
                return;
            }
            activeIndex = nextIndex;
            nextContext.canvas.style.cursor = activeIndex >= 0 ? 'pointer' : 'grab';
            const die = data[activeIndex];
            updateLabel(die);
            setDieColors();
            configuration.onDieHover?.({die, index: activeIndex, event});
            nextContext.requestRender();
        },
        click(event) {
            const index = pickIndex(event);
            const die = data[index];
            if (!die) {
                return;
            }
            configuration.onDieClick?.({die, index, event});
        },
        destroy() {
            label?.remove();
            if (group) {
                context?.scene.remove(group);
                disposeObject(group);
            }
            group = undefined;
            dieMeshes = [];
            label = undefined;
            context = undefined;
        }
    };
};

export const createThreeWaferSeries = <T = KThreeWaferDie>(
    configuration: KThreeWaferSeriesConfiguration<T>
): KChartSeries<T> => {
    let controller: KThreeSceneController<T> | undefined;
    let canvas: HTMLCanvasElement | undefined;

    const destroy = (): void => {
        controller?.destroy();
        controller = undefined;
        canvas = undefined;
    };

    return createCustomSeries<T>({
        selector: configuration.selector,
        displayName: configuration.displayName,
        render({getWebglCanvas, data, plotSize}) {
            const nextCanvas = getWebglCanvas(configuration.canvasName ?? configuration.selector);
            scheduleThreeCanvasInteraction(nextCanvas);
            if (!controller || canvas !== nextCanvas) {
                destroy();
                canvas = nextCanvas;
                controller = createKThreeScene<T>({
                    canvas,
                    width: plotSize.width,
                    height: plotSize.height,
                    backgroundColor: '#08111f',
                    alpha: false,
                    camera: {
                        fov: 38,
                        position: [0, 12.2, 6.2],
                        lookAt: [0, 0, 0]
                    },
                    controls: {
                        orbit: true,
                        autoRotate: true,
                        autoRotateSpeed: 0.18,
                        enablePan: false,
                        minDistance: 7,
                        maxDistance: 20
                    },
                    lights: 'studio',
                    ...configuration.scene
                }).add(createWaferMonitorObject<T>({
                    ...configuration,
                    data
                }));
            }
            controller.resize(plotSize.width, plotSize.height);
            controller.setData(data);
        },
        destroy
    });
};

export const createWaferDies = (options: {
    rows?: number;
    cols?: number;
    seed?: number;
} = {}): KThreeWaferDie[] => {
    const rows = options.rows ?? 25;
    const cols = options.cols ?? 25;
    let seed = options.seed ?? 42;
    const dies: KThreeWaferDie[] = [];
    const rowCenter = (rows - 1) / 2;
    const colCenter = (cols - 1) / 2;
    const radius = Math.min(rows, cols) / 2 - 0.8;
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const centeredRow = row - rowCenter;
            const centeredCol = col - colCenter;
            if (Math.hypot(centeredRow, centeredCol) > radius) {
                continue;
            }
            seed = (seed * 1664525 + 1013904223) % 4294967296;
            const noise = seed / 4294967296;
            const ring = Math.hypot(centeredRow, centeredCol) / radius;
            const value = Math.max(0, Math.min(100, 92 - ring * 18 + Math.sin(row * 0.9) * 5 + noise * 14));
            const status = value < 68
                ? 'fail'
                : value < 78
                    ? 'warn'
                    : 'pass';
            dies.push({
                id: `D-${row}-${col}`,
                label: `Die ${row}-${col}`,
                row: centeredRow,
                col: centeredCol,
                status,
                value
            });
        }
    }
    return dies;
};
