# Tested Backend Recipes

[![CI](https://github.com/AtaraxyDevelopers/tested-backend-recipes/actions/workflows/ci.yml/badge.svg)](https://github.com/AtaraxyDevelopers/tested-backend-recipes/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Small tested backend recipes for pagination, retries, uploads, jobs, and idempotency.

An open-source project from [Ataraxy Developers](https://github.com/AtaraxyDevelopers).

## Quick start

Install [Node.js](https://nodejs.org/en/download) 22 or 24 (npm is included). Check
`node --version` and `npm --version` in your terminal. The commands below run from
this repository's root folder, the one containing `package.json`.

**With Git:**

```sh
git clone https://github.com/AtaraxyDevelopers/tested-backend-recipes.git
cd tested-backend-recipes
npm ci
npm test
```

**Without Git:** choose **Code → Download ZIP** on GitHub, extract the archive,
and open a terminal in the extracted `tested-backend-recipes-main` folder (release archives may
include the version in the folder name). Run `npm ci` and `npm test` there.
Use the **source-code ZIP**, not an npm `.tgz` package, to follow this developer walkthrough.
The install step may need internet access; the examples run locally afterward.

On Windows PowerShell, if `npm.ps1` is blocked by execution policy, use `npm.cmd`
in place of `npm` in these commands. No execution-policy change is required.

```sh
npm run demo
```

Import the functions from `src/index.mjs` or copy a recipe with its tests and MIT
license. Each function is independent and uses only Node.js built-ins.

## Recipes and contracts

| Export                                            | Contract                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| paginate(items, options)                          | Ordered unique string IDs; limit 1–100; opaque cursor or null      |
| retry(operation, options)                         | Bounded attempts, exponential delay, optional retry predicate      |
| IdempotencyStore.run(key, fingerprint, operation) | Coalesces concurrent identical calls; rejects conflicting payloads |
| mapJobs(items, worker, options)                   | Bounded concurrency; ordered fulfilled/rejected results            |
| saveUpload(chunks, directory, options)            | Byte chunks, generated filename, byte cap, cleanup on failure      |

Run a fully offline pagination-and-retry example:

```sh
node examples/quick-start.mjs
```

It prints first page `a`, next page `b`, two attempts, and `recovered`. To use the
functions yourself, save this as `usage.mjs` in the repository root and run `node usage.mjs`:

```js
import { paginate, retry } from './src/index.mjs';
const items = [{ id: 'a' }, { id: 'b' }];
const page = paginate(items, { limit: 1 });
const next = paginate(items, { after: page.nextCursor });
let attempts = 0;
const result = await retry(
  async () => {
    if (++attempts === 1) throw new Error('Synthetic temporary failure');
    return 'recovered';
  },
  { attempts: 2, delayMs: 0 },
);
console.log(JSON.stringify({ first: page.data, next: next.data, attempts, result }));
```

This retry example uses a synthetic failure and needs no network connection. In a
real HTTP client, classify response statuses explicitly: fetch rejects on network
errors, while HTTP 4xx/5xx responses need your own handling. Only retry operations
whose effects are safe to repeat, or use an idempotency mechanism.

## Scope and limitations

These are instructional building blocks. Pagination assumes a stable ordered input;
real database pagination needs an indexed ordering and a documented consistency
policy. Idempotency entries live in one process, remain until it exits, and reject
new keys at capacity. Use durable transactional storage across workers. Job failures
are collected rather than stopping other jobs. Upload storage must be a trusted
directory outside the web root; add authentication, content inspection, quotas,
and a retention policy for your application. The caller must supply trusted upload
options. No content-type or malware claims are made.

## Validation

Tests cover pagination boundaries, bounded retries, concurrent duplicates,
conflicting payloads, job concurrency, and partial-upload cleanup.

## Expected first run

The demo prints a paginated result, a recovered retry, one idempotent result, ordered job results, and an upload summary. The generated upload filename varies and temporary files are removed.

## Contributing and support

See [CONTRIBUTING.md](CONTRIBUTING.md), [community expectations](CODE_OF_CONDUCT.md),
and [SECURITY.md](SECURITY.md). Open an issue with a minimal synthetic reproduction.
This project is maintained on a best-effort basis. No paid service or account is
required to run the local examples.

## License

[MIT](LICENSE). You may use, adapt, and redistribute this project under its license.
