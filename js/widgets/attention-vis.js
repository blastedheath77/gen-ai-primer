/**
 * attention-vis.js
 * Interactive attention weight visualiser for page 7.
 * Renders SVG arc arcs above token word blocks; clicking a token
 * shows its attention connections with arc thickness and opacity
 * proportional to weight.
 */

import { Widget } from '../core/widget-base.js';

export class AttentionVis extends Widget {
    get defaults() {
        return {
            dataUrl: '../js/data/attention-weights.json',
        };
    }

    async init() {
        this.data = null;
        this.state = {
            sentenceIdx: 0,
            selectedToken: null,
        };
        try {
            const res = await fetch(this.config.dataUrl);
            this.data = await res.json();
        } catch (e) {
            this.container.innerHTML = '<p style="color:var(--color-error);padding:1rem">Failed to load attention data.</p>';
            return;
        }
        this.createDOM();
        this.bindEvents();
        this.render();
    }

    createDOM() {
        this.container.innerHTML = `
            <div class="av-tabs tab-bar" role="tablist"></div>
            <p class="av-instruction" style="text-align:center;color:var(--color-text-muted);font-size:var(--text-sm);margin-bottom:0.75rem">
                Click any word to see what it pays attention to. Thicker arcs = stronger attention.
            </p>
            <div class="av-viz-area">
                <svg class="av-svg" role="img" aria-label="Attention weight arcs connecting tokens"><title>Attention connections between words</title></svg>
                <div class="av-tokens" role="group" aria-label="Sentence tokens — click to inspect attention"></div>
            </div>
            <div class="av-interpretation card" style="margin-top:1.25rem;min-height:80px;" aria-live="polite"></div>
        `;

        this.tabsEl      = this.container.querySelector('.av-tabs');
        this.svgEl       = this.container.querySelector('.av-svg');
        this.tokensEl    = this.container.querySelector('.av-tokens');
        this.interpEl    = this.container.querySelector('.av-interpretation');
    }

    bindEvents() {
        this.tabsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-sentence]');
            if (!btn) return;
            this.setState({ sentenceIdx: parseInt(btn.dataset.sentence, 10), selectedToken: null });
        });

        this.tokensEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-token-idx]');
            if (!btn) return;
            const idx = parseInt(btn.dataset.tokenIdx, 10);
            const current = this.state.selectedToken;
            this.setState({ selectedToken: current === idx ? null : idx });
        });
    }

    render() {
        if (!this.data) return;
        const sentences = this.data.sentences;

        // --- Tabs ---
        this.tabsEl.innerHTML = sentences
            .map((s, i) => {
                const active = i === this.state.sentenceIdx ? ' active' : '';
                const shortLabel = s.text.length > 35 ? s.text.slice(0, 33) + '…' : s.text;
                return `<button class="tab${active}" data-sentence="${i}" role="tab" aria-selected="${i === this.state.sentenceIdx}">${shortLabel}</button>`;
            })
            .join('');

        const sentence = sentences[this.state.sentenceIdx];
        const tokens   = sentence.tokens;

        // --- Token blocks ---
        this.tokensEl.innerHTML = tokens
            .map((tok, i) => {
                const sel = i === this.state.selectedToken;
                return `<button
                    class="av-token${sel ? ' av-token--selected' : ''}"
                    data-token-idx="${i}"
                    aria-pressed="${sel}"
                >${tok}</button>`;
            })
            .join('');

        // --- SVG arcs ---
        this._renderArcs(sentence);

        // --- Interpretation ---
        this._renderInterpretation(sentence);
    }

    _renderArcs(sentence) {
        const tokens = sentence.tokens;
        const tokenBtns = Array.from(this.tokensEl.querySelectorAll('.av-token'));

        if (tokenBtns.length === 0) return;

        // Measure positions after layout
        requestAnimationFrame(() => {
            const containerRect = this.tokensEl.getBoundingClientRect();
            const svgHeight = Math.max(160, containerRect.height * 1.8);

            this.svgEl.style.width  = containerRect.width + 'px';
            this.svgEl.style.height = svgHeight + 'px';
            this.svgEl.setAttribute('viewBox', `0 0 ${containerRect.width} ${svgHeight}`);
            this.svgEl.innerHTML = '';

            if (this.state.selectedToken === null) return;

            const srcIdx = this.state.selectedToken;
            const weights = sentence.weights[String(srcIdx)];
            if (!weights) return;

            // Centres of each token button relative to container
            const centres = tokenBtns.map((btn) => {
                const r = btn.getBoundingClientRect();
                return r.left - containerRect.left + r.width / 2;
            });

            // Sort by weight descending to identify top 3
            const indexed = weights.map((w, i) => ({ w, i })).sort((a, b) => b.w - a.w);
            const top3 = new Set(indexed.slice(0, 3).map(x => x.i));

            const baselineY = svgHeight; // arcs drawn above tokens, so they hang down from svgHeight

            weights.forEach((weight, tgtIdx) => {
                if (tgtIdx === srcIdx) return;
                if (weight < 0.015) return;

                const x1 = centres[srcIdx];
                const x2 = centres[tgtIdx];
                if (x1 === undefined || x2 === undefined) return;

                const dist      = Math.abs(x2 - x1);
                const arcHeight = Math.min(svgHeight * 0.9, 30 + dist * 0.75);
                const cpY       = baselineY - arcHeight;
                const midX      = (x1 + x2) / 2;

                const opacity   = Math.max(0.05, Math.min(1, weight * 3.5));
                const strokeW   = Math.max(1, weight * 20);
                const isTop3    = top3.has(tgtIdx);

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const d    = `M ${x1} ${baselineY} Q ${midX} ${cpY} ${x2} ${baselineY}`;
                path.setAttribute('d', d);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', 'var(--color-secondary)');
                path.setAttribute('stroke-width', String(strokeW));
                path.setAttribute('stroke-opacity', String(opacity));
                path.setAttribute('stroke-linecap', 'round');

                if (isTop3) {
                    path.setAttribute('filter', 'url(#arc-glow)');
                }

                this.svgEl.appendChild(path);
            });

            // Glow filter def
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            defs.innerHTML = `
                <filter id="arc-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>`;
            this.svgEl.prepend(defs);

            // Crossfade
            this.svgEl.style.opacity = '0';
            this.svgEl.style.transition = 'opacity 0.2s ease';
            requestAnimationFrame(() => { this.svgEl.style.opacity = '1'; });
        });
    }

    _renderInterpretation(sentence) {
        const idx = this.state.selectedToken;
        if (idx === null) {
            this.interpEl.innerHTML = `<p style="color:var(--color-text-muted);font-style:italic">Select a word above to see its attention pattern explained.</p>
            <p style="color:var(--color-text-light);font-size:var(--text-xs);margin-top:0.5rem">Note: self-attention (a word attending to itself) is filtered out for clarity.</p>`;
            return;
        }
        const text = sentence.interpretations[String(idx)] || '';
        const token = sentence.tokens[idx];
        this.interpEl.innerHTML = `
            <strong style="color:var(--color-secondary)">"${token}"</strong>
            <p style="margin-top:0.5rem;line-height:var(--leading-relaxed)">${text}</p>
        `;
    }
}

// ─── Inline styles ────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('av-styles')) return;
    const s = document.createElement('style');
    s.id = 'av-styles';
    s.textContent = `
.av-viz-area { position:relative; margin-bottom:0.75rem; }
.av-svg { display:block; width:100%; pointer-events:none; }
.av-tokens { display:flex; flex-wrap:wrap; gap:0.5rem; justify-content:center; padding:0.5rem 0; }
.av-token { padding:0.5rem 0.875rem; border-radius:var(--radius-sm); border:2px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-size:var(--text-sm); font-weight:500; cursor:pointer; transition:all 150ms; font-family:var(--font-body); }
.av-token:hover { border-color:var(--color-secondary); color:var(--color-secondary); }
.av-token--selected { background:var(--color-secondary); color:#fff; border-color:var(--color-secondary); font-weight:600; }
@media(max-width:640px) {
    .av-token { padding:0.375rem 0.625rem; font-size:var(--text-xs); }
    .av-tokens { gap:0.375rem; }
}
    `;
    document.head.appendChild(s);
}());
