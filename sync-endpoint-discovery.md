# Model-endpoint discovery: the manually tracked providers

**Question: can the hand-maintained providers be covered by their APIs?** Mostly yes — but not all of them
have a `/models` endpoint, and a reachable endpoint does not always carry prices.

All 179 providers in `providers/` without a sync module were probed live from this session with an
unauthenticated `GET`. Base URLs come from each provider's own `provider.toml` `api` field where present
(157 of 179), otherwise from documentation or targeted probing.

| Outcome | Providers | Model files | Share of hand-maintained files |
|---|---:|---:|---:|
| **Open catalog, prices inline** — syncable today, no secret | 30 | 983 | 27% |
| Open catalog, identifiers only — availability sync, cost stays manual | 26 | 761 | 21% |
| Endpoint exists, API key required (401/403/400) | 98 | 1300 | 36% |
| No global catalog — account/region/workspace scoped | 14 | 534 | 15% |
| Local runtime (`127.0.0.1`) — nothing to sync | 5 | 25 | 1% |
| Documented host, no working model route | 6 | 23 | 1% |
| **Total** | **179** | **3626** | |

So **154 of 179 (86%)** expose a machine-readable model list, covering
84% of hand-maintained model files. The remaining 25 cannot be reached by a single URL
and would stay hand-authored regardless of effort.

Machine-readable results with every endpoint, env var and note: `sync-endpoint-discovery.tsv`.


## Open catalog with pricing — no secret required (30)

These need nothing but a `SyncProvider` module. Between them they carry 983 model files that are updated by
hand today.

| Provider | Model files | Endpoint | Note |
|---|---:|---|---|
| `poe` | 137 | `https://api.poe.com/v1/models` | prices inline, no key |
| `zenmux` | 120 | `https://zenmux.ai/api/v1/models` | prices inline, no key |
| `orcarouter` | 117 | `https://api.orcarouter.ai/v1/models` | prices inline, no key |
| `novita-ai` | 107 | `https://api.novita.ai/openai/models` | prices inline, no key |
| `impossibl` | 76 | `https://api.impossibl.com/v1/models` | prices inline, no key |
| `jiekou` | 61 | `https://api.jiekou.ai/openai/models` | prices inline, no key |
| `kenari` | 59 | `https://kenari.id/v1/models` | prices inline, no key |
| `fastrouter` | 47 | `https://go.fastrouter.ai/api/v1/models` | prices inline, no key |
| `nearai` | 37 | `https://cloud-api.near.ai/v1/models` | prices inline, no key |
| `llmtr` | 32 | `https://llmtr.com/v1/models` | prices inline, no key |
| `crof` | 23 | `https://crof.ai/v1/models` | prices inline, no key |
| `neuralwatt` | 21 | `https://api.neuralwatt.com/v1/models` | prices inline, no key |
| `meganova` | 19 | `https://api.meganova.ai/v1/models` | prices inline, no key |
| `io-net` | 17 | `https://api.intelligence.io.solutions/api/v1/models` | prices inline, no key |
| `routing-run` | 15 | `https://api.routing.run/v1/models` | prices inline, no key |
| `xpersona` | 13 | `https://www.xpersona.co/v1/models` | prices inline, no key |
| `berget` | 11 | `https://api.berget.ai/v1/models` | prices inline, no key |
| `vultr` | 10 | `https://api.vultrinference.com/v1/models` | prices inline, no key |
| `synthetic` | 9 | `https://api.synthetic.new/openai/v1/models` | prices inline, no key |
| `the-grid-ai` | 9 | `https://api.thegrid.ai/v1/models` | prices inline, no key |
| `umans-ai-coding-plan` | 8 | `https://api.code.umans.ai/v1/models` | prices inline, no key |
| `trustedrouter` | 7 | `https://api.trustedrouter.com/v1/models` | prices inline, no key |
| `umans-ai` | 7 | `https://api.code.umans.ai/v1/models` | prices inline, no key |
| `friendli` | 6 | `https://api.friendli.ai/serverless/v1/models` | prices inline, no key |
| `wafer.ai` | 5 | `https://pass.wafer.ai/v1/models` | prices inline, no key |
| `lilac` | 4 | `https://api.getlilac.com/v1/models` | prices inline, no key |
| `inception` | 2 | `https://api.inceptionlabs.ai/v1/models` | prices inline, no key |
| `iteracompute` | 2 | `https://api.iteracompute.com/v1/models` | prices inline, no key |
| `kosmik` | 1 | `https://api.koscompute.com/v1/models` | prices inline, no key |
| `llmtech` | 1 | `https://api.llmtech.eu/v1/models` | prices inline, no key |

## Open catalog, identifiers only (26)

A module here syncs availability, context and lifecycle, but `cost` must stay authored or come from a docs
scrape in the style of `packages/core/src/sync/providers/anthropic.ts`.

| Provider | Model files | Endpoint | Note |
|---|---:|---|---|
| `abacus` | 108 | `https://routellm.abacus.ai/v1/models` | open list, no cost fields |
| `nvidia` | 103 | `https://integrate.api.nvidia.com/v1/models` | open list, no cost fields |
| `opencode` | 95 | `https://opencode.ai/zen/v1/models` | open list, no cost fields |
| `qiniu-ai` | 91 | `https://api.qnaigc.com/v1/models` | open list, no cost fields |
| `helicone` | 90 | `https://ai-gateway.helicone.ai/v1/models` | open list, no cost fields |
| `aihubmix` | 77 | `https://aihubmix.com/v1/models` | open list, no cost fields |
| `opencode-go` | 33 | `https://opencode.ai/zen/go/v1/models` | open list, no cost fields |
| `unorouter` | 23 | `https://api.unorouter.com/v1/models` | open list, no cost fields |
| `ollama-cloud` | 22 | `https://ollama.com/v1/models` | open list, no cost fields |
| `regolo-ai` | 18 | `https://api.regolo.ai/v1/models` | open list, no cost fields |
| `cline-pass` | 13 | `https://api.cline.bot/api/v1/models` | open list, no cost fields |
| `alibaba-coding-plan` | 12 | `https://coding-intl.dashscope.aliyuncs.com/v1/models` | open list, no cost fields |
| `alibaba-coding-plan-cn` | 12 | `https://coding.dashscope.aliyuncs.com/v1/models` | open list, no cost fields |
| `aiand` | 11 | `https://api.aiand.com/v1/models` | open list, no cost fields |
| `freemodel` | 10 | `https://cc.freemodel.dev/v1/models` | open list, no cost fields |
| `above` | 9 | `https://api.above.dev/v1/models` | open list, no cost fields |
| `inference` | 9 | `https://api.inference.net/v1/models` | open list, no cost fields |
| `modelscope` | 7 | `https://api-inference.modelscope.cn/v1/models` | open list, no cost fields |
| `watsonx` | 5 | `https://us-south.ml.cloud.ibm.com/ml/v1/foundation_model_specs?version=2024-05-01` | open list, no cost fields |
| `lucidquery` | 4 | `https://api.lucidquery.com/v1/models` | open list, no cost fields |
| `moark` | 2 | `https://moark.com/v1/models` | open list, no cost fields |
| `sarvam` | 2 | `https://api.sarvam.ai/v1/models` | open list, no cost fields |
| `subconscious` | 2 | `https://api.subconscious.dev/v1/models` | open list, no cost fields |
| `echo` | 1 | `https://echo.tracerml.ai/v1/models` | open list, no cost fields |
| `standardcompute` | 1 | `https://api.stdcmpt.com/v1/models` | open list, no cost fields |
| `zenifra` | 1 | `https://ai.zenifra.com/v1/models` | open list, no cost fields |

## Endpoint confirmed, API key required (98)

Each returned 401/403/400 unauthenticated, which proves the route exists. None of these env vars are in
`.github/workflows/sync-models.yml` yet, so each provider costs one repo secret. Whether the payload carries
prices cannot be confirmed without a key.

| Provider | Model files | Endpoint | Env |
|---|---:|---|---|
| `302ai` | 97 | `https://api.302.ai/v1/models` | 302AI_API_KEY |
| `alibaba-cn` | 87 | `https://dashscope.aliyuncs.com/compatible-mode/v1/models` | DASHSCOPE_API_KEY |
| `siliconflow-cn` | 77 | `https://api.siliconflow.cn/v1/models` | SILICONFLOW_CN_API_KEY |
| `alibaba` | 55 | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models` | DASHSCOPE_API_KEY |
| `siliconflow` | 49 | `https://api.siliconflow.com/v1/models` | SILICONFLOW_API_KEY |
| `opper` | 40 | `https://api.opper.ai/v3/compat/models` | OPPER_API_KEY |
| `togetherai` | 38 | `https://api.together.xyz/v1/models` | TOGETHER_API_KEY |
| `greenpt` | 37 | `https://api.greenpt.ai/v1/models` | GREENPT_API_KEY |
| `mistral` | 34 | `https://api.mistral.ai/v1/models` | MISTRAL_API_KEY |
| `nebius` | 34 | `https://api.tokenfactory.nebius.com/v1/models` | NEBIUS_API_KEY |
| `anyapi` | 30 | `https://api.anyapi.ai/v1/models` | ANYAPI_API_KEY |
| `alibaba-token-plan` | 26 | `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/models` | ALIBABA_TOKEN_PLAN_API_KEY |
| `alibaba-token-plan-cn` | 26 | `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/models` | ALIBABA_TOKEN_PLAN_API_KEY |
| `frogbot` | 26 | `https://app.frogbot.ai/api/v1/models` | FROGBOT_API_KEY |
| `tensorx` | 25 | `https://api.tensorx.ai/v1/models` | TENSORX_API_KEY |
| `perplexity-agent` | 22 | `https://api.perplexity.ai/v1/models` | PERPLEXITY_API_KEY |
| `vivgrid` | 22 | `https://api.vivgrid.com/v1/models` | VIVGRID_API_KEY |
| `fireworks-ai` | 18 | `https://api.fireworks.ai/inference/v1/models` | FIREWORKS_API_KEY |
| `jalapeno` | 17 | `https://api.jalapeno-cloud.ai/v1/models` | JALAPENO_API_KEY |
| `scnet-token-plan` | 17 | `https://api.scnet.cn/api/llm/v1/models` | SCNET_API_KEY |
| `evroc` | 16 | `https://models.think.evroc.com/v1/models` | EVROC_API_KEY |
| `groq` | 16 | `https://api.groq.com/openai/v1/models` | GROQ_API_KEY |
| `zai` | 16 | `https://api.z.ai/api/paas/v4/models` | ZHIPU_API_KEY |
| `zhipuai` | 16 | `https://open.bigmodel.cn/api/paas/v4/models` | ZHIPU_API_KEY |
| `auriko` | 15 | `https://api.auriko.ai/v1/models` | AURIKO_API_KEY |
| `gmicloud` | 15 | `https://api.gmi-serving.com/v1/models` | GMICLOUD_API_KEY |
| `model-oracle-ai` | 15 | `https://api.modeloracle.com/api/v1/models` | MODEL_ORACLE_API_KEY |
| `scaleway` | 15 | `https://api.scaleway.ai/v1/models` | SCALEWAY_API_KEY |
| `volcengine` | 15 | `https://ark.cn-beijing.volces.com/api/v3/models` | ARK_API_KEY |
| `cohere` | 14 | `https://api.cohere.com/v1/models` | COHERE_API_KEY |
| `tokengo` | 13 | `https://api.tokengo.com/v1/models` | TOKENGO_API_KEY |
| `inferx` | 12 | `https://model.inferx.net/endpoints/v1/models` | INFERX_API_KEY |
| `zhipuai-coding-plan` | 11 | `https://open.bigmodel.cn/api/coding/paas/v4/models` | ZHIPU_API_KEY |
| `moonshotai` | 10 | `https://api.moonshot.ai/v1/models` | MOONSHOT_API_KEY |
| `moonshotai-cn` | 10 | `https://api.moonshot.cn/v1/models` | MOONSHOT_API_KEY |
| `vancine` | 10 | `https://vancine.com/v1/models` | VANCINE_API_KEY |
| `daoxe` | 9 | `https://daoxe.com/v1/models` | DAOXE_API_KEY |
| `hpc-ai` | 9 | `https://api.hpc-ai.com/inference/v1/models` | HPC_AI_API_KEY |
| `modelis` | 9 | `https://modelishub.com/v1/models` | MODELIS_API_KEY |
| `qihang-ai` | 9 | `https://api.qhaigc.net/v1/models` | QIHANG_API_KEY |
| `submodel` | 9 | `https://llm.submodel.ai/v1/models` | SUBMODEL_INSTAGEN_ACCESS_KEY |
| `crusoe` | 8 | `https://api.inference.crusoecloud.com/v1/models` | CRUSOE_API_KEY |
| `stackit` | 8 | `https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1/models` | STACKIT_API_KEY |
| `stepfun` | 8 | `https://api.stepfun.com/v1/models` | STEPFUN_API_KEY |
| `stepfun-ai` | 8 | `https://api.stepfun.ai/v1/models` | STEPFUN_API_KEY |
| `tencent-coding-plan` | 8 | `https://api.lkeap.cloud.tencent.com/coding/v3/models` | TENCENT_CODING_PLAN_API_KEY |
| `volcengine-coding-plan` | 8 | `https://ark.cn-beijing.volces.com/api/coding/v3/models` | ARK_CODING_PLAN_API_KEY |
| `aki-io` | 7 | `https://aki.io/v1/models` | AKI_IO_API_KEY |
| `arcee` | 7 | `https://api.arcee.ai/api/v1/models` | ARCEE_API_KEY |
| `llama` | 7 | `https://api.llama.com/compat/v1/models` | LLAMA_API_KEY |
| `minimax` | 7 | `https://api.minimax.io/anthropic/v1/models` | MINIMAX_API_KEY |
| `minimax-cn` | 7 | `https://api.minimaxi.com/anthropic/v1/models` | MINIMAX_API_KEY |
| `minimax-cn-coding-plan` | 7 | `https://api.minimaxi.com/anthropic/v1/models` | MINIMAX_API_KEY |
| `minimax-coding-plan` | 7 | `https://api.minimax.io/anthropic/v1/models` | MINIMAX_API_KEY |
| `runinfra` | 7 | `https://api.runinfra.ai/v1/models` | RUNINFRA_GATEWAY_KEY |
| `xiaomi-token-plan-ams` | 7 | `https://token-plan-ams.xiaomimimo.com/v1/models` | XIAOMI_API_KEY |
| `xiaomi-token-plan-cn` | 7 | `https://token-plan-cn.xiaomimimo.com/v1/models` | XIAOMI_API_KEY |
| `xiaomi-token-plan-sgp` | 7 | `https://token-plan-sgp.xiaomimimo.com/v1/models` | XIAOMI_API_KEY |
| `zai-coding-plan` | 7 | `https://api.z.ai/api/coding/paas/v4/models` | ZHIPU_API_KEY |
| `dinference` | 6 | `https://api.dinference.com/v1/models` | DINFERENCE_API_KEY |
| `pendra` | 6 | `https://api.pendra.ai/api/v1/models` | PENDRA_API_KEY |
| `xiaomi` | 6 | `https://api.xiaomimimo.com/v1/models` | XIAOMI_API_KEY |
| `ai-router` | 5 | `https://api.ai-router.dev/v1/models` | AI_ROUTER_API_KEY |
| `cloudferro-sherlock` | 5 | `https://api-sherlock.cloudferro.com/openai/v1/models` | CLOUDFERRO_SHERLOCK_API_KEY |
| `mixlayer` | 5 | `https://models.mixlayer.ai/v1/models` | MIXLAYER_API_KEY |
| `ebcloud` | 4 | `https://maas-api.ebcloud.com/v1/models` | EBCLOUD_API_KEY |
| `kimi-for-coding` | 4 | `https://api.kimi.com/coding/v1/models` | KIMI_API_KEY |
| `modal` | 4 | `https://inference.us-west.modal.direct/v1/models` | MODAL_PROXY_TOKEN |
| `neosmith` | 4 | `https://router.neosmith.ai/v1/models` | NEOSMITH_API_KEY |
| `perplexity` | 4 | `https://api.perplexity.ai/v1/models` | PERPLEXITY_API_KEY |
| `sakana` | 4 | `https://api.sakana.ai/v1/models` | SAKANA_API_KEY |
| `scx-ai` | 4 | `https://api.scx.ai/v1/models` | SCX_API_KEY |
| `stepfun-step-plan` | 4 | `https://api.stepfun.com/step_plan/v1/models` | STEPFUN_API_KEY |
| `upstage` | 4 | `https://api.upstage.ai/v1/solar/models` | UPSTAGE_API_KEY |
| `abliteration-ai` | 3 | `https://api.abliteration.ai/v1/models` | ABLIT_KEY |
| `agnes` | 3 | `https://apihub.agnes-ai.com/v1/models` | AGNES_API_KEY |
| `coralbricks` | 3 | `https://inference.coralbricks.ai/v1/models` | CORAL_API_KEY |
| `deepseek` | 3 | `https://api.deepseek.com/models` | DEEPSEEK_API_KEY |
| `drun` | 3 | `https://chat.d.run/v1/models` | DRUN_API_KEY |
| `klokintegration` | 3 | `https://api-gw.klok.ipaas.se/proxy/kloker-key/v1/models` | KLOKINTEGRATION_API_KEY |
| `meta` | 3 | `https://api.meta.ai/v1/models` | META_MODEL_API_KEY |
| `morph` | 3 | `https://api.morphllm.com/v1/models` | MORPH_API_KEY |
| `openreason` | 3 | `https://api.openreason.app/v1/models` | OPENREASON_API_KEY |
| `poolside` | 3 | `https://inference.poolside.ai/v1/models` | POOLSIDE_API_KEY |
| `sensenova` | 3 | `https://token.sensenova.cn/v1/models` | SENSENOVA_API_KEY |
| `stepfun-ai-step-plan` | 3 | `https://api.stepfun.ai/step_plan/v1/models` | STEPFUN_API_KEY |
| `tencent-tokenhub` | 3 | `https://tokenhub.tencentmaas.com/v1/models` | TENCENT_TOKENHUB_API_KEY |
| `amd` | 2 | `https://developer.amd.com.cn/radeon/api/v1/models` | AMD_API_KEY |
| `bailing` | 2 | `https://api.tbox.cn/api/llm/v1/chat/completions/models` | BAILING_API_TOKEN |
| `blueclaw` | 2 | `https://openai.blueclaw.network/v1/models` | BLUECLAW_API_KEY |
| `bothub` | 2 | `https://openai.bothub.ru/v1/models` | BOTHUB_API_KEY |
| `cerebras` | 2 | `https://api.cerebras.ai/v1/models` | CEREBRAS_API_KEY |
| `claudinio` | 2 | `https://api.claudin.io/v1/models` | CLAUDINIO_API_KEY |
| `hetzner` | 2 | `https://inference.hetzner.com/api/v1/models` | HETZNER_API_KEY |
| `tencent-token-plan` | 2 | `https://api.lkeap.cloud.tencent.com/plan/v3/models` | TENCENT_TOKEN_PLAN_API_KEY |
| `aixy` | 1 | `https://api.aixy-gateway.com/v1/models` | AIXY_API_KEY |
| `longcat` | 1 | `https://api.longcat.chat/openai/models` | LONGCAT_API_KEY |
| `tokenrouter` | 1 | `https://api.tokenrouter.com/v1/models` | TOKENROUTER_API_KEY |

## No global catalog — account, region or workspace scoped (14)

| Provider | Model files | Endpoint | Note |
|---|---:|---|---|
| `amazon-bedrock` | 123 | `` | AWS ListFoundationModels, SigV4 + per-region |
| `azure` | 85 | `` | per-resource deployment catalog |
| `azure-cognitive-services` | 74 | `` | per-resource deployment catalog |
| `sap-ai-core` | 48 | `` | tenant-scoped |
| `google-vertex` | 44 | `` | project/region-scoped publisher API |
| `neon` | 42 | `${NEON_AI_GATEWAY_BASE_URL}/v1` | project-scoped |
| `databricks` | 30 | `https://${DATABRICKS_HOST}/ai-gateway/mlflow/v1` | workspace host (DATABRICKS_HOST) |
| `snowflake-cortex` | 25 | `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/cortex/v1` | account-scoped |
| `gitlab` | 23 | `` | no public model list (404) |
| `google-vertex-anthropic` | 14 | `` | project/region-scoped publisher API |
| `clarifai` | 12 | `https://api.clarifai.com/v2/ext/openai/v1/models` | unverified: proxy 502 from this session |
| `infomaniak` | 10 | `https://api.infomaniak.com/2/ai/${INFOMANIAK_PRODUCT_ID}/openai/v1` | product-id scoped |
| `v0` | 3 | `` | no /v1/models (404) |
| `salad-cloud` | 1 | `` | org-scoped (404 on public path) |

## Local runtimes (5)

| Provider | Model files | Endpoint | Note |
|---|---:|---|---|
| `qvac` | 9 | `` | no public host |
| `privatemode-ai` | 7 | `http://localhost:8080/v1/models` | localhost:8080 (local runtime) |
| `atomic-chat` | 5 | `http://127.0.0.1:1337/v1/models` | 127.0.0.1:1337 (local runtime) |
| `lmstudio` | 3 | `http://127.0.0.1:1234/v1/models` | 127.0.0.1:1234 (local runtime) |
| `lynkr` | 1 | `http://127.0.0.1:8081/v1/models` | 127.0.0.1:8081 (local runtime) |

## Documented host, no working model route (6)

| Provider | Model files | Endpoint | Note |
|---|---:|---|---|
| `iflowcn` | 14 | `https://apis.iflow.cn/v1/models` | apis.iflow.cn 404 on /v1/models and /models |
| `agentrouter` | 3 | `https://agentrouter.org/v1/models` | Aliyun WAF challenge, not an API response |
| `nova` | 2 | `https://api.nova.amazon.com/v1/models` | api.nova.amazon.com 500 and 404 |
| `thinkingmachines` | 2 | `https://tinker.thinkingmachines.dev/services/tinker-prod/anthropic/api/v1/models` | Tinker exposes no model-list route |
| `kuae-cloud-coding-plan` | 1 | `https://coding-plan-endpoint.kuaecloud.net/v1/models` | coding-plan-endpoint.kuaecloud.net 404 |
| `zeldoc` | 1 | `https://api.zeldoc.ai/v1/models` | api.zeldoc.ai 500 and 404 |
