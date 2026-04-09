// ══════════════════════════════════════════
// DASHBOARD TABS
// ══════════════════════════════════════════

function renderOverview() {
  const total     = entries.length;
  const totalMins = entries.reduce((s, e) => s + (e.duration_mins || 0), 0);
  const mttr      = total ? Math.round(totalMins / total) : 0;

  const byMachine = {};
  entries.forEach(e => {
    byMachine[e.work_centre] = (byMachine[e.work_centre] || 0) + (e.duration_mins || 0);
  });
  const worst = Object.entries(byMachine).sort((a,b) => b[1]-a[1])[0];

  document.getElementById('kpi-total').textContent    = total;
  document.getElementById('kpi-downtime').textContent = formatDuration(totalMins);
  document.getElementById('kpi-mttr').textContent     = formatDuration(mttr);
  document.getElementById('kpi-worst').textContent    = worst ? worst[0] : '—';

  const months = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months[d.toLocaleString('en-GB', { month: 'short', year: '2-digit' })] = 0;
  }
  entries.forEach(e => {
    const key = new Date(e.start_time).toLocaleString('en-GB', { month: 'short', year: '2-digit' });
    if (key in months) months[key]++;
  });

  destroyChart('monthly');
  charts.monthly = new Chart(document.getElementById('chart-monthly').getContext('2d'), {
    type: 'bar',
    data: { labels: Object.keys(months), datasets: [{ label: 'Breakdowns', data: Object.values(months), backgroundColor: '#78be20', borderRadius: 4 }] },
    options: { ...CHART_DEFAULTS, responsive: true }
  });
}

function renderPareto() {
  const byMachine = {};
  entries.forEach(e => {
    byMachine[e.work_centre] = (byMachine[e.work_centre] || 0) + (e.duration_mins || 0);
  });
  const sorted = Object.entries(byMachine).sort((a,b) => b[1]-a[1]);
  const labels = sorted.map(x => x[0]);
  const values = sorted.map(x => +(x[1] / 60).toFixed(1));
  const total  = values.reduce((s,v) => s+v, 0);
  let cum = 0;
  const cumPct = values.map(v => { cum += v; return Math.round(cum / total * 100); });

  destroyChart('pareto');
  charts.pareto = new Chart(document.getElementById('chart-pareto').getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Downtime (hrs)', data: values, backgroundColor: CHART_COLORS, borderRadius: 4, yAxisID: 'y' },
        { label: 'Cumulative %', data: cumPct, type: 'line', borderColor: '#e04040', backgroundColor: 'transparent', pointBackgroundColor: '#e04040', tension: 0.3, yAxisID: 'y2' }
      ]
    },
    options: {
      responsive: true, plugins: CHART_DEFAULTS.plugins,
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: 'Hours', color: '#a8c4d8' } },
        y2: { position: 'right', min: 0, max: 100, ticks: { color: '#e04040', font: { family: 'Share Tech Mono', size: 10 }, callback: v => v + '%' }, grid: { drawOnChartArea: false } }
      }
    }
  });
}

function renderFaults() {
  const byCat = {};
  entries.forEach(e => {
    const cat = (e.category || 'Other').split('—')[0].trim();
    byCat[cat] = (byCat[cat] || 0) + 1;
  });
  const sortedCat = Object.entries(byCat).sort((a,b) => b[1]-a[1]);

  destroyChart('faults');
  charts.faults = new Chart(document.getElementById('chart-faults').getContext('2d'), {
    type: 'bar',
    data: { labels: sortedCat.map(x => x[0]), datasets: [{ label: 'Occurrences', data: sortedCat.map(x => x[1]), backgroundColor: CHART_COLORS, borderRadius: 4 }] },
    options: { ...CHART_DEFAULTS, responsive: true, indexAxis: 'y' }
  });

  const byMC = {};
  entries.forEach(e => {
    const key = `${e.work_centre} — ${e.category || 'Other'}`;
    byMC[key] = (byMC[key] || 0) + 1;
  });
  const sorted = Object.entries(byMC).sort((a,b) => b[1]-a[1]).slice(0, 8);
  const wrap   = document.getElementById('fault-repeat-list');
  wrap.innerHTML = sorted.length
    ? sorted.map(([name, count]) => `<div class="fault-item"><span class="fault-name">${name}</span><span class="fault-count">${count}x</span></div>`).join('')
    : '<div class="empty-state">No data yet</div>';
}

function renderMTBF() {
  const byMachine = {};
  entries.forEach(e => {
    if (!byMachine[e.work_centre]) byMachine[e.work_centre] = { count: 0, totalMins: 0 };
    byMachine[e.work_centre].count++;
    byMachine[e.work_centre].totalMins += (e.duration_mins || 0);
  });
  const rows = Object.entries(byMachine).sort((a,b) => b[1].totalMins - a[1].totalMins);
  const wrap = document.getElementById('mtbf-table-wrap');
  wrap.innerHTML = rows.length ? `
    <table class="mtbf-table">
      <thead><tr><th>Machine</th><th>Breakdowns</th><th>Total Downtime</th><th>Avg MTTR</th></tr></thead>
      <tbody>${rows.map(([m, d]) => {
        const mttr = Math.round(d.totalMins / d.count);
        return `<tr>
          <td class="td-wc">${m}</td>
          <td class="mtbf-val">${d.count}</td>
          <td class="mtbf-val">${formatDuration(d.totalMins)}</td>
          <td class="mtbf-val ${mttr > 120 ? 'mtbf-warn' : ''}">${formatDuration(mttr)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>` : '<div class="empty-state">No data yet</div>';
}

function renderTechChart() {
  const byTech = {};
  entries.forEach(e => {
    if (!byTech[e.technician]) byTech[e.technician] = { count: 0, totalMins: 0 };
    byTech[e.technician].count++;
    byTech[e.technician].totalMins += (e.duration_mins || 0);
  });
  const techs   = Object.keys(byTech);
  const counts  = techs.map(t => byTech[t].count);
  const avgMTTR = techs.map(t => Math.round(byTech[t].totalMins / byTech[t].count));

  destroyChart('tech');
  charts.tech = new Chart(document.getElementById('chart-tech').getContext('2d'), {
    type: 'bar',
    data: {
      labels: techs,
      datasets: [
        { label: 'Jobs', data: counts, backgroundColor: '#78be20', borderRadius: 4, yAxisID: 'y' },
        { label: 'Avg MTTR (mins)', data: avgMTTR, backgroundColor: '#5bc0eb', borderRadius: 4, yAxisID: 'y2' }
      ]
    },
    options: {
      responsive: true, plugins: CHART_DEFAULTS.plugins,
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y:  { ...CHART_DEFAULTS.scales.y, title: { display: true, text: 'Jobs', color: '#a8c4d8' } },
        y2: { position: 'right', ticks: { color: '#5bc0eb', font: { family: 'Share Tech Mono', size: 10 } }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Avg MTTR (mins)', color: '#5bc0eb' } }
      }
    }
  });
}
