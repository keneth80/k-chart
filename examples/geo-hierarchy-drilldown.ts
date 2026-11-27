import {createGeoDrilldown, createKChart, createWorldCountryMapSeries, type KChartController} from '../src';
import {createThreeGlobeSeries, type KThreeGlobeSeriesHandle} from '../packages/k-chart-three/src';
import {createGeoHierarchySample} from './geo-hierarchy-data';
import {createThreeGeoDrilldownMap} from './three-geo-drilldown-map';

interface CountryPoint {id: string; label: string; value: number; lat: number; lon: number; color: string}
export interface MountedGeoHierarchyExample {resize(): void; destroy(): void}

const STYLE = `
.geo-hierarchy-example{height:100%;min-height:560px;display:flex;flex-direction:column;gap:14px;padding:16px;box-sizing:border-box;background:#071015;color:#edf3f4;font:14px system-ui,sans-serif}
.geo-hierarchy-example *{box-sizing:border-box;letter-spacing:0}
.geo-hierarchy-heading,.geo-hierarchy-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.geo-hierarchy-heading h3{font-size:18px;margin:0}.geo-hierarchy-caption{font-size:11px;color:#9baeb4;margin:5px 0 0}
.geo-hierarchy-total{font-size:20px;font-weight:650;text-align:right}.geo-hierarchy-total small{display:block;color:#9baeb4;font-size:11px;font-weight:400}
.geo-hierarchy-modes{display:flex;gap:2px;padding:3px;background:#15252c;border:1px solid #35464e;border-radius:6px;max-width:100%}
.geo-hierarchy-example button{font:inherit;cursor:pointer;color:inherit}.geo-hierarchy-modes button{border:0;background:transparent;padding:8px 10px;border-radius:3px;white-space:nowrap;font-size:12px}
.geo-hierarchy-modes button[aria-pressed=true]{background:#dcebec;color:#10252c}.geo-hierarchy-example button:focus-visible{outline:2px solid #f0c46b;outline-offset:2px}
.geo-hierarchy-switch{display:flex;gap:7px;align-items:center;font-size:12px}.geo-hierarchy-switch input{accent-color:#3fc7a5;width:16px;height:16px;margin:0}
.geo-hierarchy-map{position:relative;flex:1;min-height:320px;background:#02070b;overflow:hidden}
.geo-hierarchy-countries{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.geo-hierarchy-country{display:grid;grid-template-columns:8px minmax(0,1fr);align-items:center;gap:9px;text-align:left;background:#122027;border:1px solid #34444c;border-radius:6px;padding:12px;min-width:0}
.geo-hierarchy-country span{overflow-wrap:anywhere}.geo-hierarchy-country i{height:30px;border-radius:2px}.geo-hierarchy-country small{display:block;color:#a6b7bd;font-size:11px;margin-top:4px}.geo-hierarchy-country:disabled{opacity:.5;cursor:default}
@media(max-width:480px){.geo-hierarchy-example{padding:12px;gap:12px;min-height:660px}.geo-hierarchy-heading h3{font-size:16px}.geo-hierarchy-total{font-size:17px}.geo-hierarchy-toolbar{gap:10px}.geo-hierarchy-modes{width:100%;justify-content:space-between}.geo-hierarchy-modes button{flex:1;padding:8px 5px}.geo-hierarchy-map{min-height:320px}.geo-hierarchy-countries{gap:6px}.geo-hierarchy-country{padding:9px 6px;gap:6px;font-size:11px}.geo-hierarchy-country small{font-size:10px}}
`;

export const mountGeoHierarchyDrilldownExample = (host: HTMLElement): MountedGeoHierarchyExample => {
    const countries = createGeoHierarchySample();
    const palette = ['#53d2ae', '#f0c46b', '#f18a82'];
    const points: CountryPoint[] = countries.map((country, index) => ({
        id: country.id, label: country.label, value: country.value ?? 0,
        lat: country.cities[0].lat, lon: country.cities[0].lon, color: palette[index]
    }));
    const root = document.createElement('section');
    root.className = 'geo-hierarchy-example';
    const style = document.createElement('style');
    style.textContent = STYLE;
    root.append(style);
    const heading = document.createElement('header');
    heading.className = 'geo-hierarchy-heading';
    const title = document.createElement('div');
    const name = document.createElement('h3');
    name.textContent = 'Regional operations';
    const caption = document.createElement('p');
    caption.className = 'geo-hierarchy-caption';
    caption.textContent = 'SYNTHETIC DATA / 3 countries / 9 cities / 27 regions';
    title.append(name, caption);
    const total = document.createElement('div');
    total.className = 'geo-hierarchy-total';
    total.textContent = points.reduce((sum, point) => sum + point.value, 0).toLocaleString('en');
    const unit = document.createElement('small');
    unit.textContent = 'Orders';
    total.append(unit);
    heading.append(title, total);
    const toolbar = document.createElement('div');
    toolbar.className = 'geo-hierarchy-toolbar';
    const modes = document.createElement('div');
    modes.className = 'geo-hierarchy-modes';
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', 'Map view');
    const label = document.createElement('label');
    label.className = 'geo-hierarchy-switch';
    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.checked = true;
    label.append(enabled, document.createTextNode('Location details'));
    toolbar.append(modes, label);
    const stage = document.createElement('div');
    stage.className = 'geo-hierarchy-map';
    stage.setAttribute('aria-label', 'Regional operations map');
    const countryList = document.createElement('nav');
    countryList.className = 'geo-hierarchy-countries';
    countryList.setAttribute('aria-label', 'Countries');
    root.append(heading, toolbar, stage, countryList);
    host.append(root);

    const drilldown = createGeoDrilldown({
        countries, title: 'Regional operations', valueLabel: 'Orders',
        theme: 'dark', animation: true,
        mapRenderer: createThreeGeoDrilldownMap({
            dayTexture: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
            nightTexture: 'https://threejs.org/examples/textures/planets/earth_lights_2048.png',
            lighting: 'dynamic'
        })
    });
    let chart: KChartController<CountryPoint> | undefined;
    let globe: KThreeGlobeSeriesHandle<CountryPoint> | undefined;
    let mode: 'globe' | 'flat' | 'svg' = 'globe';
    let destroyed = false;
    const modeButtons: HTMLButtonElement[] = [];
    const size = () => ({width: Math.max(1, stage.clientWidth), height: Math.max(1, stage.clientHeight)});
    const mountMap = () => {
        chart?.destroy();
        stage.replaceChildren();
        globe = undefined;
        const series = mode === 'svg'
            ? createWorldCountryMapSeries<CountryPoint>({
                selector: 'geo-hierarchy-countries', dataKey: 'id', featureKey: 'id', valueField: 'value',
                fill: context => context.data?.color ?? '#1e343e', stroke: '#516970', strokeWidth: 0.6,
                geoDrilldown: drilldown, zoom: {enabled: true}, fitPadding: 12
            })
            : (globe = createThreeGlobeSeries<CountryPoint>({
                selector: 'geo-hierarchy-earth',
                dayTexture: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
                nightTexture: 'https://threejs.org/examples/textures/planets/earth_lights_2048.png',
                initialCenter: {lat: 36.5, lon: 127.7}, projection: mode === 'flat' ? 'flat' : 'globe',
                autoRotate: false, subsolar: new Date(), flatMap: {center: {lat: 0, lon: 0}, zoom: 1, lighting: 'dynamic'},
                atmosphere: {color: '#6cacc5', intensity: 0.8}, geoDrilldown: drilldown,
                markers: {fields: {lat: 'lat', lon: 'lon'}, color: point => point.color, radius: 0.007, surfaceOffset: 0.008}
            }));
        chart = createKChart<CountryPoint>({
            selector: stage, ...size(), data: points,
            title: {text: ''},
            margin: {top: 0, right: 0, bottom: 0, left: 0},
            axes: [], grid: {visible: false}, legend: {visible: false}, tooltip: {visible: false}, series: [series]
        }).render();
    };
    for (const [value, text] of [['globe', 'Globe'], ['flat', 'World map'], ['svg', 'Country map']] as const) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.dataset.geoView = value;
        button.setAttribute('aria-pressed', String(mode === value));
        button.addEventListener('click', () => {
            if (value === mode) return;
            const previous = mode;
            mode = value;
            drilldown.close();
            if (previous !== 'svg' && value !== 'svg' && globe) globe.setProjection(value, {duration: 900});
            else mountMap();
            modeButtons.forEach(item => item.setAttribute('aria-pressed', String(item.dataset.geoView === mode)));
        });
        modeButtons.push(button);
        modes.append(button);
    }
    countries.forEach((country, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'geo-hierarchy-country';
        button.dataset.countryId = country.id;
        const swatch = document.createElement('i');
        swatch.style.backgroundColor = palette[index];
        swatch.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        text.textContent = country.label;
        const count = document.createElement('small');
        count.textContent = `${country.value?.toLocaleString('en')} orders`;
        text.append(count);
        button.append(swatch, text);
        button.addEventListener('click', () => drilldown.openCountry(country.id));
        countryList.append(button);
    });
    enabled.addEventListener('change', () => {
        drilldown.setEnabled(enabled.checked);
        countryList.querySelectorAll('button').forEach(button => button.disabled = !enabled.checked);
    });
    mountMap();
    const observer = new ResizeObserver(() => {if (!destroyed) chart?.resize(size());});
    observer.observe(stage);
    const clock = window.setInterval(() => globe?.setDate(new Date()), 60_000);
    return {
        resize() {if (!destroyed) chart?.resize(size());},
        destroy() {
            if (destroyed) return;
            destroyed = true;
            observer.disconnect();
            window.clearInterval(clock);
            chart?.destroy();
            drilldown.destroy();
            root.remove();
        }
    };
};
