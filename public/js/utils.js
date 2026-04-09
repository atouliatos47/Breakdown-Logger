// ══════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════

function formatDuration(mins) {
  if (!mins) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function badgeClass(category) {
  if (!category) return 'badge-other';
  const c = category.toLowerCase();
  if (c.startsWith('electrical')) return 'badge-elec';
  if (c.startsWith('mechanical')) return 'badge-mech';
  if (c.startsWith('hydraulic'))  return 'badge-hyd';
  if (c.startsWith('pneumatic'))  return 'badge-pneu';
  if (c === 'operator error')     return 'badge-op';
  return 'badge-other';
}

function showToast(msg = '✔ Saved') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

const CHART_COLORS = ['#78be20','#5bc0eb','#e07030','#8080ff','#40c080','#d0a030','#e04040','#c080ff'];

const CHART_DEFAULTS = {
  plugins: { legend: { labels: { color: '#f0f6fc', font: { family: 'Share Tech Mono', size: 11 } } } },
  scales: {
    x: { ticks: { color: '#a8c4d8', font: { family: 'Share Tech Mono', size: 10 } }, grid: { color: '#6a8ea8' } },
    y: { ticks: { color: '#a8c4d8', font: { family: 'Share Tech Mono', size: 10 } }, grid: { color: '#6a8ea8' } }
  }
};

let charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}
