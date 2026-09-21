require('dotenv').config({ quiet: true });
const { zipSync, strToU8 } = require('fflate');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
(async () => {
  if (!process.env.ADMIN_SECRET || process.env.ADMIN_SECRET.length < 16) throw new Error('A configured publisher key is required for this test.');
  const login = await fetch(base + '/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: process.env.ADMIN_SECRET }) });
  if (!login.ok) throw new Error('Publisher authentication failed.');
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw new Error('No publisher session returned.');
  const auth = { Cookie: cookie };
  const slug = 'qa-build-' + Date.now();
  let created = false;
  try {
    const studio = await fetch(base + '/admin', { headers: auth });
    if (!studio.ok || !(await studio.text()).includes('Make room for a new game')) throw new Error('Protected creator UI unavailable.');
    const missing = await fetch(base + '/api/games', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, title: 'Upload QA', source: 'local', status: 'live' }) });
    if (missing.status !== 400) throw new Error('Missing local build could be published.');
    const archive = zipSync({ 'web/index.html': strToU8('<!doctype html><title>Upload QA</title><h1>Build delivered</h1>'), 'web/runtime.js': strToU8('window.uploadReady = true;') });
    const form = new FormData(); form.set('slug', slug); form.set('file', new Blob([archive], { type: 'application/zip' }), 'build.zip');
    const upload = await fetch(base + '/api/admin/upload', { method: 'POST', headers: auth, body: form });
    if (!upload.ok) throw new Error('ZIP upload failed: ' + await upload.text());
    const entry = await fetch(base + '/games/' + slug + '/index.html');
    if (!entry.ok || !(await entry.text()).includes('Build delivered')) throw new Error('Uploaded build is not served on this domain.');
    const range = await fetch(base + '/games/' + slug + '/runtime.js', { headers: { Range: 'bytes=0-5' } });
    if (range.status !== 206 || (await range.text()).length !== 6) throw new Error('Byte-range delivery failed.');
    const publish = await fetch(base + '/api/games', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, title: 'Upload QA', source: 'local', status: 'live', category: 'Arcade' }) });
    if (publish.status !== 201) throw new Error('Could not publish uploaded build.'); created = true;
    const unpublish = await fetch(base + '/api/games/' + slug, { method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'soon' }) });
    if (!unpublish.ok) throw new Error('Unpublishing failed.');
    const unsafe = zipSync({ '../escape/index.html': strToU8('not allowed') });
    const badForm = new FormData(); badForm.set('slug', slug); badForm.set('file', new Blob([unsafe], { type: 'application/zip' }), 'bad.zip');
    const rejected = await fetch(base + '/api/admin/upload', { method: 'POST', headers: auth, body: badForm });
    if (rejected.status !== 400) throw new Error('Unsafe ZIP path was not rejected.');
    const csv = await fetch(base + '/api/admin/subscribers', { headers: auth });
    if (!csv.ok || !(await csv.text()).startsWith('email,game,consented_at')) throw new Error('Opt-in export failed.');
    console.log('PASS: publisher authentication, studio rendering, missing-build guard, ZIP upload, same-domain streaming, range requests, publishing, unpublishing, unsafe ZIP rejection and subscriber export.');
  } finally {
    if (created) await fetch(base + '/api/games/' + slug, { method: 'DELETE', headers: auth });
    await fs.rm(path.join(process.env.GAME_STORAGE_DIR || path.join(process.cwd(), 'storage', 'games'), slug), { recursive: true, force: true });
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
