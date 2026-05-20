// TypeSpec Integration Dashboard

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const RUNS_TO_SHOW = 10;

const PIPELINES = [
  {
    id: 'gh-typespec-validation-nightly',
    name: 'TypeSpec Validation All (Nightly)',
    source: 'GitHub Actions — Azure/azure-rest-api-specs',
    type: 'github',
    owner: 'Azure',
    repo: 'azure-rest-api-specs',
    workflow: 'typespec-validation-all.yaml',
    params: { event: 'schedule' },
    pipelineUrl: 'https://github.com/Azure/azure-rest-api-specs/actions/workflows/typespec-validation-all.yaml',
  },
  {
    id: 'gh-typespec-validation-next',
    name: 'TypeSpec Validation All (typespec-next)',
    source: 'GitHub Actions — Azure/azure-rest-api-specs',
    type: 'github',
    owner: 'Azure',
    repo: 'azure-rest-api-specs',
    workflow: 'typespec-validation-all.yaml',
    params: { branch: 'typespec-next' },
    pipelineUrl: 'https://github.com/Azure/azure-rest-api-specs/actions/workflows/typespec-validation-all.yaml?query=branch%3Atypespec-next',
  },
  {
    id: 'ado-6119',
    name: 'Autorest Python Nightly',
    source: 'Azure DevOps — azure-sdk/public',
    type: 'ado',
    org: 'azure-sdk',
    project: 'public',
    definitionId: 6119,
    pipelineUrl: 'https://dev.azure.com/azure-sdk/public/_build?definitionId=6119',
  },
  {
    id: 'ado-6134',
    name: 'Autorest TypeScript Nightly',
    source: 'Azure DevOps — azure-sdk/public',
    type: 'ado',
    org: 'azure-sdk',
    project: 'public',
    definitionId: 6134,
    pipelineUrl: 'https://dev.azure.com/azure-sdk/public/_build?definitionId=6134',
  },
  {
    id: 'ado-7123',
    name: 'typespec-java nightly dev',
    source: 'Azure DevOps — azure-sdk/public',
    type: 'ado',
    org: 'azure-sdk',
    project: 'public',
    definitionId: 7123,
    pipelineUrl: 'https://dev.azure.com/azure-sdk/public/_build?definitionId=7123',
  },
  {
    id: 'ado-7506',
    name: 'Autorest Go Nightly',
    source: 'Azure DevOps — azure-sdk/public',
    type: 'ado',
    org: 'azure-sdk',
    project: 'public',
    definitionId: 7506,
    pipelineUrl: 'https://dev.azure.com/azure-sdk/public/_build?definitionId=7506',
  },
];

// --- API Fetchers ---

async function fetchGitHubRuns(pipeline) {
  const params = new URLSearchParams({
    per_page: String(RUNS_TO_SHOW),
    ...pipeline.params,
  });
  const url = `https://api.github.com/repos/${pipeline.owner}/${pipeline.repo}/actions/workflows/${pipeline.workflow}/runs?${params}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
  const data = await resp.json();
  return data.workflow_runs.map(run => ({
    id: run.run_number,
    status: mapGitHubStatus(run.status, run.conclusion),
    url: run.html_url,
    branch: run.head_branch,
    time: run.created_at,
    event: run.event,
  }));
}

function mapGitHubStatus(status, conclusion) {
  if (status === 'in_progress' || status === 'queued') return 'pending';
  if (conclusion === 'success') return 'success';
  if (conclusion === 'failure') return 'failure';
  if (conclusion === 'cancelled') return 'cancelled';
  return 'unknown';
}

async function fetchADORuns(pipeline) {
  const url = `https://dev.azure.com/${pipeline.org}/${pipeline.project}/_apis/build/builds?definitions=${pipeline.definitionId}&$top=${RUNS_TO_SHOW}&api-version=7.1`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`ADO API error: ${resp.status}`);
  const data = await resp.json();
  return data.value.map(build => ({
    id: build.buildNumber,
    status: mapADOStatus(build.status, build.result),
    url: `https://dev.azure.com/${pipeline.org}/${pipeline.project}/_build/results?buildId=${build.id}`,
    branch: (build.sourceBranch || '').replace('refs/heads/', ''),
    time: build.startTime || build.queueTime,
  }));
}

function mapADOStatus(status, result) {
  if (status !== 'completed') return 'pending';
  if (result === 'succeeded') return 'success';
  if (result === 'failed') return 'failure';
  if (result === 'canceled') return 'cancelled';
  if (result === 'partiallySucceeded') return 'failure';
  return 'unknown';
}

// --- Rendering ---

function renderDashboard() {
  const dashboard = document.getElementById('dashboard');
  dashboard.innerHTML = PIPELINES.map(p => `
    <div class="pipeline-card" id="card-${p.id}">
      <div class="pipeline-header">
        <h2><a href="${p.pipelineUrl}" target="_blank" rel="noopener">${p.name}</a></h2>
        <span class="pipeline-badge unknown" id="badge-${p.id}">—</span>
      </div>
      <div class="pipeline-source">${p.source}</div>
      <div class="runs-list"><span class="loading">Loading...</span></div>
    </div>
  `).join('');
}

function renderRuns(pipelineId, runs) {
  const card = document.getElementById(`card-${pipelineId}`);
  if (!card) return;
  const container = card.querySelector('.runs-list');
  const badge = document.getElementById(`badge-${pipelineId}`);

  if (runs.length === 0) {
    container.innerHTML = '<span class="loading">No runs found</span>';
    return;
  }

  // Update card and badge based on latest run status
  const latestStatus = runs[0].status;
  card.className = `pipeline-card status-${latestStatus}`;
  badge.className = `pipeline-badge ${latestStatus}`;
  badge.textContent = statusLabel(latestStatus);

  container.innerHTML = runs.map(run => `
    <div class="run-row">
      <span class="run-status ${run.status}" title="${run.status}"></span>
      <span class="run-id"><a href="${run.url}" target="_blank" rel="noopener">${run.id}</a></span>
      <span class="run-branch">${run.branch || ''}</span>
      <span class="run-time">${formatTime(run.time)}</span>
    </div>
  `).join('');
}

function statusLabel(status) {
  switch (status) {
    case 'success': return '✓ Passing';
    case 'failure': return '✗ Failing';
    case 'pending': return '● Running';
    case 'cancelled': return '○ Cancelled';
    default: return '— Unknown';
  }
}

function renderError(pipelineId, error) {
  const card = document.getElementById(`card-${pipelineId}`);
  if (!card) return;
  const container = card.querySelector('.runs-list');
  container.innerHTML = `<span class="pipeline-error">⚠ ${error.message}</span>`;
}

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// --- Refresh Logic ---

let refreshTimer = null;
let countdownTimer = null;
let nextRefreshAt = null;

async function refreshAll() {
  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.textContent = '↻ Refreshing...';

  const promises = PIPELINES.map(async pipeline => {
    try {
      const runs = pipeline.type === 'github'
        ? await fetchGitHubRuns(pipeline)
        : await fetchADORuns(pipeline);
      renderRuns(pipeline.id, runs);
    } catch (err) {
      renderError(pipeline.id, err);
    }
  });

  await Promise.all(promises);

  btn.disabled = false;
  btn.textContent = '↻ Refresh';
  document.getElementById('last-updated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
  scheduleNextRefresh();
}

function scheduleNextRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  if (countdownTimer) clearInterval(countdownTimer);

  nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;
  refreshTimer = setTimeout(refreshAll, REFRESH_INTERVAL_MS);

  countdownTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    document.getElementById('countdown').textContent = `Next refresh in ${mins}:${String(secs).padStart(2, '0')}`;
  }, 1000);
}

// --- Init ---

renderDashboard();
refreshAll();
