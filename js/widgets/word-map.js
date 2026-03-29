/**
 * word-map.js
 * Widget for Page 5 — Words as Numbers.
 * SVG-based 2D word embedding scatter plot with pan/zoom, hover nearest-neighbours,
 * word search, and two-word distance mode.
 */

import { Widget } from '../core/widget-base.js';

const SVG_W = 600;
const SVG_H = 480;
const DOT_R = 7;
const CLUSTER_FONT = 28;

export class WordMap extends Widget {
    get defaults() {
        return { dataUrl: '../js/data/embeddings-2d.json' };
    }

    init() {
        this.state = {
            words: [],
            clusters: [],
            loaded: false,
            error: null,
            // pan/zoom state
            tx: 0, ty: 0, scale: 1,
            // interaction
            hoveredWord: null,
            distanceMode: false,
            selectedWords: [],   // up to 2 words in distance mode
            searchQuery: '',
            addedWords: [],      // user-added search words
        };
        this._drag = { active: false, startX: 0, startY: 0, startTx: 0, startTy: 0 };
        this.createDOM();
        this.bindEvents();
        this.loadData();
    }

    createDOM() {
        this.container.innerHTML = `
            <div class="wm-widget">
                <div class="wm-toolbar">
                    <div class="wm-search-row">
                        <input type="text" class="wm-search" id="wm-search" placeholder="Search or add a word…" autocomplete="off">
                        <button class="btn btn-secondary wm-add-btn" id="wm-add">Add word</button>
                    </div>
                    <div class="wm-distance-row">
                        <label class="wm-toggle-label">
                            <input type="checkbox" id="wm-dist-toggle">
                            <span>Distance mode (click two words)</span>
                        </label>
                    </div>
                </div>
                <div class="wm-svg-wrap" id="wm-svg-wrap">
                    <svg class="wm-svg" id="wm-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg">
                        <g id="wm-transform-group">
                            <g id="wm-clusters-group"></g>
                            <g id="wm-connectors-group"></g>
                            <g id="wm-dots-group"></g>
                        </g>
                    </svg>
                </div>
                <div class="wm-distance-result" id="wm-dist-result" style="display:none"></div>
                <p class="wm-footnote">Real embeddings live in 1,000+ dimensions — this 2D projection preserves the major relationships but distances are approximate. In high-dimensional space, words can be simultaneously close on multiple axes (e.g., "king" is near both "queen" and "crown" for different reasons).</p>
            </div>`;
    }

    bindEvents() {
        // Will bind after data loads in render()
    }

    async loadData() {
        try {
            const res = await fetch(this.config.dataUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.setState({ words: data.words, clusters: data.clusters, loaded: true });
        } catch (err) {
            this.setState({ error: err.message });
        }
    }

    // Convert 0-1 data coords to SVG pixels
    _toSVG(x, y) {
        const pad = 48;
        return {
            sx: pad + x * (SVG_W - pad * 2),
            sy: pad + (1 - y) * (SVG_H - pad * 2),
        };
    }

    // Euclidean distance in data-space
    _dist(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    // Cosine-like similarity (0-100%)
    _similarity(a, b) {
        const d = this._dist(a, b);
        const maxDist = Math.SQRT2;
        return Math.round((1 - d / maxDist) * 100);
    }

    _nearestNeighbours(word, allWords, n = 3) {
        return allWords
            .filter(w => w.word !== word.word)
            .map(w => ({ ...w, d: this._dist(word, w) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, n);
    }

    /** Fuzzy-match against vocab and return closest word entry. */
    _findWord(query) {
        const q = query.toLowerCase().trim();
        if (!q) return null;
        const allWords = [...this.state.words, ...this.state.addedWords];
        // Exact match first
        let found = allWords.find(w => w.word.toLowerCase() === q);
        if (found) return found;
        // Prefix match
        found = allWords.find(w => w.word.toLowerCase().startsWith(q));
        return found || null;
    }

    /** Place an unknown word near its cluster heuristically. */
    _placeNewWord(query) {
        // Simple hash-based placement
        const h = [...query].reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7);
        const x = 0.1 + ((h % 800) / 1000);
        const y = 0.1 + (((h >> 3) % 800) / 1000);
        return { word: query, x: Math.min(0.9, x), y: Math.min(0.9, y), cluster: 'added', added: true };
    }

    render() {
        if (this.state.error) {
            this.container.querySelector('.wm-widget').innerHTML =
                `<p class="wm-error">Could not load data: ${this.state.error}</p>`;
            return;
        }
        if (!this.state.loaded) return;

        this._renderSVG();
        this._bindInteraction();
    }

    _renderSVG() {
        const { words, clusters, addedWords, hoveredWord, distanceMode, selectedWords } = this.state;
        const allWords = [...words, ...addedWords];

        const clustersGroup = this.container.querySelector('#wm-clusters-group');
        const conGroup = this.container.querySelector('#wm-connectors-group');
        const dotsGroup = this.container.querySelector('#wm-dots-group');

        // Clear
        clustersGroup.innerHTML = '';
        conGroup.innerHTML = '';
        dotsGroup.innerHTML = '';

        // Apply pan/zoom transform
        const g = this.container.querySelector('#wm-transform-group');
        g.setAttribute('transform', `translate(${this.state.tx},${this.state.ty}) scale(${this.state.scale})`);

        // Cluster labels
        clusters.forEach(cl => {
            const { sx, sy } = this._toSVG(cl.cx, cl.cy);
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', sx);
            text.setAttribute('y', sy);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('font-size', CLUSTER_FONT);
            text.setAttribute('font-weight', '700');
            text.setAttribute('fill', 'rgba(200,200,200,0.35)');
            text.setAttribute('pointer-events', 'none');
            text.textContent = cl.label;
            clustersGroup.appendChild(text);
        });

        // Connector lines (hover nearest neighbours)
        if (hoveredWord) {
            const nn = this._nearestNeighbours(hoveredWord, allWords, 3);
            const { sx: hx, sy: hy } = this._toSVG(hoveredWord.x, hoveredWord.y);
            nn.forEach(nb => {
                const { sx: nx, sy: ny } = this._toSVG(nb.x, nb.y);
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', hx); line.setAttribute('y1', hy);
                line.setAttribute('x2', nx); line.setAttribute('y2', ny);
                line.setAttribute('stroke', '#0d9488');
                line.setAttribute('stroke-width', '1.5');
                line.setAttribute('stroke-dasharray', '4 3');
                line.setAttribute('opacity', '0.7');
                conGroup.appendChild(line);
            });
        }

        // Distance mode line
        if (distanceMode && selectedWords.length === 2) {
            const [a, b] = selectedWords;
            const { sx: ax, sy: ay } = this._toSVG(a.x, a.y);
            const { sx: bx, sy: by } = this._toSVG(b.x, b.y);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', ax); line.setAttribute('y1', ay);
            line.setAttribute('x2', bx); line.setAttribute('y2', by);
            line.setAttribute('stroke', '#d97706');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('opacity', '0.85');
            conGroup.appendChild(line);
        }

        // Dots + labels
        allWords.forEach(w => {
            const { sx, sy } = this._toSVG(w.x, w.y);
            const isHovered = hoveredWord && hoveredWord.word === w.word;
            const isSelected = selectedWords.some(s => s.word === w.word);
            const isAdded = w.added;

            const r = isHovered || isSelected ? DOT_R * 1.5 : DOT_R;
            const fill = isSelected ? '#d97706' : isAdded ? '#6366f1' : '#0d9488';
            const stroke = isHovered ? '#fff' : 'none';
            const strokeWidth = isHovered ? 2 : 0;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', sx);
            circle.setAttribute('cy', sy);
            circle.setAttribute('r', r);
            circle.setAttribute('fill', fill);
            circle.setAttribute('stroke', stroke);
            circle.setAttribute('stroke-width', strokeWidth);
            circle.setAttribute('cursor', 'pointer');
            circle.setAttribute('class', 'wm-dot');
            circle.dataset.word = w.word;
            circle.style.transition = 'r 0.15s';
            dotsGroup.appendChild(circle);

            // Label
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', sx + r + 3);
            label.setAttribute('y', sy + 4);
            label.setAttribute('font-size', isHovered || isSelected ? 13 : 11);
            label.setAttribute('fill', isHovered || isSelected ? '#1c1917' : '#78716c');
            label.setAttribute('pointer-events', 'none');
            label.setAttribute('font-family', 'Inter, system-ui, sans-serif');
            label.setAttribute('font-weight', isHovered || isSelected ? '600' : '400');
            label.textContent = w.word;
            dotsGroup.appendChild(label);
        });
    }

    _bindInteraction() {
        const svg = this.container.querySelector('#wm-svg');
        const wrap = this.container.querySelector('#wm-svg-wrap');
        const searchInput = this.container.querySelector('#wm-search');
        const addBtn = this.container.querySelector('#wm-add');
        const distToggle = this.container.querySelector('#wm-dist-toggle');
        const distResult = this.container.querySelector('#wm-dist-result');
        if (!svg) return;

        // Hover
        svg.addEventListener('mousemove', (e) => {
            const target = e.target.closest('.wm-dot');
            if (target) {
                const allWords = [...this.state.words, ...this.state.addedWords];
                const word = allWords.find(w => w.word === target.dataset.word);
                if (word && (!this.state.hoveredWord || this.state.hoveredWord.word !== word.word)) {
                    this.state.hoveredWord = word;
                    this._renderSVG();
                }
            } else if (this.state.hoveredWord && !this._drag.active) {
                this.state.hoveredWord = null;
                this._renderSVG();
            }
        });

        svg.addEventListener('mouseleave', () => {
            if (this.state.hoveredWord) {
                this.state.hoveredWord = null;
                this._renderSVG();
            }
        });

        // Click (distance mode)
        svg.addEventListener('click', (e) => {
            if (!this.state.distanceMode) return;
            const target = e.target.closest('.wm-dot');
            if (!target) return;
            const allWords = [...this.state.words, ...this.state.addedWords];
            const word = allWords.find(w => w.word === target.dataset.word);
            if (!word) return;

            let sel = [...this.state.selectedWords];
            const idx = sel.findIndex(s => s.word === word.word);
            if (idx !== -1) {
                sel.splice(idx, 1);
            } else {
                sel.push(word);
                if (sel.length > 2) sel = sel.slice(-2);
            }
            this.state.selectedWords = sel;
            this._renderSVG();

            if (sel.length === 2) {
                const sim = this._similarity(sel[0], sel[1]);
                distResult.style.display = 'block';
                distResult.innerHTML = `<strong>${sel[0].word}</strong> ↔ <strong>${sel[1].word}</strong> = <span class="wm-sim-score">${sim}%</span> similarity`;
            } else {
                distResult.style.display = 'none';
            }
        });

        // Pan: mouse drag
        svg.addEventListener('mousedown', (e) => {
            if (e.target.closest('.wm-dot')) return;
            this._drag = { active: true, startX: e.clientX, startY: e.clientY, startTx: this.state.tx, startTy: this.state.ty };
        });
        window.addEventListener('mousemove', (e) => {
            if (!this._drag.active) return;
            const dx = e.clientX - this._drag.startX;
            const dy = e.clientY - this._drag.startY;
            this.state.tx = this._drag.startTx + dx;
            this.state.ty = this._drag.startTy + dy;
            this._renderSVG();
        });
        window.addEventListener('mouseup', () => { this._drag.active = false; });

        // Zoom: scroll wheel
        wrap.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            this.state.scale = Math.max(0.4, Math.min(4, this.state.scale * factor));
            this._renderSVG();
        }, { passive: false });

        // Touch pan/pinch
        let lastTouches = null;
        svg.addEventListener('touchstart', (e) => {
            lastTouches = e.touches;
        }, { passive: true });
        svg.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && lastTouches.length === 1) {
                const dx = e.touches[0].clientX - lastTouches[0].clientX;
                const dy = e.touches[0].clientY - lastTouches[0].clientY;
                this.state.tx += dx;
                this.state.ty += dy;
                this._renderSVG();
            } else if (e.touches.length === 2 && lastTouches.length === 2) {
                const prevDist = Math.hypot(
                    lastTouches[0].clientX - lastTouches[1].clientX,
                    lastTouches[0].clientY - lastTouches[1].clientY
                );
                const currDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                if (prevDist > 0) {
                    const factor = currDist / prevDist;
                    this.state.scale = Math.max(0.4, Math.min(4, this.state.scale * factor));
                    this._renderSVG();
                }
            }
            lastTouches = e.touches;
        }, { passive: false });

        // Distance mode toggle
        distToggle.checked = this.state.distanceMode;
        distToggle.addEventListener('change', () => {
            this.state.distanceMode = distToggle.checked;
            this.state.selectedWords = [];
            distResult.style.display = 'none';
            this._renderSVG();
        });

        // Search / Add
        const doSearch = () => {
            const q = searchInput.value.trim();
            if (!q) return;
            const found = this._findWord(q);
            if (found) {
                this.state.hoveredWord = found;
                this._renderSVG();
            } else {
                // Add as new word
                const newWord = this._placeNewWord(q);
                this.state.addedWords = [...this.state.addedWords, newWord];
                this.state.hoveredWord = newWord;
                this._renderSVG();
            }
            searchInput.value = '';
        };

        addBtn.addEventListener('click', doSearch);
        searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    }
}

// ── Inline styles ─────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('wm-styles')) return;
    const style = document.createElement('style');
    style.id = 'wm-styles';
    style.textContent = `
.wm-widget { font-family:var(--font-body); }
.wm-toolbar { display:flex; flex-wrap:wrap; gap:0.75rem; align-items:center; margin-bottom:1rem; }
.wm-search-row { display:flex; gap:0.5rem; flex:1; min-width:200px; }
.wm-search { flex:1; padding:0.5rem 0.75rem; border:1px solid var(--color-border); border-radius:var(--radius-sm); font-size:var(--text-sm); font-family:var(--font-body); background:var(--color-surface); color:var(--color-text); }
.wm-search:focus { outline:none; border-color:var(--color-secondary); box-shadow:0 0 0 3px rgba(217,119,6,0.12); }
.wm-distance-row { display:flex; align-items:center; }
.wm-toggle-label { display:flex; align-items:center; gap:0.5rem; font-size:var(--text-sm); color:var(--color-text-muted); cursor:pointer; }
.wm-toggle-label input { accent-color:var(--color-secondary); width:16px; height:16px; cursor:pointer; }
.wm-svg-wrap { border:1px solid var(--color-border); border-radius:var(--radius-md); overflow:hidden; background:#fdfdfc; cursor:grab; touch-action:none; }
.wm-svg-wrap:active { cursor:grabbing; }
.wm-svg { display:block; width:100%; height:auto; }
.wm-dot { transition:r 0.15s; }
.wm-dot:hover { filter:brightness(1.1); }
.wm-distance-result { margin-top:0.75rem; padding:0.75rem 1rem; background:rgba(217,119,6,0.08); border:1px solid rgba(217,119,6,0.25); border-radius:var(--radius-sm); font-size:var(--text-sm); color:var(--color-text); }
.wm-sim-score { font-size:var(--text-xl); font-weight:700; color:var(--color-secondary); }
.wm-footnote { font-size:var(--text-xs); color:var(--color-text-light); font-style:italic; margin-top:0.75rem; }
.wm-error { color:var(--color-error); font-size:var(--text-sm); }
@media(max-width:640px){
    .wm-toolbar { flex-direction:column; align-items:stretch; }
    .wm-search-row { flex-direction:column; }
}
    `;
    document.head.appendChild(style);
}());
