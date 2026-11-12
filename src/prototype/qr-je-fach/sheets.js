/**
 * PROTOTYPE (tickets#1049) — the Sammel-PDF as HTML, the way the backend
 * renders `access-point-qr.temp.html` to PDF. Throwaway.
 *
 * Three layouts. The same HTML feeds the preview and the print window, so a
 * test print on a real Etikettenbogen shows whether the grid fits.
 */
import { fakeQrDataUrl, groupByBank } from "@/prototype/qr-je-fach/data";

export const LAYOUTS = [
  {
    key: "A",
    name: "Etikettenbogen 3×8 (70 × 37 mm)",
    cols: 3,
    rows: 8,
    w: 70,
    h: 37.125,
    qr: 30,
    note: "24 Etiketten je A4, randlos, z. B. Zweckform 3475. Klein und billig, QR 30 mm.",
  },
  {
    key: "B",
    name: "Etikettenbogen 2×4 (105 × 74 mm)",
    cols: 2,
    rows: 4,
    w: 105,
    h: 74.25,
    qr: 52,
    note: "8 Etiketten je A4 (A7), z. B. Zweckform 3427. Große Fachnummer, QR 52 mm.",
  },
  {
    key: "C",
    name: "Eine A4-Seite je Fach",
    cols: 1,
    rows: 1,
    w: 210,
    h: 297,
    qr: 85,
    note: "Wie der Druck an der Tür heute, nur beschriftet mit Schrank und Fach. Zum Zuschneiden oder Laminieren.",
  },
];

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function labelHtml(layout, anlage, c, opts) {
  const qr = `<img class="qr" src="${fakeQrDataUrl(
    c.id + c.rotations
  )}" alt="QR"/>`;
  const off = c.outOfService ? `<div class="off">außer Betrieb</div>` : "";
  const instr = opts.instruction
    ? `<div class="instr">Scannen, um Ihr Fach zu öffnen</div>`
    : "";
  if (layout.key === "A") {
    return `<div class="label">${qr}<div class="text">
      <div class="nr">Fach ${c.number}</div>
      <div class="bank">Schrank ${esc(c.lockerBank.name)}</div>
      <div class="anlage">${esc(anlage.label)}</div>${off}${instr}</div></div>`;
  }
  if (layout.key === "B") {
    return `<div class="label">
      <div class="head"><div class="anlage">${esc(anlage.label)}</div>
      <div class="bank">Schrank ${esc(c.lockerBank.name)}</div></div>
      <div class="body">${qr}<div class="nrbox"><div class="nrlabel">Fach</div><div class="nr">${
      c.number
    }</div></div></div>
      ${off}${instr}</div>`;
  }
  return `<div class="label">
    <div class="anlage">${esc(anlage.label)}</div>
    <div class="nr">Schrank ${esc(c.lockerBank.name)} · Fach ${c.number}</div>
    ${qr}${off}
    <div class="instr">Scannen Sie den Code mit Ihrem Smartphone, um Ihr Fach zu öffnen.</div>
  </div>`;
}

const STYLES = {
  A: `
    .label { display:flex; align-items:center; gap:3mm; padding:2.5mm 3mm; }
    .qr { width:30mm; height:30mm; flex:none; }
    .text { min-width:0; }
    .nr { font-size:16pt; font-weight:bold; line-height:1.1; }
    .bank { font-size:10pt; font-weight:bold; }
    .anlage { font-size:7pt; color:#444; margin-top:1mm; }
    .instr { font-size:6pt; color:#666; margin-top:1mm; }
    .off { font-size:6.5pt; color:#b35c00; margin-top:1mm; }`,
  B: `
    .label { display:flex; flex-direction:column; padding:5mm 6mm; }
    .head { display:flex; justify-content:space-between; align-items:baseline; border-bottom:0.3mm solid #000; padding-bottom:1.5mm; margin-bottom:3mm; }
    .anlage { font-size:9pt; }
    .bank { font-size:11pt; font-weight:bold; }
    .body { display:flex; align-items:center; gap:6mm; flex:1; }
    .qr { width:52mm; height:52mm; flex:none; }
    .nrbox { text-align:center; flex:1; }
    .nrlabel { font-size:12pt; text-transform:uppercase; letter-spacing:1px; }
    .nr { font-size:54pt; font-weight:bold; line-height:1; }
    .instr { font-size:8pt; color:#444; text-align:center; margin-top:1mm; }
    .off { font-size:8pt; color:#b35c00; text-align:center; }`,
  C: `
    .label { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:20mm; }
    .anlage { font-size:20pt; color:#333; margin-bottom:4mm; }
    .nr { font-size:32pt; font-weight:bold; margin-bottom:10mm; }
    .qr { width:85mm; height:85mm; margin-bottom:10mm; }
    .instr { font-size:18pt; color:#333; }
    .off { font-size:12pt; color:#b35c00; margin-bottom:6mm; }`,
};

/**
 * @returns {{ html: string, pages: number, count: number }}
 */
export function sheetHtml(layoutKey, anlage, opts) {
  const layout = LAYOUTS.find((l) => l.key === layoutKey);
  const perPage = layout.cols * layout.rows;
  const list = anlage.compartments.filter(
    (c) => opts.includeOutOfService || !c.outOfService
  );
  const chunks = opts.newPagePerBank
    ? groupByBank(list).map((g) => g.compartments)
    : [list];

  const pages = [];
  chunks.forEach((chunk) => {
    for (let i = 0; i < chunk.length; i += perPage) {
      pages.push(chunk.slice(i, i + perPage));
    }
  });

  const body = pages
    .map((page) => {
      const cells = page.map((c) => labelHtml(layout, anlage, c, opts));
      while (cells.length < perPage)
        cells.push(`<div class="label empty"></div>`);
      return `<div class="page">${cells.join("")}</div>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"/>
<title>QR-Codes ${esc(anlage.label)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:#888; }
  body { font-family: Arial, Helvetica, sans-serif; color:#111; }
  .page { width:210mm; height:297mm; background:#fff; display:grid;
    grid-template-columns: repeat(${layout.cols}, ${layout.w}mm);
    grid-template-rows: repeat(${layout.rows}, ${layout.h}mm);
    margin: 0 auto 6mm; overflow:hidden; page-break-after: always; }
  .label { overflow:hidden; ${
    opts.cutLines ? "outline: 0.2mm dashed #aaa; outline-offset:-0.1mm;" : ""
  } }
  .label.empty { outline-color: #eee; }
  @media print { html, body { background:#fff; } .page { margin:0; } }
  ${STYLES[layout.key]}
</style></head><body>${body}</body></html>`;

  return { html, pages: pages.length, count: list.length, layout };
}
