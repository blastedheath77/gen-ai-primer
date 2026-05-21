/**
 * Vercel serverless function: POST /api/gemini-predict
 * Holds the Gemini API key server-side and proxies a prediction request.
 *
 * Body:  { text: string, topK?: number }
 * Reply: { predictions: [{ token, prob }, ...] }
 */

const MODEL = 'gemini-3.1-flash-lite-preview';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on the server.' });
    }

    const { text, topK = 10 } = req.body || {};
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "text" in request body.' });
    }

    const systemInstr =
        `You are simulating a language model's next-word probability distribution. ` +
        `Given a partial passage, output exactly ${topK} candidate single-word (or token-like) continuations that an LLM would most likely produce next, ranked from most to least likely, along with your estimate of each candidate's relative probability (probabilities should sum to roughly 1). ` +
        `Include a mix of plausible options — not just synonyms. Each token should be the literal next word with its natural leading space if it starts a new word (e.g. " saw"). Avoid full sentences; each token is one word or punctuation mark. ` +
        `Output ONLY raw JSON in this exact shape, with no markdown fences and no commentary:\n` +
        `{"predictions":[{"token":"<word>","prob":<0.x>}, ...]}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
        contents: [{ role: 'user', parts: [{ text: `Partial passage:\n"${text}"\n\nProduce the JSON now.` }] }],
        systemInstruction: { parts: [{ text: systemInstr }] },
        generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.7,
            responseMimeType: 'application/json'
        }
    };

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!resp.ok) {
            const errText = await resp.text();
            return res.status(resp.status).json({ error: `Gemini HTTP ${resp.status}: ${errText.slice(0, 200)}` });
        }
        const data = await resp.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!raw) return res.status(502).json({ error: 'Empty response from Gemini.' });

        const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (_) {
            return res.status(502).json({ error: `Could not parse Gemini JSON: ${cleaned.slice(0, 120)}` });
        }
        const list = Array.isArray(parsed) ? parsed : parsed.predictions;
        if (!Array.isArray(list) || !list.length) {
            return res.status(502).json({ error: 'Gemini returned no predictions.' });
        }

        const valid = list
            .filter(p => typeof p.token === 'string' && Number.isFinite(p.prob))
            .map(p => ({ token: p.token, prob: Math.max(0, p.prob) }));
        const sum = valid.reduce((s, p) => s + p.prob, 0) || 1;
        const predictions = valid
            .map(p => ({ token: p.token, prob: p.prob / sum }))
            .sort((a, b) => b.prob - a.prob);

        return res.status(200).json({ predictions });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
