import * as THREE from 'three';

export interface LatLon {
    lat: number;
    lon: number;
}

export type KThreeGlobeProjection = 'globe' | 'flat';

export type KThreeFlatMapLighting = 'night' | 'day' | 'dynamic';

export interface KThreeFlatMapConfiguration {
    center?: LatLon;
    zoom?: number;
    lighting?: KThreeFlatMapLighting;
}

export interface KThreeFlatMapView {
    center: LatLon;
    zoom: number;
    lighting: KThreeFlatMapLighting;
}

export type KThreeGlobeMarkerAccessor<T, V> = V | ((datum: T, index: number) => V);

export interface KThreeGlobeMarkerFields<T> {
    lat: keyof T & string;
    lon: keyof T & string;
}

export interface KThreeGlobeMarkerConfiguration<T> {
    fields: KThreeGlobeMarkerFields<T>;
    color?: KThreeGlobeMarkerAccessor<T, THREE.ColorRepresentation>;
    /** Radius relative to the configured globe radius. */
    radius?: KThreeGlobeMarkerAccessor<T, number>;
    /** Radial offset from the globe surface, relative to the globe radius. */
    surfaceOffset?: KThreeGlobeMarkerAccessor<T, number>;
}

export interface KThreePreparedGlobeMarker<T> extends LatLon {
    datum: T;
    index: number;
    color: THREE.ColorRepresentation;
    radius: number;
    surfaceOffset: number;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const normalizeDegrees = (value: number): number =>
    ((value % 360) + 360) % 360;

export const wrapLon = (lon: number): number => {
    if (!Number.isFinite(lon)) {
        return 0;
    }
    return ((lon + 180) % 360 + 360) % 360 - 180;
};

export const normalizeCenter = (center: LatLon, maxLatitude = 80): LatLon => ({
    lat: clamp(Number.isFinite(center.lat) ? center.lat : 0, -maxLatitude, maxLatitude),
    lon: wrapLon(center.lon)
});

export const normalizeProjection = (projection: unknown): KThreeGlobeProjection =>
    projection === 'flat' ? 'flat' : 'globe';

export const normalizeFlatMapView = (
    view: KThreeFlatMapConfiguration | undefined,
    fallback: KThreeFlatMapView = {
        center: {lat: 0, lon: 0},
        zoom: 1,
        lighting: 'night'
    }
): KThreeFlatMapView => {
    const zoom = view?.zoom;
    return {
        center: view?.center
            ? normalizeCenter(view.center, 90)
            : {...fallback.center},
        zoom: Number.isFinite(zoom)
            ? Math.max(1, zoom as number)
            : fallback.zoom,
        lighting: view?.lighting === 'day' || view?.lighting === 'dynamic'
            ? view.lighting
            : view?.lighting === 'night'
                ? 'night'
                : fallback.lighting
    };
};

/**
 * Converts geographic coordinates to Three.js' Earth texture orientation.
 * Longitude zero lies on +X and positive longitudes turn toward -Z.
 */
export const latLonToVector = (point: LatLon, radius = 1): THREE.Vector3 => {
    const lat = clamp(Number.isFinite(point.lat) ? point.lat : 0, -90, 90) * DEG_TO_RAD;
    const lon = wrapLon(point.lon) * DEG_TO_RAD;
    const cosLat = Math.cos(lat);
    return new THREE.Vector3(
        radius * cosLat * Math.cos(lon),
        radius * Math.sin(lat),
        -radius * cosLat * Math.sin(lon)
    );
};

/** Converts geographic coordinates to a centered 2:1 equirectangular plane. */
export const latLonToEquirectangular = (
    point: LatLon,
    mapWidth = 2,
    z = 0
): THREE.Vector3 => {
    const normalized = normalizeCenter(point, 90);
    const degreesToWorld = mapWidth / 360;
    return new THREE.Vector3(
        normalized.lon * degreesToWorld,
        normalized.lat * degreesToWorld,
        z
    );
};

const resolveMarkerValue = <T, V>(
    value: KThreeGlobeMarkerAccessor<T, V> | undefined,
    datum: T,
    index: number,
    fallback: V
): V => value === undefined
    ? fallback
    : typeof value === 'function'
        ? (value as (item: T, itemIndex: number) => V)(datum, index)
        : value;

const toFiniteCoordinate = (value: unknown): number | undefined => {
    if (value === null || value === '' || typeof value === 'boolean') {
        return undefined;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
};

/** Prepares valid marker records without allocating Three.js render resources. */
export const prepareGlobeMarkers = <T>(
    data: readonly T[],
    configuration: KThreeGlobeMarkerConfiguration<T>
): KThreePreparedGlobeMarker<T>[] => {
    const markers: KThreePreparedGlobeMarker<T>[] = [];
    data.forEach((datum, index) => {
        const record = datum as Record<string, unknown>;
        const lat = toFiniteCoordinate(record[configuration.fields.lat]);
        const lon = toFiniteCoordinate(record[configuration.fields.lon]);
        if (lat === undefined || lon === undefined || lat < -90 || lat > 90) {
            return;
        }

        const radius = resolveMarkerValue(configuration.radius, datum, index, 0.012);
        const surfaceOffset = resolveMarkerValue(
            configuration.surfaceOffset,
            datum,
            index,
            0.006
        );
        markers.push({
            datum,
            index,
            lat,
            lon: wrapLon(lon),
            color: resolveMarkerValue(configuration.color, datum, index, '#ff5f56'),
            radius: Number.isFinite(radius) && radius > 0 ? radius : 0.012,
            surfaceOffset: Number.isFinite(surfaceOffset)
                ? Math.max(0, surfaceOffset)
                : 0.006
        });
    });
    return markers;
};

/** Returns the upright globe rotation that places the coordinate at the view center. */
export const rotationFor = (center: LatLon): THREE.Quaternion => {
    const normalized = normalizeCenter(center, 90);
    const lat = normalized.lat * DEG_TO_RAD;
    const lon = normalized.lon * DEG_TO_RAD;
    const east = new THREE.Vector3(-Math.sin(lon), 0, -Math.cos(lon));
    const north = new THREE.Vector3(
        -Math.sin(lat) * Math.cos(lon),
        Math.cos(lat),
        Math.sin(lat) * Math.sin(lon)
    );
    const forward = latLonToVector(normalized);
    const geographicBasis = new THREE.Matrix4().makeBasis(east, north, forward);
    geographicBasis.transpose();
    return new THREE.Quaternion()
        .setFromRotationMatrix(geographicBasis)
        .normalize();
};

/**
 * Applies a grab-style drag. Moving one rendered globe diameter changes the
 * center by 180 degrees.
 */
export const dragCenter = (
    center: LatLon,
    deltaX: number,
    deltaY: number,
    globeDiameter: number
): LatLon => {
    const degreesPerPixel = 180 / Math.max(globeDiameter, 1);
    return normalizeCenter({
        lat: center.lat + deltaY * degreesPerPixel,
        lon: center.lon - deltaX * degreesPerPixel
    });
};

/** Calculates the geographic point where the Sun is directly overhead. */
export const calculateSubsolarPoint = (date: Date): LatLon => {
    const time = date.getTime();
    if (!Number.isFinite(time)) {
        throw new RangeError('A valid Date is required to calculate the subsolar point.');
    }

    const julianDay = time / 86_400_000 + 2_440_587.5;
    const daysSinceJ2000 = julianDay - 2_451_545;
    const meanLongitude = normalizeDegrees(280.460 + 0.9856474 * daysSinceJ2000);
    const meanAnomaly = normalizeDegrees(357.528 + 0.9856003 * daysSinceJ2000) * DEG_TO_RAD;
    const eclipticLongitude = (
        meanLongitude
        + 1.915 * Math.sin(meanAnomaly)
        + 0.020 * Math.sin(2 * meanAnomaly)
    ) * DEG_TO_RAD;
    const obliquity = (23.439 - 0.0000004 * daysSinceJ2000) * DEG_TO_RAD;
    const rightAscension = normalizeDegrees(Math.atan2(
        Math.cos(obliquity) * Math.sin(eclipticLongitude),
        Math.cos(eclipticLongitude)
    ) * RAD_TO_DEG);
    const declination = Math.asin(
        Math.sin(obliquity) * Math.sin(eclipticLongitude)
    ) * RAD_TO_DEG;

    const centuriesSinceJ2000 = daysSinceJ2000 / 36_525;
    const greenwichSiderealTime = normalizeDegrees(
        280.46061837
        + 360.98564736629 * daysSinceJ2000
        + 0.000387933 * centuriesSinceJ2000 * centuriesSinceJ2000
        - centuriesSinceJ2000 * centuriesSinceJ2000 * centuriesSinceJ2000 / 38_710_000
    );

    return {
        lat: declination,
        lon: wrapLon(rightAscension - greenwichSiderealTime)
    };
};

export const shortestLongitudeDelta = (from: number, to: number): number =>
    wrapLon(to - from);

export const cubicEaseOut = (value: number): number =>
    1 - Math.pow(1 - clamp(value, 0, 1), 3);

export interface GlobeDragBindings {
    getCenter(): LatLon;
    getDiameter(): number;
    setCenter(center: LatLon): void;
    cancelTween(): void;
    requestRender(): void;
    isEnabled?(): boolean;
    onCenterChange?(center: LatLon): void;
}

/** @internal Exported from this module so the pointer contract can be tested in Node. */
export const bindGlobeDrag = (
    canvas: HTMLCanvasElement,
    bindings: GlobeDragBindings
): (() => void) => {
    let pointerId: number | undefined;
    let startX = 0;
    let startY = 0;
    let startCenter: LatLon = {lat: 0, lon: 0};
    let moved = false;
    const previousTouchAction = canvas.style.touchAction;
    const previousCursor = canvas.style.cursor;
    const idleCursor = (): string => bindings.isEnabled?.() === false
        ? 'default'
        : 'grab';

    canvas.style.touchAction = 'none';
    canvas.style.cursor = idleCursor();

    const releaseCapture = (id: number): void => {
        try {
            if (!canvas.hasPointerCapture || canvas.hasPointerCapture(id)) {
                canvas.releasePointerCapture(id);
            }
        } catch {
            // The browser may already have released capture during cancellation.
        }
    };

    const pointerDown = (event: PointerEvent): void => {
        if (
            bindings.isEnabled?.() === false
            || pointerId !== undefined
            || (event.pointerType === 'mouse' && event.button !== 0)
        ) {
            return;
        }
        event.preventDefault();
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startCenter = bindings.getCenter();
        moved = false;
        bindings.cancelTween();
        canvas.style.cursor = 'grabbing';
        canvas.setPointerCapture(event.pointerId);
    };

    const pointerMove = (event: PointerEvent): void => {
        if (event.pointerId !== pointerId || bindings.isEnabled?.() === false) {
            return;
        }
        event.preventDefault();
        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        if (!moved && Math.hypot(deltaX, deltaY) <= 3) {
            return;
        }
        moved = true;
        bindings.setCenter(dragCenter(
            startCenter,
            deltaX,
            deltaY,
            bindings.getDiameter()
        ));
        bindings.requestRender();
    };

    const finishPointer = (event: PointerEvent): void => {
        if (event.pointerId !== pointerId) {
            return;
        }
        event.preventDefault();
        const completedPointerId = pointerId;
        pointerId = undefined;
        canvas.style.cursor = idleCursor();
        releaseCapture(completedPointerId);
        if (moved) {
            moved = false;
            const center = bindings.getCenter();
            bindings.onCenterChange?.({...center});
        }
    };

    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', finishPointer);
    canvas.addEventListener('pointercancel', finishPointer);

    return () => {
        canvas.removeEventListener('pointerdown', pointerDown);
        canvas.removeEventListener('pointermove', pointerMove);
        canvas.removeEventListener('pointerup', finishPointer);
        canvas.removeEventListener('pointercancel', finishPointer);
        if (pointerId !== undefined) {
            releaseCapture(pointerId);
            pointerId = undefined;
        }
        canvas.style.touchAction = previousTouchAction;
        canvas.style.cursor = previousCursor;
    };
};
