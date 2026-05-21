import { execSync } from "node:child_process";
let cachedToken;
function getGitHubToken() {
    try {
        return execSync("gh auth token", { encoding: "utf-8" }).trim();
    }
    catch {
        return undefined;
    }
}
export function getToken() {
    if (cachedToken === undefined) {
        cachedToken = getGitHubToken() ?? "";
    }
    return cachedToken || undefined;
}
