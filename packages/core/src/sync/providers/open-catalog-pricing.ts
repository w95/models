import { z } from "zod";

import { AuthoredModel } from "../../schema.js";
import type { ExistingModel, SyncProvider, SyncedBaseModel, SyncedModel } from "../index.js";

/**
 * Pricing-only sync for providers that publish an open, unauthenticated model
 * catalog carrying per-token prices.
 *
 * These providers cannot author complete TOMLs: their catalogs expose prices
 * and little else, so the metadata a model file needs (reasoning options,
 * modalities, canonical base model) has no authoritative source here. Each
 * provider therefore sets `skipCreates` and only refreshes `cost` on files a
 * human already authored, leaving every other field untouched.
 */

const CatalogModel = z.object({ id: z.string().min(1) }).passthrough();

const CatalogResponse = z.union([
  z.object({ data: z.array(CatalogModel) }).passthrough(),
  z.array(CatalogModel),
]);

export type CatalogModel = z.infer<typeof CatalogModel>;

export interface CatalogCost {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
}

/** Where a provider keeps each price, and whether the values are per token or per million tokens. */
export interface PricingFields {
  unit: "token" | "million";
  /** Property holding the pricing object, when it is not `pricing`. */
  container?: string;
  input: string;
  output: string;
  cache_read?: string;
  cache_write?: string;
  /** Pull the price out of a per-key wrapper object, for catalogs that nest it. */
  select?(raw: unknown): unknown;
}

export interface OpenCatalogPricingConfig {
  id: string;
  name: string;
  endpoint: string;
  pricing: PricingFields;
}

/**
 * Convert a decimal price to USD per million tokens.
 *
 * Per-token prices are shifted six decimal places as text: `0.0000003` scaled
 * by 1e6 in floating point yields 0.30000000000000004, which would rewrite
 * every file on every run.
 */
export function perMillion(value: unknown, unit: PricingFields["unit"], label: string): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`${label}: price is neither string nor number`);
  }

  const text = typeof value === "number" ? String(value) : value.trim().replace(/^\$/, "");
  if (text === "") return undefined;

  const match = /^(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (match === null) throw new Error(`${label}: invalid price ${value}`);

  const fraction = match[2] ?? "";
  const exponent = Number(match[3] ?? "0");
  const digits = `${match[1] as string}${fraction}`;
  // Decimal places remaining after the exponent and the per-million shift.
  const places = fraction.length - exponent - (unit === "token" ? 6 : 0);
  const scaled = places <= 0
    ? `${digits}${"0".repeat(-places)}`
    : `${digits.slice(0, -places).padStart(1, "0") || "0"}.${digits.slice(-places).padStart(places, "0")}`;

  const result = Number(scaled);
  if (!Number.isFinite(result) || result < 0) throw new Error(`${label}: invalid price ${value}`);
  // A catalog reports an unpriced surface as zero; leave the authored cost alone
  // rather than overwriting a real price with 0.
  return result === 0 ? undefined : result;
}

export function catalogCost(model: CatalogModel, fields: PricingFields, label: string): CatalogCost | undefined {
  const container = model[fields.container ?? "pricing"];
  if (container === null || typeof container !== "object") return undefined;
  const pricing = container as Record<string, unknown>;

  const read = (key: string | undefined) => {
    if (key === undefined) return undefined;
    const raw = fields.select === undefined ? pricing[key] : fields.select(pricing[key]);
    return perMillion(raw, fields.unit, `${label} ${key}`);
  };

  const cost: CatalogCost = {
    input: read(fields.input),
    output: read(fields.output),
    cache_read: read(fields.cache_read),
    cache_write: read(fields.cache_write),
  };
  // Half a price is not a price: a catalog that reports input without output is
  // mid-rollout, and merging one side would leave the file internally inconsistent.
  if (cost.input === undefined || cost.output === undefined) return undefined;
  return cost;
}

function preserveAuthored(provider: string, id: string, authored: ExistingModel): SyncedModel {
  if (authored.base_model !== undefined) return authored as SyncedBaseModel;

  const parsed = AuthoredModel.safeParse({ id, ...authored });
  if (!parsed.success) {
    parsed.error.cause = { provider, model: id };
    throw parsed.error;
  }
  const { id: _id, ...model } = parsed.data;
  return model;
}

export function openCatalogPricing(config: OpenCatalogPricingConfig): SyncProvider<CatalogModel> {
  return {
    id: config.id,
    name: config.name,
    modelsDir: `providers/${config.id}/models`,
    // The catalog carries prices, not the metadata a new model file needs.
    skipCreates: true,
    // Remote-only IDs are the provider's whole catalog, most of which the
    // repository deliberately omits; one issue each would bury the tracker.
    trackMissingModels: false,
    // A price feed is not a lifecycle feed: absence here is not a retirement.
    deleteMissing: false,
    sourceID(model) {
      return model.id;
    },
    skippedNotice(ids) {
      if (ids.length === 0) return [];
      return [
        `${ids.length} ${config.name} models in the remote catalog have no local TOML and were skipped; `
        + "pricing-only syncs never create files.",
      ];
    },
    async fetchModels() {
      const response = await fetch(config.endpoint);
      if (!response.ok) {
        throw new Error(`${config.name} request failed: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    parseModels(raw) {
      const parsed = CatalogResponse.parse(raw);
      const models = Array.isArray(parsed) ? parsed : parsed.data;
      const seen = new Set<string>();
      return models.filter((model) => {
        if (seen.has(model.id)) return false;
        seen.add(model.id);
        return true;
      });
    },
    translateModel(model, context) {
      const authored = context.authored(model.id);
      if (authored === undefined) return undefined;

      const preserved = preserveAuthored(config.id, model.id, authored);
      // Tiered pricing is a human judgement: catalogs report a single rate,
      // and several report the top tier, which would silently overwrite the
      // base rate of a model whose tiers were authored by hand.
      if (authored.cost?.tiers !== undefined) return { id: model.id, model: preserved };

      const cost = catalogCost(model, config.pricing, `${config.id}/${model.id}`);
      if (cost === undefined) return { id: model.id, model: preserved };

      return {
        id: model.id,
        model: { ...preserved, cost: { ...authored.cost, ...stripUndefined(cost) } } as SyncedModel,
      };
    },
  };
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}

/** Novita and its resellers nest each price under a wrapper carrying the decimal form. */
const perMillionDecimal = (raw: unknown) =>
  raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>).price_per_m_decimal : undefined;

export const orcarouter = openCatalogPricing({
  id: "orcarouter",
  name: "OrcaRouter",
  endpoint: "https://api.orcarouter.ai/v1/models",
  pricing: { unit: "million", input: "prompt_per_million", output: "completion_per_million" },
});

export const novitaAi = openCatalogPricing({
  id: "novita-ai",
  name: "NovitaAI",
  endpoint: "https://api.novita.ai/openai/models",
  pricing: {
    unit: "million",
    input: "prompt",
    output: "completion",
    cache_read: "input_cache_read",
    select: perMillionDecimal,
  },
});

export const impossibl = openCatalogPricing({
  id: "impossibl",
  name: "Impossibl",
  endpoint: "https://api.impossibl.com/v1/models",
  pricing: {
    unit: "million",
    input: "input_per_mtok_usd",
    output: "output_per_mtok_usd",
    cache_read: "cached_input_per_mtok_usd",
    cache_write: "cache_write_per_mtok_usd",
  },
});

export const llmtr = openCatalogPricing({
  id: "llmtr",
  name: "LLMTR",
  endpoint: "https://llmtr.com/v1/models",
  pricing: {
    unit: "token",
    input: "prompt",
    output: "completion",
    cache_read: "input_cache_read",
    cache_write: "input_cache_write",
  },
});

export const xpersona = openCatalogPricing({
  id: "xpersona",
  name: "Xpersona",
  endpoint: "https://www.xpersona.co/v1/models",
  pricing: { unit: "million", input: "prompt", output: "completion" },
});

export const umansAi = openCatalogPricing({
  id: "umans-ai",
  name: "Umans AI",
  endpoint: "https://api.code.umans.ai/v1/models",
  pricing: { unit: "million", input: "input", output: "output" },
});

export const crof = openCatalogPricing({
  id: "crof",
  name: "CrofAI",
  endpoint: "https://crof.ai/v1/models",
  pricing: { unit: "million", input: "prompt", output: "completion", cache_read: "cache_prompt" },
});

export const lilac = openCatalogPricing({
  id: "lilac",
  name: "Lilac",
  endpoint: "https://api.getlilac.com/v1/models",
  pricing: { unit: "token", input: "prompt", output: "completion", cache_read: "input_cache_read" },
});

export const inception = openCatalogPricing({
  id: "inception",
  name: "Inception",
  endpoint: "https://api.inceptionlabs.ai/v1/models",
  pricing: {
    unit: "token",
    input: "prompt",
    output: "completion",
    cache_read: "input_cache_reads",
    cache_write: "input_cache_writes",
  },
});

export const kosmik = openCatalogPricing({
  id: "kosmik",
  name: "Kosmik Compute",
  endpoint: "https://api.koscompute.com/v1/models",
  pricing: { unit: "million", input: "input", output: "output", cache_read: "cache_read" },
});

/** Every pricing-only provider, for the runner registry and tests. */
export const openCatalogPricingProviders = [
  orcarouter,
  novitaAi,
  impossibl,
  llmtr,
  xpersona,
  umansAi,
  crof,
  lilac,
  inception,
  kosmik,
] satisfies SyncProvider<CatalogModel>[];
