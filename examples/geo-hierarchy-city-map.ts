import {createMapLibreFlatMap} from '../packages/k-chart-maplibre/src';
import type {KChartGeoDrilldownMapContext, KChartGeoDrilldownMapHandle} from '../src/options/geo-drilldown';

export const DEFAULT_CITY_MAP_STYLE = 'https://tiles.openfreemap.org/styles/fiord';
const REGION_SOURCE = 'geo-hierarchy-regions';

/** City zoom needs tiled detail rather than magnification of a global bitmap. */
export const mountGeoHierarchyCityMap = (
    context: KChartGeoDrilldownMapContext,
    style = DEFAULT_CITY_MAP_STYLE
): KChartGeoDrilldownMapHandle => {
    const city = context.city!;
    const root = document.createElement('div');
    root.className = 'geo-city-tile-map';
    root.dataset.geoCityMap = city.id;
    root.dataset.geoMapStatus = 'loading';
    root.style.cssText = 'position:absolute;inset:0;background:#142c38;overflow:hidden';
    root.setAttribute('aria-label', `${city.label} detailed map`);
    const styles = document.createElement('style');
    styles.textContent = '.geo-city-tile-map .maplibregl-ctrl-top-right{display:none}.geo-city-tile-map .kchart-maplibre-overlay{animation:none}.geo-city-tile-map .maplibregl-ctrl-bottom-right{right:112px}.geo-city-tile-map .maplibregl-ctrl-attrib{font:10px/16px system-ui,sans-serif;max-width:100%}';
    root.append(styles);
    context.container.append(root);
    const message = document.createElement('div');
    message.setAttribute('role', 'status');
    message.setAttribute('data-geo-map-message', '');
    message.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;z-index:12;pointer-events:none;color:#fff;background:#142c38;font:13px system-ui,sans-serif';
    const status = document.createElement('span');
    status.textContent = 'Loading map...';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Retry';
    retry.setAttribute('data-city-map-retry', '');
    retry.style.pointerEvents = 'auto';
    retry.hidden = true;
    message.append(status, retry);
    root.append(message);
    let controller: ReturnType<typeof createMapLibreFlatMap> | undefined;
    let generation = 0;
    let timeout = 0;
    let destroyed = false;
    let ready = false;
    let frame = 0;
    let factor = 1;
    let baseZoom = 12;
    const values = [city, ...context.points];
    const longitude = (lon: number) => city.lon + ((lon - city.lon + 540) % 360) - 180;
    const west = Math.min(...values.map(point => longitude(point.lon)));
    const east = Math.max(...values.map(point => longitude(point.lon)));
    const south = Math.min(...values.map(point => point.lat));
    const north = Math.max(...values.map(point => point.lat));
    const bounds: [[number, number], [number, number]] = [
        [west - 0.003, south - 0.003], [east + 0.003, north + 0.003]
    ];
    const recordView = () => {
        const map = controller?.getMap();
        if (!map || destroyed) return;
        root.dataset.geoMapZoom = String(2 ** map.getZoom());
        root.dataset.geoTileZoom = String(map.getZoom());
        root.dataset.geoMapCenter = JSON.stringify({lat: map.getCenter().lat, lon: map.getCenter().lng});
    };
    const fit = () => {
        if (destroyed) return;
        controller?.resize();
        const map = controller?.getMap();
        if (!map || !ready) return;
        const inset = Math.min(48, Math.max(24, context.container.clientWidth / 10));
        const labelWidth = Math.min(120, Math.max(0, ...context.points.map(point => point.label.length * 8 + 18)));
        map.fitBounds(bounds, {
            padding: {top: inset, bottom: inset, left: inset, right: Math.max(inset, labelWidth)},
            duration: 0, maxZoom: 15
        });
        baseZoom = map.getZoom();
        map.jumpTo({zoom: Math.min(18, baseZoom + Math.log2(factor))});
        recordView();
    };
    const observer = new ResizeObserver(() => {
        if (!frame && !destroyed) frame = requestAnimationFrame(() => {frame = 0; fit();});
    });
    observer.observe(context.container);
    const start = () => {
        if (destroyed) return;
        const current = ++generation;
        const active = () => !destroyed && generation === current;
        const fail = () => {
            if (!active()) return;
            root.dataset.geoMapStatus = 'error';
            status.textContent = 'Map unavailable';
            message.hidden = false;
            message.style.display = 'flex';
            retry.hidden = false;
        };
        window.clearTimeout(timeout);
        controller?.destroy();
        controller = undefined;
        ready = false;
        root.dataset.geoMapStatus = 'loading';
        root.dataset.geoBaseFeatures = '0';
        root.dataset.geoBaseDetailFeatures = '0';
        root.dataset.geoRoadFeatures = '0';
        root.dataset.geoBuildingFeatures = '0';
        status.textContent = 'Loading map...';
        message.hidden = false;
        message.style.display = 'flex';
        retry.hidden = true;
        timeout = window.setTimeout(fail, 25_000);
        try {
            controller = createMapLibreFlatMap({
                container: root, style, cluster: false, renderWorldCopies: false,
                initialZoom: 12, minZoom: 2, maxZoom: 18,
                toolbar: {visible: false}
            });
        } catch {
            fail();
            return;
        }
        root.append(message);
        const instance = controller;
        const showing = instance.show({lat: city.lat, lon: city.lon, label: city.label, zoom: 12, places: []});
        const initialMap = instance.getMap();
        initialMap?.jumpTo({center: [city.lon, city.lat], zoom: 12});
        initialMap?.on('error', () => {if (active() && !ready) fail();});
        void showing.then(() => {
            if (!active()) return;
            const map = instance.getMap();
            if (!map) return fail();
            map.addSource(REGION_SOURCE, {type: 'geojson', data: {
                type: 'FeatureCollection', features: context.points.map(point => ({
                    type: 'Feature', properties: {id: point.id, label: point.label, value: point.value},
                    geometry: {type: 'Point', coordinates: [point.lon, point.lat]}
                }))
            }});
            map.addLayer({id: `${REGION_SOURCE}-circles`, type: 'circle', source: REGION_SOURCE,
                paint: {'circle-color': '#ffb27c', 'circle-radius': 5, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff'}});
            map.addLayer({id: `${REGION_SOURCE}-labels`, type: 'symbol', source: REGION_SOURCE,
                layout: {'text-field': ['get', 'label'], 'text-size': 13, 'text-font': ['Noto Sans Regular'],
                    'text-anchor': 'left', 'text-offset': [0.8, 0], 'text-allow-overlap': false},
                paint: {'text-color': '#fff', 'text-halo-color': '#142c38', 'text-halo-width': 1.5}});
            root.dataset.geoRegionCount = String(context.points.length);
            ready = true;
            fit();
            const inspect = () => {
                if (!active()) return;
                const features = map.queryRenderedFeatures().filter(item => item.source !== REGION_SOURCE && !item.source?.startsWith('kchart-'));
                const layerName = (item: typeof features[number]) => `${item.layer.id} ${item.layer['source-layer'] ?? ''}`;
                const roads = features.filter(item => /road|highway|transport/i.test(layerName(item))).length;
                const buildings = features.filter(item => /building/i.test(layerName(item))).length;
                root.dataset.geoBaseFeatures = String(features.length);
                root.dataset.geoBaseDetailFeatures = String(roads + buildings);
                root.dataset.geoRoadFeatures = String(roads);
                root.dataset.geoBuildingFeatures = String(buildings);
                if (roads + buildings > 0) {
                    root.dataset.geoMapStatus = 'ready';
                    message.hidden = true;
                    message.style.display = 'none';
                    window.clearTimeout(timeout);
                }
                recordView();
            };
            map.on('idle', inspect);
            map.on('moveend', recordView);
            if (map.loaded()) inspect();
        }).catch(fail);
    };
    retry.addEventListener('click', start);
    start();
    return {
        setZoom(value) {
            factor = value;
            const map = controller?.getMap();
            if (!destroyed && ready && map) {
                map.jumpTo({zoom: Math.min(18, baseZoom + Math.log2(factor))});
                recordView();
            }
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            generation++;
            cancelAnimationFrame(frame);
            window.clearTimeout(timeout);
            observer.disconnect();
            controller?.destroy();
            root.remove();
        }
    };
};
