import {geoBounds, geoEquirectangular, geoPath} from 'd3-geo';
import {createKChart, type KChartController} from '../src';
import type {KChartGeoDrilldownMapRenderer, KChartGeoDrilldownRegion} from '../src/options/geo-drilldown';
import {
    createThreeGlobeSeries, wrapLon,
    type KThreeGlobeTexture, type KThreeGlobeSeriesHandle, type KThreeFlatMapLighting
} from '../packages/k-chart-three/src';
import {mountGeoHierarchyCityMap} from './geo-hierarchy-city-map';

export interface ThreeGeoDrilldownMapConfiguration {
    dayTexture: KThreeGlobeTexture;
    nightTexture?: KThreeGlobeTexture;
    lighting?: KThreeFlatMapLighting;
    cityMapStyle?: string;
}

/** Reuses the world-map renderer; texture resolution also limits local detail. */
export const createThreeGeoDrilldownMap = (options: ThreeGeoDrilldownMapConfiguration): KChartGeoDrilldownMapRenderer => context => {
    if (context.city) return mountGeoHierarchyCityMap(context, options.cityMapStyle);
    const root = document.createElement('div');
    root.className = 'geo-earth-detail-map';
    root.style.cssText = 'position:absolute;inset:0;background:#02070b;overflow:hidden';
    root.setAttribute('aria-label', context.city?.label ?? context.country.label);
    context.container.append(root);
    const stage = document.createElement('div');
    stage.style.cssText = 'position:absolute;inset:0;isolation:isolate;z-index:0';
    root.append(stage);
    const labels = document.createElement('div');
    labels.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:25;overflow:hidden';
    const boundary = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    boundary.setAttribute('aria-hidden', 'true');
    boundary.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', '#cce7e2');
    outline.setAttribute('stroke-opacity', '0.65');
    outline.setAttribute('stroke-width', '0.9');
    outline.setAttribute('data-geo-detail-boundary', '');
    boundary.append(outline);
    labels.append(boundary);
    const points = context.points.slice();
    const center = {lat: 0, lon: 0};
    let longitudeSpan: number;
    let latitudeSpan: number;
    if (context.city) {
        const values = [context.city, ...points];
        const longitudes = values.map(point => context.city.lon + wrapLon(point.lon - context.city.lon));
        const latitudes = values.map(point => point.lat);
        const minLon = Math.min(...longitudes), maxLon = Math.max(...longitudes);
        const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
        center.lon = wrapLon((minLon + maxLon) / 2);
        center.lat = (minLat + maxLat) / 2;
        longitudeSpan = Math.max(0.05, maxLon - minLon);
        latitudeSpan = Math.max(0.05, maxLat - minLat);
    } else {
        const [[west, south], [east, north]] = geoBounds(context.feature as any);
        longitudeSpan = Math.max(0.1, east >= west ? east - west : east + 360 - west);
        latitudeSpan = Math.max(0.1, north - south);
        center.lon = wrapLon(west + longitudeSpan / 2);
        center.lat = (south + north) / 2;
    }
    let chart: KChartController<KChartGeoDrilldownRegion>;
    let globe: KThreeGlobeSeriesHandle<KChartGeoDrilldownRegion>;
    let observer: ResizeObserver;
    let clock: number;
    let resizeFrame = 0;
    let destroyed = false;
    let zoomFactor = 1;
    let markerRadius = 0.014;
    const labelNodes = points.map(point => {
        const label = document.createElement(context.city ? 'span' : 'button');
        label.textContent = point.label;
        label.setAttribute('data-geo-texture-label', point.id);
        label.style.cssText = 'position:absolute!important;inset:auto!important;margin:0!important;padding:2px 0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#fff!important;font:13px/1.3 system-ui,sans-serif!important;text-align:left;max-width:130px;overflow-wrap:anywhere;text-shadow:0 1px 3px #000,0 0 5px #000;pointer-events:none';
        if (label instanceof HTMLButtonElement) {
            label.type = 'button';
            label.title = point.label;
            label.setAttribute('aria-label', point.label);
            label.style.pointerEvents = 'auto';
            label.addEventListener('click', () => context.selectCity(point.id));
        }
        labels.append(label);
        return label;
    });
    const layout = () => {
        if (destroyed || !chart) return;
        const width = context.container.clientWidth || 720;
        const height = context.container.clientHeight || 460;
        const scale = Math.min(height, width / 2) / 1.02;
        const fitZoom = Math.max(1, Math.min(
            Math.max(1, width - 96) * 180 / (longitudeSpan * scale),
            Math.max(1, height - 96) * 180 / (latitudeSpan * scale)
        ));
        markerRadius = 4.5 / scale;
        root.dataset.geoMapZoom = String(fitZoom * zoomFactor);
        root.dataset.geoMapCenter = JSON.stringify(center);
        globe.setFlatView({center, zoom: fitZoom * zoomFactor, lighting: options.lighting ?? 'dynamic'});
        chart.resize({width, height});
        // Keep the map full bleed without changing KChart's shared header layout.
        const margin = chart.getState().margin;
        stage.style.top = `${-margin.top}px`;
        stage.style.left = `${-margin.left}px`;
        stage.style.right = 'auto';
        stage.style.bottom = 'auto';
        chart.resize({width: width + margin.left + margin.right, height: height + margin.top + margin.bottom});
        chart.updateData(points.slice());
        boundary.setAttribute('viewBox', `0 0 ${width} ${height}`);
        const projection = geoEquirectangular().rotate([-center.lon, 0]).center([0, center.lat])
            .scale(scale * fitZoom * zoomFactor / Math.PI).translate([width / 2, height / 2])
            .clipExtent([[0, 0], [width, height]]);
        outline.setAttribute('d', geoPath(projection)(context.feature as any) ?? '');
        const occupied: Array<{left: number; top: number; right: number; bottom: number}> = [];
        points.forEach((point, index) => {
            const position = globe.projectLocation(point);
            const label = labelNodes[index];
            label.hidden = !position?.visible;
            if (!position?.visible) return;
            const labelWidth = Math.min(130, point.label.length * 7 + 4);
            let box: {left: number; top: number; right: number; bottom: number};
            for (const offset of [-20, 8, -38, 26]) {
                const left = Math.max(8, Math.min(width - labelWidth - 8, position.x + 12));
                const top = Math.max(8, Math.min(height - 24, position.y + offset));
                box = {left, top, right: left + labelWidth, bottom: top + 20};
                if (!occupied.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) break;
            }
            occupied.push(box);
            label.style.left = `${box.left}px`;
            label.style.top = `${box.top}px`;
        });
    };
    try {
        globe = createThreeGlobeSeries<KChartGeoDrilldownRegion>({
            selector: 'geo-earth-detail', dayTexture: options.dayTexture, nightTexture: options.nightTexture,
            projection: 'flat', autoRotate: false, atmosphere: false, subsolar: new Date(),
            flatMap: {center, zoom: 1, lighting: options.lighting ?? 'dynamic'},
            markers: {fields: {lat: 'lat', lon: 'lon'}, color: context.city ? '#ffb27c' : '#72edd4', radius: () => markerRadius, surfaceOffset: 0},
            onMarkerClick: context.city ? undefined : ({data}) => context.selectCity(data.id)
        });
        chart = createKChart<KChartGeoDrilldownRegion>({
            selector: stage, width: context.container.clientWidth || 720, height: context.container.clientHeight || 460,
            data: points, axes: [], margin: {top: 0, right: 0, bottom: 0, left: 0},
            title: {text: ''},
            grid: {visible: false}, legend: {visible: false}, tooltip: {visible: false}, series: [globe]
        });
        chart.render();
        root.append(labels);
        layout();
        observer = new ResizeObserver(() => {
            if (!resizeFrame && !destroyed) resizeFrame = requestAnimationFrame(() => {resizeFrame = 0; layout();});
        });
        observer.observe(context.container);
        clock = window.setInterval(() => globe.setDate(new Date()), 60_000);
    } catch (error) {
        observer?.disconnect();
        chart?.destroy();
        root.remove();
        throw error;
    }
    return {
        setZoom(value) {if (!destroyed) {zoomFactor = value; layout();}},
        destroy() {
            if (destroyed) return;
            destroyed = true;
            observer.disconnect();
            cancelAnimationFrame(resizeFrame);
            window.clearInterval(clock);
            chart.destroy();
            root.remove();
        }
    };
};
