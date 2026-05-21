const RUNS_TO_FETCH = 10;
export async function fetchGitHubRuns(pipeline, token) {
    const params = new URLSearchParams({
        per_page: String(RUNS_TO_FETCH),
        ...pipeline.params,
    });
    const url = `https://api.github.com/repos/${pipeline.owner}/${pipeline.repo}/actions/workflows/${pipeline.workflow}/runs?${params}`;
    const headers = {
        Accept: "application/vnd.github+json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
        throw new Error(`GitHub API error: ${resp.status} ${resp.statusText}`);
    }
    const data = (await resp.json());
    return data.workflow_runs.map((run) => ({
        id: `#${run.run_number}`,
        status: mapGitHubStatus(run.status, run.conclusion),
        url: run.html_url,
        branch: run.head_branch,
        time: run.created_at,
    }));
}
function mapGitHubStatus(status, conclusion) {
    if (status === "in_progress" || status === "queued")
        return "pending";
    if (conclusion === "success")
        return "success";
    if (conclusion === "failure")
        return "failure";
    if (conclusion === "cancelled")
        return "cancelled";
    return "unknown";
}
export async function fetchADORuns(pipeline) {
    const url = `https://dev.azure.com/${pipeline.org}/${pipeline.project}/_apis/build/builds?definitions=${pipeline.definitionId}&$top=${RUNS_TO_FETCH}&api-version=7.1`;
    const resp = await fetch(url);
    if (!resp.ok) {
        throw new Error(`ADO API error: ${resp.status} ${resp.statusText}`);
    }
    const data = (await resp.json());
    return data.value.map((build) => ({
        id: build.buildNumber,
        status: mapADOStatus(build.status, build.result),
        url: `https://dev.azure.com/${pipeline.org}/${pipeline.project}/_build/results?buildId=${build.id}`,
        branch: (build.sourceBranch ?? "").replace("refs/heads/", ""),
        time: build.startTime ?? build.queueTime,
    }));
}
function mapADOStatus(status, result) {
    if (status !== "completed")
        return "pending";
    if (result === "succeeded")
        return "success";
    if (result === "failed")
        return "failure";
    if (result === "canceled")
        return "cancelled";
    if (result === "partiallySucceeded")
        return "failure";
    return "unknown";
}
