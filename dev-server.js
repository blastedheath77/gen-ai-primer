/**
 * dev-server.js — minimal local dev server (no Vercel CLI needed).
 * Serves static files + handles /api/gemini-predict.
 * Reads GEMINI_API_KEY from .env in the same directory.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Load .env ────────────────────────────────────────────────────────────────
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
})();

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
};

// ── Gemini API handler ────────────────────────────────────────────────────────
async function handleGeminiPredict(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured in .env' }));
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { text = '', topK = 10 } = JSON.parse(body || '{}');

      const prompt = `You are a language model probability estimator.
Given the text prefix below, return the top ${topK} most likely next single words or short tokens (1-2 words max) with estimated probability scores that sum to 1.0.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"predictions":[{"token":"word","prob":0.35},{"token":"another","prob":0.20},...]}

Text prefix: "${text.replace(/"/g, '\\"')}"`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 512,
            },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        let errMsg = `Gemini HTTP ${geminiRes.status}`;
        try { errMsg = JSON.parse(errText)?.error?.message || errMsg; } catch (_) {}
        res.writeHead(502, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: errMsg }));
      }

      const geminiData = await geminiRes.json();
      const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(raw.trim());

      if (!Array.isArray(parsed.predictions) || !parsed.predictions.length) {
        throw new Error('No predictions in response');
      }

      // Normalise probabilities
      const total = parsed.predictions.reduce((s, p) => s + (p.prob || 0), 0);
      const predictions = parsed.predictions
        .slice(0, topK)
        .map(p => ({ token: String(p.token), prob: total > 0 ? p.prob / total : 1 / parsed.predictions.length }));

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ predictions }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

// ── Static file handler ───────────────────────────────────────────────────────
function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(__dirname, urlPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end(`404: ${urlPath}`);
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

// ── Server ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3333;

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    });
    return res.end();
  }

  if (urlPath === '/api/gemini-predict') {
    return handleGeminiPredict(req, res);
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  Gen AI Primer running at http://localhost:${PORT}\n`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('  ⚠  GEMINI_API_KEY not set — live predictions will fail.\n');
  }
});
