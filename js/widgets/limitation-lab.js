/**
 * limitation-lab.js
 * Widget for Page 17 — Limitations, Bias & Responsible Use.
 * Three-station tabbed widget: Knowledge Cutoff / Bias Lens / Reasoning Limits.
 */

import { Widget } from '../core/widget-base.js';

// ── Station 1 data ────────────────────────────────────────────────────────────
const TIMELINE_EVENTS = [
    { year: 2020, label: 'AlphaFold 2 announced', known: true,
      response: 'AlphaFold 2 was announced by DeepMind at CASP14 in November 2020. It achieved groundbreaking accuracy in protein structure prediction, solving a 50-year biology challenge.' },
    { year: 2021, label: 'DALL·E 1 released', known: true,
      response: 'OpenAI released DALL·E in January 2021 — a neural network capable of generating images from text descriptions, combining language and visual understanding.' },
    { year: 2022, label: 'ChatGPT launches', known: true,
      response: 'ChatGPT launched in November 2022 and reached 1 million users in 5 days. It was built on GPT-3.5 and demonstrated surprisingly capable conversational AI to a mass audience.' },
    { year: 2023, label: 'GPT-4 released', known: true,
      response: 'GPT-4 was released by OpenAI in March 2023. It showed significant improvements over GPT-3.5 in reasoning, instruction following, and handling complex tasks.' },
    { year: 2024, label: 'Major AI regulation bills', known: false,
      response: "I don't have reliable information about specific AI regulation bills passed in 2024. My training data has a knowledge cutoff and recent legislative developments may not be included or may be incomplete." },
    { year: 2025, label: 'Latest model releases', known: false,
      response: "I don't have information about AI model releases in 2025 — this is after my knowledge cutoff. I would recommend checking official announcements from AI labs directly." },
    { year: 2026, label: 'Future developments', known: false,
      response: "This is in the future relative to my training data. I cannot predict or know about events that have not yet occurred (from my training perspective). Any answer I give here would be speculation or hallucination." },
];

// ── Station 2 data ────────────────────────────────────────────────────────────
const BIAS_NAMES = [
    { name: 'James Smith',    gender: 'male',    culture: 'western' },
    { name: 'Priya Sharma',   gender: 'female',  culture: 'south-asian' },
    { name: 'Mohammed Al-Hassan', gender: 'male', culture: 'arabic' },
    { name: 'Lucy Chen',      gender: 'female',  culture: 'east-asian' },
    { name: 'Amara Osei',     gender: 'female',  culture: 'african' },
    { name: 'Alex Taylor',    gender: 'neutral', culture: 'western' },
];

const BIAS_OUTPUTS = {
    'James Smith':       { a: 'James Smith applied for the senior software engineer role. His CV shows strong Python and system design experience.', b: 'James Smith is applying for a management position. He brings several years of leadership experience.' },
    'Priya Sharma':      { a: 'Priya Sharma applied for the senior software engineer role. Her application highlights machine learning and data science skills.', b: 'Priya Sharma is applying for a research analyst position. She has a strong academic background.' },
    'Mohammed Al-Hassan':{ a: 'Mohammed Al-Hassan applied for the senior software engineer role. He has backend development and cloud infrastructure experience.', b: 'Mohammed Al-Hassan is applying for a project manager position with extensive logistics experience.' },
    'Lucy Chen':         { a: 'Lucy Chen applied for the senior software engineer role. Her background is in frontend development and UX engineering.', b: 'Lucy Chen is applying for a product design position with a focus on user research.' },
    'Amara Osei':        { a: 'Amara Osei applied for the senior software engineer role, bringing experience in mobile development and open-source contributions.', b: 'Amara Osei is seeking a community engagement role, with a background in non-profit coordination.' },
    'Alex Taylor':       { a: 'Alex Taylor applied for the senior software engineer role with full-stack experience across web and mobile platforms.', b: 'Alex Taylor is applying for a general management position with cross-functional team experience.' },
};

// ── Station 3 data ────────────────────────────────────────────────────────────
const PUZZLES = [
    {
        title: 'Large number arithmetic',
        question: 'What is 99,997 × 99,993?',
        modelAnswer: '9,999,699,021',
        correctAnswer: '9,999,000,021',
        succeeds: false,
        explanation: 'LLMs struggle with precise arithmetic on large numbers. The model confidently produces a plausible but wrong answer. Always verify calculations with a proper calculator.',
    },
    {
        title: 'Transitive reasoning',
        question: 'Alice is taller than Bob. Bob is taller than Carol. Is Alice taller than Carol?',
        modelAnswer: 'Yes — Alice is taller than Carol. If Alice > Bob and Bob > Carol, then Alice > Carol by transitivity.',
        correctAnswer: 'Yes',
        succeeds: true,
        explanation: 'Simple transitive reasoning is generally handled well by LLMs. The model correctly applies the transitive property.',
    },
    {
        title: 'Letter counting',
        question: 'How many times does the letter "r" appear in the word "strawberry"?',
        modelAnswer: 'The word "strawberry" contains 2 letter r\'s.',
        correctAnswer: '3 (st-r-awbe-rr-y)',
        succeeds: false,
        explanation: 'LLMs process text as tokens, not individual characters. Counting specific letters — especially in familiar words tokenised as chunks — is a known weakness. "Strawberry" has 3 r\'s.',
    },
    {
        title: 'Word problem with red herring',
        question: 'A farmer has 17 sheep. All but 9 die. How many sheep are left?',
        modelAnswer: '8 sheep are left — 17 minus 9 equals 8.',
        correctAnswer: '9',
        succeeds: false,
        explanation: 'The phrase "all but 9" means "all except 9" — so 9 survive. The model often defaults to arithmetic (17 − 9 = 8), missing the linguistic nuance. This is a classic test of language comprehension over pattern-matching.',
    },
    {
        title: 'Spatial reasoning',
        question: 'I am facing north. I turn 90° right, then 180°, then 90° left. Which direction am I facing?',
        modelAnswer: 'You are facing south.',
        correctAnswer: 'South',
        succeeds: true,
        explanation: 'LLMs can handle sequential direction-tracking when the steps are clear and the chain is short. Performance degrades with longer or more complex spatial sequences.',
    },
];

export class LimitationLab extends Widget {
    get defaults() {
        return {};
    }

    init() {
        this.state = {
            station: 0,
            // Station 1
            selectedEvent: null,
            // Station 2
            selectedNameIdx: 0,
            // Station 3
            revealedPuzzles: new Set(),
        };
        this.createDOM();
        this.bindEvents();
        this.render();
    }

    createDOM() {
        this.container.innerHTML = `<div class="ll-widget"></div>`;
        this.root = this.container.querySelector('.ll-widget');
    }

    bindEvents() {}

    render() {
        const { station } = this.state;

        const stationTabs = [
            'Knowledge Cutoff',
            'Bias Lens',
            'Reasoning Limits',
        ].map((label, i) =>
            `<button class="ll-station-tab${i === station ? ' ll-station-active' : ''}" data-station="${i}">${label}</button>`
        ).join('');

        this.root.innerHTML = `
            <div class="ll-station-tabs">${stationTabs}</div>
            <div class="ll-station-body" id="ll-body"></div>`;

        this.root.querySelectorAll('.ll-station-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({ station: parseInt(btn.dataset.station) });
            });
        });

        const body = this.root.querySelector('#ll-body');
        if (station === 0) this._renderCutoff(body);
        else if (station === 1) this._renderBias(body);
        else this._renderPuzzles(body);
    }

    // ── Station 1 ─────────────────────────────────────────────────────────────

    _renderCutoff(container) {
        const { selectedEvent } = this.state;

        const nodesHTML = TIMELINE_EVENTS.map((ev, i) =>
            `<div class="ll-timeline-node${ev.known ? ' ll-node-known' : ' ll-node-unknown'}${i === selectedEvent ? ' ll-node-selected' : ''}"
                data-event="${i}" title="${ev.label}">
                <div class="ll-node-year">${ev.year}</div>
                <div class="ll-node-dot"></div>
                <div class="ll-node-label">${ev.label}</div>
            </div>`
        ).join('');

        const responseHTML = selectedEvent !== null
            ? `<div class="ll-response-box${TIMELINE_EVENTS[selectedEvent].known ? ' ll-response-known' : ' ll-response-unknown'}">
                <div class="ll-response-badge">${TIMELINE_EVENTS[selectedEvent].known ? 'Model knows this' : 'Model does not know this'}</div>
                <div class="ll-response-text">"${TIMELINE_EVENTS[selectedEvent].response}"</div>
            </div>`
            : `<div class="ll-response-placeholder">← Click an event to see the model's response</div>`;

        container.innerHTML = `
            <p class="ll-station-intro">LLMs have a training <strong>knowledge cutoff</strong> — they cannot know about events after that date. Click events on the timeline to see how the model responds.</p>
            <div class="ll-timeline-legend">
                <span class="ll-legend-item ll-legend-known">Model knows this</span>
                <span class="ll-legend-item ll-legend-unknown">Model doesn't know this</span>
            </div>
            <div class="ll-timeline">${nodesHTML}</div>
            <div class="ll-cutoff-line-label">↑ Training cutoff</div>
            ${responseHTML}`;

        container.querySelectorAll('.ll-timeline-node').forEach(node => {
            node.addEventListener('click', () => {
                this.setState({ selectedEvent: parseInt(node.dataset.event) });
            });
        });
    }

    // ── Station 2 ─────────────────────────────────────────────────────────────

    _renderBias(container) {
        const { selectedNameIdx } = this.state;
        const selected = BIAS_NAMES[selectedNameIdx];
        const outputs = BIAS_OUTPUTS[selected.name] || { a: '—', b: '—' };

        const nameOptions = BIAS_NAMES.map((n, i) =>
            `<option value="${i}"${i === selectedNameIdx ? ' selected' : ''}>${n.name}</option>`
        ).join('');

        container.innerHTML = `
            <p class="ll-station-intro">AI models can produce different responses based on names — reflecting biases in training data. Change the name in the prompt template and observe how the framing of "likely roles" shifts.</p>
            <div class="ll-bias-prompt">
                <span class="ll-prompt-prefix">Describe a job applicant named</span>
                <select class="ll-name-select" id="ll-name-select">${nameOptions}</select>
                <span class="ll-prompt-suffix">applying for a role.</span>
            </div>
            <div class="ll-bias-outputs">
                <div class="ll-bias-card">
                    <div class="ll-bias-card-label">Response A — "senior engineer" framing</div>
                    <div class="ll-bias-card-text">${outputs.a}</div>
                </div>
                <div class="ll-bias-card">
                    <div class="ll-bias-card-label">Response B — "general role" framing</div>
                    <div class="ll-bias-card-text">${outputs.b}</div>
                </div>
            </div>
            <div class="ll-bias-explainer">
                <strong>What to notice:</strong> The model may subtly assign different career trajectories, seniority levels, or domains based on name alone — even when the prompt is identical. This reflects patterns in training data, not reality.
            </div>`;

        container.querySelector('#ll-name-select').addEventListener('change', e => {
            this.setState({ selectedNameIdx: parseInt(e.target.value) });
        });
    }

    // ── Station 3 ─────────────────────────────────────────────────────────────

    _renderPuzzles(container) {
        const { revealedPuzzles } = this.state;

        const puzzlesHTML = PUZZLES.map((p, i) => {
            const revealed = revealedPuzzles.has(i);
            return `
                <div class="ll-puzzle-card">
                    <div class="ll-puzzle-header">
                        <span class="ll-puzzle-num">${i + 1}</span>
                        <span class="ll-puzzle-title">${p.title}</span>
                        <span class="ll-puzzle-outcome${p.succeeds ? ' ll-success' : ' ll-fail'}">
                            ${p.succeeds ? 'Model succeeds' : 'Model struggles'}
                        </span>
                    </div>
                    <div class="ll-puzzle-question">${p.question}</div>
                    ${revealed ? `
                        <div class="ll-puzzle-reveal">
                            <div class="ll-puzzle-answer-row">
                                <div class="ll-model-answer">
                                    <span class="ll-answer-label">Model says:</span>
                                    <span class="ll-answer-text ll-answer-model">${p.modelAnswer}</span>
                                </div>
                                <div class="ll-correct-answer">
                                    <span class="ll-answer-label">Correct answer:</span>
                                    <span class="ll-answer-text ll-answer-correct">${p.correctAnswer}</span>
                                </div>
                            </div>
                            <div class="ll-puzzle-explanation">${p.explanation}</div>
                        </div>` : `
                        <button class="btn btn-secondary ll-reveal-btn" data-puzzle="${i}">Show model's answer</button>`}
                </div>`;
        }).join('');

        container.innerHTML = `
            <p class="ll-station-intro">LLMs don't always reason correctly. Here are five puzzles — see where the model succeeds and where it goes wrong.</p>
            <div class="ll-puzzles">${puzzlesHTML}</div>`;

        container.querySelectorAll('.ll-reveal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.puzzle);
                const newRevealed = new Set(this.state.revealedPuzzles);
                newRevealed.add(idx);
                this.setState({ revealedPuzzles: newRevealed });
            });
        });
    }
}

// ─── Inline styles ────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('ll-styles')) return;
    const style = document.createElement('style');
    style.id = 'll-styles';
    style.textContent = `
.ll-widget { font-family:var(--font-body); }
.ll-station-tabs { display:flex; gap:0; margin-bottom:1.25rem; border-bottom:2px solid var(--color-border); }
.ll-station-tab { padding:0.5rem 1rem; border:none; background:none; cursor:pointer; font-size:var(--text-sm); color:var(--color-text-muted); font-family:var(--font-body); border-bottom:2px solid transparent; margin-bottom:-2px; transition:all 150ms; white-space:nowrap; }
.ll-station-tab:hover { color:var(--color-text); }
.ll-station-active { color:var(--color-primary); border-bottom-color:var(--color-primary); font-weight:600; }
.ll-station-intro { font-size:var(--text-sm); color:var(--color-text-muted); margin-bottom:1rem; line-height:1.6; }

/* Station 1 — Cutoff */
.ll-timeline-legend { display:flex; gap:1rem; margin-bottom:0.75rem; }
.ll-legend-item { font-size:var(--text-xs); font-weight:500; padding:0.25rem 0.625rem; border-radius:var(--radius-full); }
.ll-legend-known { background:rgba(13,148,136,0.1); color:var(--color-primary); }
.ll-legend-unknown { background:rgba(225,29,72,0.1); color:#e11d48; }
.ll-timeline { display:flex; gap:0.5rem; flex-wrap:nowrap; overflow-x:auto; padding-bottom:0.75rem; margin-bottom:0.5rem; }
.ll-timeline-node { display:flex; flex-direction:column; align-items:center; gap:0.25rem; cursor:pointer; min-width:80px; padding:0.5rem 0.375rem; border-radius:var(--radius-sm); transition:all 150ms; border:2px solid transparent; }
.ll-timeline-node:hover { background:var(--color-surface-2); }
.ll-node-selected { border-color:var(--color-primary) !important; background:var(--color-surface-2); }
.ll-node-year { font-size:var(--text-xs); font-weight:600; color:var(--color-text-muted); }
.ll-node-dot { width:14px; height:14px; border-radius:50%; border:2px solid; flex-shrink:0; }
.ll-node-known .ll-node-dot { background:#0d9488; border-color:#0d9488; }
.ll-node-unknown .ll-node-dot { background:#fecaca; border-color:#e11d48; }
.ll-node-label { font-size:var(--text-xs); text-align:center; color:var(--color-text-muted); line-height:1.3; }
.ll-cutoff-line-label { font-size:var(--text-xs); color:var(--color-text-muted); margin-bottom:0.75rem; }
.ll-response-box { border-radius:var(--radius-md); padding:0.875rem 1rem; margin-top:0.75rem; border:1px solid; }
.ll-response-known { background:rgba(13,148,136,0.07); border-color:rgba(13,148,136,0.25); }
.ll-response-unknown { background:rgba(225,29,72,0.07); border-color:rgba(225,29,72,0.25); }
.ll-response-badge { font-size:var(--text-xs); font-weight:600; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:0.5rem; }
.ll-response-known .ll-response-badge { color:var(--color-primary); }
.ll-response-unknown .ll-response-badge { color:#e11d48; }
.ll-response-text { font-size:var(--text-sm); color:var(--color-text); line-height:1.6; font-style:italic; }
.ll-response-placeholder { font-size:var(--text-sm); color:var(--color-text-muted); padding:1rem; text-align:center; background:var(--color-surface-2); border-radius:var(--radius-md); margin-top:0.75rem; }

/* Station 2 — Bias */
.ll-bias-prompt { display:flex; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem; padding:0.75rem 1rem; background:var(--color-surface-2); border-radius:var(--radius-md); font-size:var(--text-sm); }
.ll-prompt-prefix, .ll-prompt-suffix { color:var(--color-text-muted); }
.ll-name-select { padding:0.375rem 0.625rem; border-radius:var(--radius-sm); border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-size:var(--text-sm); font-family:var(--font-body); cursor:pointer; }
.ll-bias-outputs { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem; }
@media(max-width:600px){ .ll-bias-outputs { grid-template-columns:1fr; } }
.ll-bias-card { background:var(--color-surface-2); border-radius:var(--radius-md); padding:0.875rem; border:1px solid var(--color-border); }
.ll-bias-card-label { font-size:var(--text-xs); font-weight:600; color:var(--color-text-muted); margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:0.06em; }
.ll-bias-card-text { font-size:var(--text-sm); color:var(--color-text); line-height:1.6; }
.ll-bias-explainer { font-size:var(--text-sm); color:var(--color-text-muted); background:rgba(217,119,6,0.08); border-radius:var(--radius-sm); padding:0.75rem 1rem; border-left:3px solid #d97706; line-height:1.6; }

/* Station 3 — Puzzles */
.ll-puzzles { display:flex; flex-direction:column; gap:0.875rem; }
.ll-puzzle-card { background:var(--color-surface-2); border-radius:var(--radius-md); padding:1rem; border:1px solid var(--color-border); }
.ll-puzzle-header { display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem; flex-wrap:wrap; }
.ll-puzzle-num { width:24px; height:24px; border-radius:50%; background:var(--color-primary); color:#fff; font-size:var(--text-xs); font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ll-puzzle-title { font-size:var(--text-sm); font-weight:600; color:var(--color-text); flex:1; }
.ll-puzzle-outcome { font-size:var(--text-xs); font-weight:600; padding:0.125rem 0.5rem; border-radius:var(--radius-full); }
.ll-success { background:rgba(13,148,136,0.1); color:var(--color-primary); }
.ll-fail { background:rgba(225,29,72,0.1); color:#e11d48; }
.ll-puzzle-question { font-size:var(--text-sm); color:var(--color-text); margin-bottom:0.75rem; padding:0.625rem 0.875rem; background:var(--color-surface); border-radius:var(--radius-sm); font-weight:500; line-height:1.5; }
.ll-puzzle-reveal { animation:ll-fade-in 250ms ease; }
@keyframes ll-fade-in { from { opacity:0; } to { opacity:1; } }
.ll-puzzle-answer-row { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.625rem; }
@media(max-width:500px){ .ll-puzzle-answer-row { grid-template-columns:1fr; } }
.ll-answer-label { font-size:var(--text-xs); font-weight:600; color:var(--color-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase; letter-spacing:0.06em; }
.ll-answer-text { font-size:var(--text-sm); line-height:1.5; display:block; }
.ll-answer-model { color:var(--color-text-muted); font-style:italic; }
.ll-answer-correct { color:var(--color-primary); font-weight:600; }
.ll-puzzle-explanation { font-size:var(--text-sm); color:var(--color-text-muted); line-height:1.6; border-top:1px solid var(--color-border); padding-top:0.625rem; }
    `;
    document.head.appendChild(style);
}());
