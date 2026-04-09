// ══════════════════════════════════════════
// EXPORT — CSV + PDF
// ══════════════════════════════════════════

// ── CSV Export (all raw breakdown data) ──
function exportCSV() {
  if (!entries.length) { alert('No data to export.'); return; }

  const headers = ['Work Centre','Technician','Start','End','Duration (mins)','Category','Reason'];
  const rows = entries.map(e => [
    `"${e.work_centre}"`,
    `"${e.technician || ''}"`,
    `"${e.start_time ? new Date(e.start_time).toLocaleString('en-GB') : ''}"`,
    `"${e.end_time   ? new Date(e.end_time).toLocaleString('en-GB')   : ''}"`,
    e.duration_mins || 0,
    `"${e.category || ''}"`,
    `"${(e.reason || '').replace(/"/g, '""')}"`
  ]);

  const csv     = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob    = new Blob([csv], { type: 'text/csv' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  const date    = new Date().toISOString().slice(0,10);
  a.href        = url;
  a.download    = `clamason-breakdowns-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✔ CSV Downloaded');
}

// ── PDF Export ──
async function exportPDF(tab) {
  if (!entries.length) { alert('No data to export.'); return; }

  const { jsPDF } = window.jspdf;
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const date = new Date().toLocaleDateString('en-GB');
  const W    = doc.internal.pageSize.getWidth();

  // ── Header ──
  doc.setFillColor(74, 104, 128);
  doc.rect(0, 0, W, 20, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(14);
  doc.setFont('helvetica','bold');
  doc.text('CLAMASON — BREAKDOWN LOGGER', 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica','normal');
  doc.text(`Generated: ${date}`, W - 14, 13, { align: 'right' });

  let y = 28;

  // ── Tab-specific content ──
  if (tab === 'overview') {
    const total     = entries.length;
    const totalMins = entries.reduce((s,e) => s + (e.duration_mins||0), 0);
    const mttr      = total ? Math.round(totalMins / total) : 0;
    const byMachine = {};
    entries.forEach(e => { byMachine[e.work_centre] = (byMachine[e.work_centre]||0) + (e.duration_mins||0); });
    const worst = Object.entries(byMachine).sort((a,b) => b[1]-a[1])[0];

    // KPI boxes
    const kpis = [
      { label: 'Total Breakdowns', value: total },
      { label: 'Total Downtime',   value: formatDuration(totalMins) },
      { label: 'Avg MTTR',         value: formatDuration(mttr) },
      { label: 'Worst Machine',    value: worst ? worst[0] : '—' }
    ];
    const boxW = (W - 28) / 4;
    kpis.forEach((k, i) => {
      const x = 14 + i * (boxW + 2);
      doc.setFillColor(52, 78, 98);
      doc.rect(x, y, boxW, 22, 'F');
      doc.setTextColor(168, 196, 216);
      doc.setFontSize(7);
      doc.text(k.label.toUpperCase(), x + 4, y + 7);
      doc.setTextColor(120, 190, 32);
      doc.setFontSize(14);
      doc.setFont('helvetica','bold');
      doc.text(String(k.value), x + 4, y + 17);
      doc.setFont('helvetica','normal');
    });
    y += 30;

    // Monthly breakdown table
    doc.setTextColor(120,190,32);
    doc.setFontSize(9);
    doc.text('BREAKDOWNS — LAST 6 MONTHS', 14, y);
    y += 5;

    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months[d.toLocaleString('en-GB', { month: 'short', year: '2-digit' })] = 0;
    }
    entries.forEach(e => {
      const key = new Date(e.start_time).toLocaleString('en-GB', { month: 'short', year: '2-digit' });
      if (key in months) months[key]++;
    });

    autoTable(doc, {
      startY: y,
      head: [['Month', 'Breakdowns']],
      body: Object.entries(months).map(([m, c]) => [m, c]),
      styles: { fontSize: 9, textColor: [240,246,252], fillColor: [52,78,98] },
      headStyles: { fillColor: [74,104,128], textColor: [255,255,255] },
      alternateRowStyles: { fillColor: [58,84,104] }
    });
  }

  if (tab === 'pareto') {
    doc.setTextColor(120,190,32);
    doc.setFontSize(9);
    doc.text('DOWNTIME BY MACHINE (PARETO)', 14, y);
    y += 5;

    const byMachine = {};
    entries.forEach(e => { byMachine[e.work_centre] = (byMachine[e.work_centre]||0) + (e.duration_mins||0); });
    const sorted = Object.entries(byMachine).sort((a,b) => b[1]-a[1]);
    const total  = sorted.reduce((s,[,v]) => s+v, 0);
    let cum = 0;

    autoTable(doc, {
      startY: y,
      head: [['Machine','Downtime (hrs)','Cumulative %']],
      body: sorted.map(([m, mins]) => {
        cum += mins;
        return [m, (mins/60).toFixed(1), Math.round(cum/total*100) + '%'];
      }),
      styles: { fontSize: 9, textColor: [240,246,252], fillColor: [52,78,98] },
      headStyles: { fillColor: [74,104,128], textColor: [255,255,255] },
      alternateRowStyles: { fillColor: [58,84,104] }
    });
  }

  if (tab === 'faults') {
    doc.setTextColor(120,190,32);
    doc.setFontSize(9);
    doc.text('BREAKDOWNS BY FAULT CATEGORY', 14, y);
    y += 5;

    const byCat = {};
    entries.forEach(e => {
      const cat = (e.category||'Other').split('—')[0].trim();
      byCat[cat] = (byCat[cat]||0) + 1;
    });
    const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]);

    autoTable(doc, {
      startY: y,
      head: [['Category','Occurrences']],
      body: sorted.map(([cat, count]) => [cat, count]),
      styles: { fontSize: 9, textColor: [240,246,252], fillColor: [52,78,98] },
      headStyles: { fillColor: [74,104,128], textColor: [255,255,255] },
      alternateRowStyles: { fillColor: [58,84,104] }
    });

    // Top repeated faults
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setTextColor(120,190,32);
    doc.setFontSize(9);
    doc.text('TOP REPEATED FAULTS (MACHINE + CATEGORY)', 14, finalY);

    const byMC = {};
    entries.forEach(e => {
      const key = `${e.work_centre} — ${e.category||'Other'}`;
      byMC[key] = (byMC[key]||0) + 1;
    });
    const topFaults = Object.entries(byMC).sort((a,b) => b[1]-a[1]).slice(0,8);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Machine — Category','Count']],
      body: topFaults.map(([name, count]) => [name, count]),
      styles: { fontSize: 9, textColor: [240,246,252], fillColor: [52,78,98] },
      headStyles: { fillColor: [74,104,128], textColor: [255,255,255] },
      alternateRowStyles: { fillColor: [58,84,104] }
    });
  }

  if (tab === 'mtbf') {
    doc.setTextColor(120,190,32);
    doc.setFontSize(9);
    doc.text('MTBF & MTTR BY MACHINE', 14, y);
    y += 5;

    const byMachine = {};
    entries.forEach(e => {
      if (!byMachine[e.work_centre]) byMachine[e.work_centre] = { count: 0, totalMins: 0 };
      byMachine[e.work_centre].count++;
      byMachine[e.work_centre].totalMins += (e.duration_mins||0);
    });
    const rows = Object.entries(byMachine).sort((a,b) => b[1].totalMins - a[1].totalMins);

    autoTable(doc, {
      startY: y,
      head: [['Machine','Breakdowns','Total Downtime','Avg MTTR']],
      body: rows.map(([m, d]) => {
        const mttr = Math.round(d.totalMins / d.count);
        return [m, d.count, formatDuration(d.totalMins), formatDuration(mttr)];
      }),
      styles: { fontSize: 9, textColor: [240,246,252], fillColor: [52,78,98] },
      headStyles: { fillColor: [74,104,128], textColor: [255,255,255] },
      alternateRowStyles: { fillColor: [58,84,104] },
      didParseCell: (data) => {
        // Highlight high MTTR in red
        if (data.section === 'body' && data.column.index === 3) {
          const mins = rows[data.row.index]?.[1];
          if (mins && Math.round(mins.totalMins / mins.count) > 120) {
            data.cell.styles.textColor = [224, 64, 64];
          }
        }
      }
    });
  }

  // ── Footer ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(168,196,216);
    doc.text(`Clamason Breakdown Logger  |  Page ${i} of ${pageCount}`, W/2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
  }

  const tabNames = { overview: 'Overview', pareto: 'Pareto', faults: 'Fault-Trends', mtbf: 'MTBF-MTTR' };
  doc.save(`Clamason-${tabNames[tab]}-${new Date().toISOString().slice(0,10)}.pdf`);
  showToast('✔ PDF Downloaded');
}

// ── jsPDF autoTable helper (inline since we don't have the plugin) ──
function autoTable(doc, opts) {
  const { startY, head, body, styles = {}, headStyles = {}, alternateRowStyles = {} } = opts;
  const colCount = head[0].length;
  const pageW    = doc.internal.pageSize.getWidth();
  const colW     = (pageW - 28) / colCount;
  const rowH     = 8;
  let y          = startY;

  // Header row
  head.forEach(row => {
    row.forEach((cell, i) => {
      const x = 14 + i * colW;
      doc.setFillColor(...(headStyles.fillColor || [60,60,60]));
      doc.rect(x, y, colW, rowH, 'F');
      doc.setTextColor(...(headStyles.textColor || [255,255,255]));
      doc.setFontSize(styles.fontSize || 9);
      doc.setFont('helvetica','bold');
      doc.text(String(cell), x + 3, y + 5.5);
    });
    y += rowH;
  });

  // Body rows
  body.forEach((row, ri) => {
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 15;
    }
    const isAlt  = ri % 2 === 1;
    const fillC  = isAlt ? (alternateRowStyles.fillColor || [50,50,50]) : (styles.fillColor || [40,40,40]);
    row.forEach((cell, i) => {
      const x = 14 + i * colW;
      doc.setFillColor(...fillC);
      doc.rect(x, y, colW, rowH, 'F');
      doc.setTextColor(...(styles.textColor || [220,220,220]));
      doc.setFontSize(styles.fontSize || 9);
      doc.setFont('helvetica','normal');
      doc.text(String(cell ?? ''), x + 3, y + 5.5);
    });
    y += rowH;
  });

  doc.lastAutoTable = { finalY: y };
}
