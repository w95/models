import { expect, test } from "bun:test";

import {
  catalogCost,
  crof,
  inception,
  openCatalogPricingProviders,
  orcarouter,
  perMillion,
  type CatalogModel,
} from "../src/sync/providers/open-catalog-pricing.js";
import type { ExistingModel, SyncProvider } from "../src/sync/index.js";

function translate(provider: SyncProvider<CatalogModel>, model: CatalogModel, authored?: ExistingModel) {
  return provider.translateModel(model, {
    existing: () => authored,
    authored: () => authored,
  });
}

test("shifts per-token prices without floating-point drift", () => {
  // 0.0000003 * 1e6 is 0.30000000000000004 in floating point, which would
  // rewrite the file on every run.
  expect(perMillion("0.0000003", "token", "test")).toBe(0.3);
  expect(perMillion("0.00000015", "token", "test")).toBe(0.15);
  expect(perMillion("0.000000047475", "token", "test")).toBe(0.047475);
  expect(perMillion("0.0000100000", "token", "test")).toBe(10);
  expect(perMillion(1.47997e-7, "token", "test")).toBe(0.147997);
  expect(perMillion("$0.00000004", "token", "test")).toBe(0.04);
});

test("passes per-million prices through untouched", () => {
  expect(perMillion("18.5", "million", "test")).toBe(18.5);
  expect(perMillion(0.95, "million", "test")).toBe(0.95);
  expect(perMillion("0.075", "million", "test")).toBe(0.075);
});

test("treats an absent or zero price as no price", () => {
  expect(perMillion(undefined, "token", "test")).toBeUndefined();
  expect(perMillion(null, "million", "test")).toBeUndefined();
  expect(perMillion("", "token", "test")).toBeUndefined();
  expect(perMillion("0", "million", "test")).toBeUndefined();
  expect(perMillion("0.0000", "million", "test")).toBeUndefined();
});

test("rejects a price that is not a decimal number", () => {
  expect(() => perMillion("free", "million", "acme/model input")).toThrow("acme/model input: invalid price free");
  expect(() => perMillion(-1, "million", "acme/model input")).toThrow();
  expect(() => perMillion({}, "million", "acme/model input")).toThrow("neither string nor number");
});

test("reads prices out of a nested wrapper", () => {
  const model = {
    id: "zai-org/glm-5.3-flash",
    pricing: {
      prompt: { price_per_m_decimal: "0.075", origin_price_per_m_decimal: "0.15" },
      completion: { price_per_m_decimal: "0.25" },
      input_cache_read: { price_per_m_decimal: "0.03" },
    },
  };
  const cost = catalogCost(model, {
    unit: "million",
    input: "prompt",
    output: "completion",
    cache_read: "input_cache_read",
    select: (raw) => (raw !== null && typeof raw === "object"
      ? (raw as Record<string, unknown>).price_per_m_decimal
      : undefined),
  }, "novita-ai/glm-5.3-flash");

  // The current price, not the struck-through origin price.
  expect(cost).toEqual({ input: 0.075, output: 0.25, cache_read: 0.03, cache_write: undefined });
});

test("skips a model whose catalog reports only half a price", () => {
  const fields = { unit: "million" as const, input: "prompt", output: "completion" };
  expect(catalogCost({ id: "a", pricing: { prompt: "1.5" } }, fields, "t")).toBeUndefined();
  expect(catalogCost({ id: "a", pricing: {} }, fields, "t")).toBeUndefined();
  expect(catalogCost({ id: "a" }, fields, "t")).toBeUndefined();
});

test("refreshes cost and leaves every other authored field alone", () => {
  const authored: ExistingModel = {
    base_model: "anthropic/claude-fable-5",
    reasoning_options: [{ type: "effort", values: ["low", "medium", "high"] }],
    cost: { input: 9, output: 45, cache_read: 1, cache_write: 12.5 },
  };
  const result = translate(orcarouter, {
    id: "anthropic/claude-fable-5",
    pricing: { prompt_per_million: "10.000000", completion_per_million: "50.000000" },
  }, authored);

  expect(result?.model).toEqual({
    base_model: "anthropic/claude-fable-5",
    reasoning_options: [{ type: "effort", values: ["low", "medium", "high"] }],
    // cache_read and cache_write survive: OrcaRouter does not publish them.
    cost: { input: 10, output: 50, cache_read: 1, cache_write: 12.5 },
  });
});

test("never creates a file for a model the catalog has but the repository does not", () => {
  expect(translate(crof, { id: "unknown-model", pricing: { prompt: "0.35", completion: "0.80" } })).toBeUndefined();
});

test("leaves a hand-authored tiered price untouched", () => {
  const authored: ExistingModel = {
    base_model: "google/gemini-2.5-pro",
    cost: {
      input: 1.25,
      output: 10,
      tiers: [{ tier: { type: "context", size: 200_000 }, input: 2.5, output: 15 }],
    },
  };
  // The catalog reports the >200K rate as if it were the only rate.
  const result = translate(orcarouter, {
    id: "google/gemini-2.5-pro",
    pricing: { prompt_per_million: "2.5", completion_per_million: "15.0" },
  }, authored);

  expect(result?.model).toEqual(authored as never);
});

test("keeps the authored cost when the catalog prices a model at zero", () => {
  const authored: ExistingModel = { base_model: "z-ai/glm-5.2", cost: { input: 1.4, output: 4.4 } };
  const result = translate(inception, {
    id: "z-ai/glm-5.2",
    pricing: { prompt: "0", completion: "0" },
  }, authored);

  expect(result?.model).toEqual(authored as never);
});

test("parses both catalog envelopes and drops duplicate ids", () => {
  expect(crof.parseModels({ data: [{ id: "a" }, { id: "a" }, { id: "b" }] }).map((m) => m.id)).toEqual(["a", "b"]);
  expect(crof.parseModels([{ id: "a" }]).map((m) => m.id)).toEqual(["a"]);
  expect(() => crof.parseModels({ data: [{ id: "" }] })).toThrow();
});

test("every pricing-only provider skips creates, deletes and missing-model issues", () => {
  expect(openCatalogPricingProviders).toHaveLength(10);
  for (const provider of openCatalogPricingProviders) {
    expect(provider.skipCreates).toBe(true);
    expect(provider.deleteMissing).toBe(false);
    expect(provider.trackMissingModels).toBe(false);
    expect(provider.modelsDir).toBe(`providers/${provider.id}/models`);
  }
});
