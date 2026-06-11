import type { MovementMetrics } from '../lib/movement-types';
import { analyzeMovementWithKimi } from '../lib/kimi-client';
import {
  computeOverallScore,
  computeSymmetry,
  detectPerformancePhases,
  generateTrainingTips,
  getJointInsights,
  getOverviewSummary,
  getRelatedResources,
} from '../lib/movement-insights';
import { movementStore } from '../lib/movement-store';

// @ts-ignore
import template from '../templates/movement-analysis.html?raw';

type Subpage = 'overview' | 'biomechanics' | 'performance' | 'insights' | 'training';

const SUBPAGE_META: Record<Subpage, { title: string; subtitle: string }> = {
  overview: { title: 'Overview', subtitle: 'Session summary and key movement scores' },
  biomechanics: { title: 'Biomechanics', subtitle: 'Joint angles, posture, balance, and symmetry analysis' },
  performance: { title: 'Performance', subtitle: 'Velocity, activity phases, and body region metrics' },
  insights: { title: 'AI Insights', subtitle: 'Deep movement analysis powered by Kimi AI' },
  training: { title: 'Training & Tips', subtitle: 'Personalized exercises, focus areas, and resources' },
};

let unsubscribe: (() => void) | null = null;
let hashListener: (() => void) | null = null;
let resizeListener: (() => void) | null = null;

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderList(id: string, items: string[]) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.length
    ? items.map((item) => `<li>${item}</li>`).join('')
    : '<li class="empty-li">No data available yet.</li>';
}

function renderBodyRegions(containerId: string, metrics: MovementMetrics) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const regions = [
    { label: 'Upper Body', value: metrics.bodyRegionActivity.upperBody, color: '#00d4ff' },
    { label: 'Core', value: metrics.bodyRegionActivity.core, color: '#7c5cff' },
    { label: 'Lower Body', value: metrics.bodyRegionActivity.lowerBody, color: '#00ff9d' },
    { label: 'Hands', value: metrics.bodyRegionActivity.hands, color: '#ff6b6b' },
  ];

  container.innerHTML = regions
    .map(
      (r) => `
    <div class="region-row">
      <div class="region-label"><span class="region-dot" style="background:${r.color}"></span>${r.label}</div>
      <div class="region-bar-track">
        <div class="region-bar-fill" style="width:${r.value}%; background:${r.color}"></div>
      </div>
      <span class="region-value">${r.value.toFixed(0)}</span>
    </div>`,
    )
    .join('');
}

function drawLineChart(
  canvasId: string,
  series: { label: string; color: string; data: { t: number; v: number }[] }[],
  emptyText = 'No data',
) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 20, right: 16, bottom: 28, left: 44 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const allPoints = series.flatMap((s) => s.data);
  if (!allPoints.length) {
    ctx.fillStyle = '#8a8f98';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(emptyText, w / 2, h / 2);
    return;
  }

  const maxV = Math.max(...allPoints.map((d) => d.v), 0.001);
  const maxT = Math.max(...allPoints.map((d) => d.t), 1);

  ctx.strokeStyle = 'rgba(232, 230, 227, 0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
  }

  series.forEach((s) => {
    if (!s.data.length) return;

    ctx.beginPath();
    s.data.forEach((d, i) => {
      const x = pad.left + (d.t / maxT) * chartW;
      const y = pad.top + chartH - (d.v / maxV) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  let legendX = pad.left;
  series.forEach((s) => {
    ctx.fillStyle = s.color;
    ctx.fillRect(legendX, h - 16, 10, 3);
    ctx.fillStyle = '#8a8f98';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(s.label, legendX + 14, h - 12);
    legendX += ctx.measureText(s.label).width + 36;
  });
}

function drawVelocityChart(metrics: MovementMetrics) {
  drawLineChart(
    'chart-velocity',
    [{ label: 'Velocity', color: '#00d4ff', data: metrics.velocityTimeline.map((d) => ({ t: d.t, v: d.v })) }],
    'No velocity data',
  );
}

function drawAnglesChart(metrics: MovementMetrics) {
  const timeline = metrics.angleTimeline;
  drawLineChart(
    'chart-angles',
    [
      { label: 'L Elbow', color: '#00d4ff', data: timeline.map((d) => ({ t: d.t, v: d.angles.leftElbow })) },
      { label: 'R Elbow', color: '#7c5cff', data: timeline.map((d) => ({ t: d.t, v: d.angles.rightElbow })) },
      { label: 'L Knee', color: '#00ff9d', data: timeline.map((d) => ({ t: d.t, v: d.angles.leftKnee })) },
      { label: 'R Knee', color: '#ff6b6b', data: timeline.map((d) => ({ t: d.t, v: d.angles.rightKnee })) },
    ],
    'No angle timeline data',
  );
}

function renderHandBars(metrics: MovementMetrics) {
  const max = Math.max(metrics.leftHandActivity, metrics.rightHandActivity, 0.001);
  const leftBar = document.getElementById('hand-left-bar');
  const rightBar = document.getElementById('hand-right-bar');
  if (leftBar) leftBar.style.width = `${(metrics.leftHandActivity / max) * 100}%`;
  if (rightBar) rightBar.style.width = `${(metrics.rightHandActivity / max) * 100}%`;
  setText('hand-left-val', metrics.leftHandActivity.toFixed(3));
  setText('hand-right-val', metrics.rightHandActivity.toFixed(3));

  const handInsight = document.getElementById('hand-insight');
  if (handInsight) {
    const diff = Math.abs(metrics.leftHandActivity - metrics.rightHandActivity);
    const total = metrics.leftHandActivity + metrics.rightHandActivity;
    if (total < 0.005) {
      handInsight.textContent = 'Minimal hand movement detected in this session.';
    } else if (diff / total < 0.2) {
      handInsight.textContent = 'Balanced bilateral hand activity — good coordination.';
    } else {
      const dominant = metrics.leftHandActivity > metrics.rightHandActivity ? 'left' : 'right';
      handInsight.textContent = `${dominant.charAt(0).toUpperCase() + dominant.slice(1)} hand showed more activity. Consider unilateral coordination drills.`;
    }
  }
}

function renderAiQuality(items: { label: string; score: number }[]) {
  const grid = document.getElementById('ai-quality-grid');
  if (!grid) return;
  grid.innerHTML = items
    .map(
      (item) => `
    <div class="ai-quality-card">
      <span class="ai-quality-score">${Math.round(item.score)}</span>
      <span class="ai-quality-label">${item.label}</span>
      <div class="ai-quality-bar"><div class="ai-quality-fill" style="width:${item.score}%"></div></div>
    </div>`,
    )
    .join('');
}

function renderOverview(metrics: MovementMetrics, symmetry: ReturnType<typeof computeSymmetry>, overall: number) {
  setText('metric-detection', `${metrics.poseDetectionRate.toFixed(0)}%`);
  setText('metric-velocity', metrics.avgMovementVelocity.toFixed(3));
  setText('metric-posture', `${metrics.postureStability.toFixed(0)}/100`);
  setText('metric-balance', `${metrics.balanceScore.toFixed(0)}/100`);
  setText('overview-summary', getOverviewSummary(metrics, symmetry));

  const highlights = document.getElementById('overview-highlights');
  if (highlights) {
    const chips = [
      { label: `Symmetry ${symmetry.overall.toFixed(0)}%`, good: symmetry.overall >= 75 },
      { label: `${metrics.totalFrames} frames`, good: metrics.totalFrames > 30 },
      { label: formatDuration(metrics.sessionDurationMs), good: metrics.sessionDurationMs > 3000 },
      { label: `Peak velocity ${metrics.maxMovementVelocity.toFixed(2)}`, good: metrics.maxMovementVelocity > 0.02 },
    ];
    highlights.innerHTML = chips
      .map((c) => `<span class="highlight-chip ${c.good ? 'highlight-chip--good' : 'highlight-chip--warn'}">${c.label}</span>`)
      .join('');
  }

  const breakdown = document.getElementById('score-breakdown');
  if (breakdown) {
    const items = [
      { label: 'Posture', score: metrics.postureStability },
      { label: 'Balance', score: metrics.balanceScore },
      { label: 'Symmetry', score: symmetry.overall },
      { label: 'Tracking', score: metrics.poseDetectionRate },
      { label: 'Core Activity', score: metrics.bodyRegionActivity.core },
    ];
    breakdown.innerHTML = items
      .map(
        (i) => `
      <div class="score-row">
        <span>${i.label}</span>
        <div class="score-row-bar"><div class="score-row-fill" style="width:${i.score}%"></div></div>
        <span class="score-row-val">${i.score.toFixed(0)}</span>
      </div>`,
      )
      .join('');
  }

  renderBodyRegions('body-regions', metrics);
  setText('overall-score-value', String(overall));
}

function renderBiomechanics(metrics: MovementMetrics, symmetry: ReturnType<typeof computeSymmetry>) {
  setText('symmetry-score', `${symmetry.overall.toFixed(0)}%`);
  const sideText =
    symmetry.dominantSide === 'balanced'
      ? 'Balanced left-right movement'
      : `${symmetry.dominantSide.charAt(0).toUpperCase() + symmetry.dominantSide.slice(1)}-side dominant`;
  setText('symmetry-side', sideText);

  const symBars = document.getElementById('symmetry-bars');
  if (symBars) {
    const bars = [
      { label: 'Elbows', value: symmetry.elbow },
      { label: 'Knees', value: symmetry.knee },
      { label: 'Shoulders', value: symmetry.shoulder },
    ];
    symBars.innerHTML = bars
      .map(
        (b) => `
      <div class="symmetry-bar-item">
        <span>${b.label}</span>
        <div class="region-bar-track"><div class="region-bar-fill" style="width:${b.value}%"></div></div>
        <span class="region-value">${b.value.toFixed(0)}</span>
      </div>`,
      )
      .join('');
  }

  const insights = getJointInsights(metrics.avgJointAngles);
  const jointContainer = document.getElementById('joint-insights');
  if (jointContainer) {
    jointContainer.innerHTML = insights
      .map(
        (j) => `
      <div class="joint-insight-card joint-insight-card--${j.status}">
        <div class="joint-insight-header">
          <span class="joint-insight-name">${j.name}</span>
          <span class="joint-insight-value">${j.value.toFixed(0)}°</span>
          <span class="joint-insight-badge">${j.status}</span>
        </div>
        <div class="joint-insight-range">
          <span>Ideal: ${j.idealMin}° – ${j.idealMax}°</span>
          <div class="ideal-range-bar">
            <div class="ideal-range-zone"></div>
            <div class="ideal-range-marker" style="left:${Math.min(100, Math.max(0, ((j.value - j.idealMin) / (j.idealMax - j.idealMin + 40)) * 100))}%"></div>
          </div>
        </div>
        <p class="joint-insight-tip">${j.tip}</p>
      </div>`,
      )
      .join('');
  }

  const postureDetail = document.getElementById('posture-detail');
  if (postureDetail) {
    const level = metrics.postureStability >= 80 ? 'Excellent' : metrics.postureStability >= 60 ? 'Moderate' : 'Needs work';
    postureDetail.innerHTML = `
      <div class="detail-score">${metrics.postureStability.toFixed(0)}<span>/100</span></div>
      <p class="detail-level">${level} hip stability</p>
      <p>Measures how steadily your hip center stays during movement. Higher scores indicate less postural sway and better core control.</p>`;
  }

  const balanceDetail = document.getElementById('balance-detail');
  if (balanceDetail) {
    const level = metrics.balanceScore >= 80 ? 'Well aligned' : metrics.balanceScore >= 60 ? 'Slight asymmetry' : 'Imbalanced';
    balanceDetail.innerHTML = `
      <div class="detail-score">${metrics.balanceScore.toFixed(0)}<span>/100</span></div>
      <p class="detail-level">${level}</p>
      <p>Evaluates shoulder alignment and weight distribution. Symmetrical shoulder angles suggest balanced upper-body positioning.</p>`;
  }

  drawAnglesChart(metrics);
}

function renderPerformance(metrics: MovementMetrics) {
  const perfStats = document.getElementById('perf-stats');
  if (perfStats) {
    perfStats.innerHTML = `
      <div class="perf-stat"><span class="perf-stat-val">${metrics.avgMovementVelocity.toFixed(3)}</span><span class="perf-stat-label">Avg Velocity</span></div>
      <div class="perf-stat"><span class="perf-stat-val">${metrics.maxMovementVelocity.toFixed(3)}</span><span class="perf-stat-label">Peak Velocity</span></div>
      <div class="perf-stat"><span class="perf-stat-val">${metrics.totalFrames}</span><span class="perf-stat-label">Frames</span></div>
      <div class="perf-stat"><span class="perf-stat-val">${formatDuration(metrics.sessionDurationMs)}</span><span class="perf-stat-label">Duration</span></div>`;
  }

  drawVelocityChart(metrics);

  const phases = detectPerformancePhases(metrics);
  const phasesEl = document.getElementById('perf-phases');
  if (phasesEl) {
    phasesEl.innerHTML = phases.length
      ? phases
          .map(
            (p) => `
        <div class="phase-item phase-item--${p.intensity}">
          <span class="phase-dot"></span>
          <div class="phase-info">
            <span class="phase-label">${p.label}</span>
            <span class="phase-time">${(p.startMs / 1000).toFixed(1)}s – ${(p.endMs / 1000).toFixed(1)}s</span>
          </div>
        </div>`,
          )
          .join('')
      : '<p class="empty-phase">Record a longer session to detect activity phases.</p>';
  }

  renderBodyRegions('perf-body-regions', metrics);
  renderHandBars(metrics);
}

function renderInsights(session: ReturnType<typeof movementStore.getSession>) {
  const aiEmpty = document.getElementById('ai-empty');
  const aiPanel = document.getElementById('ai-panel');
  const hasAi = Boolean(session.aiAnalysis);

  aiEmpty?.classList.toggle('ai-empty-state--hidden', hasAi);
  aiPanel?.classList.toggle('ai-panel-content--hidden', !hasAi);

  if (session.aiAnalysis) {
    const ai = session.aiAnalysis;
    setText('ai-summary', ai.summary);
    renderList('ai-strengths', ai.strengths);
    renderList('ai-improvements', ai.improvements);
    renderList('ai-recommendations', ai.recommendations);
    if (ai.movementQuality.length) renderAiQuality(ai.movementQuality);
  }
}

function renderTraining(metrics: MovementMetrics, symmetry: ReturnType<typeof computeSymmetry>) {
  const tips = generateTrainingTips(metrics, symmetry);
  const tipsEl = document.getElementById('training-tips');
  if (tipsEl) {
    tipsEl.innerHTML = tips
      .map(
        (t) => `
      <div class="training-tip-card training-tip-card--${t.priority}">
        <div class="training-tip-icon"><span class="material-icons">${t.icon}</span></div>
        <div class="training-tip-body">
          <div class="training-tip-header">
            <h4>${t.title}</h4>
            <span class="priority-badge priority-badge--${t.priority}">${t.priority}</span>
          </div>
          <p>${t.description}</p>
          <span class="training-tip-cat">${t.category}</span>
        </div>
      </div>`,
      )
      .join('');
  }

  const focusEl = document.getElementById('focus-areas');
  if (focusEl) {
    const focus = tips.filter((t) => t.priority === 'high').slice(0, 3);
    const fallback = tips.slice(0, 3);
    const items = focus.length ? focus : fallback;
    focusEl.innerHTML = items
      .map(
        (t, i) => `
      <div class="focus-area-card">
        <span class="focus-num">${i + 1}</span>
        <div>
          <h4>${t.title}</h4>
          <p>${t.description}</p>
        </div>
      </div>`,
      )
      .join('');
  }

  const resourcesEl = document.getElementById('related-resources');
  if (resourcesEl) {
    const resources = getRelatedResources(metrics);
    resourcesEl.innerHTML = resources
      .map(
        (r) => `
      <div class="resource-card">
        <span class="resource-focus">${r.focus}</span>
        <h4>${r.title}</h4>
        <p>${r.description}</p>
      </div>`,
      )
      .join('');
  }
}

function navigateSubpage(subpage: Subpage) {
  const meta = SUBPAGE_META[subpage];
  setText('subpage-title', meta.title);
  setText('subpage-subtitle', meta.subtitle);

  document.querySelectorAll('.subnav-link').forEach((link) => {
    link.classList.toggle('active', link.getAttribute('data-subpage') === subpage);
  });

  document.querySelectorAll('.subpage').forEach((page) => {
    page.classList.toggle('active', page.id === `subpage-${subpage}`);
  });
}

function parseSubpageFromHash(): Subpage {
  const hash = window.location.hash.slice(1);
  const match = hash.match(/^\/analysis\/movement(?:\/(\w+))?/);
  const page = match?.[1] as Subpage | undefined;
  if (page && page in SUBPAGE_META) return page;
  return 'overview';
}

function renderDashboard() {
  const session = movementStore.getSession();
  const hasData = session.samples.length > 0;
  const metrics = session.metrics;

  document.getElementById('empty-state')?.classList.toggle('analysis-empty--hidden', hasData);
  document.getElementById('subpages')?.classList.toggle('analysis-subpages--hidden', !hasData);

  const statusEl = document.getElementById('session-status');
  const statusText = document.getElementById('session-status-text');
  if (statusEl && statusText) {
    if (session.isRecording) {
      statusEl.className = 'session-status session-status--recording';
      statusText.textContent = 'Recording in progress...';
    } else if (hasData) {
      statusEl.className = 'session-status session-status--ready';
      statusText.textContent = 'Session data available';
    } else {
      statusEl.className = 'session-status session-status--idle';
      statusText.textContent = 'No active recording';
    }
  }

  setText('stat-frames', String(session.samples.length));
  const duration = session.endedAt
    ? session.endedAt - session.startedAt
    : session.isRecording
      ? Date.now() - session.startedAt
      : 0;
  setText('stat-duration', formatDuration(duration));

  const analyzeBtn = document.getElementById('btn-analyze') as HTMLButtonElement | null;
  const analyzeInline = document.getElementById('btn-analyze-inline') as HTMLButtonElement | null;
  const disabled = !metrics || session.isRecording;
  if (analyzeBtn) analyzeBtn.disabled = disabled;
  if (analyzeInline) analyzeInline.disabled = disabled;

  document.getElementById('overall-score-badge')?.classList.toggle('overall-score-badge--hidden', !hasData);

  if (!metrics) return;

  const symmetry = computeSymmetry(metrics.avgJointAngles);
  const overall = computeOverallScore(metrics, symmetry, session.aiAnalysis);

  renderOverview(metrics, symmetry, overall);
  renderBiomechanics(metrics, symmetry);
  renderPerformance(metrics);
  renderInsights(session);
  renderTraining(metrics, symmetry);

  navigateSubpage(parseSubpageFromHash());
}

async function runAiAnalysis() {
  const session = movementStore.getSession();
  if (!session.metrics) movementStore.recomputeMetrics();
  const metrics = movementStore.getSession().metrics;
  if (!metrics) return;

  navigateSubpage('insights');

  const loading = document.getElementById('ai-loading');
  const content = document.getElementById('ai-content');
  const aiPanel = document.getElementById('ai-panel');
  const aiEmpty = document.getElementById('ai-empty');
  const analyzeBtn = document.getElementById('btn-analyze') as HTMLButtonElement | null;
  const analyzeInline = document.getElementById('btn-analyze-inline') as HTMLButtonElement | null;

  aiEmpty?.classList.add('ai-empty-state--hidden');
  aiPanel?.classList.remove('ai-panel-content--hidden');
  loading?.classList.remove('ai-loading--hidden');
  if (content) content.style.opacity = '0.4';
  if (analyzeBtn) analyzeBtn.disabled = true;
  if (analyzeInline) analyzeInline.disabled = true;

  try {
    const result = await analyzeMovementWithKimi(metrics);
    movementStore.setAiAnalysis(result);
    renderDashboard();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed';
    setText('ai-summary', `Error: ${msg}`);
    aiPanel?.classList.remove('ai-panel-content--hidden');
    aiEmpty?.classList.add('ai-empty-state--hidden');
  } finally {
    loading?.classList.add('ai-loading--hidden');
    if (content) content.style.opacity = '1';
    if (analyzeBtn) analyzeBtn.disabled = false;
    if (analyzeInline) analyzeInline.disabled = false;
  }
}

export async function setupMovementAnalysis(container: HTMLElement) {
  container.innerHTML = template;
  movementStore.loadFromStorage();

  document.getElementById('btn-analyze')?.addEventListener('click', runAiAnalysis);
  document.getElementById('btn-analyze-inline')?.addEventListener('click', runAiAnalysis);
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    movementStore.loadFromStorage();
    movementStore.recomputeMetrics();
    renderDashboard();
  });
  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (confirm('Clear all movement session data?')) {
      movementStore.clearSession();
      renderDashboard();
    }
  });

  hashListener = () => {
    if (window.location.hash.startsWith('#/analysis/movement')) {
      navigateSubpage(parseSubpageFromHash());
    }
  };
  window.addEventListener('hashchange', hashListener);

  resizeListener = () => {
    const metrics = movementStore.getSession().metrics;
    if (metrics) {
      drawVelocityChart(metrics);
      drawAnglesChart(metrics);
    }
  };
  window.addEventListener('resize', resizeListener);

  unsubscribe = movementStore.subscribe(renderDashboard);
  renderDashboard();
}

export function cleanupMovementAnalysis() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (hashListener) {
    window.removeEventListener('hashchange', hashListener);
    hashListener = null;
  }
  if (resizeListener) {
    window.removeEventListener('resize', resizeListener);
    resizeListener = null;
  }
}
