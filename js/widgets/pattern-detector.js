/**
 * pattern-detector.js
 * Widget for Page 4 — Patterns from Text.
 * Demonstrates n-gram matching on a growing corpus.
 */

import { Widget } from '../core/widget-base.js';

const CORPUS_SIZES = [
    { label: 'Small (30)', value: 30 },
    { label: 'Medium (150)', value: 150 },
    { label: 'Large (500)', value: 500 },
];

const EXAMPLES = [
    'The capital of',
    'Students should',
    'The weather in Glasgow is',
    'The best way to',
];

export class PatternDetector extends Widget {
    get defaults() {
        return { dataUrl: '../js/data/corpus.json', displayMax: 30 };
    }

    init() {
        this.state = {
            sentences: [],
            loaded: false,
            error: null,
            corpusSize: 30,
            query: '',
            prediction: null,
        };
        this.createDOM();
        this.bindEvents();
        this.loadData();
    }

    createDOM() {
        this.container.innerHTML = `<div class="pd-widget"><div class="pd-loading">Loading corpus…</div></div>`;
        this.root = this.container.querySelector('.pd-widget');
    }

    bindEvents() {}

    async loadData() {
        try {
            const res = await fetch(this.config.dataUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.setState({ sentences: data.sentences, loaded: true });
        } catch (err) {
            this.setState({ error: err.message });
        }
    }

    /** Returns array of sentences currently active in the corpus. */
    _activeSentences() {
        const { sentences, corpusSize } = this.state;
        return sentences.slice(0, Math.min(corpusSize, sentences.length));
    }

    /**
     * Finds the most likely next word by counting n-gram continuations.
     * @param {string} query
     * @param {string[]} corpus
     * @returns {{word: string, count: number, total: number}|null}
     */
    _predict(query, corpus) {
        const q = query.trim().toLowerCase();
        if (!q || q.length < 2) return null;

        const counts = {};
        let total = 0;

        corpus.forEach(sentence => {
            const lower = sentence.toLowerCase();
            let pos = 0;
            while ((pos = lower.indexOf(q, pos)) !== -1) {
                const after = lower.slice(pos + q.length).trimStart();
                if (after.length > 0) {
                    // Extract next word (up to whitespace or punctuation)
                    const match = after.match(/^([a-zA-Z']+)/);
                    if (match) {
                        const word = match[1];
                        counts[word] = (counts[word] || 0) + 1;
                        total++;
                    }
                }
                pos++;
            }
        });

        if (total === 0) return null;
        const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        return { word: best[0], count: best[1], total };
    }

    /** Highlights query matches inside a sentence string (safe HTML). */
    _highlightSentence(sentence, query) {
        if (!query || query.length < 2) return this._esc(sentence);
        const q = query.trim().toLowerCase();
        let result = '';
        let pos = 0;
        const lower = sentence.toLowerCase();
        let found = false;
        while (pos < sentence.length) {
            const idx = lower.indexOf(q, pos);
            if (idx === -1) {
                result += this._esc(sentence.slice(pos));
                break;
            }
            result += this._esc(sentence.slice(pos, idx));
            result += `<mark class="pd-highlight">${this._esc(sentence.slice(idx, idx + q.length))}</mark>`;
            pos = idx + q.length;
            found = true;
        }
        return found ? result : this._esc(sentence);
    }

    _esc(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    render() {
        if (this.state.error) {
            this.root.innerHTML = `<p class="pd-error">Could not load corpus: ${this.state.error}</p>`;
            return;
        }
        if (!this.state.loaded) return;

        const { corpusSize, query, prediction } = this.state;
        const active = this._activeSentences();
        const displaySentences = active.slice(0, this.config.displayMax);
        const hiddenCount = active.length - displaySentences.length;

        // Build corpus display with highlights
        const corpusHTML = displaySentences.map(s =>
            `<div class="pd-sentence">${this._highlightSentence(s, query)}</div>`
        ).join('');

        // Prediction box
        let predHTML;
        if (!query || query.trim().length < 2) {
            predHTML = `<div class="pd-pred-empty">Type a phrase above to see a prediction.</div>`;
        } else if (!prediction) {
            predHTML = `<div class="pd-pred-empty">No matches found in this corpus. Try a larger corpus or a different phrase.</div>`;
        } else {
            const pct = Math.round((prediction.count / prediction.total) * 100);
            predHTML = `
                <div class="pd-pred-result">
                    <div class="pd-pred-label">Most likely next word:</div>
                    <div class="pd-pred-word">${this._esc(prediction.word)}</div>
                    <div class="pd-pred-stats">Appeared <strong>${prediction.count}</strong> time${prediction.count !== 1 ? 's' : ''} after this phrase (${pct}% of ${prediction.total} match${prediction.total !== 1 ? 'es' : ''})</div>
                </div>`;
        }

        this.root.innerHTML = `
            <div class="pd-layout">
                <div class="pd-left">
                    <div class="pd-section-label">Corpus</div>
                    <div class="pd-corpus" id="pd-corpus">
                        ${corpusHTML}
                        ${hiddenCount > 0 ? `<div class="pd-more">…and ${hiddenCount} more sentence${hiddenCount !== 1 ? 's' : ''}</div>` : ''}
                    </div>
                </div>
                <div class="pd-right">
                    <div class="pd-section-label">Try these examples:</div>
                    <div class="pd-examples">
                        ${EXAMPLES.map(ex => `<button class="btn btn-secondary pd-example-btn" data-text="${ex}">${ex}</button>`).join('')}
                    </div>

                    <div class="pd-section-label" style="margin-top:1rem;">Your phrase:</div>
                    <input type="text" class="pd-input" id="pd-input" placeholder="Type a sentence start…" value="${this._esc(query)}" autocomplete="off">

                    <div class="pd-prediction-box">
                        ${predHTML}
                    </div>

                    <div class="pd-section-label" style="margin-top:1.25rem;">Corpus size:</div>
                    <div class="pd-size-buttons">
                        ${CORPUS_SIZES.map(sz => `
                            <button class="btn ${sz.value === corpusSize ? 'btn-primary' : 'btn-secondary'} pd-size-btn" data-size="${sz.value}">
                                ${sz.label}
                            </button>`).join('')}
                    </div>
                    <p class="pd-size-hint">Larger corpora give better predictions — just like real LLMs trained on more text.</p>
                </div>
            </div>`;

        // Events
        const input = this.root.querySelector('#pd-input');
        input.addEventListener('input', e => {
            const q = e.target.value;
            const active = this._activeSentences();
            const prediction = this._predict(q, active);
            this.setState({ query: q, prediction });
        });

        this.root.querySelectorAll('.pd-example-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const q = btn.dataset.text;
                const input = this.root.querySelector('#pd-input');
                if (input) input.value = q;
                const active = this._activeSentences();
                const prediction = this._predict(q, active);
                this.setState({ query: q, prediction });
            });
        });

        this.root.querySelectorAll('.pd-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const size = parseInt(btn.dataset.size, 10);
                const active = this.state.sentences.slice(0, Math.min(size, this.state.sentences.length));
                const prediction = this._predict(this.state.query, active);
                this.setState({ corpusSize: size, prediction });
            });
        });
    }
}

// ── Inline styles ─────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('pd-styles')) return;
    const style = document.createElement('style');
    style.id = 'pd-styles';
    style.textContent = `
.pd-widget { font-family:var(--font-body); }
.pd-loading, .pd-error { color:var(--color-text-muted); font-size:var(--text-sm); padding:1rem; }
.pd-layout { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
@media(max-width:700px){ .pd-layout { grid-template-columns:1fr; } }
.pd-section-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; font-weight:600; color:var(--color-text-muted); margin-bottom:0.5rem; }
.pd-corpus { height:320px; overflow-y:auto; border:1px solid var(--color-border); border-radius:var(--radius-sm); padding:0.75rem; background:var(--color-surface-2); font-size:var(--text-xs); line-height:1.7; }
.pd-sentence { padding:2px 0; border-bottom:1px solid var(--color-border); }
.pd-sentence:last-of-type { border-bottom:none; }
.pd-highlight { background:rgba(13,148,136,0.2); color:var(--color-primary-dark); padding:0 2px; border-radius:2px; font-weight:500; }
.pd-more { font-size:var(--text-xs); color:var(--color-text-light); font-style:italic; padding-top:0.5rem; }
.pd-examples { display:flex; flex-wrap:wrap; gap:0.375rem; margin-bottom:0.25rem; }
.pd-example-btn { font-size:var(--text-xs); padding:0.25rem 0.625rem; cursor:pointer; }
.pd-input { display:block; width:100%; padding:0.5rem 0.75rem; border:1px solid var(--color-border); border-radius:var(--radius-sm); font-size:var(--text-sm); font-family:var(--font-body); background:var(--color-surface); color:var(--color-text); }
.pd-input:focus { outline:none; border-color:var(--color-primary); box-shadow:0 0 0 3px rgba(13,148,136,0.12); }
.pd-prediction-box { margin-top:0.75rem; min-height:80px; padding:1rem; background:var(--color-surface-2); border-radius:var(--radius-sm); border:1px solid var(--color-border); }
.pd-pred-empty { font-size:var(--text-sm); color:var(--color-text-light); font-style:italic; }
.pd-pred-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; font-weight:600; color:var(--color-text-muted); margin-bottom:0.25rem; }
.pd-pred-word { font-size:var(--text-3xl); font-weight:700; color:var(--color-primary); margin-bottom:0.25rem; }
.pd-pred-stats { font-size:var(--text-xs); color:var(--color-text-muted); }
.pd-size-buttons { display:flex; gap:0.5rem; flex-wrap:wrap; }
.pd-size-hint { font-size:var(--text-xs); color:var(--color-text-light); margin-top:0.5rem; font-style:italic; }
    `;
    document.head.appendChild(style);
}());
