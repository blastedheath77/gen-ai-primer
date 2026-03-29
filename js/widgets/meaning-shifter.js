/**
 * meaning-shifter.js
 * Widget for Page 6 — Context Changes Everything.
 * Shows how context words shift word meaning on a 2D meaning-space map.
 */

import { Widget } from '../core/widget-base.js';

const SVG_W = 400;
const SVG_H = 300;

export class MeaningShifter extends Widget {
    get defaults() {
        return {
            dataUrl: '../js/data/context-positions.json',
        };
    }

    init() {
        this.state = {
            data: null,
            loaded: false,
            error: null,
            activeWord: 'bank',
            activeChips: new Set(),
            dotX: SVG_W / 2,
            dotY: SVG_H / 2,
            animating: false,
        };
        this._animFrame = null;
        this._animStart = null;
        this._animFrom = { x: SVG_W / 2, y: SVG_H / 2 };
        this._animTo   = { x: SVG_W / 2, y: SVG_H / 2 };
        this.createDOM();
        this.bindEvents();
        this.loadData();
    }

    createDOM() {
        this.container.innerHTML = `<div class="ms-widget"><div class="ms-loading">Loading data…</div></div>`;
        this.root = this.container.querySelector('.ms-widget');
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

    _wordData() {
        return this.state.data.words[this.state.activeWord];
    }

    _computeTarget(wordData, activeChips) {
        const sets = wordData.contextSets;
        const setKeys = Object.keys(sets);

        // Count active chips per set
        const counts = {};
        setKeys.forEach(k => { counts[k] = 0; });
        activeChips.forEach(chip => {
            setKeys.forEach(k => {
                if (sets[k].chips.includes(chip)) counts[k]++;
            });
        });

        const totalActive = activeChips.size;
        if (totalActive === 0) {
            const n = wordData.neutral;
            return { x: n.x * SVG_W, y: n.y * SVG_H };
        }

        // Weighted average of cluster positions
        let wx = 0, wy = 0, totalWeight = 0;
        setKeys.forEach(k => {
            const w = counts[k];
            if (w > 0) {
                const cluster = wordData.clusters[sets[k].clusterKey];
                wx += cluster.x * SVG_W * w;
                wy += cluster.y * SVG_H * w;
                totalWeight += w;
            }
        });

        if (totalWeight === 0) {
            const n = wordData.neutral;
            return { x: n.x * SVG_W, y: n.y * SVG_H };
        }

        return { x: wx / totalWeight, y: wy / totalWeight };
    }

    _springTo(toX, toY) {
        if (this._animFrame) cancelAnimationFrame(this._animFrame);
        this._animFrom = { x: this.state.dotX, y: this.state.dotY };
        this._animTo   = { x: toX, y: toY };
        this._animStart = null;
        const duration = 400;

        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

        const step = (ts) => {
            if (!this._animStart) this._animStart = ts;
            const elapsed = ts - this._animStart;
            const t = Math.min(elapsed / duration, 1);
            const e = easeOutCubic(t);
            const x = this._animFrom.x + (this._animTo.x - this._animFrom.x) * e;
            const y = this._animFrom.y + (this._animTo.y - this._animFrom.y) * e;
            this.state.dotX = x;
            this.state.dotY = y;
            this._updateDot(x, y);
            if (t < 1) {
                this._animFrame = requestAnimationFrame(step);
            } else {
                this._animFrame = null;
            }
        };
        this._animFrame = requestAnimationFrame(step);
    }

    _updateDot(x, y) {
        const dot = this.root.querySelector('.ms-dot');
        if (dot) {
            dot.setAttribute('cx', x);
            dot.setAttribute('cy', y);
        }
    }

    // ── render ───────────────────────────────────────────────────────────────

    render() {
        if (this.state.error) {
            this.root.innerHTML = `<p class="ms-error">Could not load data: ${this.state.error}</p>`;
            return;
        }
        if (!this.state.loaded) return;

        const wordData = this._wordData();
        const words = Object.keys(this.state.data.words);
        const { activeWord, activeChips, dotX, dotY } = this.state;

        // Build cluster zones
        const clusterZones = Object.entries(wordData.clusters).map(([key, c]) => {
            const cx = c.x * SVG_W;
            const cy = c.y * SVG_H;
            return `
                <ellipse cx="${cx}" cy="${cy}" rx="68" ry="48"
                    fill="rgba(99,102,241,0.07)" stroke="rgba(99,102,241,0.2)" stroke-width="1" stroke-dasharray="4 3"/>
                <text x="${cx}" y="${cy + 58}" text-anchor="middle"
                    class="ms-cluster-label">${c.label}</text>`;
        }).join('');

        // Build reference word dots
        const refDots = (wordData.referenceWords || []).map(rw => {
            const rx = rw.x * SVG_W;
            const ry = rw.y * SVG_H;
            return `
                <circle cx="${rx}" cy="${ry}" r="3" fill="rgba(156,163,175,0.5)"/>
                <text x="${rx + 5}" y="${ry + 4}" class="ms-ref-label">${rw.label}</text>`;
        }).join('');

        // Build chips grouped by context set
        const allSets = wordData.contextSets;
        const chipsHTML = Object.entries(allSets).map(([setKey, setData]) => {
            const chipButtons = setData.chips.map(chip => {
                const isActive = activeChips.has(chip);
                return `<button class="ms-chip${isActive ? ' ms-chip-active' : ''}"
                    data-chip="${chip}" data-set="${setKey}">${chip}</button>`;
            }).join('');
            const groupLabel = setData.clusterKey || setKey;
            return `<div class="ms-chip-group">
                <span class="ms-chip-group-label">${groupLabel}</span>
                <div class="ms-chip-group-items">${chipButtons}</div>
            </div>`;
        }).join('');

        // Build word tabs
        const tabsHTML = words.map(w =>
            `<button class="ms-tab${w === activeWord ? ' ms-tab-active' : ''}" data-word="${w}">${w}</button>`
        ).join('');

        this.root.innerHTML = `
            <div class="ms-tabs">${tabsHTML}</div>
            <div class="ms-word-display">
                <span class="ms-central-word">${activeWord}</span>
            </div>
            <div class="ms-map-wrap">
                <svg class="ms-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}">
                    <rect width="${SVG_W}" height="${SVG_H}" fill="var(--color-surface-2)" rx="8"/>
                    ${clusterZones}
                    ${refDots}
                    <!-- current dot -->
                    <circle class="ms-dot-glow" cx="${dotX}" cy="${dotY}" r="16"
                        fill="rgba(217,119,6,0.2)"/>
                    <circle class="ms-dot" cx="${dotX}" cy="${dotY}" r="9"
                        fill="#d97706" stroke="white" stroke-width="2"/>
                </svg>
            </div>
            <p class="widget-hint" style="margin-bottom:0.75rem">Grey dots show reference words that anchor each region of the meaning space.</p>
            <div class="ms-chips-label">Toggle context words to shift meaning:</div>
            <div class="ms-chips">${chipsHTML}</div>`;

        // Events: tabs
        this.root.querySelectorAll('.ms-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const word = btn.dataset.word;
                const newWordData = this.state.data.words[word];
                const n = newWordData.neutral;
                this.state.dotX = n.x * SVG_W;
                this.state.dotY = n.y * SVG_H;
                this.setState({ activeWord: word, activeChips: new Set() });
            });
        });

        // Events: chips
        this.root.querySelectorAll('.ms-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const chip = btn.dataset.chip;
                const newActive = new Set(this.state.activeChips);
                if (newActive.has(chip)) {
                    newActive.delete(chip);
                } else {
                    newActive.add(chip);
                }
                const target = this._computeTarget(this._wordData(), newActive);
                this.state.activeChips = newActive;
                // Re-render chips only (update active classes without full re-render)
                this._refreshChips(newActive);
                this._springTo(target.x, target.y);
            });
        });
    }

    _refreshChips(activeChips) {
        this.root.querySelectorAll('.ms-chip').forEach(btn => {
            if (activeChips.has(btn.dataset.chip)) {
                btn.classList.add('ms-chip-active');
            } else {
                btn.classList.remove('ms-chip-active');
            }
        });
    }

    destroy() {
        if (this._animFrame) cancelAnimationFrame(this._animFrame);
        super.destroy();
    }
}

// ─── Inline styles ────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('ms-styles')) return;
    const style = document.createElement('style');
    style.id = 'ms-styles';
    style.textContent = `
.ms-widget { font-family: var(--font-body); }
.ms-loading, .ms-error { color:var(--color-text-muted); font-size:var(--text-sm); padding:1rem; }
.ms-tabs { display:flex; flex-wrap:wrap; gap:0.375rem; margin-bottom:1rem; }
.ms-tab { padding:0.375rem 0.875rem; border-radius:var(--radius-full); border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text-muted); font-size:var(--text-sm); cursor:pointer; transition:all 150ms; }
.ms-tab:hover { border-color:var(--color-primary); color:var(--color-primary); }
.ms-tab-active { background:var(--color-primary); color:#fff; border-color:var(--color-primary); font-weight:600; }
.ms-word-display { text-align:center; margin-bottom:0.75rem; }
.ms-central-word { font-size:var(--text-3xl); font-weight:700; color:var(--color-text); letter-spacing:-0.02em; }
.ms-map-wrap { display:flex; justify-content:center; margin-bottom:1rem; overflow:hidden; border-radius:var(--radius-md); }
.ms-svg { max-width:100%; height:auto; display:block; }
.ms-cluster-label { font-size:11px; fill:var(--color-text-muted); font-family:var(--font-body); }
.ms-ref-label { font-size:10px; fill:rgba(156,163,175,0.8); font-family:var(--font-body); }
.ms-dot-glow { pointer-events:none; }
.ms-dot { filter:drop-shadow(0 2px 6px rgba(217,119,6,0.5)); }
.ms-chips-label { font-size:var(--text-sm); color:var(--color-text-muted); margin-bottom:0.5rem; }
.ms-chips { display:flex; flex-wrap:wrap; gap:0.75rem; }
.ms-chip-group { display:flex; flex-direction:column; gap:0.375rem; }
.ms-chip-group-label { font-size:var(--text-xs); color:var(--color-text-light); text-transform:uppercase; letter-spacing:0.06em; font-weight:500; }
.ms-chip-group-items { display:flex; flex-wrap:wrap; gap:0.375rem; }
.ms-chip { padding:0.375rem 0.875rem; border-radius:var(--radius-full); border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-size:var(--text-sm); cursor:pointer; transition:all 150ms; }
.ms-chip:hover { border-color:var(--color-secondary); }
.ms-chip-active { background:var(--color-secondary); color:#fff; border-color:var(--color-secondary); font-weight:600; }
    `;
    document.head.appendChild(style);
}());
