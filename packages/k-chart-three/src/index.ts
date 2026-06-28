import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {
    createCustomSeries,
    type KChartSeries
} from '@keneth80/k-chart';

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

const activateThreeCanvasInteraction = (canvas: HTMLCanvasElement): void => {
    canvas.style.position = canvas.style.position || 'absolute';
    canvas.style.pointerEvents = 'auto';
    canvas.style.setProperty('z-index', '8', 'important');
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';
};

const scheduleThreeCanvasInteraction = (canvas: HTMLCanvasElement): void => {
    activateThreeCanvasInteraction(canvas);
    requestAnimationFrame(() => activateThreeCanvasInteraction(canvas));
    window.setTimeout(() => activateThreeCanvasInteraction(canvas), 0);
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
    scheduleThreeCanvasInteraction(canvas);

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: configuration.antialias ?? true,
        alpha: configuration.alpha ?? true
    });
    renderer.setPixelRatio(configuration.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2));
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
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('click', handleClick);
            objects.forEach((object) => object.destroy?.());
            controls?.dispose();
            renderer.dispose();
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
