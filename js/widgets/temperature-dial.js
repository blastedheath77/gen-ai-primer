/**
 * temperature-dial.js
 * Widget for Page 10 — Temperature: The Creativity Dial.
 * Shows how temperature affects output diversity using probability bar charts
 * and sample completions.
 */

import { Widget } from '../core/widget-base.js';

const TEMP_DESCRIPTORS = [
    { max: 0.15, label: 'Frozen',       color: '#6366f1' },
    { max: 0.4,  label: 'Conservative', color: '#0d9488' },
    { max: 0.75, label: 'Balanced',     color: '#0284c7' },
    { max: 1.1,  label: 'Natural',      color: '#d97706' },
    { max: 1.5,  label: 'Adventurous',  color: '#f59e0b' },
    { max: 2.0,  label: 'Chaotic',      color: '#e11d48' },
];

function getDescriptor(temp) {
    return TEMP_DESCRIPTORS.find(d => temp <= d.max) || TEMP_DESCRIPTORS[TEMP_DESCRIPTORS.length - 1];
}

// Snap temperature to nearest key in the data
function snapTemp(temp) {
    const keys = [0.1, 0.5, 1.0, 1.5, 2.0];
    return keys.reduce((a, b) => Math.abs(b - temp) < Math.abs(a - temp) ? b : a);
}

export class TemperatureDial extends Widget {
    get defaults() {
        return {
            dataUrl: '../js/data/temperature-outputs.json',
        };
    }

    init() {
        this.state = {
            data: null,
            loaded: false,
            error: null,
            promptIndex: 0,
            temperature: 1.0,
            completions: null,
            generating: false,
        };
        this.createDOM();
        this.bindEvents();
        this.loadData();
    }

    createDOM() {
        this.container.innerHTML = `<div class="td-widget"><div class="td-loading">Loading data…</div></div>`;
        this.root = this.container.querySelector('.td-widget');
    }

    bindEvents() {}

    async loadData() {
        try {
            const res = await fetch(this.config.dataUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.setState({ data, loaded: true });
        } catch (err) {
            this.setState({ error: err.message });
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    _currentPrompt() {
        return this.state.data.prompts[this.state.promptIndex];
    }

    _getWeights(promptId, temp) {
        const dist = this.state.data.tokenDistributions[String(promptId)];
        if (!dist) return null;
        const snapped = String(snapTemp(temp));
        return { tokens: dist.tokens, weights: dist.weights[snapped] || dist.weights['1.0'] };
    }

    _getCompletions(promptId, temp) {
        const tempKey = String(snapTemp(temp));
        const completions = this.state.data.completions[String(promptId)];
        if (!completions) return [];
        return completions[tempKey] || completions['1.0'] || [];
    }

    // ── render ───────────────────────────────────────────────────────────────

    render() {
        if (this.state.error) {
            this.root.innerHTML = `<p class="td-error">Could not load data: ${this.state.error}</p>`;
            return;
        }
        if (!this.state.loaded) return;

        const { promptIndex, temperature, completions, generating } = this.state;
        const prompts = this.state.data.prompts;
        const desc = getDescriptor(temperature);

        const tabsHTML = prompts.map((p, i) =>
            `<button class="td-tab${i === promptIndex ? ' td-tab-active' : ''}" data-idx="${i}">${p.label}</button>`
        ).join('');

        const promptText = prompts[promptIndex].text;
        const barData = this._getWeights(promptIndex, temperature);

        const barsHTML = barData
            ? barData.tokens.map((tok, i) => {
                const w = barData.weights[i] || 0;
                const pct = Math.round(w * 100);
                return `
                    <div class="td-bar-row">
                        <span class="td-bar-label">${tok}</span>
                        <div class="td-bar-track">
                            <div class="td-bar-fill" data-target="${pct}" style="width:0%;background:${desc.color}"></div>
                        </div>
                        <span class="td-bar-pct">${pct}%</span>
                    </div>`;
            }).join('')
            : '';

        const completionsHTML = completions
            ? completions.map((text, i) =>
                `<div class="td-completion-card" style="animation-delay:${i * 50}ms">${text}</div>`
            ).join('')
            : '';

        this.root.innerHTML = `
            <div class="td-tabs">${tabsHTML}</div>
            <div class="td-prompt-box">
                <span class="td-prompt-text">${promptText}</span>
            </div>
            <div class="td-controls">
                <div class="td-slider-row">
                    <span class="td-temp-label">Temperature</span>
                    <input type="range" class="td-slider" id="td-slider"
                        min="0" max="2" step="0.05" value="${temperature}">
                    <span class="td-temp-value" style="color:${desc.color}">${temperature.toFixed(1)}</span>
                    <span class="td-temp-descriptor" style="color:${desc.color}">${desc.label}</span>
                </div>
            </div>
            <div class="td-chart-section">
                <div class="td-chart-label">Next-token probability distribution</div>
                <div class="td-bars">${barsHTML}</div>
            </div>
            <div class="td-generate-row">
                <button class="btn btn-primary td-generate-btn" id="td-generate"${generating ? ' disabled' : ''}>
                    ${generating ? 'Loading…' : 'Show example completions'}
                </button>
            </div>
            ${completions ? `<div class="td-completions">${completionsHTML}</div>` : ''}`;

        // Animate bars
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.root.querySelectorAll('.td-bar-fill').forEach(bar => {
                    bar.style.transition = 'width 350ms ease';
                    bar.style.width = bar.dataset.target + '%';
                });
            });
        });

        // Slider
        const slider = this.root.querySelector('#td-slider');
        slider.addEventListener('input', () => {
            const temp = parseFloat(slider.value);
            this.setState({ temperature: temp, completions: null });
        });

        // Tabs
        this.root.querySelectorAll('.td-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({ promptIndex: parseInt(btn.dataset.idx), completions: null });
            });
        });

        // Generate button
        const genBtn = this.root.querySelector('#td-generate');
        genBtn.addEventListener('click', () => {
            this.setState({ generating: true });
            // Simulate brief delay, then show pre-loaded completions
            setTimeout(() => {
                const completions = this._getCompletions(this.state.promptIndex, this.state.temperature);
                this.setState({ completions, generating: false });
            }, 350);
        });
    }
}

// ─── Inline styles ────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('td-styles')) return;
    const style = document.createElement('style');
    style.id = 'td-styles';
    style.textContent = `
.td-widget { font-family:var(--font-body); }
.td-loading, .td-error { color:var(--color-text-muted); font-size:var(--text-sm); padding:1rem; }
.td-tabs { display:flex; flex-wrap:wrap; gap:0.375rem; margin-bottom:1rem; }
.td-tab { padding:0.375rem 0.875rem; border-radius:var(--radius-full); border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text-muted); font-size:var(--text-sm); cursor:pointer; transition:all 150ms; }
.td-tab:hover { border-color:var(--color-primary); color:var(--color-primary); }
.td-tab-active { background:var(--color-primary); color:#fff; border-color:var(--color-primary); font-weight:600; }
.td-prompt-box { background:var(--color-surface-2); border-radius:var(--radius-md); padding:1rem 1.25rem; margin-bottom:1.25rem; font-size:var(--text-lg); line-height:1.6; }
.td-controls { margin-bottom:1.25rem; }
.td-slider-row { display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; }
.td-temp-label { font-size:var(--text-sm); color:var(--color-text-muted); font-weight:500; white-space:nowrap; }
.td-slider { flex:1; min-width:120px; height:6px; accent-color:var(--color-primary); cursor:pointer; }
.td-temp-value { font-size:var(--text-xl); font-weight:700; min-width:2.5rem; text-align:center; transition:color 200ms; }
.td-temp-descriptor { font-size:var(--text-sm); font-weight:600; min-width:90px; transition:color 200ms; }
.td-chart-section { margin-bottom:1.25rem; }
.td-chart-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); font-weight:600; margin-bottom:0.5rem; }
.td-bars { display:flex; flex-direction:column; gap:0.4rem; }
.td-bar-row { display:grid; grid-template-columns:90px 1fr 36px; align-items:center; gap:0.5rem; }
.td-bar-label { font-size:var(--text-sm); color:var(--color-text-muted); text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.td-bar-track { height:22px; background:var(--color-surface-2); border-radius:var(--radius-full); overflow:hidden; }
.td-bar-fill { height:100%; border-radius:var(--radius-full); width:0%; transition:width 350ms ease; }
.td-bar-pct { font-size:var(--text-xs); color:var(--color-text-muted); text-align:right; }
.td-generate-row { display:flex; margin-bottom:1rem; }
.td-completions { display:flex; flex-direction:column; gap:0.625rem; }
.td-completion-card { background:var(--color-surface-2); border-radius:var(--radius-md); padding:0.875rem 1rem; font-size:var(--text-sm); line-height:1.6; color:var(--color-text); border:1px solid var(--color-border); animation:td-fade-in 300ms ease both; }
@keyframes td-fade-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    `;
    document.head.appendChild(style);
}());
