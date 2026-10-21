import { PARTS, WALL_LABELS, formatMm, getWarnings, type Plan } from "./model";

async function planImage(
  svg: SVGSVGElement,
): Promise<{ data: string; ratio: number }> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-selection]").forEach((n) => n.remove());
  clone
    .querySelectorAll("[tabindex]")
    .forEach((n) => n.removeAttribute("tabindex"));
  clone.querySelectorAll("[data-part-number]").forEach((n) => {
    n.setAttribute("opacity", "1");
    n.querySelector("circle")?.setAttribute("fill", "#eef2f7");
  });
  const fullViewBox = svg.dataset.fullViewbox || svg.getAttribute("viewBox")!;
  clone.setAttribute("viewBox", fullViewBox);
  const [, , fullWidth, fullHeight] = fullViewBox.split(/\s+/).map(Number);
  const width = 3200,
    height = Math.round((width * fullHeight) / fullWidth);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("The drawing could not be loaded."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("PDF export is unavailable in this browser.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return { data: canvas.toDataURL("image/png"), ratio: width / height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function exportPlanPdf(plan: Plan, svg: SVGSVGElement) {
  const [{ jsPDF }, image] = await Promise.all([
    import("jspdf"),
    planImage(svg),
  ]);
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const ink: [number, number, number] = [24, 45, 79],
    blue: [number, number, number] = [28, 60, 140];
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
  }).format(new Date());
  const counts = Object.entries(PARTS)
    .map(([kind, def]) => ({
      ...def,
      count: plan.items.filter((p) => p.kind === kind).length,
    }))
    .filter((p) => p.count);
  const warnings = getWarnings(plan);
  const footer = (page: number) => {
    const w = doc.internal.pageSize.getWidth(),
      h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220, 225, 232);
    doc.line(14, h - 20, w - 14, h - 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(92, 105, 125);
    doc.text(
      "Concept sketch with illustrative components. Not construction documentation. Verify dimensions and installations.",
      14,
      h - 15,
    );
    doc.text(
      "SpaceSketch | Local-first space planning | MIT licensed",
      14,
      h - 10,
    );
    doc.text(`${date} | Page ${page}`, w - 14, h - 10, { align: "right" });
  };
  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("SPACESKETCH", 14, 18);
  doc.setTextColor(...ink);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("2D SPACE PLANNER / CONCEPT SKETCH", 14, 25);
  doc.setFillColor(245, 239, 166);
  doc.roundedRect(222, 10, 61, 18, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${formatMm(plan.length)} x ${formatMm(plan.width)} mm`, 252.5, 18, {
    align: "center",
  });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("OUTLINE DIMENSIONS / SCHEMATIC", 252.5, 24, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const title = doc.splitTextToSize(plan.title || "Untitled space", 200);
  doc.text(title.slice(0, 2), 14, 37);
  doc.setDrawColor(224, 230, 238);
  doc.rect(14, 48, 269, 109);
  const drawW = Math.min(265, 104 * image.ratio),
    drawH = drawW / image.ratio;
  doc.addImage(
    image.data,
    "PNG",
    148.5 - drawW / 2,
    50 + (104 - drawH) / 2,
    drawW,
    drawH,
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`${plan.items.length} COMPONENTS / OVERVIEW`, 14, 165);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  counts.forEach((p, i) =>
    doc.text(
      `${p.count} x ${p.name}`,
      14 + (i % 4) * 66,
      172 + Math.floor(i / 4) * 5,
    ),
  );
  if (!plan.items.length) doc.text("No components yet.", 14, 172);
  if (warnings.length) {
    doc.setTextColor(140, 87, 20);
    doc.setFontSize(7);
    doc.text("Layout notes are listed on the following page.", 14, 186);
  }
  footer(1);
  doc.addPage("a4", "portrait");
  let page = 2,
    y = 16;
  const listHeader = () => {
    doc.setTextColor(...blue);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Components & positions", 14, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...ink);
    doc.text(
      "Positions in mm, measured from the top-left corner of the schematic outline.",
      14,
      25,
    );
    doc.setFillColor(236, 240, 246);
    doc.rect(14, 32, 182, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.text("No.", 17, 38);
    doc.text("Component / sample size", 29, 38);
    doc.text("X / Y", 113, 38);
    doc.text("Placement", 152, 38);
    y = 48;
  };
  listHeader();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  plan.items.forEach((p, i) => {
    if (y > 258) {
      footer(page++);
      doc.addPage("a4", "portrait");
      listHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }
    doc.setTextColor(...ink);
    doc.text(String(i + 1), 17, y);
    doc.text(PARTS[p.kind].name, 29, y);
    doc.setTextColor(100, 112, 130);
    doc.setFontSize(7);
    doc.text(`${formatMm(p.width)} x ${formatMm(p.depth)} mm`, 29, y + 4);
    doc.setFontSize(8);
    doc.setTextColor(...ink);
    doc.text(`${formatMm(p.x)} / ${formatMm(p.y)}`, 113, y);
    doc.text(
      p.wall ? `Wall ${WALL_LABELS[p.wall]}` : `${p.rotation} degrees`,
      152,
      y,
    );
    doc.setDrawColor(232, 235, 240);
    doc.line(14, y + 7, 196, y + 7);
    y += 14;
  });
  if (!plan.items.length) {
    doc.text("No components yet.", 17, y);
    y += 15;
  }
  if (y > 235) {
    footer(page++);
    doc.addPage("a4", "portrait");
    y = 18;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("LAYOUT NOTES", 14, y + 5);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const notes = [
    ...warnings,
    "Component dimensions are illustrative. Adapt them to your real products or furniture.",
    "Wall thickness is schematic. Verify internal dimensions, door clearances and technical requirements.",
  ];
  for (const note of notes) {
    const lines = doc.splitTextToSize("- " + note, 180);
    const height = lines.length * 4 + 3;
    if (y + height > 274) {
      footer(page++);
      doc.addPage("a4", "portrait");
      y = 18;
    }
    doc.text(lines, 14, y);
    y += height;
  }
  footer(page);
  doc.setProperties({
    title: `SpaceSketch - ${plan.title}`,
    subject: "2D concept sketch and component list",
    creator: "SpaceSketch",
  });
  doc.save(`spacesketch-${plan.length}x${plan.width}.pdf`);
}
