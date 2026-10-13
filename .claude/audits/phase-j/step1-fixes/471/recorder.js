// Pasted into the pane via javascript_tool before each timed run (re-installed after every reload).
// Logs every change of the sync banner text (+ Command-rail "pending sync" cell, + board lane) with a
// wall-clock stamp, via MutationObserver (not throttled while the page is hidden) plus a 250 ms poll.
(() => {
  window.scrollTo(0,0);
  if (window.__rec && window.__rec.stop) window.__rec.stop();
  const log = []; let last = null;
  const bannerText = () => { const el = document.querySelector('.fs-sync-banner'); return el ? el.textContent.replace(/\s+/g,' ').trim() : '(no banner)'; };
  const laneOf = () => { const li = document.querySelector('[data-sp-id]'); const lane = li && li.closest('section.fs-lane'); return lane ? lane.getAttribute('aria-label') : '(no lane)'; };
  const pendingSync = () => { const m = document.body.innerText.replace(/\s+/g,' ').match(/(\d+)\s*pending sync/i); return m ? m[0] : 'none'; };
  const ts = () => new Date().toISOString().slice(11,23);
  const read = () => bannerText() + ' || lane=' + laneOf() + ' || rail=' + pendingSync();
  const tick = (why) => { const t = read(); if (t !== last) { last = t; log.push([Date.now(), ts(), why, document.visibilityState, t]); } };
  const mo = new MutationObserver(() => tick('mut'));
  mo.observe(document.body, {subtree:true, childList:true, characterData:true});
  const iv = setInterval(() => tick('iv'), 250);
  const errs = [], vis = [];
  const onRej = e => errs.push([ts(), 'unhandledrejection', String(e.reason && (e.reason.stack || e.reason)).slice(0,300)]);
  const onErr = e => errs.push([ts(), 'error', String(e.message).slice(0,300)]);
  const onVis = () => vis.push([ts(), document.visibilityState]);
  window.addEventListener('unhandledrejection', onRej); window.addEventListener('error', onErr); document.addEventListener('visibilitychange', onVis);
  window.__rec = { log, errs, vis, bannerText, laneOf, pendingSync, stop() { mo.disconnect(); clearInterval(iv); window.removeEventListener('unhandledrejection', onRej); window.removeEventListener('error', onErr); document.removeEventListener('visibilitychange', onVis); } };
  tick('init'); vis.push([ts(), 'init:' + document.visibilityState]);
  return JSON.stringify({installed: true, first: log[0]});
})()
