// Password gate for the GitHub Pages build.
//
// Takes the one-file build (dist-single/index.html, everything inlined) and writes
// dist-pages/index.html: a small password page holding the demo encrypted with AES-256-GCM,
// under a key derived from the password with PBKDF2-SHA256 (600,000 iterations). The demo is
// never in the published files as readable text; the browser decrypts it once the password
// is right and replaces the page with it.
//
// What it does not do: GitHub Pages serves this file to anyone with the link, so a weak or
// shared-around password can be guessed offline. Use a long one (four random words), and
// rebuild with a new password to revoke it.
//
// Password: DEMO_PASSWORD in the environment, or a DEMO_PASSWORD=... line in .env.local
// (git-ignored). "Remember on this device" keeps the derived key in localStorage for this
// build; open the page with ?lock to forget it.

import { webcrypto as crypto } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const ITERATIONS = 600_000;
const SRC = 'dist-single/index.html';
const OUT_DIR = 'dist-pages';

function password() {
  if (process.env.DEMO_PASSWORD) return process.env.DEMO_PASSWORD;
  if (existsSync('.env.local')) {
    const line = readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .find((l) => l.startsWith('DEMO_PASSWORD='));
    if (line) return line.slice('DEMO_PASSWORD='.length).trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

const pw = password();
if (pw.length < 10) {
  console.error('Set DEMO_PASSWORD (10 characters or more) in the environment or in .env.local before building the Pages site.');
  process.exit(1);
}
if (!existsSync(SRC)) {
  console.error(`${SRC} not found: run the single-file build first (npm run build:single).`);
  process.exit(1);
}

const html = readFileSync(SRC, 'utf8');
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(html)));
const b64 = (u8) => Buffer.from(u8).toString('base64');
const payload = JSON.stringify({ v: 1, iter: ITERATIONS, salt: b64(salt), iv: b64(iv), ct: b64(ct) });

const gate = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Patient Slot Review demo</title>
<style>
  :root { --bg: #f1f5f9; --card: #fff; --fg: #0f172a; --muted: #475569; --line: #cbd5e1; --accent: #0f766e; --err: #b91c1c; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0b1220; --card: #111a2e; --fg: #e2e8f0; --muted: #94a3b8; --line: #334155; --accent: #2dd4bf; --err: #f87171; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px; background: var(--bg); color: var(--fg);
    font: 15px/1.5 "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif; }
  form { width: 100%; max-width: 380px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 24px; }
  .eyebrow { font-size: 11.5px; font-weight: 700; letter-spacing: .1em; color: var(--accent); margin: 0; }
  h1 { font-size: 22px; margin: 2px 0 6px; }
  p { margin: 0 0 16px; color: var(--muted); font-size: 14px; }
  label { display: block; font-weight: 600; font-size: 13.5px; margin-bottom: 6px; }
  input[type=password] { width: 100%; padding: 10px 12px; font: inherit; color: var(--fg); background: transparent; border: 1px solid var(--line); border-radius: 8px; }
  input[type=password]:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: transparent; }
  .row { display: flex; align-items: center; gap: 8px; margin: 12px 0 16px; font-size: 13.5px; color: var(--muted); }
  .row label { display: inline; font-weight: 400; margin: 0; }
  button { width: 100%; padding: 10px; font: inherit; font-weight: 600; color: #fff; background: var(--accent); border: 0; border-radius: 8px; cursor: pointer; }
  @media (prefers-color-scheme: dark) { button { color: #042f2e; } }
  button:disabled { opacity: .6; cursor: progress; }
  .err { color: var(--err); font-size: 13.5px; font-weight: 600; min-height: 1.5em; margin: 10px 0 0; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<p id="opening">Opening…</p>
<form id="gate" hidden autocomplete="on">
  <p class="eyebrow">SPHINXMATCH DEMO</p>
  <h1>Patient Slot Review</h1>
  <p>This prototype is password protected. Test data only.</p>
  <label for="pw">Password</label>
  <input id="pw" name="password" type="password" autocomplete="current-password" required autofocus />
  <div class="row"><input id="remember" type="checkbox" checked /><label for="remember">Remember on this device</label></div>
  <button id="go" type="submit">Open the demo</button>
  <p class="err" id="err" role="alert"></p>
</form>
<script id="payload" type="application/json">${payload}</script>
<script>
(() => {
  const P = JSON.parse(document.getElementById('payload').textContent);
  const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const STORE = 'psr-gate-key:' + P.salt;
  const $ = (id) => document.getElementById(id);
  const store = {
    get: () => { try { return localStorage.getItem(STORE); } catch { return null; } },
    set: (v) => { try { localStorage.setItem(STORE, v); } catch { /* private window: ask next time */ } },
    drop: () => { try { localStorage.removeItem(STORE); } catch { /* nothing stored */ } },
  };
  const decrypt = async (key) => new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(P.iv) }, key, bytes(P.ct)));
  // Replace this page with the demo. document.open() is ignored while the page is still being
  // parsed (the remembered-key path can finish that early), and the demo would be written in
  // next to the gate instead of replacing it, so wait for the load to finish first.
  const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', () => r(), { once: true })));
  const show = async (html) => {
    await loaded;
    await new Promise((r) => setTimeout(r, 0));
    document.open();
    document.write(html);
    document.close();
  };
  const ask = () => { $('opening').hidden = true; $('gate').hidden = false; $('pw').focus(); };

  if (!window.crypto || !crypto.subtle) {
    $('opening').textContent = 'This browser cannot open the demo (no Web Crypto). Try a current Chrome, Edge, Safari or Firefox.';
    return;
  }
  if (/[?&]lock\\b/.test(location.search)) store.drop();

  const saved = store.get();
  if (saved) {
    crypto.subtle.importKey('raw', bytes(saved), 'AES-GCM', false, ['decrypt']).then(decrypt).then(show).catch(() => { store.drop(); ask(); });
  } else ask();

  $('gate').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('go').disabled = true;
    $('go').textContent = 'Unlocking…';
    $('err').textContent = '';
    try {
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode($('pw').value), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(P.salt), iterations: P.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
      const html = await decrypt(key);
      if ($('remember').checked) store.set(toB64(await crypto.subtle.exportKey('raw', key)));
      show(html);
    } catch {
      $('err').textContent = 'That password did not open the demo.';
      $('go').disabled = false;
      $('go').textContent = 'Open the demo';
      $('pw').select();
    }
  });
})();
</script>
</body>
</html>
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/index.html`, gate);
console.log(`${OUT_DIR}/index.html: ${(gate.length / 1024).toFixed(0)} KB (demo encrypted, ${(html.length / 1024).toFixed(0)} KB before encryption)`);
