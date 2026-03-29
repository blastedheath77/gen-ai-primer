/**
 * widget-base.js
 * Base class for all interactive widgets in the Gen-AI Primer.
 * Extend this class and override createDOM(), bindEvents(), and render()
 * to build self-contained, state-driven UI components.
 */

export class Widget {
    /**
     * @param {HTMLElement|null} container - The DOM element to render into.
     * @param {Object} [config={}] - Optional configuration overrides merged with defaults.
     */
    constructor(container, config = {}) {
        this.container = container;
        this.config = { ...this.defaults, ...config };
        this.state = {};
        if (container) this.init();
    }

    /**
     * Default configuration values for the widget.
     * Override in subclasses to provide widget-specific defaults.
     * @returns {Object}
     */
    get defaults() {
        return {};
    }

    /**
     * Lifecycle: called once by the constructor when a container is present.
     * Calls createDOM → bindEvents → render in order.
     */
    init() {
        this.createDOM();
        this.bindEvents();
        this.render();
    }

    /**
     * Lifecycle: build and insert the initial DOM structure into this.container.
     * Override in subclasses. Called before bindEvents and render.
     */
    createDOM() {}

    /**
     * Lifecycle: attach event listeners to elements created in createDOM().
     * Override in subclasses. Called after createDOM, before render.
     */
    bindEvents() {}

    /**
     * Lifecycle: update the DOM to reflect the current this.state.
     * Called after bindEvents on init, and after every setState() call.
     * Override in subclasses to perform efficient DOM updates.
     */
    render() {}

    /**
     * Merges newState into this.state and triggers a re-render.
     * @param {Object} newState - Partial state object to merge.
     */
    setState(newState) {
        Object.assign(this.state, newState);
        this.render();
    }

    /**
     * Tears down the widget by clearing the container's innerHTML.
     * Override to also remove event listeners or cancel timers.
     */
    destroy() {
        this.container.innerHTML = '';
    }
}
