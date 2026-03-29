/**
 * prompt-lab.js
 * Widget for Page 11 — Prompting: Shaping the Output.
 * Teaches prompting techniques through a live textarea editor
 * with feature detection and matched output display.
 * Clicking a technique chip toggles example phrasing in/out of the prompt.
 */

import { Widget } from '../core/widget-base.js';
import { apiMode } from '../core/api-mode.js';

const FEATURE_PATTERNS = {
    audience:    [/\b(for|aimed at|targeting)\b.*(year|child|student|beginner|expert|professional)/i, /\b\d+[\s-]year/i],
    format:      [/\b(bullet|list|numbered|table|step|section|paragraph)\b/i],
    persona:     [/\b(you are|act as|imagine you|as a|pretend)\b/i],
    constraints: [/\b(no more than|maximum|only|limit|must not|without using)\b/i],
    examples:    [/\bfor example\b|\be\.g\.\b|\blike this\b/i],
};

/** Per-task example phrases for each technique. Keyed by task id. */
const TASK_EXAMPLES = {
    photosynthesis: {
        audience:    { hint: 'Who is this for?',           text: 'Explain this for a 12-year-old student.' },
        format:      { hint: 'What shape should it take?', text: 'Use bullet points for the key facts.' },
        persona:     { hint: 'Who should the AI act as?',  text: 'You are a friendly biology teacher.' },
        constraints: { hint: 'What limits apply?',         text: 'No more than 100 words.' },
        examples:    { hint: 'Show what you mean',         text: 'For example: "The sun provides energy for plants to grow."' },
    },
    email: {
        audience:    { hint: 'Who is this for?',           text: 'This email is for the executive team.' },
        format:      { hint: 'What shape should it take?', text: 'Include bullet points for the agenda and a table for the schedule.' },
        persona:     { hint: 'Who should the AI act as?',  text: 'You are the head of the design team.' },
        constraints: { hint: 'What limits apply?',         text: 'No more than 150 words. Must not use jargon.' },
        examples:    { hint: 'Show what you mean',         text: 'For example: "Subject: Q3 Planning — 30 min sync"' },
    },
    newsletter: {
        audience:    { hint: 'Who is this for?',           text: 'This is aimed at students and staff of a sixth-form college.' },
        format:      { hint: 'What shape should it take?', text: 'Use sections with headings, bullet points, and a table of dates.' },
        persona:     { hint: 'Who should the AI act as?',  text: 'You are the college principal writing in a warm, direct tone.' },
        constraints: { hint: 'What limits apply?',         text: 'Maximum 300 words.' },
        examples:    { hint: 'Show what you mean',         text: 'For example: "Debate Team wins Regional Championship — congratulations to Amara, Josh, and Priya!"' },
    },
};

const FEATURE_LABELS = {
    audience:    'Audience',
    format:      'Format',
    persona:     'Persona',
    constraints: 'Constraints',
    examples:    'Examples',
};

function detectFeatures(text) {
    const detected = new Set();
    Object.entries(FEATURE_PATTERNS).forEach(([feature, patterns]) => {
        if (patterns.some(p => p.test(text))) {
            detected.add(feature);
        }
    });
    return detected;
}

function pickVariant(variants, detectedSet) {
    let best = variants[0];
    let bestScore = -1;

    variants.forEach(v => {
        const feats = v.features;
        const matched = feats.filter(f => detectedSet.has(f)).length;
        const missing = feats.filter(f => !detectedSet.has(f)).length;
        const score = matched - missing * 2;
        if (score > bestScore || (score === bestScore && feats.length > (best.features || []).length)) {
            best = v;
            bestScore = score;
        }
    });
    return best;
}

export class PromptLab extends Widget {
    get defaults() {
        return {
            dataUrl: '../js/data/prompt-lab-outputs.json',
        };
    }

    init() {
        this.state = {
            data: null,
            loaded: false,
            error: null,
            taskIndex: 0,
            promptText: '',
            outputText: '',
            detectedFeatures: new Set(),
            updating: false,
        };
        this._debounceTimer = null;
        this._prevOutput = '';
        // Track which technique snippets we inserted so we can remove them
        this._insertedSnippets = {};
        this.createDOM();
        this.bindEvents();
        this.loadData();
    }

    createDOM() {
        this.container.innerHTML = `<div class="pl-widget"><div class="pl-loading">Loading data…</div></div>`;
        this.root = this.container.querySelector('.pl-widget');
    }

    bindEvents() {}

    async loadData() {
        try {
            const res = await fetch(this.config.dataUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const prompt = data.tasks[0].basePrompt;
            const features = detectFeatures(prompt);
            const output = this._selectOutput(data.tasks[0], features);
            this.setState({ data, loaded: true, promptText: prompt, detectedFeatures: features, outputText: output });
        } catch (err) {
            this.setState({ error: err.message });
        }
    }

    _selectOutput(task, detectedFeatures) {
        const variant = pickVariant(task.variants, detectedFeatures);
        return variant ? variant.output : '';
    }

    _currentTask() {
        return this.state.data.tasks[this.state.taskIndex];
    }

    _getTaskExamples() {
        const task = this._currentTask();
        return TASK_EXAMPLES[task.id] || TASK_EXAMPLES.photosynthesis;
    }

    _toggleTechnique(feature) {
        const textarea = this.root.querySelector('#pl-textarea');
        if (!textarea) return;

        const isActive = this.state.detectedFeatures.has(feature);

        if (isActive) {
            // Remove: find and strip the inserted snippet
            const snippet = this._insertedSnippets[feature];
            if (snippet) {
                let text = textarea.value;
                // Remove the snippet and any leading/trailing separators
                text = text.replace(snippet, '');
                // Clean up double spaces, leading/trailing dots+spaces
                text = text.replace(/\.\s*\./g, '.').replace(/\s{2,}/g, ' ').trim();
                // If the prompt ended up empty, restore the base prompt
                if (!text) text = this._currentTask().basePrompt;
                textarea.value = text;
                this.state.promptText = text;
                delete this._insertedSnippets[feature];
            }
        } else {
            // Insert: append the example text
            const examples = this._getTaskExamples();
            const info = examples[feature];
            if (!info) return;
            const current = textarea.value.trim();
            const snippet = ' ' + info.text;
            const newText = current + snippet;
            textarea.value = newText;
            this.state.promptText = newText;
            this._insertedSnippets[feature] = snippet;
        }

        textarea.focus();
        this._scheduleRegenerate(textarea.value);
    }

    _scheduleRegenerate(text) {
        clearTimeout(this._debounceTimer);
        this.state.updating = true;
        this._showUpdating(true);
        this._debounceTimer = setTimeout(async () => {
            const features = detectFeatures(text);

            if (apiMode.isLive()) {
                try {
                    const liveResponse = await apiMode.complete(text, { maxTokens: 300 });
                    if (liveResponse) {
                        this.state.updating = false;
                        this.state.detectedFeatures = features;
                        this.state.outputText = liveResponse;
                        this._updateOutput(liveResponse, features);
                        return;
                    }
                } catch (_) {}
            }

            const output = this._selectOutput(this._currentTask(), features);
            this.state.updating = false;
            this.state.detectedFeatures = features;
            this.state.outputText = output;
            this._updateOutput(output, features);
        }, 800);
    }

    _showUpdating(on) {
        const panel = this.root.querySelector('.pl-output-text');
        const status = this.root.querySelector('#pl-status');
        if (panel) {
            panel.classList.toggle('pl-output-updating', on);
        }
        if (status) {
            status.textContent = on ? 'Updating output…' : '';
        }
    }

    _updateOutput(text, features) {
        const panel = this.root.querySelector('.pl-output-text');
        const status = this.root.querySelector('#pl-status');
        if (panel) {
            panel.classList.remove('pl-output-updating');
            if (text !== this._prevOutput) {
                panel.classList.add('pl-output-flash');
                setTimeout(() => panel.classList.remove('pl-output-flash'), 600);
                this._prevOutput = text;
            }
            panel.textContent = text;
        }
        if (status) {
            status.textContent = '';
        }
        this._updateChecklist(features);
        this._updateBadge(features);
    }

    _updateChecklist(features) {
        const examples = this._getTaskExamples();
        this.root.querySelectorAll('.pl-check-item').forEach(item => {
            const feat = item.dataset.feature;
            const active = features.has(feat);
            item.classList.toggle('pl-check-active', active);
            const icon = item.querySelector('.pl-check-icon');
            if (icon) icon.textContent = active ? '✕' : '+';
            const hint = item.querySelector('.pl-check-hint');
            if (hint) hint.textContent = active ? 'Click to remove' : (examples[feat]?.hint || '');
            item.setAttribute('aria-label', active
                ? FEATURE_LABELS[feat] + ': active — click to remove'
                : 'Add ' + FEATURE_LABELS[feat] + ' to prompt');
        });
    }

    _updateBadge(features) {
        const badge = this.root.querySelector('.pl-output-badge');
        if (badge) {
            const n = features.size;
            badge.textContent = n === 0 ? 'Base response' : n + ' technique' + (n > 1 ? 's' : '') + ' applied';
        }
    }

    render() {
        if (this.state.error) {
            this.root.innerHTML = `<p class="pl-error">Could not load data: ${this.state.error}</p>`;
            return;
        }
        if (!this.state.loaded) return;

        const { taskIndex, promptText, outputText, detectedFeatures } = this.state;
        const tasks = this.state.data.tasks;
        const examples = this._getTaskExamples();
        this._prevOutput = outputText;

        const tabsHTML = tasks.map((t, i) =>
            `<button class="pl-tab${i === taskIndex ? ' pl-tab-active' : ''}" data-idx="${i}">${t.label}</button>`
        ).join('');

        const checklistHTML = Object.entries(FEATURE_LABELS).map(([feat, label]) => {
            const active = detectedFeatures.has(feat);
            const info = examples[feat] || { hint: '' };
            return `<button class="pl-check-item${active ? ' pl-check-active' : ''}" data-feature="${feat}"
                aria-label="${active ? label + ': active — click to remove' : 'Add ' + label + ' to prompt'}">
                <span class="pl-check-icon" aria-hidden="true">${active ? '✕' : '+'}</span>
                <span class="pl-check-label">${label}</span>
                <span class="pl-check-hint">${active ? 'Click to remove' : info.hint}</span>
            </button>`;
        }).join('');

        this.root.innerHTML = `
            <p class="pl-instruction">Edit the prompt below — try adding techniques like audience, format, or constraints. Watch how the output changes. Click a <strong>+</strong> technique to add it, or <strong>✕</strong> to remove it.</p>
            <div class="pl-tabs">${tabsHTML}</div>
            <div class="pl-body">
                <div class="pl-left">
                    <div class="pl-section-label">Your prompt</div>
                    <textarea class="pl-textarea" id="pl-textarea" rows="6">${this._escapeHtml(promptText)}</textarea>
                    <div class="pl-checklist-label">Prompting techniques</div>
                    <div class="pl-checklist">${checklistHTML}</div>
                </div>
                <div class="pl-right">
                    <div class="pl-section-label">Model output <span class="pl-output-badge">${detectedFeatures.size === 0 ? 'Base response' : detectedFeatures.size + ' technique' + (detectedFeatures.size > 1 ? 's' : '') + ' applied'}</span></div>
                    <div class="pl-output-panel">
                        <div class="pl-output-status" id="pl-status" aria-live="polite"></div>
                        <div class="pl-output-text" id="pl-output" aria-live="polite">${this._escapeHtml(outputText)}</div>
                    </div>
                </div>
            </div>`;

        // Textarea events
        const textarea = this.root.querySelector('#pl-textarea');
        textarea.addEventListener('input', e => {
            this.state.promptText = e.target.value;
            this._scheduleRegenerate(e.target.value);
        });

        // Tab events
        this.root.querySelectorAll('.pl-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const task = this.state.data.tasks[idx];
                const prompt = task.basePrompt;
                const features = detectFeatures(prompt);
                const output = this._selectOutput(task, features);
                clearTimeout(this._debounceTimer);
                this._insertedSnippets = {};
                this.setState({ taskIndex: idx, promptText: prompt, detectedFeatures: features, outputText: output });
            });
        });

        // Technique chip click — toggle insert/remove
        this.root.querySelectorAll('.pl-check-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this._toggleTechnique(btn.dataset.feature);
            });
        });
    }

    _escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    destroy() {
        clearTimeout(this._debounceTimer);
        super.destroy();
    }
}

// ─── Inline styles ────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('pl-styles')) return;
    const style = document.createElement('style');
    style.id = 'pl-styles';
    style.textContent = `
.pl-widget { font-family:var(--font-body); }
.pl-loading, .pl-error { color:var(--color-text-muted); font-size:var(--text-sm); padding:1rem; }
.pl-instruction { font-size:var(--text-sm); color:var(--color-text-muted); line-height:var(--leading-relaxed); margin-bottom:1rem; padding:0.75rem 1rem; background:var(--color-secondary-light, rgba(13,148,136,0.06)); border-radius:var(--radius-md); border-left:3px solid var(--color-secondary); }
.pl-instruction strong { color:var(--color-secondary); }
.pl-tabs { display:flex; flex-wrap:wrap; gap:0.375rem; margin-bottom:1rem; }
.pl-tab { padding:0.375rem 0.875rem; border-radius:var(--radius-full); border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text-muted); font-size:var(--text-sm); cursor:pointer; transition:all 150ms; font-family:var(--font-body); }
.pl-tab:hover { border-color:var(--color-primary); color:var(--color-primary); }
.pl-tab-active { background:var(--color-primary); color:#fff; border-color:var(--color-primary); font-weight:600; }
.pl-body { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
@media(max-width:640px){ .pl-body { grid-template-columns:1fr; } }
.pl-section-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); font-weight:600; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem; }
.pl-output-badge { font-size:0.65rem; text-transform:none; letter-spacing:0; background:var(--color-secondary); color:#fff; padding:0.15rem 0.5rem; border-radius:var(--radius-full); font-weight:500; }
.pl-textarea { width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius-sm); font-size:var(--text-sm); font-family:var(--font-body); background:var(--color-surface); color:var(--color-text); resize:vertical; line-height:1.6; box-sizing:border-box; }
.pl-textarea:focus { outline:none; border-color:var(--color-primary); box-shadow:0 0 0 3px rgba(13,148,136,0.12); }
.pl-checklist-label { font-size:var(--text-xs); color:var(--color-text-muted); margin:0.75rem 0 0.375rem; font-weight:500; }
.pl-checklist { display:flex; flex-direction:column; gap:0.375rem; }
.pl-check-item { display:flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); font-size:var(--text-sm); color:var(--color-text-muted); transition:all 200ms; cursor:pointer; border:1px solid var(--color-border); background:var(--color-surface); font-family:var(--font-body); text-align:left; }
.pl-check-item:hover { border-color:var(--color-secondary); color:var(--color-secondary); background:rgba(13,148,136,0.04); }
.pl-check-active { background:rgba(13,148,136,0.08); color:var(--color-primary); border-color:var(--color-primary); }
.pl-check-active:hover { background:rgba(220,38,38,0.06); border-color:var(--color-error, #dc2626); color:var(--color-error, #dc2626); }
.pl-check-icon { font-size:var(--text-sm); min-width:1.1rem; text-align:center; font-weight:700; }
.pl-check-label { font-weight:600; min-width:5.5rem; }
.pl-check-hint { font-size:var(--text-xs); color:var(--color-text-light); margin-left:auto; }
.pl-check-active .pl-check-hint { color:var(--color-primary); font-style:italic; }
.pl-check-active:hover .pl-check-hint { color:var(--color-error, #dc2626); }
.pl-output-panel { background:var(--color-surface-2); border-radius:var(--radius-md); padding:0.875rem 1rem; min-height:160px; }
.pl-output-status { font-size:var(--text-xs); color:var(--color-text-light); min-height:1.25rem; margin-bottom:0.25rem; }
.pl-output-text { font-size:var(--text-sm); line-height:1.7; color:var(--color-text); white-space:pre-wrap; transition:opacity 200ms; }
.pl-output-updating { opacity:0.4; }
@keyframes pl-flash {
    0% { background:rgba(13,148,136,0.15); }
    100% { background:transparent; }
}
.pl-output-flash { animation:pl-flash 0.6s ease-out; }
    `;
    document.head.appendChild(style);
}());
