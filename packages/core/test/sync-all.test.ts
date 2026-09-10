import { expect, test } from "bun:test";

import { classifyProviderError, syncAll } from "../src/sync/all.js";
import type { SyncResult } from "../src/sync/index.js";

function result(id: string, overrides: Partial<SyncResult> = {}): SyncResult {
  return {
    id,
    name: id,
    status: "unchanged",
    created: 0,
    updated: 0,
    deleted: 0,
    unchanged: 1,
    notices: [],
    files: [],
    ...overrides,
  };
}

const noValidation = async () => undefined;

test("one failing provider does not abort the run", async () => {
  const attempted: string[] = [];
  const report = await syncAll({
    ids: ["a", "b", "c"],
    env: {},
    validate: noValidation,
    async sync(id) {
      attempted.push(id);
      if (id === "b") throw new Error("B models request failed: 502 Bad Gateway");
      return result(id);
    },
  });

  // The gap this closes: syncTargets would have stopped at "b" and produced no report.
  expect(attempted).toEqual(["a", "b", "c"]);
  expect(report.providers.map((run) => run.outcome)).toEqual(["unchanged", "failed", "unchanged"]);
  expect(report.counts.failed).toBe(1);
  expect(report.ok).toBe(false);
});

test("a missing credential is a skip, not a failure", async () => {
  expect(classifyProviderError("Anthropic sync requires ANTHROPIC_API_KEY", {})).toEqual({
    outcome: "skipped",
    error: "missing credentials: ANTHROPIC_API_KEY",
  });
  expect(
    classifyProviderError(
      "Google sync requires GOOGLE_API_KEY, GEMINI_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY",
      {},
    ).outcome,
  ).toBe("skipped");
  // Cloudflare names no variable in its message; the raw text is kept.
  expect(
    classifyProviderError(
      "Cloudflare AI Gateway sync requires Cloudflare API token and account ID credentials",
      {},
    ),
  ).toEqual({
    outcome: "skipped",
    error: "Cloudflare AI Gateway sync requires Cloudflare API token and account ID credentials",
  });
});

test("a requires-message whose credential IS set is a real failure", async () => {
  // xAI throws this only after XAI_API_KEY passed its own presence check, so the
  // key being set is what separates "no credential" from "bad credential".
  const message = "xAI sync requires XAI_API_KEY to include api-key:model:* so the model list is not ACL-filtered";
  expect(classifyProviderError(message, { XAI_API_KEY: "sk-test" })).toEqual({
    outcome: "failed",
    error: message,
  });
  expect(classifyProviderError(message, {}).outcome).toBe("skipped");
});

test("an ordinary error is a failure", () => {
  expect(classifyProviderError("Hyper models request failed: 502 Bad Gateway", {}).outcome).toBe("failed");
  // A 401 is deliberately not a skip: it is equally a revoked key or a bot shield.
  expect(classifyProviderError("Venice models request failed: 401 Unauthorized", {}).outcome).toBe("failed");
});

test("skips alone leave the run ok", async () => {
  const report = await syncAll({
    ids: ["open", "keyed"],
    env: {},
    validate: noValidation,
    async sync(id) {
      if (id === "keyed") throw new Error("Keyed sync requires KEYED_API_KEY");
      return result(id, { status: "changed", created: 1, updated: 2 });
    },
  });

  expect(report.counts).toEqual({ total: 2, changed: 1, unchanged: 0, skipped: 1, failed: 0 });
  expect(report.ok).toBe(true);
  expect(report.providers[1]?.error).toBe("missing credentials: KEYED_API_KEY");
});

test("a validation failure keeps the provider results and names the file", async () => {
  const error = new Error("Invalid literal value");
  error.cause = { providerPath: "providers/openai/provider.toml" };
  const report = await syncAll({
    ids: ["a"],
    env: {},
    sync: async (id) => result(id, { status: "changed", updated: 3 }),
    validate: async () => {
      throw error;
    },
  });

  expect(report.validation).toEqual({
    ok: false,
    error: "Invalid literal value",
    cause: { providerPath: "providers/openai/provider.toml" },
  });
  expect(report.counts.changed).toBe(1);
  expect(report.ok).toBe(false);
});
