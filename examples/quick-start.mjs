import { paginate, retry } from '../src/index.mjs';
const items = [{ id: 'a' }, { id: 'b' }];
const page = paginate(items, { limit: 1 });
const next = paginate(items, { after: page.nextCursor });
let attempts = 0;
const result = await retry(
  async () => {
    attempts++;
    if (attempts === 1) throw new Error('Synthetic temporary failure');
    return 'recovered';
  },
  { attempts: 2, delayMs: 0 },
);
console.log(JSON.stringify({ first: page.data, next: next.data, attempts, result }, null, 2));
