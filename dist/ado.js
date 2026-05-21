const RUNS_TO_FETCH = 10;
export async function fetchADORuns(pipeline) {
    const url = `https://dev.azure.com/${pipeline.org}/${pipeline.project}/_apis/build/builds?definitions=${pipeline.definitionId}&$top=${RUNS_TO_FETCH}&api-version=7.1`;
    const resp = await fetch(url);
    if (!resp.ok) {
        throw new Error(`ADO API error: ${resp.status} ${resp.statusText}`);
    }
    const data = (await resp.json());
    return data.value.map((build) => ({
        id: build.buildNumber,
        status: mapStatus(build.status, build.result),
        url: `https://dev.azure.com/${pipeline.org}/${pipeline.project}/_build/results?buildId=${build.id}`,
        time: build.startTime || build.queueTime,
    }));
}
function mapStatus(status, result) {
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
