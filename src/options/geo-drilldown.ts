import {geoArea, geoCentroid, geoContains, geoMercator, geoPath} from 'd3-geo';
import type {Feature, Geometry} from 'geojson';

export type KChartGeoDrilldownRegion = {
    id: string;
    label: string;
    lat: number;
    lon: number;
    value?: number;
    data?: unknown;
};
export type KChartGeoDrilldownCity = KChartGeoDrilldownRegion & {
    regions: readonly KChartGeoDrilldownRegion[];
};
export type KChartGeoDrilldownCountry = {
    id: string;
    label: string;
    feature: Feature<Geometry>;
    cities: readonly KChartGeoDrilldownCity[];
    value?: number;
    data?: unknown;
};
export type KChartGeoDrilldownNode = KChartGeoDrilldownCountry | KChartGeoDrilldownCity | KChartGeoDrilldownRegion;
export type KChartGeoDrilldownSelection =
    | {readonly level: 'country'; readonly node: KChartGeoDrilldownCountry}
    | {readonly level: 'city'; readonly node: KChartGeoDrilldownCity};
export type KChartGeoDrilldownMapContext = {
    container: HTMLElement;
    country: KChartGeoDrilldownCountry;
    feature: Feature<Geometry>;
    city?: KChartGeoDrilldownCity;
    points: readonly (KChartGeoDrilldownCity | KChartGeoDrilldownRegion)[];
    selectCity(id: string): boolean;
};
export type KChartGeoDrilldownMapHandle = {
    destroy(): void;
    setZoom?(zoom: number): void;
};
export type KChartGeoDrilldownMapRenderer = (context: KChartGeoDrilldownMapContext) => KChartGeoDrilldownMapHandle;
export type KChartGeoDrilldownConfiguration = {
    countries: readonly KChartGeoDrilldownCountry[];
    enabled?: boolean;
    title?: string;
    theme?: 'light' | 'dark';
    animation?: boolean;
    valueLabel?: string;
    valueFormatter?: (value: number, node: KChartGeoDrilldownNode) => string;
    mapRenderer?: KChartGeoDrilldownMapRenderer;
    onChange?: (selection: readonly KChartGeoDrilldownSelection[]) => void;
    onClose?: () => void;
};
export interface KChartGeoDrilldownController {
    openAt(coordinate: {lat: number; lon: number}): boolean;
    openCountry(id: string): boolean;
    selectCity(id: string): boolean;
    back(): void;
    close(): void;
    destroy(): void;
    setEnabled(enabled: boolean): void;
    isOpen(): boolean;
    getSelection(): readonly KChartGeoDrilldownSelection[];
}

let sequence = 0;
const SVG_NS = 'http://www.w3.org/2000/svg';
const validCoordinate = (point: {lat: number; lon: number}) => !!point &&
    Number.isFinite(point.lat) && Number.isFinite(point.lon) && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180;
const mercatorLatitude = (lat: number) => Math.max(-85, Math.min(85, lat));
const normalizeCountryFeature = (feature: Feature<Geometry>): Feature<Geometry> => {
    const geometry = feature?.geometry;
    if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return feature;
    const polygon = (rings: number[][][]) => rings.map((ring, index) => {
        const copy = ring.map(position => position.slice());
        // D3's spherical convention is opposite RFC 7946; choose each small
        // country exterior and the complementary winding for its holes.
        const area = geoArea({type: 'Polygon', coordinates: [copy]});
        if (index === 0 ? area > 2 * Math.PI : area < 2 * Math.PI) copy.reverse();
        return copy;
    });
    const coordinates = (geometry as any).coordinates;
    return {...feature, geometry: {...geometry, coordinates: geometry.type === 'Polygon'
        ? polygon(coordinates) : coordinates.map(polygon)} as Geometry};
};
const countryProjection = (feature: Feature<Geometry>) => {
    const center = geoCentroid(feature as any);
    return geoMercator().rotate([Number.isFinite(center[0]) ? -center[0] : 0, 0])
        .fitExtent([[55, 45], [665, 415]], feature as any);
};

/** A caller-owned controller can be shared by multiple map and globe series. */
export function createGeoDrilldown(config: KChartGeoDrilldownConfiguration): KChartGeoDrilldownController {
    let enabled = config.enabled !== false;
    let destroyed = false;
    let country: KChartGeoDrilldownCountry | undefined;
    let city: KChartGeoDrilldownCity | undefined;
    let dialog: HTMLDialogElement | undefined;
    let style: HTMLStyleElement | undefined;
    let restoreFocus: HTMLElement | undefined;
    let zoom = 1;
    let mapHandle: KChartGeoDrilldownMapHandle | undefined;
    let renderGeneration = 0;
    const scope = `kchart-geo-drilldown-${++sequence}`;
    const preparedFeatures = new WeakMap<Feature<Geometry>, Feature<Geometry>>();
    const prepareFeature = (feature: Feature<Geometry>) => {
        let prepared = preparedFeatures.get(feature);
        if (!prepared) {
            prepared = normalizeCountryFeature(feature);
            preparedFeatures.set(feature, prepared);
        }
        return prepared;
    };

    const selection = (): readonly KChartGeoDrilldownSelection[] => Object.freeze(country ? [
        Object.freeze({level: 'country' as const, node: country}),
        ...(city ? [Object.freeze({level: 'city' as const, node: city})] : [])
    ] : []);
    const notify = () => config.onChange?.(selection());
    const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        return node;
    };
    const svgElement = (tag: string, attributes: Record<string, string>) => {
        const node = document.createElementNS(SVG_NS, tag);
        Object.keys(attributes).forEach(key => node.setAttribute(key, attributes[key]));
        return node;
    };
    const metric = (node: KChartGeoDrilldownNode) => {
        if (!Number.isFinite(node.value)) return '';
        const value = config.valueFormatter ? config.valueFormatter(node.value, node) : node.value.toLocaleString();
        return `${value}${config.valueLabel ? ` ${config.valueLabel}` : ''}`;
    };
    const button = (symbol: string, label: string, action: () => void) => {
        const node = element('button', symbol);
        node.type = 'button';
        node.title = label;
        node.setAttribute('aria-label', label);
        node.addEventListener('click', action);
        return node;
    };
    const disposeHandle = (handle: KChartGeoDrilldownMapHandle | undefined) => {
        try { handle?.destroy(); }
        catch (error) { console.warn('KChart geo drilldown renderer cleanup failed', error); }
    };
    const close = () => {
        if (!dialog) return;
        const generation = ++renderGeneration;
        const previous = restoreFocus;
        const closingDialog = dialog;
        const closingStyle = style;
        const closingHandle = mapHandle;
        mapHandle = undefined;
        dialog = undefined;
        style = undefined;
        restoreFocus = undefined;
        country = undefined;
        city = undefined;
        disposeHandle(closingHandle);
        if (typeof closingDialog.close === 'function' && closingDialog.open) closingDialog.close();
        closingDialog.remove();
        closingStyle?.remove();
        if (generation !== renderGeneration) return;
        if (previous?.isConnected) previous.focus();
        notify();
        config.onClose?.();
    };
    const back = () => {
        if (!country || destroyed) return;
        if (!city) return close();
        city = undefined;
        zoom = 1;
        if (render()) notify();
        dialog?.querySelector<HTMLButtonElement>('[data-back]')?.focus();
    };
    const selectCity = (id: string) => {
        if (!dialog || !enabled || destroyed) return false;
        const match = country?.cities?.find(item => item.id === id && validCoordinate(item));
        if (!match) return false;
        if (city === match) return true;
        city = match;
        zoom = 1;
        if (render()) notify();
        dialog?.querySelector<HTMLButtonElement>('[data-back]')?.focus();
        return true;
    };
    function render(): boolean {
        if (!dialog || !country) return false;
        const currentDialog = dialog;
        const generation = ++renderGeneration;
        const previousHandle = mapHandle;
        mapHandle = undefined;
        disposeHandle(previousHandle);
        if (generation !== renderGeneration || dialog !== currentDialog || !country) return false;
        const currentCountry = country;
        const currentCity = city;
        dialog.replaceChildren();
        dialog.setAttribute('data-geo-level', city ? 'city' : 'country');
        dialog.setAttribute('data-geo-country', country.id);
        if (city) dialog.setAttribute('data-geo-city', city.id);
        else dialog.removeAttribute('data-geo-city');
        const header = element('header');
        const backButton = button('<', 'Back', back);
        backButton.setAttribute('data-back', '');
        header.appendChild(backButton);
        const heading = element('h2', [config.title, country.label, city?.label].filter(Boolean).join(' / '));
        heading.id = `${scope}-title`;
        header.appendChild(heading);
        header.appendChild(button('x', 'Close', close));
        dialog.appendChild(header);
        const content = element('div');
        content.className = 'geo-content';
        const map = element('div');
        map.className = 'geo-map';
        const svg = svgElement('svg', {viewBox: '0 0 720 460', role: 'img', 'aria-label': city?.label || country.label});
        const feature = prepareFeature(country.feature);
        const viewport = svgElement('g', {transform: `translate(360 230) scale(${zoom}) translate(-360 -230)`});
        svg.appendChild(viewport);
        let projection = geoMercator();
        const points = city ? (city.regions || []).filter(validCoordinate) : (country.cities || []).filter(validCoordinate);
        if (city) {
            // Fit local points in projected space, keeping date-line neighbors contiguous.
            projection.rotate([-city.lon, 0]).center([0, mercatorLatitude(city.lat)]).scale(1).translate([0, 0]);
            const positions = [city, ...points].map(point => projection([point.lon, mercatorLatitude(point.lat)]));
            const xs = positions.map(point => point[0]);
            const ys = positions.map(point => point[1]);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const scale = Math.min(540 / Math.max(maxX - minX, 0.004), 310 / Math.max(maxY - minY, 0.004));
            projection.scale(scale).translate([360 - (minX + maxX) * scale / 2, 230 - (minY + maxY) * scale / 2]);
        } else {
            projection = countryProjection(feature);
        }
        const path = svgElement('path', {d: geoPath(projection)(feature as any) || '', fill: '#e2edf0', stroke: '#718b91', 'stroke-width': '1.2', 'vector-effect': 'non-scaling-stroke'});
        viewport.appendChild(path);
        const list = element('ul');
        list.setAttribute('aria-label', city?.label || country.label);
        const labelBounds: Record<string, number[][]> = {desktop: [], mobile: []};
        points.forEach(point => {
            const position = projection([point.lon, mercatorLatitude(point.lat)]);
            if (!position || !position.every(Number.isFinite)) return;
            const group = svgElement('g', {'aria-label': `${point.label} ${metric(point)}`.trim()});
            group.setAttribute('data-geo-marker', point.id);
            group.appendChild(svgElement('circle', {cx: String(position[0]), cy: String(position[1]), r: '6', fill: city ? '#b94f75' : '#167b83', stroke: '#ffffff', 'stroke-width': '2'}));
            ['desktop', 'mobile'].forEach(mode => {
                const mobile = mode === 'mobile';
                const fontSize = mobile ? 24 : 13;
                const limit = mobile ? 28 : 40;
                const text = point.label.length > limit ? `${point.label.slice(0, limit - 3)}...` : point.label;
                const labelWidth = text.length * fontSize;
                for (const offset of mobile ? [-18, 34, -52, 68] : [-12, 22, -32, 42]) {
                    const x = Math.max(12, Math.min(708 - labelWidth, position[0] + (mobile ? 14 : 10)));
                    const y = Math.max(fontSize + 8, Math.min(452 - fontSize, position[1] + offset));
                    const box = [x, y - fontSize - 2, x + labelWidth, y + 4];
                    if (labelBounds[mode].some(other => box[0] < other[2] && box[2] > other[0] && box[1] < other[3] && box[3] > other[1])) continue;
                    labelBounds[mode].push(box);
                    const label = svgElement('text', {x: String(x), y: String(y), fill: '#162c34', 'font-size': String(fontSize), 'data-geo-label': mode, 'aria-hidden': 'true', 'paint-order': 'stroke', stroke: '#ffffff', 'stroke-width': '3', 'stroke-linejoin': 'round'});
                    label.textContent = text;
                    group.appendChild(label);
                    break;
                }
            });
            if (!city) {
                group.setAttribute('role', 'button');
                group.setAttribute('tabindex', '0');
                group.addEventListener('click', () => selectCity(point.id));
                group.addEventListener('keydown', event => {
                    const key = (event as KeyboardEvent).key;
                    if (key === 'Enter' || key === ' ') {
                        event.preventDefault();
                        selectCity(point.id);
                    }
                });
            }
            viewport.appendChild(group);
            const row = element('li');
            row.setAttribute(city ? 'data-geo-region' : 'data-geo-city-option', point.id);
            const rowContent = city ? element('div') : button('', point.label, () => selectCity(point.id));
            rowContent.appendChild(element('span', point.label));
            rowContent.appendChild(element('strong', metric(point)));
            row.appendChild(rowContent);
            list.appendChild(row);
        });
        const customContainer = config.mapRenderer ? element('div') : undefined;
        if (customContainer) {
            customContainer.className = 'geo-custom-map';
            customContainer.setAttribute('data-geo-custom-map', '');
            map.appendChild(customContainer);
        } else map.appendChild(svg);
        const controls = element('nav');
        controls.setAttribute('aria-label', 'Map zoom');
        const changeZoom = (factor: number) => {
            if (generation !== renderGeneration || dialog !== currentDialog) return;
            zoom = Math.min(8, Math.max(1, zoom * factor));
            if (customContainer?.parentNode && mapHandle) mapHandle.setZoom?.(zoom);
            else viewport.setAttribute('transform', `translate(360 230) scale(${zoom}) translate(-360 -230)`);
            zoomOut.disabled = zoom <= 1;
            zoomIn.disabled = zoom >= 8;
        };
        const zoomIn = button('+', 'Zoom in', () => changeZoom(1.5));
        const zoomOut = button('-', 'Zoom out', () => changeZoom(1 / 1.5));
        zoomOut.disabled = true;
        controls.append(zoomIn, zoomOut);
        map.appendChild(controls);
        content.appendChild(map);
        const aside = element('aside');
        const currentMetric = metric(city || country);
        if (currentMetric) aside.appendChild(element('p', currentMetric));
        aside.appendChild(list);
        content.appendChild(aside);
        dialog.appendChild(content);
        if (customContainer) {
            try {
                const handle = config.mapRenderer({
                    container: customContainer,
                    country: currentCountry,
                    feature,
                    city: currentCity,
                    points: Object.freeze(points.slice()),
                    selectCity: id => generation === renderGeneration && dialog === currentDialog ? selectCity(id) : false
                });
                if (generation !== renderGeneration || dialog !== currentDialog) {
                    disposeHandle(handle);
                    return false;
                }
                if (!handle || typeof handle.destroy !== 'function') throw new Error('Map renderer must return a destroy handle');
                mapHandle = handle;
            } catch (error) {
                if (generation !== renderGeneration || dialog !== currentDialog) return false;
                customContainer.remove();
                map.appendChild(svg);
                console.warn('KChart geo drilldown renderer failed; using SVG', error);
            }
        }
        return generation === renderGeneration && dialog === currentDialog;
    }
    const openCountry = (id: string) => {
        if (destroyed || !enabled || typeof document === 'undefined' || !document.body) return false;
        const match = config.countries.find(item => item.id === id);
        if (!match?.feature || !['Polygon', 'MultiPolygon'].includes(match.feature.geometry?.type)) return false;
        try {
            const feature = prepareFeature(match.feature);
            const projection = countryProjection(feature);
            if (!Number.isFinite(projection.scale()) || !geoPath(projection)(feature as any)) return false;
        } catch { return false; }
        country = match;
        city = undefined;
        zoom = 1;
        const firstOpen = !dialog;
        if (firstOpen) {
            const nextDialog = element('dialog');
            if (typeof nextDialog.showModal !== 'function') {
                country = undefined;
                return false;
            }
            restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
            dialog = nextDialog;
            dialog.id = scope;
            dialog.setAttribute('data-geo-drilldown', '');
            dialog.setAttribute('data-geo-theme', config.theme === 'dark' ? 'dark' : 'light');
            dialog.setAttribute('data-geo-animated', String(config.animation !== false));
            dialog.setAttribute('aria-labelledby', `${scope}-title`);
            dialog.setAttribute('aria-modal', 'true');
            dialog.addEventListener('cancel', event => { event.preventDefault(); if (dialog === nextDialog) close(); });
            dialog.addEventListener('close', () => { if (dialog === nextDialog) close(); });
            dialog.addEventListener('click', event => { if (dialog === nextDialog && event.target === nextDialog) close(); });
            style = element('style');
            style.textContent = `
                #${scope}{--geo-panel:#fff;--geo-header:#fff;--geo-text:#162c34;--geo-muted:#435963;--geo-border:#d7e1e5;--geo-button:#f4f8f9;--geo-button-border:#b2c4ca;--geo-hover:#e8f1f3;--geo-accent:#157d9c;--geo-metric:#162c34;--geo-map:#f7fafb;--geo-land:#e2edf0;--geo-land-border:#718b91;--geo-halo:#fff;color-scheme:light;box-sizing:border-box;position:fixed;inset:0;margin:auto;float:none;transform:none;width:min(1120px,calc(100vw - 24px));height:fit-content;max-width:none;max-height:calc(100dvh - 24px);padding:0;border:1px solid var(--geo-button-border);border-radius:8px;background:var(--geo-panel);color:var(--geo-text);font:14px system-ui,sans-serif;overflow:auto;overscroll-behavior:contain;box-shadow:0 20px 70px rgba(0,0,0,.3)}
                #${scope}[data-geo-theme=dark]{--geo-panel:#171b20;--geo-header:#20262c;--geo-text:#edf3f4;--geo-muted:#b7c4cb;--geo-border:#35424b;--geo-button:#283239;--geo-button-border:#52616b;--geo-hover:#303d45;--geo-accent:#75e0c1;--geo-metric:#f0c46b;--geo-map:#131b20;--geo-land:#2d4248;--geo-land-border:#72949e;--geo-halo:#131b20;color-scheme:dark}
                #${scope}::backdrop{background:rgba(7,20,26,.58)}
                #${scope} *{box-sizing:border-box;letter-spacing:0}
                #${scope} header{position:static;inset:auto;z-index:auto;float:none;transform:none;display:flex;gap:12px;align-items:center;width:auto;height:auto;margin:0;padding:12px 16px;border:0;border-bottom:1px solid var(--geo-border);background:var(--geo-header);box-shadow:none}
                #${scope} h2{position:static;inset:auto;float:none;transform:none;flex:1;min-width:0;width:auto;height:auto;margin:0;padding:0;font-size:18px;line-height:1.3;white-space:normal;overflow-wrap:anywhere}
                #${scope} button{position:static;inset:auto;float:none;transform:none;font:inherit;color:inherit;background:var(--geo-button);border:1px solid var(--geo-button-border);border-radius:4px;box-shadow:none;cursor:pointer;transition:background-color 120ms ease,border-color 120ms ease}
                #${scope} button:not(:disabled):hover{background:var(--geo-hover);border-color:var(--geo-accent)}
                #${scope} header button,#${scope} nav button{width:36px;height:36px;flex:none;font-size:20px}
                #${scope} button:disabled{opacity:.4;cursor:default}
                #${scope} :focus-visible{outline:3px solid var(--geo-accent);outline-offset:3px}
                #${scope} .geo-content{position:static;inset:auto;display:grid;grid-template-columns:minmax(0,1fr) 250px;width:auto;height:auto;margin:0;padding:0}
                #${scope} .geo-map{position:relative;inset:auto;isolation:isolate;min-width:0;width:100%;height:auto;aspect-ratio:720/460;margin:0;padding:0;overflow:hidden;background:var(--geo-map)}
                #${scope} .geo-custom-map{position:absolute;inset:0;isolation:isolate;z-index:0;width:100%;height:100%;margin:0;padding:0;overflow:hidden}
                #${scope} svg{position:static;inset:auto;float:none;transform:none;display:block;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;overflow:hidden}
                #${scope} svg [role=button]{cursor:pointer}
                #${scope} .geo-map>svg path{fill:var(--geo-land);stroke:var(--geo-land-border)}
                #${scope} .geo-map>svg [data-geo-label]{fill:var(--geo-text);stroke:var(--geo-halo)}
                #${scope} [data-geo-label=mobile]{display:none}
                #${scope} nav{position:absolute;inset:auto 12px 12px auto;z-index:1;float:none;transform:none;display:flex;gap:6px;width:auto;height:auto;margin:0;padding:0;background:transparent;border:0;box-shadow:none}
                #${scope} aside{position:static;inset:auto;float:none;transform:none;min-width:0;width:auto;height:auto;margin:0;padding:12px;border:0;border-left:1px solid var(--geo-border);max-height:540px;background:var(--geo-panel);overflow:auto;scrollbar-color:var(--geo-button-border) var(--geo-panel)}
                #${scope} aside p{margin:0 0 12px;padding:4px 10px 14px;border-bottom:1px solid var(--geo-border);font-size:16px;font-weight:650;color:var(--geo-metric);overflow-wrap:anywhere}
                #${scope} ul{padding:0;margin:0;list-style:none}
                #${scope} li+li{margin-top:6px}
                #${scope} li>button,#${scope} li>div{display:flex;width:100%;gap:12px;justify-content:space-between;align-items:center;padding:10px;text-align:left}
                #${scope} li>div{border-bottom:1px solid var(--geo-border)}
                #${scope} li span,#${scope} li strong{min-width:0;overflow-wrap:anywhere}
                #${scope} li strong{text-align:right;font-size:12px;color:var(--geo-muted)}
                #${scope}[open][data-geo-animated=true]{animation:${scope}-open 180ms ease-out both}
                #${scope}[data-geo-animated=true] .geo-content{animation:${scope}-content 160ms ease-out both}
                #${scope}[data-geo-animated=true] aside{animation:${scope}-panel 200ms ease-out both}
                @keyframes ${scope}-open{from{opacity:0}to{opacity:1}}
                @keyframes ${scope}-content{from{opacity:.35}to{opacity:1}}
                @keyframes ${scope}-panel{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}
                @media(max-width:650px){#${scope} .geo-content{grid-template-columns:minmax(0,1fr)}#${scope} aside{border-left:0;border-top:1px solid var(--geo-border);max-height:240px}#${scope} h2{font-size:16px}#${scope} [data-geo-label=desktop]{display:none}#${scope} [data-geo-label=mobile]{display:inline;font-size:24px}#${scope} [data-geo-marker]>circle{r:10px;stroke-width:3px}}
                @media(prefers-reduced-motion:reduce){#${scope},#${scope} *{animation:none!important;transition:none!important}}
            `;
            document.head.appendChild(style);
            document.body.appendChild(dialog);
        }
        const openingDialog = dialog;
        const current = render();
        if (dialog !== openingDialog) return false;
        if (firstOpen && !dialog.open) dialog.showModal();
        dialog.querySelector<HTMLButtonElement>('button')?.focus();
        if (current) notify();
        return true;
    };
    return {
        openAt(point) {
            if (destroyed || !enabled || !validCoordinate(point)) return false;
            const match = config.countries.find(item => {
                try { return !!item.feature && geoContains(prepareFeature(item.feature) as any, [point.lon, point.lat]); }
                catch { return false; }
            });
            return match ? openCountry(match.id) : false;
        },
        openCountry,
        selectCity,
        back,
        close,
        destroy() { if (!destroyed) { destroyed = true; close(); } },
        setEnabled(value) { if (!destroyed) { enabled = value; if (!value) close(); } },
        isOpen: () => !!dialog,
        getSelection: selection
    };
}
