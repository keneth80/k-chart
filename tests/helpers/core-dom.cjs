// Minimal DOM for exercising the real d3-selection lifecycle without a browser.
class Element {
    constructor(name, document, namespace = 'http://www.w3.org/1999/xhtml') {
        this.tagName = name;
        this.ownerDocument = document;
        this.namespaceURI = namespace;
        this.children = [];
        this.attributes = new Map();
        this.listeners = new Map();
        const styles = new Map();
        this.style = {
            setProperty: (key, value) => styles.set(key, String(value)),
            getPropertyValue: (key) => styles.get(key) ?? '',
            removeProperty: (key) => styles.delete(key)
        };
    }
    get parentElement() { return this.parentNode; }
    get nextSibling() {
        return this.parentNode?.children[this.parentNode.children.indexOf(this) + 1] ?? null;
    }
    get firstChild() { return this.children[0] ?? null; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { return this.insertBefore(child, null); }
    insertBefore(child, next) {
        child.parentNode?.removeChild(child);
        const index = next ? this.children.indexOf(next) : this.children.length;
        this.children.splice(index, 0, child);
        child.parentNode = this;
        return child;
    }
    removeChild(child) {
        this.children.splice(this.children.indexOf(child), 1);
        child.parentNode = null;
        return child;
    }
    compareDocumentPosition() { return 4; }
    getBoundingClientRect() { return {width: 640, height: 400}; }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    removeEventListener(type) { this.listeners.delete(type); }
    matches(selector) {
        if (selector === '*') return true;
        const match = /^([\w-]+)?(?:\.([\w-]+))?$/.exec(selector);
        if (!match) throw new Error(`Unsupported or unsafe test DOM selector: ${selector}`);
        return (!match[1] || this.tagName === match[1])
            && (!match[2] || (this.getAttribute('class') ?? '').split(/\s+/).includes(match[2]));
    }
    querySelectorAll(selector) {
        return this.children.flatMap((child) => [
            ...(child.matches(selector) ? [child] : []),
            ...child.querySelectorAll(selector)
        ]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

const createContainer = () => {
    const document = {
        createElement(name) { return new Element(name, document); },
        createElementNS(namespace, name) { return new Element(name, document, namespace); }
    };
    document.documentElement = document.createElement('html');
    return document.createElement('div');
};

module.exports = {createContainer};
