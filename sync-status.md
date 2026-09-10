# Sync automation — status and handoff

Written 2026-09-10, at the point where work moves to local development.

## What you asked for

Stated across the session, in your words and in order:

1. Understand how this project gets price updates from providers.
2. **Automate ALL model providers' sync process.**
3. **No GitHub CI Actions at all** — "in the future sync will be runned manually via api or on cron job."
4. **KISS, don't overengineer** — "this is for my own personal use, but it need to work without my
   involvement."
5. The script **writes files only** — no commits, branches or pull requests.
6. Secrets come from a **`.env` at the repo root**; providers whose keys are absent are skipped, not
   failed.

## Where things stand

### Merged into `dev`

- **PR #1** — `packages/core/src/sync/providers/open-catalog-pricing.ts`: a pricing-only
  `SyncProvider` factory wired to 10 providers that publish an open catalog with prices
  (`orcarouter`, `novita-ai`, `impossibl`, `llmtr`, `xpersona`, `umans-ai`, `crof`, `lilac`,
  `inception`, `kosmik` — 382 model files, previously hand-maintained). Registered as the `pricing`
  group. 12 tests.
- **PR #2** — ungated `sync-models.yml` and `validate.yml` for this fork, and made
  `setup-git-committer` fall back to `github.token`. Superseded in intent by item 3 above; the
  workflows are still present and can now be deleted.

### On the branch, NOT yet in `dev`

`claude/price-update-providers-hgvlrz` is one commit ahead:

- **`5efc1f5` — `feat(sync): add sync:all, a standalone all-provider runner`**

That commit is the answer to items 2-6. Merge it or check the branch out before continuing locally.

```
git fetch origin && git checkout claude/price-update-providers-hgvlrz
```

## The runner

```
bun run sync:all                 # every registered provider (43)
bun run sync:all pricing         # a group, or name providers: bun run sync:all crof lilac
bun run sync:all --dry-run       # report only, writes nothing
bun run sync:all --json          # full report on stdout, for an API caller
```

- `packages/core/src/sync/all.ts` — `syncAll()`, the testable core.
- `packages/core/script/sync-all.ts` — thin CLI wrapper.
- `packages/core/test/sync-all.test.ts` — 6 tests.
- Docs: the "Running everything without CI" section in `sync.md`.

Design points worth knowing before you change anything:

- **Per-provider isolation is the whole point.** The existing `syncTargets` awaits providers in a
  bare loop, so the first one that throws aborts the run *and* the report. `syncAll` catches per
  provider instead. Don't "simplify" that back.
- **Missing credentials are skipped, not failed** — a partial `.env` still exits 0. The signal is
  the `"<Name> sync requires <VAR>"` message the eight credential-gated modules share, plus a check
  that the variable really is unset (xAI throws the same wording *after* its key passes, and that
  has to stay a failure).
- **An HTTP 401/403 is deliberately a failure, not a skip.** It is equally a revoked key or a bot
  shield; skipping those quietly is how a sync goes stale unnoticed.
- **It refuses to run outside the repo root.** Bun reads `.env` from the cwd before any code runs,
  so starting elsewhere would silently skip every keyed provider and still exit 0.
- Exit codes: `0` fine (skips included), `1` a provider failed, `2` the catalog no longer validates.
- Every run overwrites `.sync/sync-all.json` with the full report.

Cron:

```
17 * * * * cd /path/to/models && timeout 20m bun run sync:all >> .sync/cron.log 2>&1
```

The `timeout` is deliberate — the sync modules pass no `AbortSignal`, so a hung request is best cut
off by the caller rather than raced in-process, where the loser could write files after validation
had already passed.

## What is verified, and what is not

Verified by running it here: per-provider isolation (10 failures, 10 reported, run completed),
credential skips exiting 0, both output modes, the JSON report on disk, the cwd guard, and that no
provider files were touched by failed or skipped runs. Full suite 288 pass / 4 fail, the 4 being
pre-existing failures unrelated to this work (sdk snapshot ×2, deepinfra, generate).

**Not verified: a successful sync.** bun's `fetch` cannot reach the provider hosts from the cloud
sandbox — the agent proxy drops the TLS tunnel (`ws_closed_mid_exchange`, 39 bytes received) while
`curl` to the same host returns 200. It is not a certificate problem and not simply HTTP/2. So the
seam between a live `fetch` and the runner has never executed. **That is the first thing to do
locally**, and it should just work:

```
bun run sync:all pricing
git diff --stat providers          # expect [cost] changes only
bun run sync:all pricing           # expect a clean no-op
```

The earlier pricing sync *was* proven end-to-end here by feeding captured payloads into
`syncProvider` directly — 25 files updated, idempotent on the second pass — so the write path itself
is sound. Only the network hop is untested.

## Next steps

1. Run `sync:all pricing` locally to close the verification gap above.
2. Create `.env` with the provider keys you have. Every key added moves providers from `skipped` to
   actually syncing. `HTTPS_PROXY` / `NODE_EXTRA_CA_CERTS` belong there too if your host needs them.
3. Delete the workflows once the cron has run clean — `.github/workflows/sync-models.yml`,
   `validate.yml`, `deploy.yml`, `publish-sdk.yml`, `close-stale-pull-requests.yml`,
   `issue-fixer.yml`, `pr-reviewer.yml`, `ci-fixer.yml`, `opencode.yml`. Note `sync-models.yml`
   never once ran: scheduled workflows do not fire on a fork.
4. Commit or revert the working tree periodically. `sync:all` never commits, so changes accumulate;
   sync is convergent so they don't compound into garbage, but if validation ever fails the bad file
   stays until you deal with it.

## Open items

- **35 files carry mid-file comments** that a future price rewrite will drop — per `AGENTS.md` a
  sync-owned file keeps only its leading comment block. Listed in `sync-endpoint-discovery.md`.
  Hoisting them above the first key needs a human-meaningful rewrite per comment.
- **`providers/inference/provider.toml` has a broken `api`** — `https://inference.net/v1` 500s with
  "Only HTML requests are supported here"; the working endpoint is `https://api.inference.net/v1/models`.
- **5 near-miss providers** (`meganova`, `fastrouter`, `nearai`, `synthetic`, `friendli` — 87 files)
  agree with authored prices on only 71-90%. Someone has to judge whether the gaps are stale repo
  data or a wrong extractor before wiring them up.
- **Coverage beyond 43.** `sync:all` automates the *running*; widening coverage means writing more
  sync modules. Of the 179 providers with no module: 98 have a reachable endpoint behind an API key,
  26 serve an open catalog with identifiers only, and 25 cannot be automated at all (account- or
  region-scoped catalogs like Bedrock/Vertex/Azure, localhost runtimes, dead endpoints). The full
  survey with every endpoint, env var and note is in `sync-endpoint-discovery.md` / `.tsv` and
  `sync-endpoint-research.md`.
