/**
 * api-mode.js
 * Manages live/offline mode and Anthropic API calls.
 * Also exports SettingsModal for the in-page settings overlay.
 */

// ============================================================
// apiMode singleton
// ============================================================

export const apiMode = {
    isLive() {
        return localStorage.getItem('ai-primer-live') === 'true';
    },

    getApiKey() {
        return localStorage.getItem('ai-primer-key');
    },

    toggle(on) {
        localStorage.setItem('ai-primer-live', String(on));
    },

    setApiKey(key) {
        localStorage.setItem('ai-primer-key', key);
    },

    /**
     * Sends a single prompt to Claude and returns the response text.
     * Returns null when in offline mode.
     * @param {string} prompt
     * @param {Object} [options]
     * @param {number} [options.maxTokens=300]
     * @param {number} [options.temperature=0.7]
     * @returns {Promise<string|null>}
     */
    async complete(prompt, options = {}) {
        if (!this.isLive()) return null;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.getApiKey(),
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: options.maxTokens || 300,
                temperature: options.temperature ?? 0.7,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        const data = await response.json();
        return data.content?.[0]?.text || null;
    },

    /**
     * Sends the same prompt concurrently `count` times and returns an array
     * of response texts (or nulls in offline mode).
     * @param {string} prompt
     * @param {number} [count=5]
     * @param {Object} [options]
     * @returns {Promise<Array<string|null>>}
     */
    async completeMultiple(prompt, count = 5, options = {}) {
        const promises = Array.from({ length: count }, () =>
            this.complete(prompt, options)
        );
        return Promise.all(promises);
    },

    // ---- Gemini next-token predictions (used by page 3) ----
    // The browser does NOT hold the key — it calls our /api/gemini-predict
    // serverless function, which proxies to Gemini using a server-side env var.

    /**
     * Calls the local /api/gemini-predict serverless function for top-K next
     * continuation candidates.
     * @param {string} text - The text to continue.
     * @param {number} [topK=10]
     * @returns {Promise<Array<{token:string, prob:number}>>}
     */
    async geminiPredictNext(text, topK = 10) {
        const res = await fetch('/api/gemini-predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, topK })
        });
        if (!res.ok) {
            let msg = `HTTP ${res.status}`;
            try {
                const data = await res.json();
                if (data && data.error) msg = data.error;
            } catch (_) { /* non-JSON error body */ }
            throw new Error(msg);
        }
        const data = await res.json();
        if (!Array.isArray(data.predictions) || !data.predictions.length) {
            throw new Error('No predictions returned.');
        }
        return data.predictions;
    },
};

// ============================================================
// SettingsModal
// ============================================================

export class SettingsModal {
    /**
     * @param {HTMLElement} [mountPoint] - Element to append the modal to.
     *   Defaults to document.body.
     */
    constructor(mountPoint) {
        this.mountPoint = mountPoint || document.body;
        this._el = null;
        this._build();
        this._bindEvents();
        this._syncFromStorage();
    }

    // ---------------------------------------------------------------- build

    _build() {
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'settings-modal-title');

        modal.innerHTML = `
<div class="settings-modal__panel animate-in">
    <button type="button" class="settings-modal__close" aria-label="Close settings">✕</button>
    <h2 id="settings-modal-title">Settings</h2>

    <div class="settings-modal__field">
        <div class="toggle-row">
            <label for="settings-live-toggle">Live AI mode</label>
            <label class="toggle-switch">
                <input type="checkbox" id="settings-live-toggle">
                <span class="toggle-switch__track"></span>
            </label>
        </div>
    </div>

    <div class="settings-modal__field" id="settings-key-field">
        <label for="settings-api-key">Anthropic API key</label>
        <input
            type="password"
            id="settings-api-key"
            placeholder="sk-ant-…"
            autocomplete="off"
            spellcheck="false"
        >
    </div>

    <div class="settings-modal__field">
        <button type="button" class="btn btn-secondary" id="settings-test-btn">
            Test connection
        </button>
        <div class="settings-modal__status" id="settings-status" aria-live="polite"></div>
    </div>

    <p class="settings-modal__note">
        <strong>Offline mode</strong> (default): all widgets work with pre-written
        examples and no data leaves your browser.<br><br>
        <strong>Live mode</strong>: your API key is stored only in this browser's
        localStorage and is sent directly to Anthropic. It is never transmitted
        to any other server.
    </p>
</div>`;

        this._el = modal;
        this.mountPoint.appendChild(modal);

        // Cache references to interactive elements
        this._liveToggle  = modal.querySelector('#settings-live-toggle');
        this._keyInput    = modal.querySelector('#settings-api-key');
        this._keyField    = modal.querySelector('#settings-key-field');
        this._testBtn     = modal.querySelector('#settings-test-btn');
        this._statusEl    = modal.querySelector('#settings-status');
        this._closeBtn    = modal.querySelector('.settings-modal__close');
    }

    // -------------------------------------------------------------- events

    _bindEvents() {
        // Close on backdrop click
        this._el.addEventListener('click', (e) => {
            if (e.target === this._el) this.close();
        });

        // Close button
        this._closeBtn.addEventListener('click', () => this.close());

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) this.close();
        });

        // Live-mode toggle
        this._liveToggle.addEventListener('change', () => {
            const isOn = this._liveToggle.checked;
            apiMode.toggle(isOn);
            this._updateKeyFieldVisibility(isOn);
            this._clearStatus();
        });

        // API key input — save on change
        this._keyInput.addEventListener('input', () => {
            apiMode.setApiKey(this._keyInput.value.trim());
            this._clearStatus();
        });

        // Test connection button
        this._testBtn.addEventListener('click', () => this._testConnection());
    }

    // ----------------------------------------------------------- sync / UI

    _syncFromStorage() {
        const live = apiMode.isLive();
        this._liveToggle.checked = live;
        this._updateKeyFieldVisibility(live);

        const key = apiMode.getApiKey();
        if (key) this._keyInput.value = key;
    }

    _updateKeyFieldVisibility(isLive) {
        this._keyField.style.display = isLive ? '' : 'none';
    }

    _setStatus(message, type) {
        this._statusEl.textContent = message;
        this._statusEl.className = `settings-modal__status ${type || ''}`;
    }

    _clearStatus() {
        this._statusEl.textContent = '';
        this._statusEl.className = 'settings-modal__status';
    }

    async _testConnection() {
        if (!apiMode.isLive()) {
            this._setStatus('Enable live mode first.', '');
            return;
        }

        const key = apiMode.getApiKey();
        if (!key || !key.startsWith('sk-ant-')) {
            this._setStatus('Please enter a valid API key (starts with sk-ant-).', 'error');
            return;
        }

        this._testBtn.disabled = true;
        this._setStatus('Testing…', '');

        try {
            const reply = await apiMode.complete('Say hello', { maxTokens: 20 });
            if (reply) {
                this._setStatus(`Connected. Claude says: "${reply.trim()}"`, 'success');
            } else {
                this._setStatus('No response received. Check your key.', 'error');
            }
        } catch (err) {
            this._setStatus(`Error: ${err.message}`, 'error');
        } finally {
            this._testBtn.disabled = false;
        }
    }

    // ---------------------------------------------------------- public API

    open() {
        this._el.classList.add('open');
        // Re-sync in case storage changed externally
        this._syncFromStorage();
        this._clearStatus();
        // Trap focus on the close button for accessibility
        requestAnimationFrame(() => this._closeBtn.focus());
    }

    close() {
        this._el.classList.remove('open');

        // Return focus to the settings toggle if it exists
        const toggle = document.querySelector('.settings-toggle');
        if (toggle) toggle.focus();
    }

    isOpen() {
        return this._el.classList.contains('open');
    }

    toggle() {
        if (this.isOpen()) this.close();
        else this.open();
    }

    /**
     * Removes the modal element from the DOM entirely.
     */
    destroy() {
        this._el?.remove();
        this._el = null;
    }
}
