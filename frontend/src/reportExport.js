// Builds PDF and Excel reports from campaign data using CDN-loaded libraries.

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "0%");

function metricRows(stats) {
  return [
    ["Audience", stats.audience, ""],
    ["Sent", stats.sentTotal, pct(stats.sentTotal, stats.audience)],
    ["Delivered", stats.delivered, pct(stats.delivered, stats.sentTotal)],
    ["Opened", stats.opened, pct(stats.opened, stats.delivered)],
    ["Read", stats.read, pct(stats.read, stats.delivered)],
    ["Clicked", stats.clicked, pct(stats.clicked, stats.opened)],
    ["Converted", stats.converted, pct(stats.converted, stats.sentTotal)],
    ["Failed", stats.failed, pct(stats.failed, stats.sentTotal)],
    ["Queued", stats.queued, ""]
  ];
}

const safeName = (name) => (name || "campaign").replace(/[^a-z0-9]+/gi, "_").slice(0, 40);

export function exportPDF({ campaign, stats }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header band
  doc.setFillColor(244, 72, 10);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text("Ping — Campaign Report", 14, 18);

  // Campaign meta
  doc.setTextColor(26, 8, 5);
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text(campaign.name, 14, 40);

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.setTextColor(120, 90, 82);
  const meta = [
    `Goal: ${campaign.goal}`,
    `Channel: ${campaign.channel}    Status: ${campaign.status}`,
    `Created: ${new Date(campaign.createdAt).toLocaleString("en-IN")}`
  ];
  meta.forEach((line, i) => doc.text(line, 14, 48 + i * 6));

  // Metrics table
  doc.autoTable({
    startY: 70,
    head: [["Metric", "Value", "Rate"]],
    body: metricRows(stats).map((r) => [r[0], String(r[1]), r[2]]),
    headStyles: { fillColor: [244, 72, 10], textColor: 255 },
    alternateRowStyles: { fillColor: [253, 248, 244] },
    styles: { fontSize: 10, cellPadding: 3 }
  });

  let y = doc.lastAutoTable.finalY + 12;

  // Message
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.setTextColor(26, 8, 5);
  doc.text("Message", 14, y);
  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const wrapped = doc.splitTextToSize(campaign.message || "", 180);
  doc.text(wrapped, 14, y + 7);
  y += 7 + wrapped.length * 5 + 8;

  // Insights
  if (campaign.insights) {
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(232, 23, 106);
    doc.text("AI Insights", 14, y);
    y += 7;
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    (campaign.insights.reasons || []).forEach((r) => {
      const lines = doc.splitTextToSize(`• ${r}`, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 1;
    });
    if (campaign.insights.recommendation) {
      y += 3;
      doc.setFont(undefined, "bold");
      const rec = doc.splitTextToSize(`Recommendation: ${campaign.insights.recommendation}`, 180);
      doc.text(rec, 14, y);
    }
  }

  doc.save(`${safeName(campaign.name)}_report.pdf`);
}

export function exportExcel({ campaign, stats }) {
  const XLSX = window.XLSX;

  const summary = [
    ["Ping — Campaign Report"],
    [],
    ["Name", campaign.name],
    ["Goal", campaign.goal],
    ["Channel", campaign.channel],
    ["Status", campaign.status],
    ["Created", new Date(campaign.createdAt).toLocaleString("en-IN")],
    [],
    ["Metric", "Value", "Rate"],
    ...metricRows(stats)
  ];

  if (campaign.insights) {
    summary.push([], ["AI Insights"]);
    (campaign.insights.reasons || []).forEach((r, i) => summary.push([`Reason ${i + 1}`, r]));
    if (campaign.insights.recommendation) summary.push(["Recommendation", campaign.insights.recommendation]);
  }
  summary.push([], ["Message", campaign.message || ""]);

  const ws = XLSX.utils.aoa_to_sheet(summary);
  ws["!cols"] = [{ wch: 22 }, { wch: 50 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${safeName(campaign.name)}_report.xlsx`);
}