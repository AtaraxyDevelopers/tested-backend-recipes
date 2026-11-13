import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { paginate, retry, IdempotencyStore, mapJobs, saveUpload } from '../src/index.mjs';
test('cursor pagination has no gaps and rejects stale or malformed cursors', () => {
  const items = Array.from({ length: 5 }, (_, i) => ({ id: String(i) }));
  const first = paginate(items, { limit: 2 });
  const second = paginate(items, { after: first.nextCursor, limit: 2 });
  const last = paginate(items, { after: second.nextCursor, limit: 2 });
  assert.deepEqual([...first.data, ...second.data, ...last.data], items);
  assert.equal(last.nextCursor, null);
  assert.throws(() => paginate(items, { after: 'not-json' }));
  assert.throws(() => paginate(items, { limit: 0 }));
  assert.throws(() => paginate(items.slice(2), { after: first.nextCursor }));
});
test('retry bounds attempts, waits, and honors permanent failures', async () => {
  let calls = 0;
  const delays = [];
  assert.equal(
    await retry(
      () => {
        if (++calls < 3) throw new Error();
        return 42;
      },
      { wait: async (d) => delays.push(d), delayMs: 10 },
    ),
    42,
  );
  assert.deepEqual(delays, [10, 20]);
  calls = 0;
  await assert.rejects(
    retry(
      () => {
        calls++;
        throw new Error('permanent');
      },
      { shouldRetry: () => false },
    ),
  );
  assert.equal(calls, 1);
});
test('concurrent identical requests run once; conflicting payloads fail', async () => {
  const store = new IdempotencyStore();
  let calls = 0;
  const operation = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 5));
    return 'result';
  };
  assert.deepEqual(
    await Promise.all([store.run('a', 'x', operation), store.run('a', 'x', operation)]),
    ['result', 'result'],
  );
  assert.equal(calls, 1);
  await assert.rejects(store.run('a', 'y', operation), /different payload/);
  await assert.rejects(
    store.run('b', 'x', () => {
      throw new Error('retryable');
    }),
  );
  assert.equal(await store.run('b', 'x', () => 7), 7);
});
test('job pool bounds active work and retains ordered failures', async () => {
  let active = 0,
    max = 0;
  const out = await mapJobs(
    [1, 2, 3, 4],
    async (x) => {
      active++;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      if (x === 3) throw new Error('job failed');
      return x * 2;
    },
    { concurrency: 2 },
  );
  assert.equal(max, 2);
  assert.equal(out[0].value, 2);
  assert.equal(out[2].status, 'rejected');
  assert.equal(out[3].value, 8);
});
test('uploads preserve bytes, avoid caller filenames, and clean partial failures', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'upload-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const uploaded = await saveUpload([Buffer.from('ab'), Buffer.from('cd')], dir, {
    extension: '.txt',
    maxBytes: 4,
  });
  assert.equal(await fs.readFile(path.join(dir, uploaded.filename), 'utf8'), 'abcd');
  await assert.rejects(saveUpload([Buffer.from('too large')], dir, { maxBytes: 2 }));
  assert.deepEqual(await fs.readdir(dir), [uploaded.filename]);
  await assert.rejects(saveUpload([], dir, { extension: '../bad' }));
});
