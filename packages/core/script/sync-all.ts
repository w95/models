#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { groups, providers } from "../src/sync/index.js";
import { syncAll, type SyncAllReport } from "../src/sync/all.js";

const REPO_ROOT = path.join(import.meta.dirname, "..", "..", "..");
const REPORT_PATH = path.join(REPO_ROOT, ".sync", "sync-all.json");

const args = process.argv.slice(2);
const json = args.includes("--json");
const dryRun = args.includes("--dry-run");
const targets = args.filter((arg) => !arg.startsWith("-"));

// Provider modelsDirs are relative, and Bun loads .env from the cwd at process
// start — before any code here runs, so chdir cannot rescue it. Running from
// elsewhere would silently skip every credential-gated provider and still exit 0,
// which is the worst way for an unattended job to fail.
if (process.cwd() !== REPO_ROOT) {
  console.error(`sync:all must run from the repo root (${REPO_ROOT}) so relative paths and .env resolve.`);
  process.exit(1);
}

function resolveIds(names: string[]) {
  if (names.length === 0) return Object.keys(providers);
  return names.flatMap((name) => {
    if (name in groups) return [...groups[name as keyof typeof groups]];
    if (name in providers) return [name];
    console.error(`Unknown provider or group: ${name}`);
    process.exit(1);
  });
}

function summarize(report: SyncAllReport) {
  const { counts } = report;
  const lines = [
    `\nSync summary (${counts.total} providers, ${Math.round(report.durationMs / 1000)}s${report.dryRun ? ", dry run" : ""})`,
  ];

  const changed = report.providers.filter((run) => run.outcome === "changed");
  lines.push(`  changed   ${String(counts.changed).padStart(3)}`);
  for (const run of changed) {
    lines.push(`    ${run.id}: +${run.created} ~${run.updated} -${run.deleted}`);
  }
  lines.push(`  unchanged ${String(counts.unchanged).padStart(3)}`);

  const skipped = report.providers.filter((run) => run.outcome === "skipped");
  lines.push(`  skipped   ${String(counts.skipped).padStart(3)}`);
  for (const run of skipped) lines.push(`    ${run.id}: ${run.error}`);

  const failed = report.providers.filter((run) => run.outcome === "failed");
  lines.push(`  failed    ${String(counts.failed).padStart(3)}`);
  for (const run of failed) lines.push(`    ${run.id}: ${run.error}`);

  if (counts.failed > 0 && counts.failed === counts.total) {
    lines.push("  Every provider failed — suspect the network or a proxy, not the providers.");
  }

  if (report.validation.ok) {
    lines.push("  validation ok");
  } else {
    lines.push(`  validation FAILED: ${report.validation.error}`);
    if (report.validation.cause !== undefined) {
      lines.push(`    ${JSON.stringify(report.validation.cause).slice(0, 300)}`);
    }
    lines.push("    Files are already written; fix or revert the file above.");
  }

  lines.push(`  report ${path.relative(REPO_ROOT, REPORT_PATH)}`);
  return lines.join("\n");
}

// syncProvider logs its own progress and is not injectable, so --json muzzles
// console.log for the duration to keep stdout parseable. console.error is untouched.
const log = console.log;
if (json) console.log = () => {};

const report = await syncAll({ ids: resolveIds(targets), dryRun });

if (json) console.log = log;

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await Bun.write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(json ? JSON.stringify(report) : summarize(report));

// 2 distinguishes "the working tree holds bad files" from "a provider was
// unreachable", which is the first thing you want to know from a cron log.
if (!report.validation.ok) process.exitCode = 2;
else if (report.counts.failed > 0) process.exitCode = 1;
