import path from "node:path";

import { generate } from "../generate.js";
import { providers, syncProviderByID, type SyncResult } from "./index.js";

/**
 * Sync every registered provider in one process, for a cron job or an API call
 * rather than a CI matrix.
 *
 * The runner's own `syncTargets` cannot be used for this: it awaits each
 * provider in a bare loop, so the first provider that throws aborts the run and
 * the report is never produced. The workflow hides that by giving each provider
 * its own job; here the isolation has to be explicit.
 */

const PROVIDERS_DIR = path.join(import.meta.dirname, "..", "..", "..", "..", "providers");

export type ProviderOutcome = "changed" | "unchanged" | "skipped" | "failed";

export interface ProviderRun {
  id: string;
  name: string;
  outcome: ProviderOutcome;
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  notices: string[];
  files: SyncResult["files"];
  /** Present for skipped and failed runs only. */
  error?: string;
}

export interface SyncAllReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  dryRun: boolean;
  /** No provider failed and the catalog still validates. Skips do not count against it. */
  ok: boolean;
  validation: { ok: boolean; error?: string; cause?: unknown };
  counts: { total: number; changed: number; unchanged: number; skipped: number; failed: number };
  providers: ProviderRun[];
}

export interface SyncAllOptions {
  /** Defaults to every registered provider. */
  ids?: string[];
  dryRun?: boolean;
  /** Injectable for tests; defaults to the real runner. */
  sync?(id: string): Promise<SyncResult>;
  /** Injectable for tests; defaults to generating the catalog from `providers/`. */
  validate?(): Promise<unknown>;
  /** Injectable for tests; defaults to the process environment. */
  env?: Record<string, string | undefined>;
}

/** An env var name as the provider modules spell it: SCREAMING_SNAKE with at least one underscore. */
const ENV_TOKEN = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;

/**
 * Decide whether a provider error means "I have no key for this one" (skip, benign)
 * or something actually went wrong (fail, look at it).
 *
 * The signal is the `"<Name> sync requires <VAR>"` message the eight credential-gated
 * modules all throw. A provider->env-var map would be more direct but goes stale, and
 * `provider.toml`'s `env` field cannot stand in for one — crof lists env vars although
 * its catalog is open.
 *
 * An HTTP 401/403 is deliberately NOT treated as a skip: it is equally what a revoked
 * key or a bot shield returns, and silently skipping those is how a sync goes stale
 * without anyone noticing.
 */
export function classifyProviderError(
  message: string,
  env: Record<string, string | undefined>,
): { outcome: "skipped" | "failed"; error: string } {
  if (!message.includes(" sync requires ")) return { outcome: "failed", error: message };

  const tokens = message.match(ENV_TOKEN) ?? [];
  // A credential that IS set means this is a real failure wearing a "requires" message,
  // e.g. xAI rejecting a key whose ACL hides part of the model list.
  if (tokens.some((token) => env[token])) return { outcome: "failed", error: message };

  return {
    outcome: "skipped",
    error: tokens.length > 0 ? `missing credentials: ${tokens.join(", ")}` : message,
  };
}

function providerName(id: string) {
  return (providers as Record<string, { name?: string } | undefined>)[id]?.name ?? id;
}

export async function syncAll(options: SyncAllOptions = {}): Promise<SyncAllReport> {
  const ids = options.ids ?? Object.keys(providers);
  const env = options.env ?? process.env;
  const dryRun = options.dryRun ?? false;
  const sync = options.sync ?? ((id: string) => syncProviderByID(id as never, { dryRun }));
  const validate = options.validate ?? (() => generate(PROVIDERS_DIR));

  const startedAt = new Date();
  const runs: ProviderRun[] = [];

  for (const id of ids) {
    try {
      const result = await sync(id);
      runs.push({
        id: result.id,
        name: result.name,
        outcome: result.status,
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
        unchanged: result.unchanged,
        notices: result.notices,
        files: result.files,
      });
    } catch (error) {
      // Catch and never rethrow: this loop is the only thing that could abort the
      // run, and a report that stops halfway is worse than a slow one.
      const message = error instanceof Error ? error.message : String(error);
      const { outcome, error: reason } = classifyProviderError(message, env);
      runs.push({
        id,
        name: providerName(id),
        outcome,
        error: reason,
        created: 0,
        updated: 0,
        deleted: 0,
        unchanged: 0,
        notices: [],
        files: [],
      });
    }
  }

  let validation: SyncAllReport["validation"] = { ok: true };
  try {
    await validate();
  } catch (error) {
    validation = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      // generate() stamps the offending file onto the error, which is the only
      // thing that tells an unattended operator what to fix.
      cause: (error as { cause?: unknown }).cause,
    };
  }

  const counts = {
    total: runs.length,
    changed: runs.filter((run) => run.outcome === "changed").length,
    unchanged: runs.filter((run) => run.outcome === "unchanged").length,
    skipped: runs.filter((run) => run.outcome === "skipped").length,
    failed: runs.filter((run) => run.outcome === "failed").length,
  };

  const finishedAt = new Date();
  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    dryRun,
    ok: counts.failed === 0 && validation.ok,
    validation,
    counts,
    providers: runs,
  };
}
