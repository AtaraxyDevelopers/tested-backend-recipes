import { paginate, retry, IdempotencyStore, mapJobs, saveUpload } from '../src/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const page = paginate([{ id: 'a' }, { id: 'b' }, { id: 'c' }], { limit: 2 });
console.log('Pagination:', page);
let calls = 0;
console.log(
  'Retry:',
  await retry(async () => {
    if (++calls < 2) throw new Error('Temporary failure');
    return 'recovered';
  }),
);
const store = new IdempotencyStore();
console.log(
  'Idempotency:',
  await store.run('demo', 'same-payload', () => ({ id: 'one-result' })),
  await store.run('demo', 'same-payload', () => {
    throw new Error('must not run');
  }),
);
console.log('Jobs:', await mapJobs([1, 2, 3], async (value) => value * 2));
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'recipes-'));
try {
  console.log('Upload:', await saveUpload([Buffer.from('synthetic sample')], dir));
} finally {
  await fs.rm(dir, { recursive: true, force: true });
}
