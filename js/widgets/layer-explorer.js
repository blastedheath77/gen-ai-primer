/**
 * layer-explorer.js
 * Vertical pipeline diagram showing how text is processed through
 * transformer layers, from surface patterns to deep reasoning.
 */

import { Widget } from '../core/widget-base.js';

const LAYER_COLORS = ['#fafaf9', '#f0fdf9', '#ccfbf1', '#99f6e4'];

/** Descriptive subtitles for each layer depth to help learners understand progressive abstraction */
const LAYER_DEPTH_LABELS = [
    'Surface patterns',
    'Grammar & structure',
    'Meaning & relationships',
    'Reasoning & intent',
    'Abstract concepts',
    'High-level synthesis',
];

export class LayerExplorer extends Widget {
    get defaults() {
        return {
            dataUrl: '../js/data/layer-interpretations.json',
        };
    }

    async init() {
        this.data = null;
        this.state = {
            sentenceIdx: 0,
            openLayer: null,
        };
        try {
            const res = await fetch(this.config.dataUrl);
            this.data = await res.json();
        } catch (e) {
            this.container.innerHTML = '<p style="color:var(--color-error);padding:1rem">Failed to load layer data.</p>';
            return;
        }
        this.createDOM();
        this.bindEvents();
        this.render();
    }

    createDOM() {
        this.container.innerHTML = `
            <div class="le-tabs tab-bar" role="tablist"></div>
            <div class="le-pipeline">
                <div class="le-input-box card" style="text-align:center;margin-bottom:0"></div>
                <div class="le-flow-track" aria-hidden="true">
                    <div class="le-flow-line"></div>
                </div>
                <div class="le-layers"></div>
                <div class="le-flow-track" aria-hidden="true">
                    <div class="le-flow-line"></div>
                </div>
                <div class="le-output-box card" style="text-align:center;margin-top:0"></div>
            </div>
        `;

        this.tabsEl    = this.container.querySelector('.le-tabs');
        this.inputEl   = this.container.querySelector('.le-input-box');
        this.layersEl  = this.container.querySelector('.le-layers');
        this.outputEl  = this.container.querySelector('.le-output-box');

        this._injectStyles();
    }

    _injectStyles() {
        if (document.getElementById('le-styles')) return;
        const style = document.createElement('style');
        style.id = 'le-styles';
        style.textContent = `
            .le-pipeline {
                display: flex;
                flex-direction: column;
                align-items: stretch;
                gap: 0;
                margin: 1rem 0;
            }
            .le-flow-track {
                display: flex;
                justify-content: center;
                height: 32px;
                position: relative;
            }
            .le-flow-line {
                width: 3px;
                height: 100%;
                background: repeating-linear-gradient(
                    to bottom,
                    var(--color-primary) 0px,
                    var(--color-primary) 6px,
                    transparent 6px,
                    transparent 12px
                );
                background-size: 3px 12px;
                animation: flowDown 1.2s linear infinite;
            }
            @keyframes flowDown {
                from { background-position: 0 0; }
                to   { background-position: 0 24px; }
            }
            .le-layers {
                display: flex;
                flex-direction: column;
                gap: 0;
                border-radius: var(--radius-md);
                overflow: hidden;
                border: 1px solid var(--color-border);
            }
            .le-layer {
                border-bottom: 1px solid var(--color-border);
                transition: background 0.3s ease;
                overflow: hidden;
            }
            .le-layer:last-child { border-bottom: none; }
            .le-layer-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.875rem 1.25rem;
                cursor: pointer;
                user-select: none;
                gap: 0.75rem;
            }
            .le-layer-header:hover { filter: brightness(0.97); }
            .le-layer-label {
                font-weight: 600;
                font-size: var(--text-sm);
                color: var(--color-text);
            }
            .le-layer-depth {
                font-weight: 400;
                font-size: var(--text-xs);
                color: var(--color-text-light);
                margin-left: 0.375rem;
            }
            .le-layer-summary {
                font-size: var(--text-xs);
                color: var(--color-text-muted);
                flex: 1;
                text-align: right;
            }
            .le-layer-chevron {
                font-size: 0.75rem;
                color: var(--color-text-muted);
                transition: transform 0.2s ease;
                flex-shrink: 0;
            }
            .le-layer.open .le-layer-chevron {
                transform: rotate(90deg);
            }
            .le-layer-body {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.35s ease;
            }
            .le-layer.open .le-layer-body {
                max-height: 400px;
            }
            .le-layer-detail {
                padding: 0.75rem 1.25rem 1rem;
                font-size: var(--text-sm);
                line-height: var(--leading-relaxed);
                color: var(--color-text);
                border-top: 1px solid rgba(0,0,0,0.06);
            }
            .le-input-box, .le-output-box {
                border-radius: var(--radius-md);
                padding: 0.875rem 1.25rem;
                border: 1px solid var(--color-border);
                background: var(--color-surface);
            }
            .le-input-box {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
                border-bottom: none;
            }
            .le-output-box {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
                border-top: none;
            }
            .le-input-label, .le-output-label {
                font-size: var(--text-xs);
                text-transform: uppercase;
                letter-spacing: 0.08em;
                font-weight: 600;
                color: var(--color-text-muted);
                margin-bottom: 0.3rem;
            }
            .le-input-text {
                font-size: var(--text-base);
                font-weight: 500;
                color: var(--color-text);
            }
            .le-output-text {
                font-size: var(--text-base);
                font-weight: 600;
                color: var(--color-primary);
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        this.tabsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-sentence]');
            if (!btn) return;
            this.setState({ sentenceIdx: parseInt(btn.dataset.sentence, 10), openLayer: null });
        });

        this.layersEl.addEventListener('click', (e) => {
            const header = e.target.closest('.le-layer-header');
            if (!header) return;
            const layerIdx = parseInt(header.dataset.layerIdx, 10);
            this.setState({ openLayer: this.state.openLayer === layerIdx ? null : layerIdx });
        });

        this.layersEl.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const header = e.target.closest('.le-layer-header');
            if (!header) return;
            e.preventDefault();
            const layerIdx = parseInt(header.dataset.layerIdx, 10);
            this.setState({ openLayer: this.state.openLayer === layerIdx ? null : layerIdx });
        });
    }

    render() {
        if (!this.data) return;
        const sentences = this.data.sentences;
        const sentence  = sentences[this.state.sentenceIdx];

        // Tabs
        this.tabsEl.innerHTML = sentences
            .map((s, i) => {
                const short = s.text.length > 32 ? s.text.slice(0, 30) + '…' : s.text;
                return `<button class="tab${i === this.state.sentenceIdx ? ' active' : ''}" data-sentence="${i}" role="tab" aria-selected="${i === this.state.sentenceIdx}">${short}</button>`;
            })
            .join('');

        // Input
        this.inputEl.innerHTML = `
            <div class="le-input-label">Input</div>
            <div class="le-input-text">${sentence.text}</div>
        `;

        // Layers
        this.layersEl.innerHTML = sentence.layers
            .map((layer, i) => {
                const isOpen = this.state.openLayer === i;
                const bg     = LAYER_COLORS[i] || '#ffffff';
                return `
                    <div class="le-layer${isOpen ? ' open' : ''}" style="background:${bg}">
                        <div class="le-layer-header" data-layer-idx="${i}" role="button" aria-expanded="${isOpen}" tabindex="0">
                            <span class="le-layer-label">${layer.label} <span class="le-layer-depth">${LAYER_DEPTH_LABELS[i] || ''}</span></span>
                            <span class="le-layer-summary">${layer.summary}</span>
                            <span class="le-layer-chevron">▶</span>
                        </div>
                        <div class="le-layer-body" role="region">
                            <div class="le-layer-detail">${layer.detail}</div>
                        </div>
                    </div>
                `;
            })
            .join('');

        // Output
        this.outputEl.innerHTML = `
            <div class="le-output-label">Output</div>
            <div class="le-output-text">${sentence.outputPrediction}</div>
        `;
    }
}
