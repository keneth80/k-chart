const assert = require('node:assert/strict');
const {startKChartRenderWorker} = require('../lib/worker/render-worker');

class FakeWebGLContext {
    constructor() {
        this.ARRAY_BUFFER = 0x8892;
        this.DYNAMIC_DRAW = 0x88e8;
        this.FLOAT = 0x1406;
        this.LINE_STRIP = 0x0003;
        this.COLOR_BUFFER_BIT = 0x4000;
        this.BLEND = 0x0be2;
        this.SRC_ALPHA = 0x0302;
        this.ONE_MINUS_SRC_ALPHA = 0x0303;
        this.VERTEX_SHADER = 0x8b31;
        this.FRAGMENT_SHADER = 0x8b30;
        this.COMPILE_STATUS = 0x8b81;
        this.LINK_STATUS = 0x8b82;
        this.createdBuffers = [];
        this.deletedBuffers = [];
        this.deletedPrograms = [];
        this.bufferUploads = [];
        this.resolutions = [];
        this.shaderSources = [];
        this.drawCalls = [];
    }

    createShader(type) { return {type}; }
    shaderSource(shader, source) {
        shader.source = source;
        this.shaderSources.push(source);
    }
    compileShader() {}
    getShaderParameter() { return true; }
    getShaderInfoLog() { return ''; }
    deleteShader() {}
    createProgram() { return {}; }
    attachShader() {}
    linkProgram() {}
    getProgramParameter() { return true; }
    getProgramInfoLog() { return ''; }
    deleteProgram(program) { this.deletedPrograms.push(program); }
    createBuffer() {
        const buffer = {id: this.createdBuffers.length + 1};
        this.createdBuffers.push(buffer);
        return buffer;
    }
    deleteBuffer(buffer) { this.deletedBuffers.push(buffer); }
    bindBuffer(_target, buffer) { this.boundBuffer = buffer; }
    bufferData(target, data, usage) {
        this.bufferUploads.push({target, data, usage, buffer: this.boundBuffer});
    }
    getAttribLocation() { return 0; }
    enableVertexAttribArray() {}
    vertexAttribPointer() {}
    getUniformLocation(_program, name) { return {name}; }
    uniform2f(location, width, height) {
        this.resolutions.push({location: location.name, width, height});
    }
    uniform4fv() {}
    viewport() {}
    clearColor() {}
    clear() {}
    useProgram() {}
    enable() {}
    blendFunc() {}
    lineWidth() {}
    drawArrays(mode, first, count) { this.drawCalls.push({mode, first, count}); }
}

const gl = new FakeWebGLContext();
let canvasWidth = 0;
let canvasHeight = 0;
let widthSetCount = 0;
let heightSetCount = 0;
const canvas = {
    get width() { return canvasWidth; },
    set width(value) {
        canvasWidth = value;
        widthSetCount += 1;
    },
    get height() { return canvasHeight; },
    set height(value) {
        canvasHeight = value;
        heightSetCount += 1;
    },
    getContext(type) {
        assert.equal(type, 'webgl');
        return gl;
    }
};
const messages = [];
const scope = {
    onmessage: undefined,
    postMessage(message) { messages.push(message); }
};

startKChartRenderWorker(scope);
scope.onmessage({
    data: {
        type: 'kchart:init-canvas',
        canvasId: 'canvas-1',
        renderer: 'webgl',
        canvas
    }
});

const firstPoints = new Float32Array([0, 0, 50, 25, 100, 50]);
const secondPoints = new Float32Array([10, 5, 90, 45]);
const render = (requestId, points, width = 100, height = 50) => scope.onmessage({
    data: {
        type: 'kchart:render-line',
        canvasId: 'canvas-1',
        requestId,
        renderer: 'webgl',
        width,
        height,
        color: '#38bdf8',
        lineWidth: 1,
        points
    }
});

render(1, firstPoints);
render(2, secondPoints, 200, 80);
render(3, secondPoints, 200, 80);

assert.equal(gl.createdBuffers.length, 1, 'WebGL buffer should be created once per worker canvas');
assert.equal(gl.bufferUploads.length, 3, 'each render should upload its current point data');
assert.equal(gl.bufferUploads[0].data, firstPoints, 'worker should upload the transferred point array without a CPU copy');
assert.equal(gl.bufferUploads[1].data, secondPoints, 'subsequent renders should also reuse their transferred point array');
assert.ok(gl.bufferUploads.every((upload) => upload.buffer === gl.createdBuffers[0]), 'all renders should reuse one GPU buffer');
assert.ok(gl.bufferUploads.every((upload) => upload.usage === gl.DYNAMIC_DRAW), 'reused streaming buffer should use DYNAMIC_DRAW');
assert.equal(widthSetCount, 2, 'worker canvas width should change only when the pixel width changes');
assert.equal(heightSetCount, 2, 'worker canvas height should change only when the pixel height changes');
assert.deepEqual(
    gl.resolutions.map(({location, width, height}) => ({location, width, height})),
    [
        {location: 'u_resolution', width: 100, height: 50},
        {location: 'u_resolution', width: 200, height: 80},
        {location: 'u_resolution', width: 200, height: 80}
    ],
    'shader should receive canvas resolution for pixel-to-clip conversion'
);
assert.deepEqual(gl.drawCalls.map((call) => call.count), [3, 2, 2], 'draw count should remain based on source point pairs');
assert.deepEqual(
    messages.map(({type, requestId}) => ({type, requestId})),
    [
        {type: 'kchart:render-complete', requestId: 1},
        {type: 'kchart:render-complete', requestId: 2},
        {type: 'kchart:render-complete', requestId: 3}
    ],
    'render completion contract should remain unchanged'
);

const vertexShader = gl.shaderSources.find((source) => source.includes('a_position')) ?? '';
assert.match(vertexShader, /u_resolution/, 'vertex shader should declare a resolution uniform');
assert.match(vertexShader, /a_position\.x\s*\/\s*u_resolution\.x/, 'vertex shader should normalize the original x pixel coordinate');
assert.match(vertexShader, /a_position\.y\s*\/\s*u_resolution\.y/, 'vertex shader should normalize the original y pixel coordinate');
for (const [x, y] of [[0, 0], [50, 25], [100, 50]]) {
    const previous = [(x / 100) * 2 - 1, 1 - (y / 50) * 2];
    const shaderEquivalent = [(x / 100) * 2 - 1, ((y / 50) * 2 - 1) * -1];
    assert.ok(
        shaderEquivalent.every((value, index) => Math.abs(value - previous[index]) <= Number.EPSILON),
        'shader conversion must be mathematically identical to the removed CPU loop'
    );
}

scope.onmessage({data: {type: 'kchart:destroy-canvas', canvasId: 'canvas-1'}});
assert.equal(gl.deletedBuffers.length, 1, 'destroy should release the cached GPU buffer');
assert.equal(gl.deletedPrograms.length, 1, 'destroy should release the cached shader program');
assert.deepEqual(
    messages.at(-1),
    {type: 'kchart:destroy-complete', canvasId: 'canvas-1'},
    'worker should acknowledge resource cleanup before main-thread termination'
);

console.log('worker-webgl.test.cjs passed');
