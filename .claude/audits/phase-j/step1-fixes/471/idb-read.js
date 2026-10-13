// Pasted into the pane via javascript_tool. Opens the department bucket raw (no version => no upgrade) and reports the
// quarantine / events / meta contents. DB name = fieldshore-dept-<deptId> (src/data/store/db.ts DEPT_DB_PREFIX).
(async () => {
  const name = 'fieldshore-dept-a1109487-1a15-4688-8f0e-54ce6cce16c3';
  const db = await new Promise((res, rej) => { const r = indexedDB.open(name); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej('blocked'); });
  const getAll = (s) => new Promise((res, rej) => { const tx = db.transaction(s, 'readonly'); const rq = tx.objectStore(s).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
  const q = await getAll('quarantine'); const ev = await getAll('events'); const meta = await getAll('meta');
  const out = { dbVersion: db.version, stores: [...db.objectStoreNames], quarantineCount: q.length,
    quarantineRows: q.map(r => ({ id: r.id, type: r.type, reason: r.reason, quarantinedAtISO: new Date(r.quarantinedAt).toISOString() })),
    eventsCount: ev.length, eventTypes: ev.map(e => e.type), quarantinedIdsInEvents: q.map(r => ev.some(e => e.id === r.id)),
    metaRejected: meta.filter(m => String(m.key ?? '').includes('rejected')).map(m => JSON.stringify(m)) };
  db.close();
  return JSON.stringify(out, null, 1);
})()
