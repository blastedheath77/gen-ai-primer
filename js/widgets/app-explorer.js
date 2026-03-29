/**
 * app-explorer.js
 * Widget for Page 16 — Real-World Applications.
 * Grid of domain cards with filter bar and expandable use cases.
 */

import { Widget } from '../core/widget-base.js';

const FILTERS = [
    { key: 'all',    label: 'All' },
    { key: 'strong', label: 'AI is strong here' },
    { key: 'caution',label: 'Use with caution' },
    { key: 'verify', label: 'Verify everything' },
];

const RELIABILITY_CONFIG = {
    strong:  { label: 'AI is strong here', color: '#0d9488', bg: 'rgba(13,148,136,0.1)' },
    caution: { label: 'Use with caution',  color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    verify:  { label: 'Verify everything', color: '#e11d48', bg: 'rgba(225,29,72,0.1)' },
};

export class AppExplorer extends Widget {
    get defaults() {
        return {
            dataUrl: '../js/data/applications.json',
        };
    }

    init() {
        this.state = {
            data: null,
            loaded: false,
            error: null,
            activeFilter: 'all',
            expandedCards: new Set(),
        };
        this.createDOM();
        this.bindEvents();
        this.loadData();
    }

    createDOM() {
        this.container.innerHTML = `<div class="ae-widget"><div class="ae-loading">Loading data…</div></div>`;
        this.root = this.container.querySelector('.ae-widget');
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

    _reliabilityDot(key) {
        const cfg = RELIABILITY_CONFIG[key] || RELIABILITY_CONFIG.caution;
        return `<span class="ae-rel-dot" style="background:${cfg.color}" title="${cfg.label}"></span>
                <span class="ae-rel-label" style="color:${cfg.color}">${cfg.label}</span>`;
    }

    render() {
        if (this.state.error) {
            this.root.innerHTML = `<p class="ae-error">Could not load data: ${this.state.error}</p>`;
            return;
        }
        if (!this.state.loaded) return;

        const { activeFilter, expandedCards } = this.state;
        const domains = this.state.data.domains;

        const filtersHTML = FILTERS.map(f =>
            `<button class="ae-filter${f.key === activeFilter ? ' ae-filter-active' : ''}" data-filter="${f.key}">${f.label}</button>`
        ).join('');

        const cardsHTML = domains.map(domain => {
            const isVisible = activeFilter === 'all' || domain.reliability === activeFilter;
            const isExpanded = expandedCards.has(domain.id);

            const useCasesHTML = domain.useCases.map(uc => {
                const rel = RELIABILITY_CONFIG[uc.reliability] || RELIABILITY_CONFIG.caution;
                const mechanismTags = uc.mechanisms.map((m, i) => {
                    const page = uc.mechanismPages?.[i];
                    return `<span class="ae-mech-tag">${m}${page ? ` (p.${page})` : ''}</span>`;
                }).join('');

                return `
                    <div class="ae-use-case">
                        <div class="ae-uc-header">
                            <span class="ae-uc-title">${uc.title}</span>
                            <span class="ae-uc-rel" style="background:${rel.bg};color:${rel.color}">${rel.label}</span>
                        </div>
                        <p class="ae-uc-desc">${uc.description}</p>
                        <div class="ae-uc-tags">${mechanismTags}</div>
                        <div class="ae-uc-prompt">
                            <span class="ae-prompt-label">Sample prompt:</span>
                            <span class="ae-prompt-text">${uc.promptExample}</span>
                        </div>
                    </div>`;
            }).join('');

            return `
                <div class="ae-card${isVisible ? '' : ' ae-card-hidden'}" data-domain="${domain.id}">
                    <button class="ae-card-header" data-toggle="${domain.id}" aria-expanded="${isExpanded}">
                        <span class="ae-card-emoji">${domain.emoji}</span>
                        <span class="ae-card-title">${domain.title}</span>
                        <span class="ae-card-rel">${this._reliabilityDot(domain.reliability)}</span>
                        <span class="ae-expand-icon">${isExpanded ? '▲' : '▼'}</span>
                    </button>
                    <div class="ae-card-body${isExpanded ? ' ae-card-body-open' : ''}">
                        <div class="ae-use-cases">${useCasesHTML}</div>
                    </div>
                </div>`;
        }).join('');

        this.root.innerHTML = `
            <div class="ae-filters">${filtersHTML}</div>
            <div class="ae-grid" id="ae-grid">${cardsHTML}</div>`;

        // Filter events
        this.root.querySelectorAll('.ae-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({ activeFilter: btn.dataset.filter });
            });
        });

        // Toggle events
        this.root.querySelectorAll('.ae-card-header').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.toggle;
                const newExpanded = new Set(this.state.expandedCards);
                if (newExpanded.has(id)) {
                    newExpanded.delete(id);
                } else {
                    newExpanded.add(id);
                }
                this.setState({ expandedCards: newExpanded });
            });
        });
    }
}

// ─── Inline styles ────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('ae-styles')) return;
    const style = document.createElement('style');
    style.id = 'ae-styles';
    style.textContent = `
.ae-widget { font-family:var(--font-body); }
.ae-loading, .ae-error { color:var(--color-text-muted); font-size:var(--text-sm); padding:1rem; }
.ae-filters { display:flex; flex-wrap:wrap; gap:0.375rem; margin-bottom:1.25rem; }
.ae-filter { padding:0.375rem 0.875rem; border-radius:var(--radius-full); border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text-muted); font-size:var(--text-sm); cursor:pointer; transition:all 150ms; }
.ae-filter:hover { border-color:var(--color-primary); color:var(--color-primary); }
.ae-filter-active { background:var(--color-primary); color:#fff; border-color:var(--color-primary); font-weight:600; }
.ae-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:0.75rem; }
@media(max-width:600px){ .ae-grid { grid-template-columns:1fr; } }
.ae-card { border:1px solid var(--color-border); border-radius:var(--radius-md); overflow:hidden; background:var(--color-surface); transition:opacity 200ms, transform 200ms; }
.ae-card-hidden { opacity:0.15; pointer-events:none; }
.ae-card-header { width:100%; display:flex; align-items:center; gap:0.5rem; padding:0.875rem 1rem; background:none; border:none; cursor:pointer; text-align:left; }
.ae-card-header:hover { background:var(--color-surface-2); }
.ae-card-emoji { font-size:1.25rem; flex-shrink:0; }
.ae-card-title { font-size:var(--text-sm); font-weight:600; color:var(--color-text); flex:1; }
.ae-card-rel { display:flex; align-items:center; gap:0.375rem; }
.ae-rel-dot { width:8px; height:8px; border-radius:50%; display:inline-block; flex-shrink:0; }
.ae-rel-label { font-size:var(--text-xs); font-weight:500; white-space:nowrap; }
@media(max-width:480px){ .ae-rel-label { display:none; } }
.ae-expand-icon { font-size:var(--text-xs); color:var(--color-text-muted); flex-shrink:0; }
.ae-card-body { max-height:0; overflow:hidden; transition:max-height 400ms ease; }
.ae-card-body-open { max-height:900px; }
.ae-use-cases { padding:0 1rem 1rem; display:flex; flex-direction:column; gap:0.875rem; }
.ae-use-case { background:var(--color-surface-2); border-radius:var(--radius-sm); padding:0.75rem; }
.ae-uc-header { display:flex; align-items:flex-start; justify-content:space-between; gap:0.5rem; margin-bottom:0.375rem; }
.ae-uc-title { font-size:var(--text-sm); font-weight:600; color:var(--color-text); }
.ae-uc-rel { font-size:var(--text-xs); font-weight:500; padding:0.125rem 0.5rem; border-radius:var(--radius-full); white-space:nowrap; flex-shrink:0; }
.ae-uc-desc { font-size:var(--text-sm); color:var(--color-text-muted); margin:0 0 0.5rem; line-height:1.5; }
.ae-uc-tags { display:flex; flex-wrap:wrap; gap:0.375rem; margin-bottom:0.5rem; }
.ae-mech-tag { font-size:var(--text-xs); background:rgba(99,102,241,0.1); color:#6366f1; padding:0.125rem 0.5rem; border-radius:var(--radius-full); }
.ae-uc-prompt { border-top:1px solid var(--color-border); padding-top:0.5rem; margin-top:0.375rem; }
.ae-prompt-label { font-size:var(--text-xs); font-weight:600; color:var(--color-text-muted); margin-right:0.375rem; }
.ae-prompt-text { font-size:var(--text-xs); color:var(--color-text-muted); font-style:italic; line-height:1.5; }
    `;
    document.head.appendChild(style);
}());
