import * as THREE from 'three';
import {createKChart} from '../../src';
import {createThreeGlobeSeries} from '../../packages/k-chart-three/src';

const locations = [
    {lat: 37.5665, lon: 126.978},
    {lat: 40.7128, lon: -74.006},
    {lat: -33.8688, lon: 151.2093},
    {lat: 0, lon: 179.8},
    {lat: 85, lon: -179.8},
    {lat: 90, lon: 0}
];
const texture = (night: boolean): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    context.fillStyle = night ? '#17354f' : '#397c8a';
    context.fillRect(0, 0, 512, 256);
    for (let y = 0; y < 256; y += 16) {
        for (let x = 0; x < 512; x += 16) {
            context.fillStyle = (x / 16 + y / 16) % 2 ? '#e3c463' : '#467c69';
            context.fillRect(x + 2, y + 2, 11, 11);
        }
    }
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
};
const day = texture(false);
const night = texture(true);
let series: ReturnType<typeof createThreeGlobeSeries>;
let chart: ReturnType<typeof createKChart>;
let lastScene: THREE.Scene;
let lastCamera: THREE.Camera;
let lastRenderer: THREE.WebGLRenderer;
let capturePixels = false;
let pixels = {colored: 0, total: 0, lateralColored: 0, lateralTotal: 0};
let frames: unknown[] = [];

const inspect = () => {
    if (!lastScene || !series) return null;
    const markers = lastScene.getObjectByName('kchart-three-globe-markers') as THREE.InstancedMesh;
    if (!markers) return null;
    const matrix = new THREE.Matrix4();
    lastScene.updateMatrixWorld(true);
    const points = locations.map((_, index) => {
        markers.getMatrixAt(index, matrix);
        const position = new THREE.Vector3().setFromMatrixPosition(matrix).applyMatrix4(markers.matrixWorld);
        const screen = position.clone().project(lastCamera);
        return {world: position.toArray(), screen: screen.toArray()};
    });
    const surface = lastScene.getObjectByName('kchart-three-globe-surface') as THREE.Mesh<THREE.PlaneGeometry>;
    const surfaces: {name: string; uuid: string; count: number; finite: boolean; maxNdc: number; positionVersion: number; ndcHeight: number}[] = [];
    lastScene.traverse(object => {
        // Include every mesh using the geographic geometry, not only names
        // containing "surface": otherwise adjacent world copies escape checks.
        if ((object as THREE.Mesh).geometry !== surface.geometry || !object.visible) return;
        const geometry = (object as THREE.Mesh).geometry;
        const positions = geometry?.getAttribute('position');
        if (positions) {
            let maxNdc = 0;
            let minY = Infinity;
            let maxY = -Infinity;
            const point = new THREE.Vector3();
            for (let i = 0; i < positions.count; i++) {
                point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(lastCamera);
                maxNdc = Math.max(maxNdc, Math.abs(point.x), Math.abs(point.y));
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
            }
            surfaces.push({name: object.name, uuid: geometry.uuid, count: positions.count, maxNdc, ndcHeight: maxY - minY, positionVersion: (positions as THREE.BufferAttribute).version,
                finite: Array.from(positions.array).every(Number.isFinite)});
        }
    });
    const atmosphere = lastScene.getObjectByName('kchart-three-globe-atmosphere') as THREE.Mesh<THREE.SphereGeometry>;
    const size = lastRenderer.getSize(new THREE.Vector2());
    return {progress: series.getProjectionProgress(), center: series.getCenter(),
        camera: {distance: lastCamera.position.z, tangent: Math.tan(THREE.MathUtils.degToRad((lastCamera as THREE.PerspectiveCamera).fov) / 2),
            width: size.x, height: size.y, framingRadius: atmosphere?.geometry.parameters.radius ?? surface.geometry.parameters.height},
        points, surfaces, markerUuid: markers.uuid, pixels, canvasCount: document.querySelectorAll('canvas').length};
};

const originalAfterRender = THREE.Scene.prototype.onAfterRender;
THREE.Scene.prototype.onAfterRender = function(renderer, scene, camera, ...args) {
    originalAfterRender.call(this, renderer, scene, camera, ...args);
    lastScene = this;
    lastCamera = camera;
    lastRenderer = renderer;
    if (capturePixels) {
        capturePixels = false;
        const gl = renderer.getContext();
        const width = gl.drawingBufferWidth;
        const height = gl.drawingBufferHeight;
        const values = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, values);
        let colored = 0;
        for (let y = 1; y < 20; y++) for (let x = 1; x < 20; x++) {
            const index = (Math.floor(height * y / 20) * width + Math.floor(width * x / 20)) * 4;
            if (values[index] + values[index + 1] + values[index + 2] > 40) colored++;
        }
        let lateralColored = 0;
        let lateralTotal = 0;
        for (const x of [0.02, 0.98]) for (const y of [0.25, 0.5, 0.75]) {
            const index = (Math.floor(height * y) * width + Math.floor(width * x)) * 4;
            if (values[index] + values[index + 1] + values[index + 2] > 40) lateralColored++;
            lateralTotal++;
        }
        pixels = {colored, total: 361, lateralColored, lateralTotal};
    }
    const frame = inspect();
    if (frame && frames.length < 500) frames.push(frame);
};

const mount = (options = {}) => {
    chart?.destroy();
    series = createThreeGlobeSeries({
        selector: 'test-earth', dayTexture: day, nightTexture: night,
        initialCenter: {lat: 25, lon: 127},
        atmosphere: true,
        markers: {fields: {lat: 'lat', lon: 'lon'}, color: '#ff5369', radius: 0.015},
        ...options
    });
    chart = createKChart({selector: '#chart', width: innerWidth, height: innerHeight,
        data: locations, axes: [], margin: {top: 0, right: 0, bottom: 0, left: 0},
        grid: {visible: false}, legend: {visible: false}, tooltip: {visible: false}, series: [series]});
    chart.render();
};
mount();
(window as any).globeHarness = {
    series: () => series,
    mount,
    inspect,
    clearFrames: () => {frames = [];},
    frames: () => frames,
    capture: () => {capturePixels = true; chart.render(); return inspect();},
    resize: (width: number, height: number) => chart.resize({width, height}),
    destroy: () => chart.destroy(),
    contextLost: () => lastRenderer.getContext().isContextLost()
};
