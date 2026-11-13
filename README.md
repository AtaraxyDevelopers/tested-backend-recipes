# Tested Backend Recipes

[![CI](https://github.com/AtaraxyDevelopers/tested-backend-recipes/actions/workflows/ci.yml/badge.svg)](https://github.com/AtaraxyDevelopers/tested-backend-recipes/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Small tested backend recipes for pagination, retries, uploads, jobs, and idempotency.

An open-source project from [Ataraxy Developers](https://github.com/AtaraxyDevelopers).

## Quick start

Requires Node.js 22 or 24 and npm. Git is optional if you download the source ZIP.

```sh
git clone https://github.com/AtaraxyDevelopers/tested-backend-recipes.git
cd tested-backend-recipes
npm ci
npm test
```

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

```js
import { paginate, retry } from './src/index.mjs';
const page = paginate([{ id: 'a' }, { id: 'b' }], { limit: 1 });
const next = paginate([{ id: 'a' }, { id: 'b' }], { after: page.nextCursor });
const result = await retry(() => fetch('https://example.com'), {
  attempts: 2,
  shouldRetry: (error) => error instanceof TypeError,
});
```

The fetch example retries thrown network failures; HTTP error statuses need your
own explicit classification. Avoid retrying non-idempotent operations without an
idempotency mechanism.

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

## Contributing and support

See [CONTRIBUTING.md](CONTRIBUTING.md), [community expectations](CODE_OF_CONDUCT.md),
and [SECURITY.md](SECURITY.md). Open an issue with a minimal synthetic reproduction.
This project is maintained on a best-effort basis. No paid service or account is
required to run the local examples.

## License

[MIT](LICENSE). You may use, adapt, and redistribute this project under its license.
