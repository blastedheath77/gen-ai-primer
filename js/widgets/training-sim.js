/**
 * training-sim.js
 * Simulates LLM training progression from random noise to coherent text.
 * Includes: batch counter, learning curve SVG, scale-jump buttons,
 * milestone reflection panel.
 */

import { Widget } from '../core/widget-base.js';

const SCALE_JUMPS = [
    { label: '1K',  value: 1_000 },
    { label: '100K', value: 100_000 },
    { label: '1M',  value: 1_000_000 },
    { label: '1B',  value: 1_000_000_000 },
];

const MAX_DISPLAY_BATCHES = 50;

export class TrainingSim extends Widget {
    get defaults() {
        return { dataUrl: '../js/data/training-progression.json' };
    }

    async init() {
        this.data            = null;
        this.autoTrainTimer  = null;
        this.state = {
            batches:        0,
            promptIdx:      0,
            showScale:      false,
            scaleLabel:     '',
            scaleMsg:       '',
            scaleAnimating: false,
            displayBatches: 0,
        };
        try {
            const res   = await fetch(this.config.dataUrl);
            this.data   = await res.json();
        } catch (e) {
            this.container.innerHTML = '<p style="color:var(--color-error);padding:1rem">Failed to load training data.</p>';
            return;
        }
        this.createDOM();
        this.bindEvents();
        this.render();
    }

    createDOM() {
        this.container.innerHTML = `
            <div class="ts-layout">
                <div class="ts-left">
                    <h3 class="widget-title" style="font-size:var(--text-base)">Training controls</h3>
                    <button class="btn btn-primary ts-train-btn" id="ts-train">Train</button>
                    <p class="widget-hint" style="margin-top:0.375rem;text-align:left">Click once or hold to auto-train</p>
                    <div class="ts-counter" style="margin-top:0.5rem;font-size:var(--text-sm);color:var(--color-text-muted)">
                        Batches trained: <strong class="ts-batch-num">0</strong>
                    </div>
                    <div class="ts-progress-wrap" style="margin-top:0.5rem">
                        <div class="ts-progress-track" style="height:8px;background:var(--color-surface-2);border-radius:var(--radius-full);overflow:hidden">
                            <div class="ts-progress-fill" style="height:100%;width:0%;background:var(--color-secondary);border-radius:var(--radius-full);transition:width 0.3s ease"></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-top:0.2rem;font-size:var(--text-xs);color:var(--color-text-light)">
                            <span>0</span><span>50</span>
                        </div>
                    </div>
                    <div class="ts-scale-btns" style="margin-top:1rem">
                        <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:0.4rem;font-weight:500">Jump to scale:</div>
                        <div style="display:flex;flex-wrap:wrap;gap:0.4rem">
                            ${SCALE_JUMPS.map(s => `<button class="btn btn-secondary ts-scale" data-value="${s.value}" data-label="${s.label}" style="font-size:var(--text-xs);padding:0.3rem 0.7rem">${s.label}</button>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="ts-right">
                    <div class="ts-prompt-tabs tab-bar" role="tablist"></div>
                    <div class="ts-prompt-text card" style="font-style:italic;color:var(--color-text-muted);font-size:var(--text-sm);margin-bottom:0.75rem"></div>
                    <div class="ts-output card" style="min-height:100px;font-size:var(--text-sm);line-height:var(--leading-relaxed);white-space:pre-wrap"></div>
                </div>
            </div>
            <div class="ts-scale-panel" style="display:none;margin-top:1.5rem;background:var(--color-secondary-light);border-left:4px solid var(--color-secondary);border-radius:var(--radius-md);padding:1rem 1.25rem">
                <strong class="ts-scale-heading" style="color:var(--color-secondary)"></strong>
                <p class="ts-scale-msg" style="margin-top:0.4rem;font-size:var(--text-sm);line-height:var(--leading-relaxed)"></p>
            </div>
            <div style="margin-top:1.5rem">
                <svg class="ts-curve" width="100%" height="140" style="overflow:visible" aria-label="Learning curve"></svg>
            </div>
        `;

        this.trainBtn       = this.container.querySelector('#ts-train');
        this.batchNum       = this.container.querySelector('.ts-batch-num');
        this.progressFill   = this.container.querySelector('.ts-progress-fill');
        this.promptTabs     = this.container.querySelector('.ts-prompt-tabs');
        this.promptText     = this.container.querySelector('.ts-prompt-text');
        this.outputEl       = this.container.querySelector('.ts-output');
        this.scalePanel     = this.container.querySelector('.ts-scale-panel');
        this.scaleHeading   = this.container.querySelector('.ts-scale-heading');
        this.scaleMsgEl     = this.container.querySelector('.ts-scale-msg');
        this.curveEl        = this.container.querySelector('.ts-curve');
        this._injectStyles();
    }

    _injectStyles() {
        if (document.getElementById('ts-styles')) return;
        const s = document.createElement('style');
        s.id = 'ts-styles';
        s.textContent = `
            .ts-layout {
                display: grid;
                grid-template-columns: 220px 1fr;
                gap: 1.5rem;
            }
            @media (max-width: 640px) {
                .ts-layout { grid-template-columns: 1fr; }
            }
            .ts-output {
                transition: opacity 0.25s ease;
            }
        `;
        document.head.appendChild(s);
    }

    bindEvents() {
        // Train button (click = +1, hold = auto)
        this.trainBtn.addEventListener('click', () => this._trainBatch());

        this.trainBtn.addEventListener('mousedown', () => this._startAutoTrain());
        this.trainBtn.addEventListener('mouseup',   () => this._stopAutoTrain());
        this.trainBtn.addEventListener('mouseleave',() => this._stopAutoTrain());
        this.trainBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this._startAutoTrain(); });
        this.trainBtn.addEventListener('touchend',   () => this._stopAutoTrain());

        // Scale jump buttons
        this.container.querySelectorAll('.ts-scale').forEach(btn => {
            btn.addEventListener('click', () => {
                const val   = parseInt(btn.dataset.value, 10);
                const label = btn.dataset.label;
                this._jumpToScale(val, label);
            });
        });

        // Prompt tabs
        this.promptTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('[data-prompt]');
            if (!tab) return;
            this.setState({ promptIdx: parseInt(tab.dataset.prompt, 10) });
        });

    }

    _trainBatch() {
        if (this.state.batches >= MAX_DISPLAY_BATCHES) return;
        this.setState({ batches: this.state.batches + 1, displayBatches: this.state.batches + 1 });
    }

    _startAutoTrain() {
        if (this.autoTrainTimer) return;
        this.autoTrainTimer = setInterval(() => {
            if (this.state.batches >= MAX_DISPLAY_BATCHES) {
                this._stopAutoTrain();
                return;
            }
            this._trainBatch();
        }, 250);
    }

    _stopAutoTrain() {
        if (this.autoTrainTimer) {
            clearInterval(this.autoTrainTimer);
            this.autoTrainTimer = null;
        }
    }

    _jumpToScale(value, label) {
        const comp = this.data.scaleComparisons[String(value)];
        this.setState({
            batches:        MAX_DISPLAY_BATCHES,
            displayBatches: value,
            showScale:      true,
            scaleLabel:     label + ' batches',
            scaleMsg:       comp || '',
            scaleAnimating: true,
        });
        // Animated counter
        this._animateCounter(value);
    }

    _animateCounter(target) {
        const duration = 1200;
        const start    = performance.now();
        const initial  = this.state.batches;
        const el       = this.batchNum;

        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            const current = Math.round(initial + (target - initial) * eased);
            el.textContent = current.toLocaleString();
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = target.toLocaleString();
        };
        requestAnimationFrame(tick);
    }

    _getStageForBatches(n) {
        const stages = this.data.stages;
        let best = stages[0];
        for (const stage of stages) {
            if (n >= stage.batchRange[0]) best = stage;
        }
        return best;
    }

    render() {
        if (!this.data) return;
        const { batches, displayBatches, promptIdx, showScale, scaleLabel, scaleMsg } = this.state;
        const prompts = this.data.prompts;

        // Tabs
        this.promptTabs.innerHTML = prompts
            .map((p, i) => `<button class="tab${i === promptIdx ? ' active' : ''}" data-prompt="${i}" role="tab">${p.label}</button>`)
            .join('');

        const prompt = prompts[promptIdx];
        this.promptText.textContent = prompt.text;

        // Output
        const stage = this._getStageForBatches(batches);
        const response = stage.responses[prompt.type] || '';
        this.outputEl.style.opacity = '0';
        requestAnimationFrame(() => {
            this.outputEl.textContent = response;
            this.outputEl.style.opacity = '1';
        });

        // Progress bar (0-50 only)
        const pct = Math.min(batches, MAX_DISPLAY_BATCHES) / MAX_DISPLAY_BATCHES * 100;
        this.progressFill.style.width = pct + '%';

        // Batch counter
        if (!this.state.scaleAnimating) {
            this.batchNum.textContent = displayBatches.toLocaleString();
        }

        // Scale comparison panel
        if (showScale) {
            this.scalePanel.style.display = 'block';
            this.scaleHeading.textContent = `At ${scaleLabel}:`;
            this.scaleMsgEl.textContent = scaleMsg;
        }

        // Learning curve
        this._renderCurve(batches);

        // Disable train button at max
        this.trainBtn.disabled = batches >= MAX_DISPLAY_BATCHES;
    }

    _renderCurve(batches) {
        const W = this.curveEl.clientWidth || 600;
        const H = 140;
        const padL = 40, padR = 16, padT = 12, padB = 30;
        const innerW = W - padL - padR;
        const innerH = H - padT - padB;

        // Build quality data points from stages
        const stages = this.data.stages;
        const points = [];
        for (const stage of stages) {
            const b = stage.batchRange[1];
            if (b > MAX_DISPLAY_BATCHES) break;
            points.push({ b, q: stage.qualityScore });
        }
        // Insert 0
        points.unshift({ b: 0, q: 2 });

        const toX = (b) => padL + (b / MAX_DISPLAY_BATCHES) * innerW;
        const toY = (q) => padT + innerH - (q / 100) * innerH;

        let pathD = '';
        points.forEach((pt, i) => {
            const x = toX(pt.b);
            const y = toY(pt.q);
            pathD += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        });

        // Clip to current batches
        const clipX = toX(batches);

        this.curveEl.innerHTML = `
            <defs>
                <clipPath id="ts-clip">
                    <rect x="${padL}" y="${padT}" width="${clipX - padL}" height="${innerH}"/>
                </clipPath>
            </defs>
            <!-- Grid lines -->
            <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" stroke="var(--color-border)" stroke-width="1"/>
            <line x1="${padL}" y1="${padT + innerH}" x2="${padL + innerW}" y2="${padT + innerH}" stroke="var(--color-border)" stroke-width="1"/>
            <!-- Y labels -->
            <text x="${padL - 6}" y="${padT + 4}" text-anchor="end" fill="var(--color-text-muted)" font-size="11">100</text>
            <text x="${padL - 6}" y="${padT + innerH / 2 + 4}" text-anchor="end" fill="var(--color-text-muted)" font-size="11">50</text>
            <text x="${padL - 6}" y="${padT + innerH + 4}" text-anchor="end" fill="var(--color-text-muted)" font-size="11">0</text>
            <!-- X labels -->
            <text x="${padL}" y="${H - 4}" text-anchor="middle" fill="var(--color-text-muted)" font-size="11">0</text>
            <text x="${padL + innerW}" y="${H - 4}" text-anchor="middle" fill="var(--color-text-muted)" font-size="11">50</text>
            <text x="${padL + innerW / 2}" y="${H}" text-anchor="middle" fill="var(--color-text-muted)" font-size="10">Batches trained</text>
            <!-- Full path (muted) -->
            <path d="${pathD}" fill="none" stroke="var(--color-border)" stroke-width="2" stroke-dasharray="4 2"/>
            <!-- Revealed path -->
            <path d="${pathD}" fill="none" stroke="var(--color-secondary)" stroke-width="2.5" clip-path="url(#ts-clip)" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- Quality label -->
            <text x="${padL - 6}" y="${padT - 4}" fill="var(--color-text-muted)" font-size="10" transform="rotate(-90,${padL - 22},${padT + innerH / 2})" text-anchor="middle">Quality</text>
        `;
    }
}
