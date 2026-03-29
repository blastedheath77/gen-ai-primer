/**
 * tokeniser.js
 * Widget for Page 2 — Tokens: How AI Reads Text.
 * Provides a real-time BPE-approximate tokeniser with coloured chips.
 */

import { Widget } from '../core/widget-base.js';

// ── Tokeniser algorithm ───────────────────────────────────────────────────────

/**
 * Common English words that should remain as single tokens (GPT-style vocabulary).
 * Space-prefixed forms indicate the word follows a space.
 */
const COMMON_WORDS = new Set([
    'the','of','and','to','in','is','it','that','he','she','was','for',
    'on','are','as','with','his','they','at','be','this','have','from',
    'or','by','not','but','we','an','you','my','all','can','her','were',
    'do','has','more','up','will','out','if','about','who','get','which',
    'go','me','when','make','like','him','into','time','has','look','two',
    'more','write','go','see','number','no','way','could','people','my',
    'than','first','water','been','call','who','oil','its','now','find',
    'long','down','day','did','get','come','made','may','part','over',
    'new','sound','take','only','little','work','know','place','years',
    'live','back','give','most','very','after','things','our','just',
    'name','good','sentence','man','think','say','great','where','help',
    'through','much','before','line','right','too','means','old','any',
    'same','tell','boy','follow','came','want','show','also','around',
    'form','small','set','put','end','does','another','well','large',
    'need','big','high','such','turn','here','why','ask','went','men',
    'read','land','different','home','us','move','try','kind','hand',
    'picture','again','change','play','spell','air','away','animal',
    'house','point','page','letter','mother','answer','found','study',
    'still','learn','plant','cover','food','sun','four','between','state',
    'keep','eye','never','last','let','thought','city','tree','cross',
    'farm','hard','start','might','story','saw','far','sea','draw',
    'left','late','run','while','press','close','night','real','life',
    'few','north','open','seem','together','next','white','children',
    'begin','got','walk','example','ease','paper','group','always',
    'music','those','both','mark','book','carry','took','science','eat',
    'room','friend','began','idea','fish','mountain','stop','once',
    'base','hear','horse','cut','sure','watch','color','face','wood',
    'main','enough','plain','girl','usual','young','ready','above',
    'ever','red','list','though','feel','talk','bird','soon','body',
    'dog','family','direct','pose','leave','song','measure','door',
    'product','black','short','numeral','class','wind','question','happen',
    'complete','ship','area','half','rock','order','fire','south',
    'problem','piece','told','knew','pass','since','top','whole','king',
    'space','heard','best','hour','better','true','during','hundred',
    'five','remember','step','early','hold','west','ground','interest',
    'reach','fast','verb','sing','listen','six','table','travel','less',
    'morning','ten','simple','several','vowel','toward','war','lay','against',
    'pattern','slow','center','love','person','money','serve','appear',
    'road','map','rain','rule','govern','pull','cold','notice','voice',
    'unit','power','town','fine','drive','print','fell','drew','car',
    'force','blue','object','decide','surface','deep','moon','island',
    'foot','system','busy','test','record','boat','common','gold','possible',
    'plane','age','dry','wonder','laugh','thousands','ago','ran','check',
    'game','shape','equate','hot','miss','brought','heat','snow','tire',
    'bring','yes','distant','fill','east','paint','language','among',
    'grand','ball','yet','wave','drop','heart','am','present','heavy',
    'dance','engine','position','arm','wide','sail','material','size',
    'vary','settle','speak','weight','general','ice','matter','circle',
    'pair','include','divide','syllable','felt','perhaps','pick','sudden',
    'count','square','reason','length','represent','art','subject','region',
    'energy','hunt','probable','bed','brother','egg','ride','cell','believe',
    'fraction','forest','sit','race','window','store','summer','train',
    'sleep','prove','lone','leg','exercise','wall','catch','mount','wish',
    'sky','board','joy','winter','sat','written','wild','instrument',
    'kept','glass','grass','cow','job','edge','sign','visit','past',
    'soft','fun','bright','gas','weather','month','million','bear','finish',
    'happy','hope','flower','clothe','strange','gone','jump','baby',
    'eight','village','meet','root','buy','raise','solve','metal','whether',
    'push','seven','paragraph','third','shall','held','hair','describe',
    'cook','floor','either','result','burn','hill','safe','cat','century',
    'consider','type','law','bit','coast','copy','phrase','silent','tall',
    'sand','soil','roll','temperature','finger','industry','value','fight',
    'lie','beat','excite','natural','view','sense','ear','else','quite',
    'broke','case','middle','kill','son','lake','moment','scale','loud',
    'spring','observe','child','straight','consonant','nation','dictionary',
    'milk','speed','method','organ','pay','age','section','dress','cloud',
    'surprise','quiet','stone','tiny','climb','cool','design','poor',
    'lot','experiment','bottom','key','iron','single','stick','flat',
    'twenty','skin','smile','crease','hole','trade','melody','trip',
    'office','receive','row','mouth','exact','symbol','die','least',
    'trouble','shout','except','wrote','seed','tone','join','suggest',
    'clean','break','lady','yard','rise','bad','blow','oil','blood',
    'touch','grew','cent','mix','team','wire','cost','lost','brown',
    'wear','garden','equal','sent','choose','fell','fit','flow','fair',
    'bank','save','control','decimal','gentle','woman','captain','practice',
    'separate','difficult','doctor','please','protect','noon','whose',
    'locate','ring','character','insect','caught','period','indicate',
    'radio','spoke','atom','human','history','effect','electric','expect',
    'crop','modern','element','hit','student','corner','party','supply',
    'bone','rail','imagine','provide','agree','thus','capital','chair',
    'danger','fruit','rich','thick','soldier','process','operate','guess',
    'necessary','sharp','wing','create','neighbor','wash','bat','rather',
    'crowd','corn','compare','poem','string','bell','depend','meat',
    'rub','tube','famous','dollar','stream','fear','sight','thin','triangle',
    'planet','hurry','chief','colony','clock','mine','tie','enter','major',
    'fresh','search','send','yellow','gun','allow','print','dead','spot',
    'desert','suit','current','lift','rose','continue','block','chart',
    'hat','sell','success','company','subtract','event','particular',
    'deal','swim','term','opposite','wife','shoe','shoulder','spread',
    'arrange','camp','invent','cotton','born','determine','quart','nine',
    'truck','noise','level','chance','gather','shop','stretch','throw',
    'shine','property','column','molecule','select','wrong','gray','repeat',
    'require','broad','prepare','salt','nose','plural','anger','claim',
    'condition','supply','maybe','win','drink','human','women','men',
]);

/** Common prefixes and suffixes for morpheme-boundary splitting */
const PREFIXES = ['un','re','pre','dis','over','under','out','mis','non','anti','pro','sub','super','inter','trans','ultra','extra','semi','mid'];
const SUFFIXES = ['ing','tion','sion','ness','ment','able','ible','ful','less','ous','ive','al','ity','ism','ist','ize','ise','ly','er','est','ed','en','age','ance','ence'];

/**
 * Known BPE splits for words that the heuristic gets wrong.
 * Based on OpenAI's cl100k_base tokenizer (GPT-4 / ChatGPT).
 * Keys are lowercase; values are arrays of sub-token strings.
 */
const BPE_OVERRIDES = {
    // Places & proper nouns
    'edinburgh':    ['Ed', 'inburgh'],
    'pittsburgh':   ['Pitts', 'burgh'],
    'copenhagen':   ['Cop', 'enhagen'],
    'tokyo':        ['Tok', 'yo'],
    'london':       ['London'],
    'amsterdam':    ['Amst', 'erdam'],
    'stockholm':    ['Stock', 'holm'],
    'melbourne':    ['Mel', 'bourne'],
    'singapore':    ['Sing', 'apore'],
    'manhattan':    ['Man', 'hattan'],
    'shakespeare':  ['Sh', 'akes', 'peare'],
    // Tech terms
    'chatgpt':      ['Chat', 'G', 'PT'],
    'openai':       ['Open', 'AI'],
    'github':       ['Git', 'hub'],
    'javascript':   ['Java', 'Script'],
    'typescript':   ['Type', 'Script'],
    'tensorflow':   ['Tensor', 'flow'],
    'pytorch':      ['Py', 'Torch'],
    'kubernetes':   ['Kub', 'ernetes'],
    'stackoverflow':['Stack', 'Over', 'flow'],
    'webpack':      ['Web', 'pack'],
    // Programming
    'fibonacci':    ['f', 'ibon', 'acci'],
    'algorithm':    ['algorithm'],
    'recursive':    ['recurs', 'ive'],
    'concatenate':  ['concat', 'enate'],
    'initialization':['initial', 'ization'],
    'asynchronous': ['async', 'hronous'],
    // Common long words the heuristic mangles
    'antidisestablishmentarianism': ['ant', 'idis', 'est', 'ablish', 'ment', 'arian', 'ism'],
    'pneumonoultramicroscopicsilicovolcanoconiosis': ['pne', 'um', 'on', 'oult', 'ram', 'icro', 'scop', 'ics', 'ilic', 'ov', 'olcan', 'ocon', 'iosis'],
    'supercalifragilisticexpialidocious': ['super', 'cal', 'ifrag', 'il', 'istic', 'exp', 'ial', 'id', 'ocious'],
    'beautiful':    ['beautiful'],
    'technology':   ['technology'],
    'california':   ['California'],
    'microsoft':    ['Microsoft'],
    'university':   ['university'],
    'information':  ['information'],
    'environment':  ['environment'],
    'international':['international'],
    'communication':['communication'],
    'understanding':['understanding'],
    'intelligence': ['intelligence'],
    'unfortunately':['unfortunately'],
    'approximately':['approximately'],
    'significantly':['significantly'],
    'extraordinary':['extra', 'ordinary'],
    'uncomfortable':['un', 'comfortable'],
    'unpredictable':['un', 'predict', 'able'],
    'revolutionary':['revolution', 'ary'],
    'overwhelming': ['over', 'whelming'],
    'collaboration':['collabor', 'ation'],
    'consciousness':['conscious', 'ness'],
    'hallucination':['hall', 'ucin', 'ation'],
    'transformer':  ['transform', 'er'],
    'tokenization': ['token', 'ization'],
    'tokenisation': ['token', 'isation'],
    'embedding':    ['embed', 'ding'],
    'embeddings':   ['embed', 'dings'],
    'probability':  ['probability'],
    'prediction':   ['prediction'],
    'generative':   ['gener', 'ative'],
    'reinforcement':['reinforce', 'ment'],
    'alignment':    ['alignment'],
    'parameters':   ['parameters'],
    'lanarkshire':  ['Lan', 'ark', 'shire'],
    'scottish':     ['Scottish'],
    'scotland':     ['Scotland'],
    'glasgow':      ['Glasgow'],
};

/**
 * Simple BPE-approximate tokeniser that mimics GPT-2 tokenisation.
 * Spaces attach to the following word token.
 * @param {string} text
 * @returns {Array<{text: string, id: number}>}
 */
function tokenize(text) {
    if (!text) return [];

    const tokens = [];
    let i = 0;

    while (i < text.length) {
        const ch = text[i];

        // Whitespace: attach to the next word (GPT-2 style: " hello" is one token)
        if (ch === ' ' || ch === '\t') {
            // Collect the space + the following word
            let spaceStr = '';
            while (i < text.length && (text[i] === ' ' || text[i] === '\t')) {
                spaceStr += text[i++];
            }
            if (i < text.length && /[A-Za-z]/.test(text[i])) {
                // Read the word
                let word = '';
                while (i < text.length && /[A-Za-z']/.test(text[i])) {
                    word += text[i++];
                }
                // Tokenise the space+word combination
                const subTokens = tokenizeWord(word, spaceStr);
                tokens.push(...subTokens);
            } else {
                // Lone whitespace (before digit/punct)
                tokens.push({ text: spaceStr, id: hashCode(spaceStr) });
            }
            continue;
        }

        // Newline
        if (ch === '\n') {
            tokens.push({ text: '↵', id: hashCode('\n') });
            i++;
            continue;
        }

        // Emoji: approximate — consume up to 4 code-units
        const cp = text.codePointAt(i);
        if (cp && cp > 0xFFFF) {
            // Supplementary plane: 2 code units per character, output 2–4 tokens
            const emojiStr = String.fromCodePoint(cp);
            tokens.push({ text: emojiStr + '①', id: hashCode(emojiStr + '1') });
            tokens.push({ text: emojiStr + '②', id: hashCode(emojiStr + '2') });
            i += 2;
            continue;
        }

        // ASCII letters at word start (no leading space)
        if (/[A-Za-z]/.test(ch)) {
            let word = '';
            while (i < text.length && /[A-Za-z']/.test(text[i])) {
                word += text[i++];
            }
            const subTokens = tokenizeWord(word, '');
            tokens.push(...subTokens);
            continue;
        }

        // Digit runs
        if (/[0-9]/.test(ch)) {
            let num = '';
            while (i < text.length && /[0-9]/.test(text[i])) {
                num += text[i++];
            }
            // Each group of up to 3 digits is a token (approximate)
            for (let n = 0; n < num.length; n += 3) {
                const chunk = num.slice(n, n + 3);
                tokens.push({ text: chunk, id: hashCode(chunk) });
            }
            continue;
        }

        // Punctuation: each character is its own token
        tokens.push({ text: ch, id: hashCode(ch) });
        i++;
    }

    return tokens;
}

/**
 * Splits a word (without leading space) into sub-tokens, then re-attaches the prefix.
 */
function tokenizeWord(word, spacePfx) {
    const lower = word.toLowerCase();
    const pfxStr = spacePfx;

    // Common contractions stay together
    const contractions = ["don't","can't","won't","isn't","aren't","wasn't","weren't","it's","i'm","i've","i'll","i'd","you're","they're","we're","he's","she's","that's","what's","who's"];
    if (contractions.includes(lower)) {
        return [{ text: pfxStr + word, id: hashCode(pfxStr + lower) }];
    }

    // Check BPE overrides first (takes priority over common words list)
    const override = BPE_OVERRIDES[lower];
    if (override && override.length > 1) {
        return override.map((p, idx) => ({
            text: (idx === 0 ? pfxStr : '') + restoreCase(word, p, idx, override),
            id: hashCode((idx === 0 ? pfxStr : '') + p.toLowerCase()),
        }));
    }

    // Common words as single tokens
    if (COMMON_WORDS.has(lower) || (override && override.length === 1)) {
        return [{ text: pfxStr + word, id: hashCode(pfxStr + lower) }];
    }

    // Long/unusual words: try prefix+suffix splitting
    const parts = splitWord(lower);
    if (parts.length === 1) {
        return [{ text: pfxStr + word, id: hashCode(pfxStr + lower) }];
    }

    // Re-attach space prefix to first sub-token, preserve original casing for display
    return parts.map((p, idx) => ({
        text: (idx === 0 ? pfxStr : '') + restoreCase(word, p, idx, parts),
        id: hashCode((idx === 0 ? pfxStr : '') + p),
    }));
}

/**
 * Attempts to split a word at morpheme boundaries (prefix/suffix/stem).
 * First checks a lookup table of known BPE splits, then falls back to heuristics.
 */
function splitWord(word) {
    // Check BPE override table first (case-insensitive)
    const override = BPE_OVERRIDES[word.toLowerCase()];
    if (override) return override;

    if (word.length <= 4) return [word];

    // Try prefix
    for (const pfx of PREFIXES) {
        if (word.startsWith(pfx) && word.length > pfx.length + 3) {
            const stem = word.slice(pfx.length);
            if (COMMON_WORDS.has(stem) || stem.length >= 3) {
                const stemParts = stem.length > 6 ? splitWord(stem) : [stem];
                return [pfx, ...stemParts];
            }
        }
    }

    // Try suffix
    for (const sfx of SUFFIXES) {
        if (word.endsWith(sfx) && word.length > sfx.length + 3) {
            const stem = word.slice(0, word.length - sfx.length);
            if (COMMON_WORDS.has(stem) || stem.length >= 3) {
                const stemParts = stem.length > 6 ? splitWord(stem) : [stem];
                return [...stemParts, sfx];
            }
        }
    }

    // For very long words, split roughly in half
    if (word.length > 10) {
        const mid = Math.floor(word.length / 2);
        return [word.slice(0, mid), word.slice(mid)];
    }

    return [word];
}

/** Rough case restoration for a sub-part of the original word. */
function restoreCase(original, part, idx, parts) {
    // If original is all uppercase, uppercase the part
    if (original === original.toUpperCase()) return part.toUpperCase();
    // If first char of original is uppercase and this is the first part, capitalise
    if (idx === 0 && original[0] === original[0].toUpperCase()) {
        return part[0].toUpperCase() + part.slice(1);
    }
    return part;
}

/** Simple hash for assigning a deterministic "token ID". */
function hashCode(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return ((h >>> 0) % 50000) + 1;
}

// ── Widget ────────────────────────────────────────────────────────────────────

const TOKEN_COLOURS = [
    '#0d9488','#d97706','#6366f1','#e11d48',
    '#059669','#7c3aed','#b45309','#0284c7',
];

const EXAMPLES = [
    'Hello world',
    'unbreakable',
    'Edinburgh',
    'antidisestablishmentarianism',
    'ChatGPT',
    '🎵🤖',
    'The quick brown fox',
    'def fibonacci(n):',
];

export class Tokeniser extends Widget {
    get defaults() { return { debounceMs: 150 }; }

    createDOM() {
        this.container.innerHTML = `
            <div class="tok-widget">
                <div class="tok-examples-label">Try these:</div>
                <div class="tok-examples" id="tok-examples">
                    ${EXAMPLES.map(ex => `<button class="btn btn-secondary tok-example-btn" data-text="${ex}">${ex}</button>`).join('')}
                </div>
                <div class="tok-input-area">
                    <textarea
                        id="tok-input"
                        class="tok-textarea"
                        placeholder="Type anything here…"
                        rows="4"
                        spellcheck="false"
                    ></textarea>
                </div>
                <div class="tok-chips-area">
                    <div class="tok-count" id="tok-count">Tokens: 0</div>
                    <div class="tok-chips" id="tok-chips"></div>
                </div>
                <details class="tok-explainer">
                    <summary class="tok-explainer-toggle">How tokenisation works</summary>
                    <div class="tok-explainer-body">
                        <p>Before a language model sees any text, it converts it to <strong>tokens</strong> — the basic units it operates on. Tokenisation uses an algorithm called <strong>Byte-Pair Encoding (BPE)</strong>.</p>
                        <p>BPE starts by splitting text into individual characters, then iteratively merges the most frequent adjacent pairs. After enough merges, common words become single tokens while rare or long words remain split into sub-word units. The splits can seem arbitrary — "Edinburgh" becomes "Ed" + "inburgh" — because they're driven by statistical frequency in training data, not linguistic rules.</p>
                        <p>Key observations: spaces usually attach to the word that <em>follows</em> them (" hello" is one token). Rare words split into pieces that may not be recognisable morphemes. Emoji need multiple tokens because they're encoded as multi-byte sequences.</p>
                        <p>GPT-4 uses roughly 100,000 tokens in its vocabulary. A rule of thumb: 1 token ≈ ¾ of an English word, so 100 tokens is about 75 words.</p>
                        <p><em>Note: this widget approximates real BPE tokenisation. For exact results, use OpenAI's <a href="https://platform.openai.com/tokenizer" target="_blank" rel="noopener">official tokenizer tool</a>.</em></p>
                    </div>
                </details>
            </div>`;
    }

    bindEvents() {
        this._timer = null;
        const input = this.container.querySelector('#tok-input');
        input.addEventListener('input', () => {
            clearTimeout(this._timer);
            this._timer = setTimeout(() => this._tokeniseInput(), this.config.debounceMs);
        });

        this.container.querySelectorAll('.tok-example-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = btn.dataset.text;
                this._tokeniseInput();
                input.focus();
            });
        });
    }

    _tokeniseInput() {
        const text = this.container.querySelector('#tok-input').value;
        const tokens = tokenize(text);
        this._renderChips(tokens);
    }

    _renderChips(tokens) {
        const chipsEl = this.container.querySelector('#tok-chips');
        const countEl = this.container.querySelector('#tok-count');

        countEl.textContent = `Tokens: ${tokens.length}`;

        if (tokens.length === 0) {
            chipsEl.innerHTML = '';
            return;
        }

        chipsEl.innerHTML = tokens.map((tok, i) => {
            const colour = TOKEN_COLOURS[i % TOKEN_COLOURS.length];
            const display = tok.text
                .replace(/&/g,'&amp;')
                .replace(/</g,'&lt;')
                .replace(/>/g,'&gt;');
            return `<span
                class="tok-chip"
                style="--chip-color:${colour}"
                title="Token ID: ${tok.id}"
                aria-label="Token: ${display}, ID: ${tok.id}"
            >${display}</span>`;
        }).join('');
    }

    render() {}
}

// ── Inline styles ─────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('tok-styles')) return;
    const style = document.createElement('style');
    style.id = 'tok-styles';
    style.textContent = `
.tok-widget { font-family:var(--font-body); }
.tok-examples-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); font-weight:600; margin-bottom:0.5rem; }
.tok-examples { display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1.25rem; }
.tok-example-btn { font-size:var(--text-xs); padding:0.3rem 0.75rem; cursor:pointer; }
.tok-textarea { display:block; width:100%; padding:0.75rem 1rem; border:1px solid var(--color-border); border-radius:var(--radius-sm); font-family:var(--font-mono); font-size:var(--text-sm); color:var(--color-text); background:var(--color-surface); resize:vertical; line-height:1.6; }
.tok-textarea:focus { outline:none; border-color:var(--color-primary); box-shadow:0 0 0 3px rgba(13,148,136,0.12); }
.tok-chips-area { margin-top:1rem; }
.tok-count { font-size:var(--text-sm); font-weight:600; color:var(--color-text-muted); margin-bottom:0.625rem; }
.tok-chips { display:flex; flex-wrap:wrap; gap:4px; min-height:32px; }
.tok-chip {
    display:inline-flex; align-items:center; padding:0.2rem 0.5rem;
    border-radius:4px; font-family:var(--font-mono); font-size:var(--text-sm);
    background:color-mix(in srgb, var(--chip-color) 12%, transparent);
    color:var(--chip-color); border:1px solid color-mix(in srgb, var(--chip-color) 30%, transparent);
    cursor:default; white-space:pre; transition:transform 0.1s;
    user-select:none;
}
.tok-chip:hover { transform:scale(1.05); }
.tok-explainer { margin-top:1.5rem; border-top:1px solid var(--color-border); padding-top:1rem; }
.tok-explainer-toggle { font-size:var(--text-sm); font-weight:500; color:var(--color-primary); cursor:pointer; list-style:none; display:flex; align-items:center; gap:0.4rem; }
.tok-explainer-toggle::-webkit-details-marker { display:none; }
.tok-explainer-toggle::marker { display:none; content:''; }
.tok-explainer-toggle::before { content:'▶'; font-size:1.1rem; margin-right:0.25em; transition:transform 0.2s ease; display:inline-block; }
details[open] .tok-explainer-toggle::before { transform:rotate(90deg); }
.tok-explainer-body { padding-top:0.75rem; }
.tok-explainer-body p { font-size:var(--text-sm); color:var(--color-text-muted); line-height:var(--leading-relaxed); margin-bottom:0.75rem; }
.tok-explainer-body p:last-child { margin-bottom:0; }
    `;
    document.head.appendChild(style);
}());
