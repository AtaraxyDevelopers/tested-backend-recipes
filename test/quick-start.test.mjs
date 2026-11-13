import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
test('offline quick start produces the documented pagination and retry result', () => {
  const output = execFileSync(process.execPath, ['examples/quick-start.mjs'], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), {
    first: [{ id: 'a' }],
    next: [{ id: 'b' }],
    attempts: 2,
    result: 'recovered',
  });
});
