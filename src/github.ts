import { execSync } from "node:child_process";

let cachedToken: string | undefined;

function getGitHubToken(): string | undefined {
  try {
    return execSync("gh auth token", { encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}

export function getToken(): string | undefined {
  if (cachedToken === undefined) {
    cachedToken = getGitHubToken() ?? "";
  }
  return cachedToken || undefined;
}
