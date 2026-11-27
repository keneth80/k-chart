const assert = require('node:assert/strict');
const {createGeoDrilldown} = require('../lib/options/geo-drilldown.js');

class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.open = false; this.isConnected = true; }
    setAttribute(key, value) { this.attributes[key] = value; if (key === 'open') this.open = true; }
    removeAttribute(key) { delete this.attributes[key]; }
    addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); }
    dispatch(name, event = {}) { (this.listeners[name] || []).forEach(handler => handler({target: this, ...event})); }
    appendChild(child) { this.children.push(child); child.parent = this; return child; }
    get parentNode() { return this.parent; }
    append(...nodes) { nodes.forEach(node => this.appendChild(node)); }
    replaceChildren() { this.children = []; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.isConnected = false; }
    focus() { global.document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatch('close'); }
    querySelector(selector) {
        const matches = child => selector === 'button' ? child.tagName === 'button' : selector === '[data-back]' && 'data-back' in child.attributes;
        for (const child of this.children) { if (matches(child)) return child; const nested = child.querySelector(selector); if (nested) return nested; }
        return null;
    }
}
const walk = (node, predicate) => [node, ...node.children.flatMap(child => walk(child, predicate))].filter(predicate);
const feature = {
    type: 'Feature', properties: {},
    geometry: {type: 'Polygon', coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]]}
};
const region = {id: 'r', label: '<script>region</script>', lat: 5.01, lon: 5.01, value: 7};
const city = {id: 'c', label: '<img src=x>', lat: 5, lon: 5, value: 10, regions: [region, {id: 'invalid', label: 'invalid', lat: NaN, lon: 0}]};
const country = {id: 'a', label: 'Country', feature, cities: [city, {id: 'empty', label: 'Empty', lat: 8, lon: 8, regions: []}]};

// Construction, disabled and SSR paths never require a DOM.
const ssr = createGeoDrilldown({countries: [country]});
assert.equal(ssr.isOpen(), false);
assert.equal(ssr.openAt({lat: 5, lon: 5}), false);
assert.equal(ssr.openCountry('a'), false);
ssr.destroy();
assert.equal(ssr.openCountry('a'), false);

global.HTMLElement = Element;
const origin = new Element('button');
let created = 0;
global.document = {
    head: new Element('head'), body: new Element('body'), activeElement: origin,
    createElement(tag) { created++; return new Element(tag); },
    createElementNS(namespace, tag) { created++; return new Element(tag); }
};
const changes = [];
let closes = 0;
const controller = createGeoDrilldown({countries: [country], onChange: value => changes.push(value), onClose: () => closes++, valueLabel: 'orders', valueFormatter: value => `$${value}`});
assert.equal(created, 0);
assert.equal(controller.openAt({lat: 50, lon: 50}), false, 'no nearest-marker fallback outside actual boundary');
assert.equal(controller.openAt({lat: 91, lon: 5}), false);
assert.equal(controller.openAt({lat: 5, lon: Infinity}), false);
assert.equal(controller.openCountry('missing'), false);
assert.equal(created, 0);
assert.equal(controller.openAt({lat: 5, lon: 5}), true);
assert.equal(controller.isOpen(), true);
assert.equal(document.head.children.length, 1);
const dialog = document.body.children[0];
assert.equal(dialog.open, true);
assert.equal(dialog.attributes['data-geo-level'], 'country');
assert.equal(dialog.attributes['data-geo-theme'], 'light', 'backward-compatible default theme');
assert.equal(dialog.attributes['data-geo-animated'], 'true', 'opening motion is enabled unless explicitly disabled');
assert.deepEqual(controller.getSelection().map(item => item.level), ['country']);
assert(Object.isFrozen(controller.getSelection()));
assert(Object.isFrozen(controller.getSelection()[0]));
assert.equal(controller.getSelection()[0].node, country, 'external data retained without disposal or mutation');
const cityRow = walk(dialog, node => node.attributes['data-geo-city-option'] === 'c')[0];
assert.equal(cityRow.children[0].children[0].textContent, city.label, 'labels are assigned as text, never markup');
assert.equal(cityRow.children[0].children[1].textContent, '$10 orders');
const countryPath = walk(dialog, node => node.tagName === 'path')[0].attributes.d;
assert(countryPath.length > 0);
assert.equal(controller.selectCity('missing'), false);
assert.equal(controller.selectCity('c'), true);
assert.deepEqual(controller.getSelection().map(item => item.level), ['country', 'city']);
assert.equal(dialog.attributes['data-geo-city'], 'c');
assert.notEqual(walk(dialog, node => node.tagName === 'path')[0].attributes.d, countryPath, 'city uses a geographic zoom, not an unchanged national viewport');
assert.equal(walk(dialog, node => node.attributes['data-geo-region'] === 'r').length, 1);
assert.equal(walk(dialog, node => node.attributes['data-geo-region'] === 'invalid').length, 0);
assert.equal(walk(dialog, node => node.attributes['data-geo-region'] === 'r')[0].children[0].tagName, 'div', 'region is final level, not another drilldown');
for (const label of walk(dialog, node => node.attributes['data-geo-label'] === 'mobile')) {
    assert.equal(label.attributes['font-size'], '24');
    assert(Number(label.attributes.x) >= 12);
    assert(Number(label.attributes.x) + label.textContent.length * 24 <= 708, 'mobile label reserves its larger text width');
    assert(Number(label.attributes.y) >= 32 && Number(label.attributes.y) <= 428);
}
controller.back();
assert.deepEqual(controller.getSelection().map(item => item.level), ['country']);
assert.equal('data-geo-city' in dialog.attributes, false);
assert.equal(controller.selectCity('empty'), true);
assert.equal(walk(dialog, node => 'data-geo-region' in node.attributes).length, 0);
let prevented = false;
dialog.dispatch('cancel', {preventDefault() { prevented = true; }});
assert(prevented);
assert.equal(controller.isOpen(), false);
assert.equal(document.head.children.length, 0);
assert.equal(document.body.children.length, 0);
assert.equal(document.activeElement, origin);
assert.equal(closes, 1);
assert.deepEqual(changes.at(-1), []);
assert.equal(controller.openCountry('a'), true);
controller.setEnabled(false);
assert.equal(controller.isOpen(), false);
assert.equal(controller.openCountry('a'), false);
controller.setEnabled(true);
assert.equal(controller.openCountry('a'), true);
document.body.children[0].dispatch('click');
assert.equal(controller.isOpen(), false, 'backdrop click closes');
assert.equal(controller.openCountry('a'), true);
const previousDialog = document.body.children[0];
controller.close();
assert.equal(controller.openCountry('a'), true);
previousDialog.dispatch('close');
assert.equal(controller.isOpen(), true, 'queued close from a removed native dialog cannot close a newly opened popup');
controller.destroy();
controller.destroy();
assert.equal(controller.openCountry('a'), false);
assert.equal(controller.selectCity('c'), false);
assert.deepEqual(controller.getSelection(), []);
assert.equal(document.head.children.length, 0);
assert.equal(document.body.children.length, 0);

const empty = createGeoDrilldown({countries: [{...country, cities: []}]});
assert.equal(empty.openCountry('a'), true);
empty.back();
assert.equal(empty.isOpen(), false);
empty.destroy();
const malformed = createGeoDrilldown({countries: [{...country, feature: {...feature, geometry: {type: 'Polygon', coordinates: []}}}]});
assert.equal(malformed.openCountry('a'), false);
malformed.destroy();
const dateLineCity = {id: 'island', label: 'Island', lat: 0, lon: 179, regions: [{id: 'east', label: 'East', lat: 1, lon: -179}]};
const dateLine = createGeoDrilldown({countries: [{
    id: 'date-line', label: 'Date line', cities: [dateLineCity],
    feature: {type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [[[170, -10], [170, 10], [-170, 10], [-170, -10], [170, -10]]]}}
}]});
assert.equal(dateLine.openAt({lat: 0, lon: 0}), false);
assert.equal(dateLine.openAt({lat: 0, lon: -179}), true);
assert.equal(dateLine.selectCity('island'), true);
const regionalMarker = walk(document.body.children[0], node => node.attributes['data-geo-marker'] === 'east')[0];
const markerX = Number(regionalMarker.children[0].attributes.cx);
assert(markerX >= 50 && markerX <= 670, 'date-line regional point is fitted locally, not across the entire world');
dateLine.destroy();
for (const reverse of [false, true]) {
    const exterior = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    const hole = [[4, 4], [4, 6], [6, 6], [6, 4], [4, 4]];
    const coordinates = [exterior, hole].map(ring => reverse ? ring.slice().reverse() : ring);
    const input = {type: 'Feature', properties: {name: 'Original'}, geometry: {type: 'Polygon', coordinates}};
    const original = JSON.stringify(input);
    const winding = createGeoDrilldown({countries: [{...country, feature: input}]});
    assert.equal(winding.openAt({lat: 50, lon: 50}), false, 'outside stays outside for either winding');
    assert.equal(winding.openAt({lat: 5, lon: 5}), false, 'holes stay excluded for either winding');
    assert.equal(winding.openAt({lat: 2, lon: 2}), true, 'RFC 7946 and D3 exteriors both select the country');
    assert.equal(winding.getSelection()[0].node.feature, input);
    winding.destroy();
    assert.equal(JSON.stringify(input), original, 'normalization never mutates caller geometry');
}
const nativeShowModal = Element.prototype.showModal;
Element.prototype.showModal = undefined;
const unsupported = createGeoDrilldown({countries: [country]});
assert.equal(unsupported.openCountry('a'), false, 'do not claim an accessible modal where native dialogs are unsupported');
assert.equal(document.body.children.length, 0);
assert.equal(document.head.children.length, 0);
assert.deepEqual(unsupported.getSelection(), []);
unsupported.destroy();
Element.prototype.showModal = nativeShowModal;

const handles = [];
const contexts = [];
const custom = createGeoDrilldown({countries: [country], mapRenderer(context) {
    assert(context.container.parentNode, 'custom renderer is mounted after its content is attached');
    assert.equal(document.body.children.length, 1);
    assert.equal(context.country, country);
    assert(Object.isFrozen(context.points));
    assert.notEqual(context.feature, country.feature, 'custom maps receive the prepared normalized feature');
    const handle = {disposed: 0, zooms: [], destroy() { this.disposed++; }, setZoom(value) { this.zooms.push(value); }};
    handles.push(handle);
    contexts.push(context);
    return handle;
}});
assert.equal(custom.openCountry('a'), true);
assert.equal(walk(document.body.children[0], node => node.tagName === 'svg').length, 0, 'only custom map is attached');
walk(document.body.children[0], node => node.attributes['aria-label'] === 'Zoom in')[0].dispatch('click');
assert.deepEqual(handles[0].zooms, [1.5]);
assert.equal(contexts[0].selectCity('c'), true);
assert.equal(handles[0].disposed, 1);
assert.equal(contexts[0].selectCity('empty'), false, 'stale renderer callbacks cannot change a newer selection');
assert.equal(contexts[1].city, city);
assert.equal(contexts[1].points[0], region);
custom.back();
assert.equal(handles[1].disposed, 1);
assert.equal(contexts[2].city, undefined);
custom.openCountry('a');
assert.equal(handles[2].disposed, 1, 'reselect disposes old resources');
custom.setEnabled(false);
assert.equal(handles[3].disposed, 1);
custom.setEnabled(true);
custom.openCountry('a');
custom.close();
assert.equal(handles[4].disposed, 1);
custom.openCountry('a');
custom.destroy();
custom.destroy();
assert(handles.every(handle => handle.disposed === 1));

const synchronousHandles = [];
let synchronousContext;
const synchronous = createGeoDrilldown({countries: [country], mapRenderer(context) {
    const handle = {disposed: 0, destroy() { this.disposed++; }};
    synchronousHandles.push(handle);
    if (!context.city) context.selectCity('c');
    else {
        synchronousContext = context;
        assert.equal(context.selectCity('c'), true, 'same-city selection does not recursively rebuild');
    }
    return handle;
}});
assert.equal(synchronous.openCountry('a'), true);
assert.equal(synchronous.getSelection()[1].node, city);
assert.equal(synchronousHandles.length, 2);
assert.equal(synchronousHandles[0].disposed, 1, 'handle returned from superseded factory is immediately disposed');
assert.equal(synchronousHandles[1].disposed, 0);
synchronous.destroy();
assert.equal(synchronousHandles[1].disposed, 1);
assert.equal(synchronousContext.selectCity('empty'), false);

let closeWhileCreating;
let lateDisposals = 0;
closeWhileCreating = createGeoDrilldown({countries: [country], mapRenderer() {
    closeWhileCreating.close();
    return {destroy() { lateDisposals++; }};
}});
assert.equal(closeWhileCreating.openCountry('a'), false);
assert.equal(lateDisposals, 1);
assert.equal(closeWhileCreating.isOpen(), false);
assert.equal(document.body.children.length, 0);
closeWhileCreating.destroy();

const originalWarn = console.warn;
let warnings = 0;
console.warn = () => warnings++;
const fallback = createGeoDrilldown({countries: [country], mapRenderer() { throw new Error('renderer unavailable'); }});
assert.equal(fallback.openCountry('a'), true);
assert.equal(walk(document.body.children[0], node => 'data-geo-custom-map' in node.attributes).length, 0);
assert.equal(walk(document.body.children[0], node => node.tagName === 'svg').length, 1);
const fallbackViewport = walk(document.body.children[0], node => node.tagName === 'g' && 'transform' in node.attributes)[0];
walk(document.body.children[0], node => node.attributes['aria-label'] === 'Zoom in')[0].dispatch('click');
assert(fallbackViewport.attributes.transform.includes('scale(1.5)'));
fallback.destroy();
assert.equal(warnings, 1);
console.warn = originalWarn;
let themedDisposals = 0;
const themed = createGeoDrilldown({countries: [country], theme: 'dark', animation: false, mapRenderer(context) {
    assert.equal(document.body.children[0].attributes['data-geo-theme'], 'dark');
    assert.equal(document.body.children[0].attributes['data-geo-animated'], 'false');
    context.container.appendChild(document.createElement('canvas'));
    return {destroy() { themedDisposals++; }};
}});
assert.equal(themed.openCountry('a'), true);
assert.equal(themed.selectCity('c'), true);
assert.equal(document.body.children[0].attributes['data-geo-theme'], 'dark');
assert.equal(document.body.children[0].attributes['data-geo-animated'], 'false');
assert.equal(themedDisposals, 1);
themed.close();
assert.equal(themedDisposals, 2, 'closing never waits for an animation timer before disposing the map');
assert.equal(document.body.children.length, 0);
assert.equal(document.head.children.length, 0);
assert.equal(document.activeElement, origin);
themed.destroy();
assert.equal(themedDisposals, 2);
delete global.document;
delete global.HTMLElement;
console.log('geo-drilldown.test.cjs passed');
