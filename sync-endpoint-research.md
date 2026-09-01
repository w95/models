# Provider model-endpoint research

Scope: every provider appearing in the Model Route Explorer page that models.dev does **not** price-sync,
plus every provider on that page absent from `providers/`. Each endpoint below was probed live from this
session (unauthenticated GET). `200` = open catalog, `401`/`403` = endpoint exists, key required — both are
usable for a sync module; `401` providers need a secret in `sync-models.yml`.

Probed 90 endpoints confirmed live, 8 providers have no single public endpoint, 24 unresolved.


## Priority

Ranked by route coverage on the page, weighed against how easy the source is to parse.

1. **`novita-ai` (456 routes)** — open `/models`, 204KB, already `@ai-sdk/openai-compatible`. Highest single win, no secret needed.
2. **`openai` (339) and `google` (155)** — both already have sync modules that deliberately preserve `cost`
   (`providers/openai.ts` re-serializes the authored TOML; `providers/google.ts` sets `cost: existing.cost`).
   Neither `/v1/models` nor `/v1beta/models` returns prices, so automating these means scraping the pricing
   pages the way `providers/anthropic.ts` already scrapes `platform.claude.com` — the pattern exists.
3. **`alibaba` (355) + `alibaba-cn`** — DashScope compatible-mode `/models`, needs a key.
4. **`aimlapi` (327, not in catalog)** — open `/v1/models`, 527KB, and an aggregator like OpenRouter so it fits
   the aggregator group. But its payload carries **no pricing** (per-model keys are `id`, `info`, `tags`,
   `type`; `info` holds `contextLength`, `developer`, `releasedAt`, docs links only), so it can automate
   availability and metadata, not cost.
5. **`atlascloud` (144) / `parasail` (128) / `phala`+RedPill (61) / `sambanova` (25)** — all live, mostly open,
   and all four return inline pricing.
6. **`fireworks-ai` (136), `togetherai` (125), `mistral` (107), `siliconflow` (106)** — standard OpenAI-shaped
   `/models` behind a key; each needs one secret added to `sync-models.yml`.

Caveat on pricing: a `/models` endpoint proves the model list is machine-readable, **not** that it carries
prices. Checking the parsed payload of every open catalog probed:

- **Prices inline** — `novita-ai` (`pricing.price_per_m`), `zenmux` (`pricings`), `io-net`
  (`input_token_price` / `output_token_price` / `cache_read_token_price`), plus `crof`, `meganova`, `nearai`,
  `redpill`, `atlascloud`, `sambanova`, `featherless`, `uomi`, `nextbit`, `mancer`, `inception`, `lilac`,
  `berget`, `friendli`, `llmtech`, `neuralwatt`, `wafer.ai`, `sference`, `embercloud`, `engy`, `infercom`,
  `openinference`, `aionlabs`, `lightning`, `inference.net` (all `pricing.{prompt,completion}`).
- **IDs only, no price** — `aimlapi`, `nvidia`, `regolo-ai` (bare `{id, object, created, owned_by}`) and
  `geodd` (rich metadata, no cost fields). These sync availability; cost stays hand-authored or needs a
  docs scrape like `providers/anthropic.ts`.

## A. In the catalog, not price-synced — endpoint confirmed (52)

| Provider | Routes on page | Endpoint | Status | Notes |
|---|---:|---|---|---|
| `novita-ai` | 456 | `https://api.novita.ai/openai/models` | 200 | open list, 204KB |
| `alibaba` | 355 | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models` | 401 | OpenAI-compatible |
| `nebius` | 150 | `https://api.tokenfactory.nebius.com/v1/models` | 401 |  |
| `fireworks-ai` | 136 | `https://api.fireworks.ai/inference/v1/models` | 401 |  |
| `togetherai` | 125 | `https://api.together.xyz/v1/models` | 401 | api key required |
| `mistral` | 107 | `https://api.mistral.ai/v1/models` | 401 |  |
| `siliconflow` | 106 | `https://api.siliconflow.com/v1/models` | 401 |  |
| `opper` | 104 | `https://api.opper.ai/v3/compat/models` | 401 |  |
| `tensorx` | 96 | `https://api.tensorx.ai/v1/models` | 401 |  |
| `zai` | 93 | `https://api.z.ai/api/paas/v4/models` | 401 |  |
| `gmicloud` | 78 | `https://api.gmi-serving.com/v1/models` | 401 |  |
| `io-net` | 66 | `https://api.intelligence.io.solutions/api/v1/models` | 200 | open list, 32KB |
| `morph` | 55 | `https://api.morphllm.com/v1/models` | 401 |  |
| `minimax-cn` | 50 | `https://api.minimaxi.com/anthropic/v1/models` | 401 | Anthropic-shaped |
| `moonshotai` | 44 | `https://api.moonshot.ai/v1/models` | 401 |  |
| `friendli` | 42 | `https://api.friendli.ai/serverless/v1/models` | 200 | open list |
| `volcengine` | 40 | `https://ark.cn-beijing.volces.com/api/v3/models` | 401 |  |
| `groq` | 35 | `https://api.groq.com/openai/v1/models` | 401 |  |
| `crof` | 34 | `https://crof.ai/v1/models` | 200 | open list |
| `crusoe` | 34 | `https://api.inference.crusoecloud.com/v1/models` | 401 |  |
| `deepseek` | 34 | `https://api.deepseek.com/models` | 401 |  |
| `scaleway` | 30 | `https://api.scaleway.ai/v1/models` | 401 |  |
| `wafer.ai` | 28 | `https://pass.wafer.ai/v1/models` | 200 | open list |
| `cerebras` | 27 | `https://api.cerebras.ai/v1/models` | 403 | auth required |
| `neuralwatt` | 22 | `https://api.neuralwatt.com/v1/models` | 200 | open list |
| `modal` | 21 | `https://inference.us-west.modal.direct/v1/models` | 401 | region host |
| `perplexity` | 20 | `https://api.perplexity.ai/v1/models` | 401 | /models 404; /v1/models works |
| `nearai` | 15 | `https://cloud-api.near.ai/v1/models` | 200 | open list, 50KB |
| `nvidia` | 14 | `https://integrate.api.nvidia.com/v1/models` | 200 | open list |
| `xiaomi` | 14 | `https://api.xiaomimimo.com/v1/models` | 401 |  |
| `regolo-ai` | 13 | `https://api.regolo.ai/v1/models` | 200 | open list |
| `scx-ai` | 12 | `https://api.scx.ai/v1/models` | 401 |  |
| `arcee` | 12 | `https://api.arcee.ai/api/v1/models` | 401 |  |
| `berget` | 12 | `https://api.berget.ai/v1/models` | 200 | open list |
| `lilac` | 11 | `https://api.getlilac.com/v1/models` | 200 | open list |
| `meganova` | 11 | `https://api.meganova.ai/v1/models` | 200 | open list, 149KB |
| `evroc` | 10 | `https://models.think.evroc.com/v1/models` | 401 |  |
| `tencent-tokenhub` | 10 | `https://tokenhub.tencentmaas.com/v1/models` | 401 |  |
| `meta` | 9 | `https://api.meta.ai/v1/models` | 401 |  |
| `cohere` | 9 | `https://api.cohere.com/v1/models` | 401 |  |
| `mixlayer` | 7 | `https://models.mixlayer.ai/v1/models` | 401 |  |
| `runinfra` | 7 | `https://api.runinfra.ai/v1/models` | 401 |  |
| `sakana` | 7 | `https://api.sakana.ai/v1/models` | 401 |  |
| `stepfun-ai` | 5 | `https://api.stepfun.ai/v1/models` | 401 |  |
| `upstage` | 5 | `https://api.upstage.ai/v1/solar/models` | 401 |  |
| `inception` | 4 | `https://api.inceptionlabs.ai/v1/models` | 200 | open list |
| `poolside` | 3 | `https://inference.poolside.ai/v1/models` | 401 |  |
| `alibaba-cn` | 2 | `https://dashscope.aliyuncs.com/compatible-mode/v1/models` | 401 | OpenAI-compatible |
| `abliteration-ai` | 2 | `https://api.abliteration.ai/v1/models` | 401 |  |
| `llmtech` | 1 | `https://api.llmtech.eu/v1/models` | 200 | open list |
| `zenmux` | 1 | `https://zenmux.ai/api/v1/models` | 200 | open list, 128KB |
| `inference` | 1 | `https://api.inference.net/v1/models` | 200 | catalog api= inference.net/v1 is wrong (500) |

## B. In the catalog, not price-synced — no single public endpoint

| Provider | Routes | Why not |
|---|---:|---|
| `amazon-bedrock` | 352 | AWS ListFoundationModels, SigV4-signed and per-region; no unauthenticated URL |
| `azure` | 263 | per-resource/deployment scoped; catalog lives in Azure AI Foundry API |
| `google-vertex` | 210 | project- and region-scoped publisher API, needs GCP OAuth |
| `databricks` | 79 | workspace host (${DATABRICKS_HOST}); /api/2.0/serving-endpoints per workspace |
| `thinkingmachines` | 7 | Tinker exposes no model-list route (404 on /models) |
| `google-vertex-anthropic` | 3 | same Vertex publisher API, partner-model path |
| `infomaniak` | 1 | product-id scoped (${INFOMANIAK_PRODUCT_ID}) |
| `clarifai` | 1 | api.clarifai.com unreachable through this session's proxy (502 CONNECT); unverified |

## C. Not in the catalog at all — endpoint confirmed (38)

| Provider | Routes on page | Endpoint | Status | Notes |
|---|---:|---|---|---|
| `aimlapi` | 327 | `https://api.aimlapi.com/v1/models` | 200 | open, 527KB, rich metadata |
| `atlascloud` | 144 | `https://api.atlascloud.ai/v1/models` | 200 | open list |
| `parasail` | 128 | `https://api.parasail.io/v1/models` | 401 |  |
| `phala` | 61 | `https://api.redpill.ai/v1/models` | 200 | Phala/RedPill, open list |
| `arliai` | 33 | `https://api.arliai.com/v1/models` | 401 |  |
| `nextbit` | 33 | `https://api.nextbit256.com/v1/models` | 200 | open list |
| `uomi` | 32 | `https://gateway.uomi.ai/v1/models` | 200 | open list |
| `baidu` | 26 | `https://qianfan.baidubce.com/v2/models` | 403 | host live, auth required |
| `sambanova` | 25 | `https://api.sambanova.ai/v1/models` | 200 | open list |
| `lightningai` | 25 | `https://lightning.ai/api/v1/models` | 200 | open list |
| `akash` | 20 | `https://api.akashml.com/v1/models` | 401 | AkashML |
| `flexai` | 17 | `https://api.flex.ai/v1/models` | 401 |  |
| `telnyx` | 16 | `https://api.telnyx.com/v2/ai/models` | 401 |  |
| `runware` | 15 | `https://api.runware.ai/v1/models` | 401 |  |
| `sference` | 14 | `https://api.sference.com/v1/models` | 200 | open list |
| `aionlabs` | 12 | `https://api.aionlabs.ai/v1/models` | 200 | open list |
| `geoddus` | 12 | `https://api.geodd.io/v1/models` | 200 | open list |
| `mancer` | 11 | `https://neuro.mancer.tech/oai/v1/models` | 200 | open list |
| `dekallm` | 11 | `https://dekallm.cloudeka.ai/v1/models` | 401 |  |
| `embercloud` | 10 | `https://api.embercloud.ai/v1/models` | 200 | open list |
| `ionos` | 9 | `https://openai.inference.de-txl.ionos.com/v1/models` | 401 |  |
| `nscale` | 8 | `https://inference.api.nscale.com/v1/models` | 401 |  |
| `engy` | 7 | `https://api.engy.ai/v1/models` | 200 | open list |
| `melious` | 7 | `https://api.melious.ai/v1/models` | 401 |  |
| `neurometricai` | 7 | `https://api.neurometric.ai/v1/models` | 401 |  |
| `reka` | 6 | `https://api.reka.ai/v1/models` | 401 |  |
| `featherlessai` | 5 | `https://api.featherless.ai/v1/models` | 200 | open, 7MB |
| `infercom` | 5 | `https://api.infercom.ai/v1/models` | 200 | open list |
| `canopywave` | 5 | `https://api.canopywave.io/v1/models` | 401 |  |
| `hyperbolic` | 4 | `https://api.hyperbolic.xyz/v1/models` | 401 |  |
| `doubleword` | 4 | `https://api.doubleword.ai/v1/models` | 401 |  |
| `gonka24` | 3 | `https://api.gonka24.com/v1/models` | 401 |  |
| `ranoai` | 2 | `https://api.ranoai.com/v1/models` | 401 |  |
| `openinference` | 1 | `https://api.openinference.ai/v1/models` | 200 | open list |
| `heabsy` | 1 | `https://api.heabsy.com/v1/models` | 401 |  |
| `interfaze` | 1 | `https://api.interfaze.ai/v1/models` | 401 |  |
| `pokee` | 1 | `https://api.pokee.ai/v1/models` | 401 |  |
| `perceptron` | 1 | `https://api.perceptron.inc/v1/models` | 401 |  |

## D. Unresolved

| Label | Routes | Finding |
|---|---:|---|
| `streamlake` | 57 | host wanqing.streamlakeapi.com live (404 on /v1/models); Kuaishou Vanchin platform, path undocumented publicly |
| `coreweave` | 43 | per-gateway endpoints only; inference.coreweave.com returns Cloudflare 403, no global catalog |
| `aoru` | 33 | no host resolved (.ai/.com/.io tried) |
| `gerra` | 16 | api.gerra.com live but Cloudflare 403 |
| `relace` | 11 | api.relace.com serves HTML, /v1/models not a JSON list; api.relace.run 404 |
| `modelrun` | 10 | no host resolved |
| `sailresearch` | 10 | no host resolved |
| `darkbloom` | 9 | api.darkbloom.io/.ai unresolved |
| `nube` | 9 | api.nube.com live, 404 on /models and /v1/* |
| `makora` | 8 | no host resolved |
| `mara` | 7 | api.mara.io live, 404 on /models |
| `plubo` | 6 | no host resolved |
| `iceberg` | 6 | no host resolved |
| `decart` | 6 | api.decart.ai 404 on /models and /v1/models |
| `quartz` | 4 | no host resolved |
| `glacier` | 4 | no host resolved |
| `aster` | 3 | no host resolved |
| `0gprivatecomputer` | 3 | no host resolved |
| `pearlresearchlabs` | 3 | api.pearlresearch.ai live, 404 on /models |
| `nexagi` | 2 | no host resolved |
| `secretai` | 1 | no host resolved |
| `ncompass` | 1 | api.ncompass.tech unreachable via proxy |
| `ionstream` | 1 | api.ionstream.ai live, 404 on /models |
| `consensusprotocol` | 1 | no host resolved |
