import * as THREE from 'three';
import {createKChart, createSvgGlobeSeries, createWorldCountryMapSeries} from '../../src';
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
const mipDiagnosticTexture = (): THREE.DataTexture => {
    // Only coarse levels are white: an artificial seam becomes measurable when
    // wrapping UVs accidentally selects those levels in the globe's center.
    const levels = [];
    for (let level = 0; level <= 9; level++) {
        const width = Math.max(1, 512 >> level);
        const height = Math.max(1, 256 >> level);
        const data = new Uint8Array(width * height * 4);
        for (let i = 0; i < data.length; i += 4) {
            data.set(level >= 4 ? [255, 255, 255, 255] : [12, 48, 80, 255], i);
        }
        levels.push({data, width, height});
    }
    const result = new THREE.DataTexture(levels[0].data, 512, 256);
    result.mipmaps = levels;
    result.minFilter = THREE.LinearMipmapLinearFilter;
    result.magFilter = THREE.LinearFilter;
    result.generateMipmaps = false;
    result.needsUpdate = true;
    return result;
};
let series: ReturnType<typeof createThreeGlobeSeries>;
let chart: ReturnType<typeof createKChart>;
let lastScene: THREE.Scene;
let lastCamera: THREE.Camera;
let lastRenderer: THREE.WebGLRenderer;
let capturePixels = false;
let pixels = {colored: 0, total: 0, lateralColored: 0, lateralTotal: 0, seamBright: 0, seamTotal: 0};
let frames: unknown[] = [];
let geoPicks: {lat: number; lon: number}[] = [];
let geoRegionClicks: string[] = [];
let geoMarkerClicks = 0;
let geoControllerDestroyed = 0;
let geoKind = '';
let markerCallbacks: {name: string; index: number; lat: number; lon: number}[] = [];

const inspect = () => {
    if (!lastScene || !series) return null;
    const markers = lastScene.getObjectByName('kchart-three-globe-markers') as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4();
    lastScene.updateMatrixWorld(true);
    const points = markers ? Array.from({length: markers.count}, (_, index) => {
        markers.getMatrixAt(index, matrix);
        const position = new THREE.Vector3().setFromMatrixPosition(matrix).applyMatrix4(markers.matrixWorld);
        const screen = position.clone().project(lastCamera);
        return {world: position.toArray(), screen: screen.toArray()};
    }) : [];
    const surface = lastScene.getObjectByName('kchart-three-globe-surface') as THREE.Mesh<THREE.PlaneGeometry>;
    if (!surface) return null;
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
        points, surfaces, markerUuid: markers?.uuid, pixels, canvasCount: document.querySelectorAll('canvas').length};
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
        let seamBright = 0;
        let seamTotal = 0;
        for (let y = Math.floor(height * 0.47); y < height * 0.53; y++) {
            for (let x = Math.floor(width * 0.46); x < width * 0.54; x++) {
                const index = (y * width + x) * 4;
                if (values[index] > 220 && values[index + 1] > 220 && values[index + 2] > 220) seamBright++;
                seamTotal++;
            }
        }
        pixels = {colored, total: 361, lateralColored, lateralTotal, seamBright, seamTotal};
    }
    const frame = inspect();
    if (frame && frames.length < 500) frames.push(frame);
};

const mount = (options = {}, data = locations) => {
    chart?.destroy();
    series = createThreeGlobeSeries({
        selector: 'test-earth', dayTexture: day, nightTexture: night,
        initialCenter: {lat: 25, lon: 127},
        atmosphere: true,
        markers: {fields: {lat: 'lat', lon: 'lon'}, color: '#ff5369', radius: 0.015},
        ...options
    });
    chart = createKChart({selector: '#chart', width: innerWidth, height: innerHeight,
        data, axes: [], margin: {top: 0, right: 0, bottom: 0, left: 0},
        grid: {visible: false}, legend: {visible: false}, tooltip: {visible: false}, series: [series]});
    chart.render();
};
mount();
(window as any).globeHarness = {
    series: () => series,
    mount,
    mountMarkerPick: (options: {cancel?: boolean; destroy?: boolean; geo?: boolean} = {}) => {
        geoPicks = []; markerCallbacks = [];
        mount({autoRotate: false, initialCenter: {lat: 37.45, lon: 126.4},
            markers: {fields: {lat: 'lat', lon: 'lon'}, radius: 0.0005, surfaceOffset: 0.025},
            geoDrilldown: options.geo === false ? false : {openAt: (coordinate: {lat: number; lon: number}) => {geoPicks.push(coordinate); return true;}},
            onMarkerClick: (context: any) => {
                markerCallbacks.push({name: context.data.name, index: context.index, lat: context.lat, lon: context.lon});
                if (options.cancel) context.event.preventDefault();
                if (options.destroy) chart.destroy();
            }}, [{lat: NaN, lon: 0, name: 'invalid'}, {lat: -37.45, lon: -53.6, name: 'back'},
                {lat: 37.45, lon: 126.4, name: 'coast'}, {lat: 0, lon: 0, name: 'other'}] as any);
    },
    markerPickState: () => ({callbacks: markerCallbacks, picks: geoPicks}),
    mountMarkerVisibility: (kind: string) => {
        markerCallbacks = []; geoPicks = [];
        mount({autoRotate: false, initialCenter: {lat: 0, lon: 0}, geoDrilldown: false,
            markers: {fields: {lat: 'lat', lon: 'lon'}, radius: (datum: any) => datum.radius,
                surfaceOffset: (datum: any) => datum.offset},
            onMarkerClick: (context: any) => markerCallbacks.push({name: context.data.name,
                index: context.index, lat: context.lat, lon: context.lon})}, (kind === 'raised'
            ? [{lat: 0, lon: 70, radius: 0.03, offset: 0.5, name: 'raised'}]
            : [{lat: 0, lon: 0, radius: 0.15, offset: 0, name: 'large'},
                {lat: 0, lon: 0, radius: 0.025, offset: 0.25, name: 'small'}]) as any);
    },
    markerPickTarget: (instance: number) => {
        const point = inspect()!.points[instance].screen;
        const bounds = document.querySelector('#chart canvas')!.getBoundingClientRect();
        return {x: bounds.left + (point[0] + 1) * bounds.width / 2,
            y: bounds.top + (1 - point[1]) * bounds.height / 2};
    },
    mountGeo: (kind: string, enabled = true, zoom = true) => {
        chart?.destroy();
        geoPicks = []; geoRegionClicks = []; geoMarkerClicks = 0; geoKind = kind;
        const geoDrilldown = enabled ? {
            openAt: (coordinate: {lat: number; lon: number}) => {geoPicks.push(coordinate); return true;},
            openCountry: () => false,
            destroy: () => {geoControllerDestroyed++;}
        } as any : false;
        if (kind === 'three') {
            mount({autoRotate: false, initialCenter: {lat: 51, lon: 10}, geoDrilldown});
            return;
        }
        const mapSeries = kind === 'region' ? createWorldCountryMapSeries({
            selector: 'geo-country', geoDrilldown, zoom, labels: false,
            onRegionClick: context => geoRegionClicks.push(String(context.feature.id))
        }) : createSvgGlobeSeries({
            selector: 'geo-svg-globe', latField: 'lat', lonField: 'lon',
            initialRotate: [-10, -51, 0], landMode: 'countries', zoom, geoDrilldown,
            drilldown: kind === 'svg-marker', onMarkerClick: () => {geoMarkerClicks++;}
        });
        chart = createKChart({selector: '#chart', width: innerWidth, height: innerHeight,
            data: kind === 'svg-marker' ? [{lat: 51, lon: 10}] : [], axes: [],
            margin: {top: 0, right: 0, bottom: 0, left: 0}, grid: {visible: false},
            legend: {visible: false}, tooltip: {visible: true}, series: [mapSeries]});
        chart.render();
    },
    geoState: () => ({picks: geoPicks, regions: geoRegionClicks, markers: geoMarkerClicks, destroyed: geoControllerDestroyed}),
    geoMarkerTarget: (index: number) => {
        const state = inspect()!;
        const marker = state.points[index].world;
        // Pick the geographic surface below the elevated marker, not its
        // perspective-shifted 3D center. Allow one CSS pixel of input rounding.
        const point = new THREE.Vector3(marker[0], marker[1], 0).project(lastCamera);
        const bounds = document.querySelector('#chart canvas')!.getBoundingClientRect();
        return {x: bounds.left + (point.x + 1) * bounds.width / 2,
            y: bounds.top + (1 - point.y) * bounds.height / 2,
            degreesPerPixel: 180 / (state.surfaces[0].ndcHeight * bounds.height / 2)};
    },
    geoTarget: () => {
        if (geoKind === 'three') {
            const bounds = document.querySelector('#chart canvas')!.getBoundingClientRect();
            return {x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2};
        }
        if (geoKind === 'region') {
            const node = Array.from(document.querySelectorAll<SVGPathElement>('path.geo-country'))
                .find(node => String((node as any).__data__?.feature?.id) === '276')!;
            const center = (node as any).__data__.centroid;
            const point = new DOMPoint(center[0], center[1]).matrixTransform(node.getScreenCTM()!);
            return {x: point.x, y: point.y};
        }
        const sphere = document.querySelector<SVGPathElement>('path.kchart-globe-sphere')!;
        const bounds = sphere.getBBox();
        const point = new DOMPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2).matrixTransform(sphere.getScreenCTM()!);
        return {x: point.x, y: point.y};
    },
    mountSeam: (nightSide: boolean, legacySampling = false) => {
        const diagnostic = mipDiagnosticTexture();
        mount({dayTexture: diagnostic, nightTexture: diagnostic, autoRotate: false,
            initialCenter: {lat: 0, lon: 179}, subsolar: {lat: 0, lon: nightSide ? -1 : 179},
            flatMap: {center: {lat: 0, lon: 127}, lighting: 'dynamic'},
            atmosphere: false, markers: false});
        if (legacySampling) {
            const surface = lastScene.getObjectByName('kchart-three-globe-surface') as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
            surface.material.fragmentShader = surface.material.fragmentShader
                .replace('sampleEarthTexture(uDayTexture, earthUv)', 'texture2D(uDayTexture, earthUv).rgb')
                .replace('sampleEarthTexture(uNightTexture, earthUv)', 'texture2D(uNightTexture, earthUv).rgb');
            surface.material.needsUpdate = true;
        }
    },
    compileWebGL1Sampling: () => {
        const gl = document.createElement('canvas').getContext('webgl');
        if (!gl) throw new Error('WebGL1 context unavailable');
        const surface = lastScene.getObjectByName('kchart-three-globe-surface') as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
        const source = surface.material.fragmentShader.replace(/#include <[^>]+>/g, '');
        const compile = (prefix: string, shaderSource: string) => {
            const shader = gl.createShader(gl.FRAGMENT_SHADER)!;
            gl.shaderSource(shader, `${prefix}\nprecision highp float;\n${shaderSource}`);
            gl.compileShader(shader);
            const result = {compiled: Boolean(gl.getShaderParameter(shader, gl.COMPILE_STATUS)), log: gl.getShaderInfoLog(shader)};
            gl.deleteShader(shader);
            return result;
        };
        try {
            const fallback = compile('', source.replace(
                '#elif defined(GL_EXT_shader_texture_lod) && defined(GL_OES_standard_derivatives)', '#elif 0'));
            const supported = Boolean(gl.getExtension('OES_standard_derivatives') && gl.getExtension('EXT_shader_texture_lod'));
            const gradients = supported ? compile(
                '#extension GL_OES_standard_derivatives : enable\n#extension GL_EXT_shader_texture_lod : enable', source) : null;
            return {fallback, gradients};
        } finally {
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
    },
    inspect,
    clearFrames: () => {frames = [];},
    frames: () => frames,
    capture: () => {capturePixels = true; chart.render(); return inspect();},
    resize: (width: number, height: number) => chart.resize({width, height}),
    destroy: () => chart.destroy(),
    contextLost: () => lastRenderer.getContext().isContextLost()
};
