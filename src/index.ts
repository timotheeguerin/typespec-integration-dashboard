#!/usr/bin/env node

import { exec } from "node:child_process";
import { PIPELINES, type AnyPipeline, type PipelineResult } from "./pipelines.js";
import { fetchGitHubRuns, fetchADORuns } from "./fetchers.js";
import { getToken } from "./github.js";
import { startServer } from "./server.js";

// ANSI colors
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const link = (text: string, url: string) => `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;

async function fetchPipeline(pipeline: AnyPipeline): Promise<PipelineResult> {
  try {
    const token = getToken();
    const runs =
      pipeline.source === "github"
        ? await fetchGitHubRuns(pipeline, token)
        : await fetchADORuns(pipeline);
    return { pipeline, runs };
  } catch (e: any) {
    return { pipeline, runs: [], error: e.message };
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case "success": return green("●");
    case "failure": return red("●");
    case "pending": return yellow("●");
    case "cancelled": return dim("○");
    default: return dim("○");
  }
}

function statusWord(status: string): string {
  switch (status) {
    case "success": return "passing";
    case "failure": return "failing";
    case "pending": return "running";
    case "cancelled": return "cancelled";
    default: return "unknown";
  }
}

function colorize(status: string, text: string): string {
  switch (status) {
    case "success": return green(text);
    case "failure": return red(text);
    case "pending": return yellow(text);
    default: return dim(text);
  }
}

function passRate(results: PipelineResult): string {
  if (results.runs.length === 0) return dim("  —  ");
  const passed = results.runs.filter((r) => r.status === "success").length;
  const total = results.runs.length;
  const text = `${passed}/${total}`.padStart(5);
  const ratio = passed / total;
  if (ratio >= 0.8) return green(text);
  if (ratio >= 0.5) return yellow(text);
  return red(text);
}

function render(results: PipelineResult[]): void {
  const nameWidth = Math.max(...results.map((r) => r.pipeline.name.length)) + 2;
  const rateWidth = 5; // "10/10"
  const wordWidth = 9; // "cancelled"
  const separator = dim("─".repeat(nameWidth + rateWidth + wordWidth + 12));

  console.log("");
  console.log(bold("  TypeSpec Integration Status"));
  console.log(`  ${separator}`);

  for (const result of results) {
    if (result.error) {
      const icon = red("⚠");
      const name = result.pipeline.name.padEnd(nameWidth);
      console.log(`  ${icon} ${name} ${dim(result.error)}`);
      continue;
    }

    const latest = result.runs[0]?.status ?? "unknown";
    const icon = statusIcon(latest);
    const name = result.pipeline.name.padEnd(nameWidth);
    const rate = passRate(result);
    const word = colorize(latest, statusWord(latest).padEnd(wordWidth));
    const url = dim(link("go to ↗", result.pipeline.pipelineUrl));
    console.log(`  ${icon} ${name} ${rate}  ${word}  ${url}`);
  }

  console.log(`  ${separator}`);
  console.log(`  ${dim("Use --open to launch the local dashboard in your browser.")}`);
  console.log("");
}

function openUrl(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${cmd} "${url}"`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldOpen = args.includes("--open") || args.includes("--web");

  const results = await Promise.all(PIPELINES.map(fetchPipeline));
  render(results);

  if (shouldOpen) {
    const url = await startServer();
    openUrl(url);
    console.log(dim(`  Local dashboard running at ${cyan(url)}`));
    console.log(dim("  Press Ctrl+C to stop.\n"));
    return; // Keep process alive for the server
  }

  // Exit 1 if any pipeline's latest run is failing
  const hasFailing = results.some(
    (r) => r.runs.length > 0 && r.runs[0]?.status === "failure"
  );
  if (hasFailing) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(red(`Error: ${err.message}`));
  process.exit(2);
});
