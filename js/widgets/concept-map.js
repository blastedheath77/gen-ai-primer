/**
 * concept-map.js
 * Widget for Page 18 — The Big Picture Concept Map.
 * Full SVG interactive node graph with pan+zoom, trace animation,
 * path-finding between nodes, and an info panel.
 */

import { Widget } from '../core/widget-base.js';

// ── Node definitions ──────────────────────────────────────────────────────────

const PHASES = {
    1: { color: '#0d9488', label: 'Phase 1: Foundations' },
    2: { color: '#d97706', label: 'Phase 2: Architecture' },
    3: { color: '#6366f1', label: 'Phase 3: Using LLMs' },
    4: { color: '#e11d48', label: 'Phase 4: Impact' },
};

const NODES = [
    { id: 1,  label: 'Prediction',    page: 1,  phase: 1, x: 350, y: 50,
      summary: 'LLMs work by predicting the next most likely token. Every output is a sequence of predictions.' },
    { id: 2,  label: 'Tokens',        page: 2,  phase: 1, x: 200, y: 130,
      summary: 'Text is split into tokens — sub-word chunks. The model never sees raw characters, only token IDs.' },
    { id: 3,  label: 'Probability',   page: 3,  phase: 1, x: 350, y: 130,
      summary: 'Each token is assigned a probability. The model outputs a distribution over its entire vocabulary at each step.' },
    { id: 4,  label: 'Patterns',      page: 4,  phase: 1, x: 500, y: 130,
      summary: 'Models learn patterns from billions of text examples during training. These patterns encode grammar, facts, and reasoning strategies.' },
    { id: 5,  label: 'Embeddings',    page: 5,  phase: 2, x: 120, y: 210,
      summary: 'Words and tokens are represented as vectors in high-dimensional space. Semantic similarity maps to geometric proximity.' },
    { id: 6,  label: 'Context',       page: 6,  phase: 2, x: 200, y: 290,
      summary: 'The meaning of a word depends on its surrounding context. Embeddings shift based on what words appear nearby.' },
    { id: 7,  label: 'Attention',     page: 7,  phase: 2, x: 200, y: 370,
      summary: 'Attention mechanisms let the model focus on relevant parts of the input. Each token can "attend" to any other token.' },
    { id: 8,  label: 'Layers',        page: 8,  phase: 2, x: 290, y: 430,
      summary: 'Transformer models stack many attention layers. Lower layers capture syntax; higher layers capture semantics and reasoning.' },
    { id: 9,  label: 'Training',      page: 9,  phase: 2, x: 430, y: 350,
      summary: 'Training adjusts millions of parameters on vast text corpora. The model learns by predicting the next token and correcting errors.' },
    { id: 10, label: 'Temperature',   page: 10, phase: 3, x: 500, y: 210,
      summary: 'Temperature controls randomness. Low temperature = predictable; high temperature = creative and varied.' },
    { id: 11, label: 'Prompting',     page: 11, phase: 3, x: 580, y: 290,
      summary: 'Prompt design shapes model outputs. Audience, format, persona, constraints, and examples all matter.' },
    { id: 12, label: 'In-Context',    page: 12, phase: 3, x: 580, y: 370,
      summary: 'Few-shot examples in the prompt teach the model new patterns without changing its weights. More examples = better pattern matching.' },
    { id: 13, label: 'Hallucination', page: 13, phase: 3, x: 500, y: 440,
      summary: 'LLMs sometimes generate plausible-sounding but false information. This is a structural feature, not a bug to be patched away.' },
    { id: 14, label: 'Alignment',     page: 14, phase: 3, x: 400, y: 480,
      summary: 'Alignment techniques (RLHF, Constitutional AI) shape models to be helpful, harmless, and honest.' },
    { id: 15, label: 'Multimodal',    page: 15, phase: 4, x: 290, y: 490,
      summary: 'Modern models extend beyond text to images, audio, and video — generalising the token-prediction approach across modalities.' },
    { id: 16, label: 'Applications',  page: 16, phase: 4, x: 170, y: 460,
      summary: 'LLMs are deployed across education, medicine, engineering, creative work, and more — each domain with different reliability profiles.' },
    { id: 17, label: 'Limitations',   page: 17, phase: 4, x: 90,  y: 380,
      summary: 'Knowledge cutoffs, bias in training data, and failures in multi-step reasoning are structural limitations of current LLMs.' },
    { id: 18, label: 'Synthesis',     page: 18, phase: 4, x: 50,  y: 290,
      summary: 'All concepts connect: prediction → tokens → attention → training → prompting → applications → responsible use.' },
];

const EDGES = [
    { from: 1,  to: 2,  label: 'operates on' },
    { from: 1,  to: 3,  label: 'produces' },
    { from: 2,  to: 5,  label: 'become' },
    { from: 3,  to: 10, label: 'shaped by' },
    { from: 4,  to: 9,  label: 'emerge from' },
    { from: 5,  to: 6,  label: 'shift with context' },
    { from: 6,  to: 7,  label: 'computed by' },
    { from: 7,  to: 8,  label: 'stacked in' },
    { from: 8,  to: 9,  label: 'refined during' },
    { from: 1,  to: 13, label: 'can produce' },
    { from: 9,  to: 14, label: 'refined by' },
    { from: 2,  to: 15, label: 'generalise to' },
    { from: 11, to: 12, label: 'extends to' },
    { from: 10, to: 11, label: 'influences' },
    { from: 12, to: 13, label: 'risks' },
    { from: 9,  to: 16, label: 'enables' },
    { from: 14, to: 17, label: 'studied in' },
    { from: 16, to: 18, label: 'part of' },
    { from: 17, to: 18, label: 'part of' },
];

const SVG_W = 700;
const SVG_H = 530;
const NODE_R = 26;

// Build adjacency for path-finding (BFS)
function buildAdjacency() {
    const adj = {};
    NODES.forEach(n => { adj[n.id] = []; });
    EDGES.forEach(e => {
        adj[e.from].push(e.to);
        adj[e.to].push(e.from); // undirected for path finding
    });
    return adj;
}

function bfsPath(fromId, toId) {
    if (fromId === toId) return [fromId];
    const adj = buildAdjacency();
    const visited = new Set([fromId]);
    const queue = [[fromId]];
    while (queue.length) {
        const path = queue.shift();
        const cur = path[path.length - 1];
        for (const neighbour of adj[cur] || []) {
            if (!visited.has(neighbour)) {
                const newPath = [...path, neighbour];
                if (neighbour === toId) return newPath;
                visited.add(neighbour);
                queue.push(newPath);
            }
        }
    }
    return null;
}

export class ConceptMap extends Widget {
    get defaults() {
        return {};
    }

    init() {
        this.state = {
            selectedNode: null,
            glowNodes: new Set(),
            pathNodes: new Set(),
            pathMode: false,
            pathSelection: [],
            tracing: false,
        };
        this._traceTimers = [];
        this._nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));
        this.createDOM();
        this.bindEvents();
        this.render();

        // First-visit glow
        if (!localStorage.getItem('ai-primer-visited-18')) {
            localStorage.setItem('ai-primer-visited-18', 'true');
            setTimeout(() => this._celebrateFirstVisit(), 400);
        }
    }

    createDOM() {
        this.container.innerHTML = `<div class="cm-widget"></div>`;
        this.root = this.container.querySelector('.cm-widget');
    }

    bindEvents() {}

    // ── Pan + zoom state ───────────────────────────────────────────────────────

    _initPanZoom(svgEl) {
        let scale = 1, tx = 0, ty = 0;
        let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;

        const group = svgEl.querySelector('#cm-pan-group');

        const applyTransform = () => {
            group.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`);
        };

        svgEl.addEventListener('wheel', e => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            const rect = svgEl.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            tx = mouseX - delta * (mouseX - tx);
            ty = mouseY - delta * (mouseY - ty);
            scale *= delta;
            scale = Math.max(0.4, Math.min(3, scale));
            applyTransform();
        }, { passive: false });

        svgEl.addEventListener('pointerdown', e => {
            if (e.target.closest('.cm-node-group')) return;
            dragging = true;
            startX = e.clientX; startY = e.clientY;
            startTx = tx; startTy = ty;
            svgEl.setPointerCapture(e.pointerId);
        });

        svgEl.addEventListener('pointermove', e => {
            if (!dragging) return;
            tx = startTx + (e.clientX - startX);
            ty = startTy + (e.clientY - startY);
            applyTransform();
        });

        svgEl.addEventListener('pointerup', () => { dragging = false; });
    }

    // ── Rendering ──────────────────────────────────────────────────────────────

    render() {
        const { selectedNode, glowNodes, pathNodes, pathMode, pathSelection, tracing } = this.state;

        // Build edge paths
        const edgesHTML = EDGES.map(e => {
            const from = this._nodeMap[e.from];
            const to   = this._nodeMap[e.to];
            if (!from || !to) return '';
            const dx = to.x - from.x, dy = to.y - from.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / len, uy = dy / len;
            const x1 = from.x + ux * NODE_R;
            const y1 = from.y + uy * NODE_R;
            const x2 = to.x   - ux * (NODE_R + 8);
            const y2 = to.y   - uy * (NODE_R + 8);
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;

            const isPath = pathNodes.has(e.from) && pathNodes.has(e.to);
            const edgeColor = isPath ? '#6366f1' : 'rgba(156,163,175,0.4)';
            const edgeWidth = isPath ? 2.5 : 1.2;

            return `
                <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                    stroke="${edgeColor}" stroke-width="${edgeWidth}" marker-end="url(#arrowhead)"/>
                <text x="${mx}" y="${my - 4}" text-anchor="middle" class="cm-edge-label">${e.label}</text>`;
        }).join('');

        // Build nodes
        const nodesHTML = NODES.map(n => {
            const phase = PHASES[n.phase];
            const isSelected = selectedNode === n.id;
            const isGlowing = glowNodes.has(n.id);
            const isPath = pathNodes.has(n.id);
            const isPathPending = pathMode && pathSelection.includes(n.id);

            const ringR = NODE_R + 5;
            const glowR = NODE_R + 11;

            return `
                <g class="cm-node-group" data-node="${n.id}" style="cursor:pointer">
                    ${isGlowing ? `<circle cx="${n.x}" cy="${n.y}" r="${glowR}" fill="${phase.color}" opacity="0.25" class="cm-glow-ring"/>` : ''}
                    ${(isSelected || isPath || isPathPending) ? `<circle cx="${n.x}" cy="${n.y}" r="${ringR}" fill="none" stroke="${isPath ? '#6366f1' : phase.color}" stroke-width="2.5" opacity="0.7"/>` : ''}
                    <circle cx="${n.x}" cy="${n.y}" r="${NODE_R}"
                        fill="${phase.color}" opacity="${isGlowing ? '1' : '0.85'}"
                        stroke="white" stroke-width="${isSelected ? 3 : 1.5}"
                        class="cm-node-circle"/>
                    <text x="${n.x}" y="${n.y - 4}" text-anchor="middle" class="cm-node-label-main">${n.label}</text>
                    <text x="${n.x}" y="${n.y + 9}" text-anchor="middle" class="cm-node-label-page">p.${n.page}</text>
                </g>`;
        }).join('');

        // Phase legend
        const legendHTML = Object.entries(PHASES).map(([phase, cfg]) =>
            `<span class="cm-legend-item"><span class="cm-legend-dot" style="background:${cfg.color}"></span>${cfg.label}</span>`
        ).join('');

        // Info panel
        const infoPanelHTML = selectedNode
            ? (() => {
                const n = this._nodeMap[selectedNode];
                const phase = PHASES[n.phase];
                return `
                    <div class="cm-info-panel cm-info-visible" id="cm-info">
                        <button class="cm-info-close" id="cm-info-close" aria-label="Close">✕</button>
                        <div class="cm-info-badge" style="background:${phase.color}">${phase.label}</div>
                        <div class="cm-info-title">${n.label}</div>
                        <p class="cm-info-summary">${n.summary}</p>
                        <a class="cm-info-link" href="../pages/page-${String(n.page).padStart(2, '0')}.html">
                            Revisit page ${n.page} →
                        </a>
                    </div>`;
            })()
            : '';

        this.root.innerHTML = `
            <div class="cm-toolbar">
                <button class="btn btn-secondary cm-trace-btn" id="cm-trace">
                    ${tracing ? 'Stop tracing' : 'Trace the journey'}
                </button>
                <button class="cm-path-btn${pathMode ? ' cm-path-active' : ''}" id="cm-path-mode">
                    ${pathMode
                        ? (pathSelection.length === 0 ? '① Click the first concept' : pathSelection.length === 1 ? '② Now click the second concept' : 'Path found!')
                        : 'How are these connected?'}
                </button>
                ${pathMode ? `<button class="cm-path-clear" id="cm-path-clear">Clear</button>` : ''}
            </div>
            <div class="cm-legend">${legendHTML}</div>
            <div class="cm-svg-wrap" id="cm-svg-wrap">
                <svg class="cm-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}" id="cm-svg">
                    <defs>
                        <marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                            <polygon points="0 0, 7 3.5, 0 7" fill="rgba(156,163,175,0.6)"/>
                        </marker>
                    </defs>
                    <g id="cm-pan-group">
                        ${edgesHTML}
                        ${nodesHTML}
                    </g>
                </svg>
                ${infoPanelHTML}
            </div>`;

        // Pan/zoom
        this._initPanZoom(this.root.querySelector('#cm-svg'));

        // Node clicks
        this.root.querySelectorAll('.cm-node-group').forEach(g => {
            g.addEventListener('click', () => {
                const nodeId = parseInt(g.dataset.node);
                this._handleNodeClick(nodeId);
            });
        });

        // Info close
        const closeBtn = this.root.querySelector('#cm-info-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.setState({ selectedNode: null });
            });
        }

        // Trace button (start or cancel)
        const traceBtn = this.root.querySelector('#cm-trace');
        traceBtn.addEventListener('click', () => {
            if (this.state.tracing) {
                this._cancelTrace();
            } else {
                this._traceJourney();
            }
        });

        // Path mode toggle
        const pathModeBtn = this.root.querySelector('#cm-path-mode');
        pathModeBtn.addEventListener('click', () => {
            this.setState({
                pathMode: !this.state.pathMode,
                pathSelection: [],
                pathNodes: new Set(),
                selectedNode: null,
            });
        });

        // Path clear
        const pathClearBtn = this.root.querySelector('#cm-path-clear');
        if (pathClearBtn) {
            pathClearBtn.addEventListener('click', () => {
                this.setState({ pathSelection: [], pathNodes: new Set() });
            });
        }
    }

    _handleNodeClick(nodeId) {
        const { pathMode, pathSelection } = this.state;

        if (pathMode) {
            const newSelection = [...pathSelection];
            if (newSelection.includes(nodeId)) return;
            newSelection.push(nodeId);

            if (newSelection.length === 2) {
                const path = bfsPath(newSelection[0], newSelection[1]);
                const pathSet = new Set(path || []);
                this.setState({ pathSelection: newSelection, pathNodes: pathSet });
            } else {
                this.setState({ pathSelection: newSelection });
            }
            return;
        }

        this.setState({
            selectedNode: this.state.selectedNode === nodeId ? null : nodeId,
            pathNodes: new Set(),
        });
    }

    // ── Trace animation ────────────────────────────────────────────────────────

    _cancelTrace() {
        this._traceTimers.forEach(t => clearTimeout(t));
        this._traceTimers = [];
        this.setState({ tracing: false });
    }

    _traceJourney() {
        if (this.state.tracing) return;
        this._traceTimers = [];
        this.setState({ tracing: true, glowNodes: new Set(), selectedNode: null, pathNodes: new Set() });

        NODES.forEach((node, i) => {
            const timer = setTimeout(() => {
                if (!this.state.tracing) return; // cancelled
                const newGlow = new Set(this.state.glowNodes);
                newGlow.add(node.id);
                const isLast = i === NODES.length - 1;
                this.state.glowNodes = newGlow;
                this._pulseNode(node.id);

                if (isLast) {
                    const endTimer = setTimeout(() => {
                        this.setState({ tracing: false });
                    }, 800);
                    this._traceTimers.push(endTimer);
                } else {
                    this._updateNodeGlow(node.id, true);
                }
            }, i * 300);
            this._traceTimers.push(timer);
        });
    }

    _pulseNode(nodeId) {
        const node = this._nodeMap[nodeId];
        if (!node) return;
        const circle = this.root.querySelector(`[data-node="${nodeId}"] .cm-node-circle`);
        if (!circle) return;
        circle.style.transform = `scale(1.3)`;
        circle.style.transformOrigin = `${node.x}px ${node.y}px`;
        circle.style.transition = 'transform 200ms ease';
        setTimeout(() => {
            circle.style.transform = 'scale(1)';
        }, 200);

        // Add glow ring dynamically
        const group = this.root.querySelector(`[data-node="${nodeId}"]`);
        if (!group) return;
        const existingGlow = group.querySelector('.cm-glow-ring');
        if (!existingGlow) {
            const phase = PHASES[node.phase];
            const glowEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            glowEl.setAttribute('cx', node.x);
            glowEl.setAttribute('cy', node.y);
            glowEl.setAttribute('r', NODE_R + 11);
            glowEl.setAttribute('fill', phase.color);
            glowEl.setAttribute('opacity', '0.25');
            glowEl.classList.add('cm-glow-ring');
            group.prepend(glowEl);
        }
    }

    _updateNodeGlow(nodeId, on) {
        const node = this._nodeMap[nodeId];
        if (!node) return;
        const group = this.root.querySelector(`[data-node="${nodeId}"]`);
        if (!group) return;
        if (on) {
            const existingGlow = group.querySelector('.cm-glow-ring');
            if (!existingGlow) {
                const phase = PHASES[node.phase];
                const glowEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                glowEl.setAttribute('cx', node.x);
                glowEl.setAttribute('cy', node.y);
                glowEl.setAttribute('r', NODE_R + 11);
                glowEl.setAttribute('fill', phase.color);
                glowEl.setAttribute('opacity', '0.25');
                glowEl.classList.add('cm-glow-ring');
                group.prepend(glowEl);
            }
        }
    }

    _celebrateFirstVisit() {
        // Light up all nodes briefly with a staggered glow
        NODES.forEach((node, i) => {
            setTimeout(() => {
                this._updateNodeGlow(node.id, true);
            }, i * 80);
        });
    }

    destroy() {
        this._traceTimers.forEach(t => clearTimeout(t));
        super.destroy();
    }
}

// ─── Inline styles ────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('cm-styles')) return;
    const style = document.createElement('style');
    style.id = 'cm-styles';
    style.textContent = `
.cm-widget { font-family:var(--font-body); position:relative; }
.cm-toolbar { display:flex; align-items:center; gap:0.625rem; margin-bottom:0.75rem; flex-wrap:wrap; }
.cm-trace-btn { white-space:nowrap; }
.cm-path-btn { padding:0.375rem 0.875rem; border-radius:var(--radius-full); border:1px dashed var(--color-border); background:none; color:var(--color-text-muted); font-size:var(--text-sm); cursor:pointer; transition:all 150ms; font-family:var(--font-body); }
.cm-path-btn:hover { border-color:var(--color-primary); color:var(--color-primary); }
.cm-path-active { border-color:#6366f1; color:#6366f1; background:rgba(99,102,241,0.08); }
.cm-path-clear { padding:0.375rem 0.625rem; border-radius:var(--radius-full); border:1px solid var(--color-border); background:none; color:var(--color-text-muted); font-size:var(--text-sm); cursor:pointer; font-family:var(--font-body); }
.cm-legend { display:flex; flex-wrap:wrap; gap:0.625rem; margin-bottom:0.75rem; }
.cm-legend-item { display:flex; align-items:center; gap:0.375rem; font-size:var(--text-xs); color:var(--color-text-muted); }
.cm-legend-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.cm-svg-wrap { position:relative; overflow:hidden; border-radius:var(--radius-md); border:1px solid var(--color-border); background:var(--color-surface-2); }
.cm-svg { max-width:100%; height:auto; display:block; touch-action:none; }
.cm-node-group { transition:opacity 150ms; }
.cm-node-group:hover .cm-node-circle { filter:brightness(1.15); }
.cm-node-label-main { font-size:11.5px; font-weight:700; fill:white; font-family:var(--font-body); pointer-events:none; }
.cm-node-label-page { font-size:9.5px; fill:rgba(255,255,255,0.8); font-family:var(--font-body); pointer-events:none; }
.cm-edge-label { font-size:8px; fill:rgba(156,163,175,0.7); font-family:var(--font-body); pointer-events:none; }
.cm-glow-ring { pointer-events:none; }
.cm-node-circle { transition:transform 200ms ease; }

/* Info panel */
.cm-info-panel { position:absolute; top:0.75rem; right:0.75rem; width:220px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:1rem; box-shadow:0 4px 20px rgba(0,0,0,0.12); z-index:10; opacity:0; pointer-events:none; transform:translateX(12px); transition:opacity 250ms, transform 250ms; }
.cm-info-visible { opacity:1; pointer-events:all; transform:translateX(0); }
.cm-info-close { position:absolute; top:0.5rem; right:0.5rem; background:none; border:none; color:var(--color-text-muted); cursor:pointer; font-size:0.875rem; padding:0.25rem; line-height:1; }
.cm-info-badge { display:inline-block; font-size:var(--text-xs); font-weight:600; color:white; padding:0.125rem 0.5rem; border-radius:var(--radius-full); margin-bottom:0.5rem; }
.cm-info-title { font-size:var(--text-base); font-weight:700; color:var(--color-text); margin-bottom:0.5rem; }
.cm-info-summary { font-size:var(--text-sm); color:var(--color-text-muted); line-height:1.6; margin-bottom:0.75rem; }
.cm-info-link { font-size:var(--text-sm); color:var(--color-primary); text-decoration:none; font-weight:500; }
.cm-info-link:hover { text-decoration:underline; }
    `;
    document.head.appendChild(style);
}());
