/**
 * universal-tokeniser.js
 * Widget for Page 15 — Beyond Text: Images, Audio, and Code.
 *
 * Visual comparison of how different data types get tokenised
 * and fed through the same transformer mechanism.
 * Three modality cards: Image, Audio, Multimodal.
 * Each has an interactive "tokenise" step showing the breakdown.
 */

import { Widget } from '../core/widget-base.js';

export class UniversalTokeniser extends Widget {
    get defaults() { return {}; }

    init() {
        this.state = {
            imageTokenised: false,
            audioTokenised: false,
            multiTokenised: false,
            hoveredPatch: null,
            hoveredFrame: null,
        };
        this.createDOM();
        this.bindEvents();
        this.render();
    }

    createDOM() {
        this.container.innerHTML = `<div class="ut-widget"></div>`;
        this.root = this.container.querySelector('.ut-widget');
    }

    bindEvents() {}

    render() {
        const { imageTokenised, audioTokenised, multiTokenised } = this.state;

        this.root.innerHTML = `
            <p class="ut-intro">You've seen how text gets broken into word tokens. But the same approach works for <em>any</em> data — you just need a different way to slice it up. Explore each modality below.</p>

            ${this._renderImageCard(imageTokenised)}
            ${this._renderAudioCard(audioTokenised)}
            ${this._renderMultiCard(multiTokenised)}

            <div class="ut-takeaway">
                <div class="ut-takeaway-diagram">
                    <div class="ut-td-row">
                        <span class="ut-td-label ut-td-text">Text → word pieces</span>
                        <span class="ut-td-arrow">→</span>
                        <span class="ut-td-box">Token sequence</span>
                    </div>
                    <div class="ut-td-row">
                        <span class="ut-td-label ut-td-image">Image → patches</span>
                        <span class="ut-td-arrow">→</span>
                        <span class="ut-td-box">Token sequence</span>
                    </div>
                    <div class="ut-td-row">
                        <span class="ut-td-label ut-td-audio">Audio → frames</span>
                        <span class="ut-td-arrow">→</span>
                        <span class="ut-td-box">Token sequence</span>
                    </div>
                </div>
                <p class="ut-takeaway-text">Once any data becomes a <strong>sequence of tokens</strong>, the transformer processes it exactly the same way: predict the next one from all the previous ones.</p>
            </div>
        `;

        this._bindDynamic();
    }

    /* ── Image card ─────────────────────────────────────────────── */

    _renderImageCard(tokenised) {
        const gridOverlay = tokenised ? this._buildImageGrid() : '';
        const btnLabel = tokenised ? 'Reset' : 'Tokenise image →';

        return `
        <div class="ut-card">
            <div class="ut-card-header">
                <span class="ut-card-icon">🖼</span>
                <div>
                    <h3 class="ut-card-title">Images → Patches</h3>
                    <p class="ut-card-sub">Vision transformers split an image into a grid of small square patches — each patch becomes one token.</p>
                </div>
            </div>
            <div class="ut-card-body">
                <div class="ut-image-wrap">
                    <svg class="ut-sample-img" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" aria-label="Simple landscape illustration">
                        <!-- Sky gradient -->
                        <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#87CEEB"/><stop offset="100%" stop-color="#E0F0FF"/></linearGradient></defs>
                        <rect width="240" height="180" fill="url(#sky)"/>
                        <!-- Sun -->
                        <circle cx="190" cy="40" r="22" fill="#FFD700" opacity="0.9"/>
                        <!-- Hills -->
                        <ellipse cx="60" cy="180" rx="100" ry="60" fill="#5B8C3E"/>
                        <ellipse cx="180" cy="180" rx="110" ry="70" fill="#4A7A2E"/>
                        <!-- Tree -->
                        <rect x="105" y="110" width="8" height="35" fill="#6B4226"/>
                        <ellipse cx="109" cy="105" rx="20" ry="22" fill="#2D6B1E"/>
                        <!-- Cloud -->
                        <ellipse cx="60" cy="35" rx="30" ry="12" fill="white" opacity="0.8"/>
                        <ellipse cx="45" cy="30" rx="18" ry="10" fill="white" opacity="0.7"/>
                    </svg>
                    ${tokenised ? `<div class="ut-grid-overlay" id="ut-grid-overlay">${gridOverlay}</div>` : ''}
                </div>
                <div class="ut-card-action">
                    <button class="btn ${tokenised ? 'btn-secondary' : 'btn-primary'} ut-btn-image">${btnLabel}</button>
                </div>
                ${tokenised ? `
                <div class="ut-insight">
                    <div class="ut-token-sequence" id="ut-img-seq">
                        ${this._buildImageSequence()}
                    </div>
                    <p class="ut-insight-text">The model reads patches left-to-right, top-to-bottom — just like you read words on a page. Each patch is a token, and the model learns what patches tend to appear next to each other (blue sky above, green ground below).</p>
                </div>` : ''}
            </div>
        </div>`;
    }

    _buildImageGrid() {
        const rows = 4, cols = 6;
        let html = '';
        for (let i = 0; i < rows * cols; i++) {
            html += `<div class="ut-gpatch" data-patch="${i}"><span class="ut-gpatch-num">${i + 1}</span></div>`;
        }
        return html;
    }

    _buildImageSequence() {
        const colors = [
            '#87CEEB','#89D0EC','#8BD2EE','#A8D8EA','#D0E8F0','#E0F0FF',  // sky row
            '#87CEEB','#87CEEB','#FFFFFF','#87CEEB','#FFD700','#FFD700',   // sky+sun
            '#6BAE4A','#5B8C3E','#2D6B1E','#2D6B1E','#4A7A2E','#4A7A2E', // trees+hills
            '#5B8C3E','#5B8C3E','#6B4226','#4A7A2E','#4A7A2E','#4A7A2E', // ground
        ];
        return colors.map((c, i) =>
            `<span class="ut-seq-chip" style="background:${c};${this._textColorFor(c)}" data-seq-patch="${i}" title="Patch ${i + 1}">${i + 1}</span>`
        ).join('');
    }

    _textColorFor(hex) {
        // Simple brightness check
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 160 ? 'color:#333;' : 'color:#fff;';
    }

    /* ── Audio card ─────────────────────────────────────────────── */

    _renderAudioCard(tokenised) {
        const btnLabel = tokenised ? 'Reset' : 'Tokenise audio →';
        const frameLines = tokenised ? this._buildFrameLines() : '';

        return `
        <div class="ut-card">
            <div class="ut-card-header">
                <span class="ut-card-icon">🔊</span>
                <div>
                    <h3 class="ut-card-title">Audio → Spectral Frames</h3>
                    <p class="ut-card-sub">Audio models slice a sound wave into tiny time windows (about 25 ms each), then analyse the frequencies in each slice.</p>
                </div>
            </div>
            <div class="ut-card-body">
                <div class="ut-waveform-wrap">
                    <svg class="ut-waveform" viewBox="0 0 480 100" xmlns="http://www.w3.org/2000/svg" aria-label="Audio waveform">
                        <rect width="480" height="100" fill="#f8f7f5" rx="6"/>
                        <line x1="0" y1="50" x2="480" y2="50" stroke="#e0ddd6" stroke-width="1"/>
                        ${this._buildWaveformPath()}
                        ${frameLines}
                    </svg>
                    ${tokenised ? `<div class="ut-frame-labels">${this._buildFrameLabels()}</div>` : ''}
                </div>
                <div class="ut-card-action">
                    <button class="btn ${tokenised ? 'btn-secondary' : 'btn-primary'} ut-btn-audio">${btnLabel}</button>
                </div>
                ${tokenised ? `
                <div class="ut-insight">
                    <div class="ut-frame-sequence" id="ut-aud-seq">
                        ${this._buildAudioSequence()}
                    </div>
                    <p class="ut-insight-text">Each frame captures a snapshot of frequencies — like a single chord in music. The model learns which sounds tend to follow which: a rising "Hel-" is very likely to continue with "-lo". Shuffling the frames destroys meaning, just like shuffling words in a sentence.</p>
                </div>` : ''}
            </div>
        </div>`;
    }

    _buildWaveformPath() {
        const amps = [15,25,40,55,70,60,45,55,70,85,75,60,50,65,80,70,55,40,50,65,75,60,45,35,50,60,45,30,20,25,40,55,65,50,35,45,60,70,55,40,30,40,55,65,50,35,25,20];
        const w = 480, mid = 50;
        let topD = 'M0,50 ', botD = 'M0,50 ';
        amps.forEach((a, i) => {
            const x = (i / (amps.length - 1)) * w;
            topD += `L${x.toFixed(1)},${(mid - a * 0.5).toFixed(1)} `;
            botD += `L${x.toFixed(1)},${(mid + a * 0.5).toFixed(1)} `;
        });
        topD += `L480,50`; botD += `L480,50`;
        return `<path d="${topD}" fill="none" stroke="#8b5cf6" stroke-width="1.5" opacity="0.7"/>
                <path d="${botD}" fill="none" stroke="#8b5cf6" stroke-width="1.5" opacity="0.7"/>`;
    }

    _buildFrameLines() {
        const n = 8;
        let lines = '';
        for (let i = 1; i < n; i++) {
            const x = (i / n) * 480;
            lines += `<line x1="${x}" y1="2" x2="${x}" y2="98" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"/>`;
        }
        return lines;
    }

    _buildFrameLabels() {
        const n = 8;
        let html = '';
        for (let i = 0; i < n; i++) {
            html += `<span class="ut-flabel" data-frame="${i}">Frame ${i + 1}</span>`;
        }
        return html;
    }

    _buildAudioSequence() {
        const colors = ['#8b5cf6','#7c3aed','#6d28d9','#5b21b6','#7c3aed','#8b5cf6','#a78bfa','#c4b5fd'];
        const labels = ['Hh','eh','l','oh','_','w','er','ld'];
        return colors.map((c, i) =>
            `<span class="ut-seq-chip ut-seq-audio" style="background:${c}" data-seq-frame="${i}" title="Frame ${i + 1}: phoneme '${labels[i]}'">${labels[i]}</span>`
        ).join('');
    }

    /* ── Multimodal card ────────────────────────────────────────── */

    _renderMultiCard(tokenised) {
        const btnLabel = tokenised ? 'Reset' : 'Show combined sequence →';

        return `
        <div class="ut-card">
            <div class="ut-card-header">
                <span class="ut-card-icon">🔗</span>
                <div>
                    <h3 class="ut-card-title">Multimodal → One Sequence</h3>
                    <p class="ut-card-sub">Modern AI models can process text and images together. They simply interleave both types of tokens into a single sequence.</p>
                </div>
            </div>
            <div class="ut-card-body">
                <div class="ut-multi-example">
                    <div class="ut-multi-input">
                        <div class="ut-multi-block ut-multi-text-block">
                            <span class="ut-multi-label">Text prompt</span>
                            <p>"What animal is in this photo?"</p>
                        </div>
                        <span class="ut-multi-plus">+</span>
                        <div class="ut-multi-block ut-multi-img-block">
                            <span class="ut-multi-label">Image</span>
                            <svg viewBox="0 0 80 60" class="ut-multi-thumb" aria-label="Photo of a cat">
                                <rect width="80" height="60" rx="4" fill="#fef3c7"/>
                                <!-- Simple cat face -->
                                <polygon points="25,20 20,8 30,16" fill="#d97706"/>
                                <polygon points="55,20 50,8 60,16" fill="#d97706"/>
                                <circle cx="40" cy="32" r="18" fill="#f59e0b"/>
                                <circle cx="34" cy="28" r="3" fill="#1e1e1e"/>
                                <circle cx="46" cy="28" r="3" fill="#1e1e1e"/>
                                <ellipse cx="40" cy="35" rx="3" ry="2" fill="#ec4899"/>
                                <path d="M37,38 Q40,42 43,38" fill="none" stroke="#1e1e1e" stroke-width="1"/>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="ut-card-action">
                    <button class="btn ${tokenised ? 'btn-secondary' : 'btn-primary'} ut-btn-multi">${btnLabel}</button>
                </div>
                ${tokenised ? `
                <div class="ut-insight">
                    <div class="ut-combined-seq">
                        <span class="ut-seq-chip ut-seq-text">What</span>
                        <span class="ut-seq-chip ut-seq-text">animal</span>
                        <span class="ut-seq-chip ut-seq-text">is</span>
                        <span class="ut-seq-chip ut-seq-text">in</span>
                        <span class="ut-seq-chip ut-seq-text">this</span>
                        <span class="ut-seq-chip ut-seq-text">photo?</span>
                        <span class="ut-seq-divider">|</span>
                        <span class="ut-seq-chip ut-seq-img" title="Image patch 1">🖼 1</span>
                        <span class="ut-seq-chip ut-seq-img" title="Image patch 2">🖼 2</span>
                        <span class="ut-seq-chip ut-seq-img" title="Image patch 3">🖼 3</span>
                        <span class="ut-seq-chip ut-seq-img">…</span>
                        <span class="ut-seq-chip ut-seq-img" title="Image patch N">🖼 N</span>
                        <span class="ut-seq-divider">→</span>
                        <span class="ut-seq-chip ut-seq-answer">This</span>
                        <span class="ut-seq-chip ut-seq-answer">is</span>
                        <span class="ut-seq-chip ut-seq-answer">a</span>
                        <span class="ut-seq-chip ut-seq-answer">cat.</span>
                    </div>
                    <div class="ut-seq-legend">
                        <span class="ut-legend-item"><span class="ut-legend-dot ut-legend-text"></span> Text tokens</span>
                        <span class="ut-legend-item"><span class="ut-legend-dot ut-legend-img"></span> Image tokens</span>
                        <span class="ut-legend-item"><span class="ut-legend-dot ut-legend-answer"></span> Generated response</span>
                    </div>
                    <p class="ut-insight-text">The model doesn't "see" images differently from text — it processes one long sequence of tokens. Text tokens and image patch tokens are interleaved, and the transformer attends to all of them when predicting what comes next.</p>
                </div>` : ''}
            </div>
        </div>`;
    }

    /* ── Event binding ──────────────────────────────────────────── */

    _bindDynamic() {
        const imgBtn = this.root.querySelector('.ut-btn-image');
        if (imgBtn) imgBtn.addEventListener('click', () => {
            this.setState({ imageTokenised: !this.state.imageTokenised });
        });

        const audBtn = this.root.querySelector('.ut-btn-audio');
        if (audBtn) audBtn.addEventListener('click', () => {
            this.setState({ audioTokenised: !this.state.audioTokenised });
        });

        const mulBtn = this.root.querySelector('.ut-btn-multi');
        if (mulBtn) mulBtn.addEventListener('click', () => {
            this.setState({ multiTokenised: !this.state.multiTokenised });
        });

        // Hover sync: image grid ↔ sequence
        this.root.querySelectorAll('[data-patch]').forEach(el => {
            el.addEventListener('mouseenter', () => {
                const idx = el.dataset.patch;
                this.root.querySelector(`[data-seq-patch="${idx}"]`)?.classList.add('ut-seq-highlight');
                el.classList.add('ut-gpatch-hover');
            });
            el.addEventListener('mouseleave', () => {
                const idx = el.dataset.patch;
                this.root.querySelector(`[data-seq-patch="${idx}"]`)?.classList.remove('ut-seq-highlight');
                el.classList.remove('ut-gpatch-hover');
            });
        });
        this.root.querySelectorAll('[data-seq-patch]').forEach(el => {
            el.addEventListener('mouseenter', () => {
                const idx = el.dataset.seqPatch;
                this.root.querySelector(`[data-patch="${idx}"]`)?.classList.add('ut-gpatch-hover');
                el.classList.add('ut-seq-highlight');
            });
            el.addEventListener('mouseleave', () => {
                const idx = el.dataset.seqPatch;
                this.root.querySelector(`[data-patch="${idx}"]`)?.classList.remove('ut-gpatch-hover');
                el.classList.remove('ut-seq-highlight');
            });
        });

        // Hover sync: audio frames ↔ sequence
        this.root.querySelectorAll('[data-frame]').forEach(el => {
            el.addEventListener('mouseenter', () => {
                const idx = el.dataset.frame;
                this.root.querySelector(`[data-seq-frame="${idx}"]`)?.classList.add('ut-seq-highlight');
                el.classList.add('ut-flabel-hover');
            });
            el.addEventListener('mouseleave', () => {
                const idx = el.dataset.frame;
                this.root.querySelector(`[data-seq-frame="${idx}"]`)?.classList.remove('ut-seq-highlight');
                el.classList.remove('ut-flabel-hover');
            });
        });
    }
}

/*──────────────────────────────────────────────────────────────────────────────
  Styles
──────────────────────────────────────────────────────────────────────────────*/

(function injectStyles() {
    if (document.getElementById('ut-styles')) return;
    const s = document.createElement('style');
    s.id = 'ut-styles';
    s.textContent = `
.ut-widget { font-family:var(--font-body); }
.ut-intro { font-size:var(--text-sm); color:var(--color-text-muted); line-height:var(--leading-relaxed); margin-bottom:1.25rem; }
.ut-intro em { color:var(--color-secondary); font-style:normal; font-weight:600; }

/* Cards */
.ut-card { border:1px solid var(--color-border); border-radius:var(--radius-md); padding:1.25rem; margin-bottom:1rem; background:var(--color-surface); }
.ut-card-header { display:flex; gap:0.75rem; align-items:flex-start; margin-bottom:1rem; }
.ut-card-icon { font-size:1.5rem; line-height:1; flex-shrink:0; margin-top:0.1rem; }
.ut-card-title { font-size:var(--text-base); font-weight:700; color:var(--color-text); margin:0 0 0.25rem; }
.ut-card-sub { font-size:var(--text-sm); color:var(--color-text-muted); line-height:var(--leading-relaxed); margin:0; }
.ut-card-body { }
.ut-card-action { margin:0.75rem 0; }

/* Image section */
.ut-image-wrap { position:relative; max-width:360px; border-radius:var(--radius-sm); overflow:hidden; border:1px solid var(--color-border); }
.ut-sample-img { display:block; width:100%; height:auto; }
.ut-grid-overlay { position:absolute; inset:0; display:grid; grid-template-columns:repeat(6,1fr); grid-template-rows:repeat(4,1fr); }
.ut-gpatch { border:1px solid rgba(255,255,255,0.5); display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.15); transition:background 150ms; cursor:default; }
.ut-gpatch-hover { background:rgba(255,255,255,0.35); }
.ut-gpatch-num { font-size:0.55rem; font-weight:700; color:rgba(255,255,255,0.9); text-shadow:0 1px 2px rgba(0,0,0,0.5); }

/* Audio section */
.ut-waveform-wrap { max-width:480px; }
.ut-waveform { display:block; width:100%; height:auto; border:1px solid var(--color-border); border-radius:var(--radius-sm); }
.ut-frame-labels { display:flex; justify-content:space-around; margin-top:0.25rem; }
.ut-flabel { font-size:0.6rem; color:var(--color-text-muted); font-weight:500; padding:0.15rem 0.3rem; border-radius:3px; cursor:default; transition:background 150ms; }
.ut-flabel-hover { background:rgba(139,92,246,0.15); color:#7c3aed; }

/* Insight panels */
.ut-insight { margin-top:0.75rem; padding:0.875rem; background:var(--color-surface-2); border-radius:var(--radius-md); }
.ut-insight-text { font-size:var(--text-sm); color:var(--color-text-muted); line-height:var(--leading-relaxed); margin:0.75rem 0 0; }

/* Token sequences */
.ut-token-sequence, .ut-frame-sequence, .ut-combined-seq { display:flex; flex-wrap:wrap; gap:0.3rem; margin-bottom:0.25rem; }
.ut-seq-chip { padding:0.2rem 0.45rem; border-radius:4px; font-size:0.65rem; font-weight:600; transition:transform 150ms, box-shadow 150ms; cursor:default; }
.ut-seq-highlight { transform:scale(1.2); box-shadow:0 2px 8px rgba(0,0,0,0.2); z-index:1; position:relative; }
.ut-seq-audio { color:#fff; }

/* Multimodal section */
.ut-multi-example { padding:0.75rem; background:var(--color-surface-2); border-radius:var(--radius-md); margin-bottom:0.5rem; }
.ut-multi-input { display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; }
.ut-multi-block { padding:0.625rem 0.875rem; border-radius:var(--radius-sm); border:1px solid var(--color-border); background:var(--color-surface); }
.ut-multi-label { font-size:var(--text-xs); font-weight:600; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:0.25rem; }
.ut-multi-text-block p { font-size:var(--text-sm); margin:0; font-style:italic; color:var(--color-text); }
.ut-multi-img-block { display:flex; flex-direction:column; align-items:center; }
.ut-multi-thumb { width:80px; height:60px; }
.ut-multi-plus { font-size:1.25rem; font-weight:700; color:var(--color-text-muted); }

/* Combined sequence chips */
.ut-seq-text { background:#99f6e4; color:#0f766e; }
.ut-seq-img { background:#fde68a; color:#92400e; }
.ut-seq-answer { background:#c7d2fe; color:#3730a3; }
.ut-seq-divider { font-size:var(--text-sm); font-weight:700; color:var(--color-text-light); display:flex; align-items:center; padding:0 0.2rem; }
.ut-seq-legend { display:flex; gap:1rem; margin-top:0.5rem; flex-wrap:wrap; }
.ut-legend-item { font-size:var(--text-xs); color:var(--color-text-muted); display:flex; align-items:center; gap:0.3rem; }
.ut-legend-dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
.ut-legend-text { background:#99f6e4; }
.ut-legend-img { background:#fde68a; }
.ut-legend-answer { background:#c7d2fe; }

/* Takeaway */
.ut-takeaway { border-top:1px solid var(--color-border); padding-top:1.25rem; margin-top:0.5rem; }
.ut-takeaway-diagram { display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1rem; max-width:400px; margin-left:auto; margin-right:auto; }
.ut-td-row { display:flex; align-items:center; gap:0.5rem; }
.ut-td-label { font-size:var(--text-xs); font-weight:600; padding:0.3rem 0.6rem; border-radius:var(--radius-sm); min-width:120px; text-align:center; }
.ut-td-text { background:#99f6e4; color:#0f766e; }
.ut-td-image { background:#fde68a; color:#92400e; }
.ut-td-audio { background:#e9d5ff; color:#6b21a8; }
.ut-td-arrow { color:var(--color-text-light); font-weight:700; }
.ut-td-box { font-size:var(--text-xs); font-weight:600; padding:0.3rem 0.6rem; border-radius:var(--radius-sm); background:var(--color-surface-2); color:var(--color-text); border:1px solid var(--color-border); }
.ut-takeaway-text { font-size:var(--text-sm); color:var(--color-text-muted); line-height:var(--leading-relaxed); text-align:center; }
.ut-takeaway-text strong { color:var(--color-secondary); }

@media(max-width:640px) {
    .ut-multi-input { flex-direction:column; align-items:stretch; }
    .ut-multi-plus { text-align:center; }
    .ut-td-label { min-width:90px; font-size:0.6rem; }
}
    `;
    document.head.appendChild(s);
}());
