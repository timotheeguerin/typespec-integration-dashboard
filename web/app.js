// TypeSpec Integration Dashboard — Web UI
import { PIPELINES, LANG_SVG } from "/shared/pipelines.js";
import { fetchGitHubRuns, fetchADORuns } from "/shared/fetchers.js";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// --- Config (fetched from local server) ---
let githubToken = null;

async function loadConfig() {
  try {
    const resp = await fetch('/api/config');
    if (resp.ok) {
      const config = await resp.json();
      githubToken = config.githubToken;
    }
  } catch {
    // Running without local server — no token available
  }
}

// --- Rendering ---

function renderDashboard() {
  const dashboard = document.getElementById('dashboard');
  dashboard.innerHTML = PIPELINES.map(p => {
    const iconUrl = LANG_SVG[p.lang] || '';
    const iconHtml = iconUrl ? `<img class="pipeline-lang-icon" src="${iconUrl}" alt="${p.lang}" />` : '';
    return `
    <div class="pipeline-card" id="card-${p.id}">
      <div class="pipeline-header">
        <div class="pipeline-title">
          ${iconHtml}
          <h2><a href="${p.pipelineUrl}" target="_blank" rel="noopener">${p.name}</a></h2>
        </div>
        <span class="pipeline-badge unknown" id="badge-${p.id}">—</span>
      </div>
      <div class="pipeline-source">${p.source === "github" ? "GitHub Actions" : "Azure DevOps"}</div>
      <div class="runs-list"><span class="loading">Loading...</span></div>
    </div>
  `;
  }).join('');
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
      const runs = pipeline.source === 'github'
        ? await fetchGitHubRuns(pipeline, githubToken)
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

window.refreshAll = refreshAll;
document.getElementById('refresh-btn').addEventListener('click', refreshAll);

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
loadConfig().then(() => refreshAll());
