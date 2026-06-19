import type {KChartResolvedScale} from '../../core/contracts';
import {resolveScalePosition} from './scale';

export const parseColor = (
    color: string
): [number, number, number, number] => {
    if (color.startsWith('#')) {
        const value = color.slice(1);
        const normalized = value.length === 3
            ? value.split('').map((item: string) => item + item).join('')
            : value;
        const numberValue = parseInt(normalized, 16);

        return [
            ((numberValue >> 16) & 255) / 255,
            ((numberValue >> 8) & 255) / 255,
            (numberValue & 255) / 255,
            1
        ];
    }

    return [0.35, 0.72, 1, 1];
};

const createShader = (
    gl: WebGLRenderingContext,
    type: number,
    source: string
): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) {
        return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};

export const createProgram = (
    gl: WebGLRenderingContext,
    vertexSource: string,
    fragmentSource: string
): WebGLProgram | null => {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) {
        return null;
    }

    const program = gl.createProgram();
    if (!program) {
        return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
    }
    return program;
};

export const resolveWebglLineVertices = (
    points: Float32Array,
    width: number,
    height: number
): Float32Array => {
    const vertices = new Float32Array(points.length);
    for (let index = 0; index < points.length; index += 2) {
        vertices[index] = (points[index] / width) * 2 - 1;
        vertices[index + 1] = 1 - (points[index + 1] / height) * 2;
    }
    return vertices;
};

export const resolveWebglPointInterleavedData = <T = any>(
    data: T[],
    xScale: KChartResolvedScale<T>,
    yScale: KChartResolvedScale<T>,
    xField: keyof T & string,
    yField: keyof T & string,
    width: number,
    height: number,
    resolveSize: (point: T) => number
): {buffer: Float32Array, count: number} => {
    const buffer = new Float32Array(data.length * 3);
    let pointCount = 0;

    data.forEach((point: T) => {
        if (point[xField] === undefined || point[yField] === undefined) {
            return;
        }

        const x = resolveScalePosition(xScale, point[xField]);
        const y = resolveScalePosition(yScale, point[yField]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return;
        }

        const offset = pointCount * 3;
        buffer[offset] = (x / width) * 2 - 1;
        buffer[offset + 1] = 1 - (y / height) * 2;
        buffer[offset + 2] = resolveSize(point);
        pointCount += 1;
    });

    return {
        buffer: pointCount * 3 === buffer.length
            ? buffer
            : buffer.subarray(0, pointCount * 3),
        count: pointCount
    };
};
