// Drive headless Chrome over CDP: optionally emulate display-mode: standalone (what DevTools does),
// load the app root on a FRESH profile, report where it landed and the entered flag.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [mode, url] = process.argv.slice(2); // mode: 'standalone' | 'browser'
const port = 9300 + Math.floor(Math.random() * 500);
const prof = mkdtempSync(join(tmpdir(), 'fs-cdp-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', 'about:blank'],
  { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver;
for (let i = 0; i < 40 && !ver; i++) { await sleep(250); try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch {} }
if (!ver) { chrome.kill('SIGKILL'); throw new Error('chrome did not start'); }
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
if (mode === 'standalone') await send('Emulation.setEmulatedMedia', { features: [{ name: 'display-mode', value: 'standalone' }] }, sessionId);
if (mode === 'ios') await send('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });" }, sessionId);
const probe = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)).result.result.value;
await send('Page.navigate', { url }, sessionId);
await sleep(4000);
const out = await probe(`JSON.stringify({ mode: ${JSON.stringify(mode)}, mq: matchMedia('(display-mode: standalone)').matches, navStandalone: navigator.standalone, path: location.pathname, title: document.title, entered: (()=>{try{return localStorage.getItem('fieldshore_entered')}catch(e){return 'n/a'}})(), heading: (document.querySelector('h1,h2')||{}).textContent })`);
console.log(out);
ws.close(); chrome.kill('SIGKILL');
