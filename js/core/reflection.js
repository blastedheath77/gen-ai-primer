/**
 * reflection.js
 * Collapsible reflection panel with auto-saving textarea.
 * Content is persisted to localStorage keyed by the current page number.
 */

const STORAGE_PREFIX = 'ai-primer-reflection-';

/**
 * Returns the current page number from <body data-page="N">.
 * Falls back to the pathname for a best-effort key.
 * @returns {string}
 */
function getPageKey() {
    const raw = document.body.getAttribute('data-page');
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return String(n);
    // Fallback: strip leading slash and extension
    return window.location.pathname.replace(/^\/|\.html$/g, '') || 'unknown';
}

export class ReflectionPanel {
    /**
     * @param {HTMLElement} container - Element to render the panel into.
     * @param {string} [prompt='What questions or ideas does this spark for you?'] - Textarea placeholder text.
     */
    constructor(container, prompt = 'What questions or ideas does this spark for you?') {
        if (!container) {
            console.warn('[ReflectionPanel] No container element provided.');
            return;
        }
        this.container = container;
        this.prompt = prompt;
        this.storageKey = STORAGE_PREFIX + getPageKey();
        this._expanded = false;

        this._build();
        this._bindEvents();
        this._loadSaved();
    }

    // ------------------------------------------------------------------ build

    _build() {
        // Wrap in the shared .reflection-panel layout expected by styles.css
        this.container.classList.add('reflection-panel');

        // Toggle button
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.type = 'button';
        this.toggleBtn.className = 'reflection-toggle';
        this.toggleBtn.setAttribute('aria-expanded', 'false');
        this.toggleBtn.setAttribute('aria-controls', this._contentId());
        this.toggleBtn.innerHTML =
            'Pause and reflect <span class="toggle-arrow" aria-hidden="true">→</span>';

        // Collapsible content area
        this.contentDiv = document.createElement('div');
        this.contentDiv.className = 'reflection-content';
        this.contentDiv.id = this._contentId();

        // Textarea
        this.textarea = document.createElement('textarea');
        this.textarea.placeholder = this.prompt;
        this.textarea.setAttribute('aria-label', 'Reflection notes');
        this.textarea.rows = 4;

        this.contentDiv.appendChild(this.textarea);
        this.container.appendChild(this.toggleBtn);
        this.container.appendChild(this.contentDiv);
    }

    /** Returns a stable id for the content div, used for aria-controls. */
    _contentId() {
        return `reflection-content-${getPageKey()}`;
    }

    // --------------------------------------------------------------- events

    _bindEvents() {
        // Toggle expand / collapse
        this.toggleBtn.addEventListener('click', () => {
            this._expanded = !this._expanded;
            this._applyState();
        });

        // Auto-save on input (debounced slightly to reduce writes)
        let saveTimer;
        this.textarea.addEventListener('input', () => {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => this._save(), 400);
        });

        // Immediate save on blur
        this.textarea.addEventListener('blur', () => {
            clearTimeout(saveTimer);
            this._save();
        });
    }

    // --------------------------------------------------------------- state

    _applyState() {
        const expanded = this._expanded;
        this.toggleBtn.setAttribute('aria-expanded', String(expanded));

        if (expanded) {
            this.contentDiv.classList.add('expanded');
            // Focus textarea for usability
            requestAnimationFrame(() => this.textarea.focus());
        } else {
            this.contentDiv.classList.remove('expanded');
        }
    }

    // ---------------------------------------------------------- persistence

    _save() {
        try {
            localStorage.setItem(this.storageKey, this.textarea.value);
        } catch (_) { /* storage full or unavailable */ }
    }

    _loadSaved() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved !== null) {
                this.textarea.value = saved;
            }
        } catch (_) { /* ignore */ }
    }

    // ---------------------------------------------------------- public API

    /**
     * Programmatically expand the reflection panel.
     */
    open() {
        this._expanded = true;
        this._applyState();
    }

    /**
     * Programmatically collapse the reflection panel.
     */
    close() {
        this._expanded = false;
        this._applyState();
    }

    /**
     * Returns the current textarea value.
     * @returns {string}
     */
    getValue() {
        return this.textarea ? this.textarea.value : '';
    }

    /**
     * Clears the saved note from localStorage and resets the textarea.
     */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (_) { /* ignore */ }
        if (this.textarea) this.textarea.value = '';
    }
}
