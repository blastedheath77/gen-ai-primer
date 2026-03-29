/**
 * feedback-loop.js
 * Widget for Page 14 — Alignment: Steering the Model
 * Learners compare raw vs aligned responses and observe cumulative model behaviour.
 */

import { Widget } from '../core/widget-base.js';

// ─── Inline styles ────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('fl-styles')) return;
    const s = document.createElement('style');
    s.id = 'fl-styles';
    s.textContent = `
.fl-widget { font-family:var(--font-body); }
.fl-loading, .fl-error { color:var(--color-text-muted); font-size:var(--text-sm); padding:1rem; }
.fl-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem; }
.fl-round-counter { font-size:var(--text-sm); color:var(--color-text-muted); font-weight:500; }
.fl-theme-badge { font-size:var(--text-xs); font-weight:600; padding:0.2rem 0.625rem; border-radius:var(--radius-full); background:rgba(99,102,241,0.1); color:#6366f1; text-transform:uppercase; letter-spacing:0.05em; }
.fl-prompt-box { background:var(--color-surface-2); border-radius:var(--radius-md); padding:0.875rem 1.25rem; margin-bottom:1.25rem; display:flex; flex-direction:column; gap:0.25rem; }
.fl-prompt-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); font-weight:600; }
.fl-prompt-text { font-size:var(--text-base); color:var(--color-text); line-height:var(--leading-relaxed); }
.fl-comparison { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem; }
@media(max-width:640px) { .fl-comparison { grid-template-columns:1fr; } }
.fl-response-card { background:var(--color-surface); border:2px solid var(--color-border); border-radius:var(--radius-md); padding:1rem; transition:border-color 200ms, box-shadow 200ms; }
.fl-card--selected { border-color:var(--color-tertiary); box-shadow:0 0 0 3px rgba(99,102,241,0.15); }
.fl-card--better { border-color:var(--color-success); }
.fl-card--worse { border-color:var(--color-border); opacity:0.7; }
.fl-card-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); font-weight:600; margin-bottom:0.5rem; }
.fl-card-text { font-size:var(--text-sm); line-height:var(--leading-relaxed); color:var(--color-text); }
.fl-card-verdict { margin-top:0.75rem; font-size:var(--text-sm); font-weight:500; }
.fl-verdict-good { color:var(--color-success); }
.fl-verdict-neutral { color:var(--color-text-muted); }
.fl-choice-row { display:flex; align-items:center; gap:0.625rem; margin-bottom:1rem; flex-wrap:wrap; }
.fl-choice-label { font-size:var(--text-sm); color:var(--color-text-muted); font-weight:500; }
.fl-choice-btn { font-size:var(--text-sm); }
.fl-explanation { background:var(--color-surface-2); border-radius:var(--radius-md); padding:1rem; margin-bottom:1rem; }
.fl-explanation-text { font-size:var(--text-sm); color:var(--color-text-muted); line-height:var(--leading-relaxed); }
.fl-graph-section { margin-bottom:1rem; }
.fl-graph-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); font-weight:600; margin-bottom:0.5rem; }
.fl-graph { max-width:100%; height:auto; }
.fl-graph-axis-label { font-size:10px; fill:var(--color-text-light); font-family:var(--font-body); }
.fl-actions { display:flex; gap:0.75rem; margin-bottom:1rem; }
.fl-reflect-section { border-top:1px solid var(--color-border); margin-top:1rem; padding-top:1rem; }
.fl-reflect-toggle { display:inline-flex; align-items:center; gap:0.5rem; border:none; background:transparent; color:var(--color-tertiary); font-family:var(--font-body); font-size:var(--text-sm); font-weight:500; cursor:pointer; padding:0.25rem 0; }
.fl-reflect-toggle:hover { opacity:0.75; }
.fl-reflect-toggle .toggle-arrow { display:inline-block; transition:transform 0.2s ease; }
.fl-reflect-content { max-height:0; overflow:hidden; transition:max-height 0.3s ease; }
.fl-reflect-content--open { max-height:600px; }
.fl-reflect-content p { margin-top:0.75rem; font-size:var(--text-sm); color:var(--color-text-muted); line-height:var(--leading-relaxed); }
.fl-summary-panel { padding:1.5rem; }
.fl-summary-title { font-size:var(--text-xl); font-weight:600; margin-bottom:1rem; text-align:center; }
.fl-summary-stats { display:flex; justify-content:center; gap:2rem; margin-bottom:1.5rem; flex-wrap:wrap; }
.fl-summary-stat { display:flex; flex-direction:column; align-items:center; }
.fl-summary-num { font-size:var(--text-2xl); font-weight:700; color:var(--color-text); }
.fl-summary-label { font-size:var(--text-xs); color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.05em; }
.fl-summary-reveal { background:var(--color-surface-2); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.25rem; }
.fl-summary-reveal h4 { font-size:var(--text-sm); font-weight:600; margin-bottom:0.5rem; }
.fl-reveal-row { display:flex; align-items:center; gap:0.75rem; padding:0.375rem 0; font-size:var(--text-sm); }
.fl-reveal-theme { font-weight:600; color:var(--color-text); min-width:80px; }
.fl-reveal-detail { color:var(--color-text-muted); }
.fl-summary-rlhf { background:var(--color-tertiary-light); border-left:4px solid var(--color-tertiary); border-radius:var(--radius-md); padding:1rem 1.25rem; }
.fl-summary-rlhf h4 { font-size:var(--text-sm); font-weight:600; color:var(--color-tertiary); margin-bottom:0.5rem; }
.fl-summary-rlhf p { font-size:var(--text-sm); color:var(--color-text); line-height:var(--leading-relaxed); margin-bottom:0.5rem; }
.fl-summary-rlhf p:last-child { margin-bottom:0; }
    `;
    document.head.appendChild(s);
}());

export class FeedbackLoop extends Widget {
    get defaults() {
        return {
            dataPath: '../js/data/alignment-scenarios.json',
        };
    }

    async init() {
        this.state = {
            scenarios: null,
            currentScenario: 0,
            choice: null,       // 'A' | 'B' | 'equal' | null
            revealed: false,
            history: [],        // array of { scenarioId, choice, correctChoice }
            phase: 'playing',   // 'playing' | 'revealed' | 'summary'
            graphPoints: [50],  // helpfulness score 0-100, starts at 50
        };

        this.container.innerHTML = `<div class="fl-loading">Loading scenarios…</div>`;

        try {
            const res = await fetch(this.config.dataPath);
            this.state.scenarios = await res.json();
        } catch (e) {
            this.container.innerHTML = `<div class="fl-error">Could not load scenario data.</div>`;
            return;
        }

        this.createDOM();
        this.bindEvents();
        this.render();
    }

    createDOM() {
        this.container.innerHTML = `
<div class="fl-widget">
    <div class="fl-header">
        <div class="fl-round-counter" id="fl-round-counter">Scenario 1 of 6</div>
        <div class="fl-theme-badge" id="fl-theme-badge"></div>
    </div>

    <div class="fl-prompt-box" id="fl-prompt-box"></div>

    <div class="fl-comparison" id="fl-comparison">
        <div class="fl-response-card" id="fl-card-a" data-choice="A">
            <div class="fl-card-label">Response A</div>
            <div class="fl-card-text" id="fl-text-a"></div>
            <div class="fl-card-verdict" id="fl-verdict-a" style="display:none"></div>
        </div>
        <div class="fl-response-card" id="fl-card-b" data-choice="B">
            <div class="fl-card-label">Response B</div>
            <div class="fl-card-text" id="fl-text-b"></div>
            <div class="fl-card-verdict" id="fl-verdict-b" style="display:none"></div>
        </div>
    </div>

    <div class="fl-choice-row" id="fl-choice-row">
        <span class="fl-choice-label">Which is better?</span>
        <button class="btn fl-choice-btn" id="fl-choose-a" data-choice="A">Choose A</button>
        <button class="btn fl-choice-btn" id="fl-choose-equal" data-choice="equal">About equal</button>
        <button class="btn fl-choice-btn" id="fl-choose-b" data-choice="B">Choose B</button>
    </div>

    <div class="fl-explanation" id="fl-explanation" style="display:none"></div>

    <div class="fl-graph-section">
        <div class="fl-graph-label">Model behaviour over time <span style="font-weight:400;color:var(--color-text-light)">(starts at 50 — neutral baseline)</span></div>
        <svg class="fl-graph" id="fl-graph" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet" aria-label="Helpfulness and safety score trend">
            <defs>
                <linearGradient id="fl-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#6366f1" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#6366f1" stop-opacity="0.02"/>
                </linearGradient>
            </defs>
            <text x="2" y="12" class="fl-graph-axis-label">High</text>
            <text x="2" y="112" class="fl-graph-axis-label">Low</text>
            <line x1="30" y1="8" x2="30" y2="108" stroke="#e5e2db" stroke-width="1"/>
            <line x1="30" y1="108" x2="395" y2="108" stroke="#e5e2db" stroke-width="1"/>
            <line x1="30" y1="58" x2="395" y2="58" stroke="#e5e2db" stroke-width="1" stroke-dasharray="4 4"/>
            <path id="fl-graph-area" fill="url(#fl-grad)"/>
            <path id="fl-graph-line" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </div>

    <div class="fl-actions" id="fl-actions" style="display:none">
        <button class="btn btn-primary" id="fl-next-btn">Next Scenario →</button>
    </div>

    <div class="fl-reflect-section">
        <div class="fl-reflect-toggle" id="fl-reflect-toggle">
            <span class="toggle-arrow">▶</span> Pause and reflect
        </div>
        <div class="fl-reflect-content" id="fl-reflect-content">
            <p><strong>Why might an aligned model refuse a request that a raw model would answer?</strong></p>
            <p>A raw model simply predicts the most statistically likely continuation of the prompt. If training data contains instructions for something dangerous, the raw model may produce them — not because it "wants to", but because that's what typically follows in the data.</p>
            <p>An aligned model has been trained with an additional objective: to produce outputs that humans rate as helpful, honest, and harmless. When it declines a request, it's not following a hardcoded rule — it has learned to assign low reward to producing that content. However, this also means over-refusal is possible: the model may decline legitimate requests if similar-looking requests have been associated with negative feedback during training.</p>
        </div>
    </div>

    <div class="fl-summary" id="fl-summary" style="display:none"></div>
</div>`;

        this._els = {
            roundCounter:  this.container.querySelector('#fl-round-counter'),
            themeBadge:    this.container.querySelector('#fl-theme-badge'),
            promptBox:     this.container.querySelector('#fl-prompt-box'),
            cardA:         this.container.querySelector('#fl-card-a'),
            cardB:         this.container.querySelector('#fl-card-b'),
            textA:         this.container.querySelector('#fl-text-a'),
            textB:         this.container.querySelector('#fl-text-b'),
            verdictA:      this.container.querySelector('#fl-verdict-a'),
            verdictB:      this.container.querySelector('#fl-verdict-b'),
            choiceRow:     this.container.querySelector('#fl-choice-row'),
            chooseA:       this.container.querySelector('#fl-choose-a'),
            chooseEqual:   this.container.querySelector('#fl-choose-equal'),
            chooseB:       this.container.querySelector('#fl-choose-b'),
            explanation:   this.container.querySelector('#fl-explanation'),
            graphLine:     this.container.querySelector('#fl-graph-line'),
            graphArea:     this.container.querySelector('#fl-graph-area'),
            actions:       this.container.querySelector('#fl-actions'),
            nextBtn:       this.container.querySelector('#fl-next-btn'),
            reflectToggle: this.container.querySelector('#fl-reflect-toggle'),
            reflectContent:this.container.querySelector('#fl-reflect-content'),
            summary:       this.container.querySelector('#fl-summary'),
        };
    }

    bindEvents() {
        [this._els.chooseA, this._els.chooseEqual, this._els.chooseB].forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.state.revealed) return;
                this._handleChoice(btn.dataset.choice);
            });
        });

        this._els.nextBtn.addEventListener('click', () => this._handleNext());

        this._els.reflectToggle.addEventListener('click', () => {
            this._els.reflectContent.classList.toggle('fl-reflect-content--open');
            const isOpen = this._els.reflectContent.classList.contains('fl-reflect-content--open');
            this._els.reflectToggle.querySelector('.toggle-arrow').style.transform = isOpen ? 'rotate(90deg)' : '';
        });
    }

    _currentScenario() {
        return this.state.scenarios[this.state.currentScenario];
    }

    _handleChoice(choice) {
        const scenario = this._currentScenario();
        const betterResponse = scenario.responses.find(r => r.better);
        const correctChoice = betterResponse ? betterResponse.id : 'equal';

        // Update graph: correct choice → +15, equal → +5, wrong → -10
        let delta = 0;
        if (choice === correctChoice) delta = 15;
        else if (choice === 'equal') delta = 5;
        else delta = -10;

        const lastPoint = this.state.graphPoints[this.state.graphPoints.length - 1];
        const newPoint = Math.max(5, Math.min(95, lastPoint + delta));

        this.setState({
            choice,
            revealed: true,
            graphPoints: [...this.state.graphPoints, newPoint],
            history: [...this.state.history, { scenarioId: scenario.id, choice, correctChoice }],
        });
    }

    _handleNext() {
        const total = this.state.scenarios.length;
        if (this.state.currentScenario >= total - 1) {
            this.setState({ phase: 'summary' });
        } else {
            this.setState({
                currentScenario: this.state.currentScenario + 1,
                choice: null,
                revealed: false,
                phase: 'playing',
            });
        }
    }

    render() {
        if (!this.state.scenarios) return;

        if (this.state.phase === 'summary') {
            this._renderSummary();
            return;
        }

        const scenario = this._currentScenario();
        const total = this.state.scenarios.length;

        this._els.roundCounter.textContent = `Scenario ${this.state.currentScenario + 1} of ${total}`;
        this._els.themeBadge.textContent = scenario.theme;

        this._els.promptBox.innerHTML = `<span class="fl-prompt-label">Prompt</span><span class="fl-prompt-text">${scenario.prompt}</span>`;

        const rA = scenario.responses[0];
        const rB = scenario.responses[1];
        this._els.textA.textContent = rA.text;
        this._els.textB.textContent = rB.text;

        // Reset card states
        this._els.cardA.classList.remove('fl-card--selected', 'fl-card--better', 'fl-card--worse');
        this._els.cardB.classList.remove('fl-card--selected', 'fl-card--better', 'fl-card--worse');
        this._els.verdictA.style.display = 'none';
        this._els.verdictB.style.display = 'none';
        this._els.explanation.style.display = 'none';
        this._els.actions.style.display = 'none';

        // Disable choice buttons once revealed
        this._els.chooseA.disabled = this.state.revealed;
        this._els.chooseEqual.disabled = this.state.revealed;
        this._els.chooseB.disabled = this.state.revealed;

        if (this.state.revealed) {
            const { choice } = this.state;

            if (choice === 'A') this._els.cardA.classList.add('fl-card--selected');
            if (choice === 'B') this._els.cardB.classList.add('fl-card--selected');

            if (rA.better) {
                this._els.cardA.classList.add('fl-card--better');
                this._els.cardB.classList.add('fl-card--worse');
                this._els.verdictA.innerHTML = `<span class="fl-verdict-good">✓ Better response (${rA.type})</span>`;
                this._els.verdictB.innerHTML = `<span class="fl-verdict-neutral">This is the ${rB.type} response</span>`;
            } else if (rB.better) {
                this._els.cardB.classList.add('fl-card--better');
                this._els.cardA.classList.add('fl-card--worse');
                this._els.verdictB.innerHTML = `<span class="fl-verdict-good">✓ Better response (${rB.type})</span>`;
                this._els.verdictA.innerHTML = `<span class="fl-verdict-neutral">This is the ${rA.type} response</span>`;
            } else {
                this._els.verdictA.innerHTML = `<span class="fl-verdict-neutral">${rA.type}</span>`;
                this._els.verdictB.innerHTML = `<span class="fl-verdict-neutral">${rB.type}</span>`;
            }

            this._els.verdictA.style.display = 'block';
            this._els.verdictB.style.display = 'block';

            this._els.explanation.innerHTML = `<div class="fl-explanation-text">${scenario.betterExplanation}</div>`;
            this._els.explanation.style.display = 'block';
            this._els.actions.style.display = 'flex';

            const isLast = this.state.currentScenario >= this.state.scenarios.length - 1;
            this._els.nextBtn.textContent = isLast ? 'See Summary →' : 'Next Scenario →';
        }

        this._renderGraph();
    }

    _renderGraph() {
        const points = this.state.graphPoints;
        const W = 370, H = 100, LEFT = 30, TOP = 8;

        if (points.length < 2) {
            const x = LEFT;
            const y = TOP + H - (points[0] / 100) * H;
            this._els.graphLine.setAttribute('d', `M${x},${y}`);
            this._els.graphArea.setAttribute('d', '');
            return;
        }

        const step = W / Math.max(points.length - 1, 1);
        const coords = points.map((p, i) => ({
            x: LEFT + i * step,
            y: TOP + H - (p / 100) * H,
        }));

        const lineD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
        const areaD = lineD + ` L${coords[coords.length - 1].x.toFixed(1)},${(TOP + H).toFixed(1)} L${LEFT},${(TOP + H).toFixed(1)} Z`;

        this._els.graphLine.setAttribute('d', lineD);
        this._els.graphArea.setAttribute('d', areaD);
    }

    _renderSummary() {
        const { history, scenarios, graphPoints } = this.state;
        const correct = history.filter(h => h.choice === h.correctChoice).length;
        const total = history.length;
        const finalScore = graphPoints[graphPoints.length - 1];

        const rawResponses = scenarios.flatMap(s => s.responses.filter(r => r.type === 'raw'));

        this._els.summary.innerHTML = `
<div class="fl-summary-panel">
    <h3 class="fl-summary-title">Summary: Your Training Run</h3>
    <div class="fl-summary-stats">
        <div class="fl-summary-stat">
            <span class="fl-summary-num">${correct}/${total}</span>
            <span class="fl-summary-label">Correct choices</span>
        </div>
        <div class="fl-summary-stat">
            <span class="fl-summary-num" style="color:${finalScore >= 60 ? 'var(--color-success)' : finalScore >= 40 ? 'var(--color-warning)' : 'var(--color-error)'}">${Math.round(finalScore)}</span>
            <span class="fl-summary-label">Final behaviour score</span>
        </div>
    </div>

    <div class="fl-summary-reveal">
        <h4>Which was raw vs aligned?</h4>
        ${scenarios.map(s => {
            const raw = s.responses.find(r => r.type === 'raw');
            const aligned = s.responses.find(r => r.type === 'aligned');
            return `<div class="fl-reveal-row">
                <span class="fl-reveal-theme">${s.theme}</span>
                <span class="fl-reveal-detail">Response ${raw?.id} was raw — Response ${aligned?.id} was aligned</span>
            </div>`;
        }).join('')}
    </div>

    <div class="fl-summary-rlhf">
        <h4>How RLHF works</h4>
        <p>Reinforcement Learning from Human Feedback (RLHF) is the process you just simulated. Human raters compare model outputs and indicate which is better. A separate "reward model" is trained to predict human preference. The main model is then fine-tuned using reinforcement learning to maximise the reward model's score.</p>
        <p>This process shifts the model's behaviour distribution — making helpful, honest responses more probable and harmful or unhelpful responses less probable. But it doesn't guarantee perfect behaviour: reward models can be gamed, human raters can disagree, and edge cases remain.</p>
    </div>
</div>`;
        this._els.summary.style.display = 'block';

        // Hide playing UI
        ['roundCounter', 'themeBadge', 'promptBox', 'choiceRow', 'explanation', 'actions'].forEach(k => {
            if (this._els[k]) this._els[k].style.display = 'none';
        });
        this._els.cardA.style.display = 'none';
        this._els.cardB.style.display = 'none';
    }
}
