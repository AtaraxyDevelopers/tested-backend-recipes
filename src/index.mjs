import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function paginate(items, { after = null, limit = 20 } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new RangeError('limit must be 1..100');
  if (
    !Array.isArray(items) ||
    items.some((x) => !x || typeof x.id !== 'string') ||
    new Set(items.map((x) => x.id)).size !== items.length
  )
    throw new TypeError('items need unique string IDs');
  let start = 0;
  if (after !== null) {
    let id;
    try {
      const decoded = JSON.parse(Buffer.from(after, 'base64url').toString());
      if (decoded.v !== 1 || typeof decoded.id !== 'string') throw new Error();
      id = decoded.id;
    } catch {
      throw new Error('Invalid cursor');
    }
    const index = items.findIndex((x) => x.id === id);
    if (index < 0) throw new Error('Cursor item no longer exists');
    start = index + 1;
  }
  const data = items.slice(start, start + limit);
  return {
    data,
    nextCursor:
      start + limit < items.length
        ? Buffer.from(JSON.stringify({ v: 1, id: data.at(-1).id })).toString('base64url')
        : null,
  };
}
export async function retry(
  operation,
  { attempts = 3, delayMs = 50, shouldRetry = () => true, wait = sleep } = {},
) {
  if (
    !Number.isInteger(attempts) ||
    attempts < 1 ||
    attempts > 10 ||
    !Number.isFinite(delayMs) ||
    delayMs < 0 ||
    delayMs > 60000
  )
    throw new RangeError('Invalid retry bounds');
  for (let attempt = 1; attempt <= attempts; attempt++)
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt === attempts || !shouldRetry(error)) throw error;
      await wait(Math.min(delayMs * 2 ** (attempt - 1), 60000));
    }
}
export class IdempotencyStore {
  #entries = new Map();
  constructor({ maxEntries = 1000 } = {}) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new RangeError('Invalid capacity');
    this.maxEntries = maxEntries;
  }
  run(key, fingerprint, operation) {
    if (typeof key !== 'string' || !key || typeof fingerprint !== 'string')
      return Promise.reject(new TypeError('key and fingerprint must be strings'));
    const cached = this.#entries.get(key);
    if (cached) {
      if (cached.fingerprint !== fingerprint)
        return Promise.reject(new Error('Idempotency key reused with a different payload'));
      return cached.promise;
    }
    if (this.#entries.size >= this.maxEntries)
      return Promise.reject(new Error('Idempotency capacity reached'));
    const promise = Promise.resolve()
      .then(operation)
      .catch((error) => {
        this.#entries.delete(key);
        throw error;
      });
    this.#entries.set(key, { fingerprint, promise });
    return promise;
  }
}
export async function mapJobs(items, worker, { concurrency = 2 } = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100)
    throw new RangeError('Invalid concurrency');
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        try {
          results[index] = { status: 'fulfilled', value: await worker(items[index], index) };
        } catch (error) {
          results[index] = { status: 'rejected', reason: error };
        }
      }
    }),
  );
  return results;
}
export async function saveUpload(
  chunks,
  directory,
  { extension = '.bin', maxBytes = 1048576 } = {},
) {
  if (!/^\.[a-z0-9]{1,8}$/.test(extension) || !Number.isSafeInteger(maxBytes) || maxBytes < 1)
    throw new TypeError('Invalid upload options');
  await fs.mkdir(directory, { recursive: true });
  const filename = randomUUID() + extension,
    target = path.join(directory, filename);
  const handle = await fs.open(target, 'wx');
  let bytes = 0;
  try {
    for await (const chunk of chunks) {
      if (!Buffer.isBuffer(chunk) && !(chunk instanceof Uint8Array))
        throw new TypeError('Upload chunks must be bytes');
      bytes += chunk.length;
      if (bytes > maxBytes) throw new Error('Upload exceeds size limit');
      await handle.writeFile(chunk);
    }
    await handle.close();
    return { filename, bytes };
  } catch (error) {
    await handle.close();
    await fs.rm(target, { force: true });
    throw error;
  }
}
