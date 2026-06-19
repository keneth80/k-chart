import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    createCustomSeries,
    KChartSeries
} from '../src';

export interface ConstellationNode {
    id: string;
    label: string;
    x: number;
    y: number;
    z: number;
    size: number;
    color?: string;
}

export interface ConstellationLink {
    source: string;
    target: string;
}

export interface ThreeConstellationSeriesConfiguration<T> {
    selector: string;
    displayName?: string;
    idField: keyof T & string;
    labelField: keyof T & string;
    xField: keyof T & string;
    yField: keyof T & string;
    zField: keyof T & string;
    sizeField?: keyof T & string;
    colorField?: keyof T & string;
    links: ConstellationLink[];
    canvasName?: string;
    lineColor?: string;
    backgroundColor?: string;
    autoRotate?: boolean;
    onNodeClick?: (node: T) => void;
}

const disposeObject = (object: THREE.Object3D): void => {
    object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.filter(Boolean).forEach((material) => {
            (material as THREE.MeshBasicMaterial).map?.dispose();
            material.dispose();
        });
    });
};

const createGlowTexture = (): THREE.CanvasTexture => {
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const context = glowCanvas.getContext('2d');
    if (context) {
        const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.16, 'rgba(226, 243, 255, 0.92)');
        gradient.addColorStop(0.42, 'rgba(134, 217, 255, 0.42)');
        gradient.addColorStop(1, 'rgba(134, 217, 255, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(glowCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

export const createThreeConstellationSeries = <T = ConstellationNode>(
    configuration: ThreeConstellationSeriesConfiguration<T>
): KChartSeries<T> => {
    let canvas: HTMLCanvasElement | undefined;
    let renderer: THREE.WebGLRenderer | undefined;
    let scene: THREE.Scene | undefined;
    let camera: THREE.PerspectiveCamera | undefined;
    let controls: OrbitControls | undefined;
    let constellation: THREE.Group | undefined;
    let stars: THREE.InstancedMesh | undefined;
    let nodes: T[] = [];
    let selectedIndex = -1;
    let hoveredIndex = -1;
    let animationFrame = 0;
    let infoLabel: HTMLDivElement | undefined;
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    const setNodeColors = (): void => {
        if (!stars) {
            return;
        }
        nodes.forEach((node, index) => {
            const configuredColor = configuration.colorField
                ? node[configuration.colorField]
                : undefined;
            const baseColor = new THREE.Color(
                String(configuredColor ?? '#e8f5ff')
            );
            const color = index === selectedIndex
                ? new THREE.Color('#9edcff')
                : index === hoveredIndex
                    ? new THREE.Color('#ffffff')
                    : baseColor;
            stars?.setColorAt(index, color);
        });
        if (stars.instanceColor) {
            stars.instanceColor.needsUpdate = true;
        }
    };

    const resolvePointerIndex = (event: PointerEvent): number => {
        if (!canvas || !camera || !stars) {
            return -1;
        }
        const bounds = canvas.getBoundingClientRect();
        pointer.set(
            ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1,
            -((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 + 1
        );
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObject(stars, false)[0]?.instanceId ?? -1;
    };

    const handlePointerMove = (event: PointerEvent): void => {
        const nextIndex = resolvePointerIndex(event);
        if (nextIndex === hoveredIndex) {
            return;
        }
        hoveredIndex = nextIndex;
        if (canvas) {
            canvas.style.cursor = hoveredIndex >= 0 ? 'pointer' : 'grab';
        }
        if (infoLabel) {
            const node = nodes[hoveredIndex];
            infoLabel.textContent = node
                ? String(node[configuration.labelField])
                : 'Drag to rotate · Wheel to zoom';
        }
        setNodeColors();
    };

    const handleClick = (event: MouseEvent): void => {
        const nextIndex = resolvePointerIndex(event as PointerEvent);
        if (nextIndex < 0) {
            return;
        }
        selectedIndex = nextIndex;
        setNodeColors();
        configuration.onNodeClick?.(nodes[nextIndex]);
    };

    const initialize = (nextCanvas: HTMLCanvasElement): void => {
        canvas = nextCanvas;
        canvas.style.pointerEvents = 'auto';
        canvas.style.zIndex = '4';
        canvas.style.cursor = 'grab';

        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(configuration.backgroundColor ?? '#08111f', 1);

        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(configuration.backgroundColor ?? '#08111f', 9, 18);
        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 0.6, 8.5);

        controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.enablePan = false;
        controls.minDistance = 4;
        controls.maxDistance = 14;
        controls.autoRotate = configuration.autoRotate ?? true;
        controls.autoRotateSpeed = 0.28;

        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('click', handleClick);

        infoLabel = document.createElement('div');
        infoLabel.className = 'kchart-three-constellation-label';
        infoLabel.textContent = 'Drag to rotate · Wheel to zoom';
        canvas.parentElement?.appendChild(infoLabel);

        const animate = (): void => {
            controls?.update();
            if (scene && camera) {
                renderer?.render(scene, camera);
            }
            animationFrame = window.requestAnimationFrame(animate);
        };
        animate();
    };

    const rebuildConstellation = (data: T[]): void => {
        if (!scene) {
            return;
        }
        if (constellation) {
            scene.remove(constellation);
            disposeObject(constellation);
        }

        nodes = data;
        selectedIndex = Math.min(selectedIndex, nodes.length - 1);
        hoveredIndex = -1;
        constellation = new THREE.Group();
        scene.add(constellation);

        const positions = new Map<string, THREE.Vector3>();
        const matrix = new THREE.Matrix4();
        const starGeometry = new THREE.SphereGeometry(0.09, 16, 12);
        const starMaterial = new THREE.MeshBasicMaterial({
            color: '#ffffff',
            vertexColors: true,
            toneMapped: false
        });
        stars = new THREE.InstancedMesh(starGeometry, starMaterial, nodes.length);
        const glowTexture = createGlowTexture();
        const glowGroup = new THREE.Group();

        nodes.forEach((node, index) => {
            const position = new THREE.Vector3(
                Number(node[configuration.xField]),
                Number(node[configuration.yField]),
                Number(node[configuration.zField])
            );
            const size = configuration.sizeField
                ? Math.max(Number(node[configuration.sizeField]) || 1, 0.4)
                : 1;
            positions.set(String(node[configuration.idField]), position);
            matrix.makeScale(size, size, size);
            matrix.setPosition(position);
            stars?.setMatrixAt(index, matrix);

            const configuredColor = configuration.colorField
                ? node[configuration.colorField]
                : undefined;
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: glowTexture.clone(),
                color: String(configuredColor ?? '#e8f5ff'),
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                toneMapped: false
            }));
            glow.position.copy(position);
            glow.scale.setScalar(size * 0.72);
            glowGroup.add(glow);
        });
        stars.instanceMatrix.needsUpdate = true;
        setNodeColors();
        constellation.add(stars);
        constellation.add(glowGroup);
        glowTexture.dispose();

        const linePositions: number[] = [];
        configuration.links.forEach((link) => {
            const source = positions.get(link.source);
            const target = positions.get(link.target);
            if (source && target) {
                linePositions.push(source.x, source.y, source.z, target.x, target.y, target.z);
            }
        });
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(linePositions, 3)
        );
        const lines = new THREE.LineSegments(
            lineGeometry,
            new THREE.LineBasicMaterial({
                color: configuration.lineColor ?? '#5db8ff',
                transparent: true,
                opacity: 0.58
            })
        );
        constellation.add(lines);

        const backgroundGeometry = new THREE.BufferGeometry();
        const backgroundPositions: number[] = [];
        let seed = 17;
        for (let index = 0; index < 280; index += 1) {
            seed = (seed * 9301 + 49297) % 233280;
            const radius = 6 + (seed / 233280) * 7;
            const phi = ((index * 137.5) % 360) * Math.PI / 180;
            const theta = ((index * 61.7) % 180) * Math.PI / 180;
            backgroundPositions.push(
                radius * Math.sin(theta) * Math.cos(phi),
                radius * Math.cos(theta),
                radius * Math.sin(theta) * Math.sin(phi)
            );
        }
        backgroundGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(backgroundPositions, 3)
        );
        constellation.add(new THREE.Points(
            backgroundGeometry,
            new THREE.PointsMaterial({
                color: '#d7efff',
                size: 0.025,
                transparent: true,
                opacity: 0.62
            })
        ));
    };

    const destroy = (): void => {
        if (animationFrame) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
        }
        canvas?.removeEventListener('pointermove', handlePointerMove);
        canvas?.removeEventListener('click', handleClick);
        controls?.dispose();
        if (constellation) {
            disposeObject(constellation);
        }
        renderer?.dispose();
        infoLabel?.remove();
        canvas = undefined;
        renderer = undefined;
        scene = undefined;
        camera = undefined;
        controls = undefined;
        constellation = undefined;
        stars = undefined;
        infoLabel = undefined;
    };

    return createCustomSeries<T>({
        selector: configuration.selector,
        displayName: configuration.displayName,
        render({ getWebglCanvas, data, plotSize }) {
            const nextCanvas = getWebglCanvas(
                configuration.canvasName ?? configuration.selector
            );
            if (canvas !== nextCanvas || !renderer) {
                destroy();
                initialize(nextCanvas);
            }
            renderer?.setSize(plotSize.width, plotSize.height, false);
            if (camera) {
                camera.aspect = plotSize.width / Math.max(plotSize.height, 1);
                camera.updateProjectionMatrix();
            }
            rebuildConstellation(data);
        },
        destroy
    });
};

// Relative placement follows the J2000 right ascension/declination pattern.
export const ariesNodes: ConstellationNode[] = [
    { id: 'mesarthim', label: 'Mesarthim · γ Ari', x: -2.25, y: -0.78, z: 0.08, size: 0.82, color: '#f8fcff' },
    { id: 'sheratan', label: 'Sheratan · β Ari', x: -2.08, y: -0.34, z: -0.06, size: 1.15, color: '#e8f5ff' },
    { id: 'hamal', label: 'Hamal · α Ari', x: -1.05, y: 0.62, z: 0.1, size: 1.55, color: '#fff7e8' },
    { id: 'botein', label: 'Botein · δ Ari', x: 1.95, y: -0.62, z: 0.04, size: 0.78, color: '#f2f8ff' },
    { id: 'bharani', label: 'Bharani · 41 Ari', x: 0.82, y: 1.78, z: -0.12, size: 0.9, color: '#e1f2ff' }
];

export const ariesLinks: ConstellationLink[] = [
    { source: 'mesarthim', target: 'sheratan' },
    { source: 'sheratan', target: 'hamal' },
    { source: 'hamal', target: 'botein' },
    { source: 'hamal', target: 'bharani' }
];
