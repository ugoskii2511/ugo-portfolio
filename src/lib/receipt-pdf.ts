import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, degrees, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { formatMinor, type ReceiptSnapshot } from "@/lib/receipt-calc";

/// Real, text-based PDF receipts (selectable, searchable, print-sharp).
/// Noto Sans is embedded (subset) because the standard PDF fonts have no ₦.

const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");
let fontCache: Promise<[Buffer, Buffer]> | null = null;
function loadFonts() {
  fontCache ??= Promise.all([readFile(path.join(FONT_DIR, "NotoSans-Regular.ttf")), readFile(path.join(FONT_DIR, "NotoSans-Bold.ttf"))]);
  return fontCache;
}

/// Logo as PNG bytes: a site path ("/logo.jpg") is read from /public, an
/// https URL is fetched (short timeout, size cap). Any failure → no logo.
async function loadLogo(url: string | null): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    let bytes: Buffer;
    if (url.startsWith("/") && !url.startsWith("//")) {
      const file = path.normalize(path.join(process.cwd(), "public", url));
      if (!file.startsWith(path.join(process.cwd(), "public"))) return null;
      bytes = await readFile(file);
    } else if (url.startsWith("https://")) {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: "follow" });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 4 * 1024 * 1024) return null;
      bytes = buf;
    } else {
      return null;
    }
    const sharp = (await import("sharp")).default;
    return await sharp(bytes).resize(240, 240, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  } catch {
    return null;
  }
}

const INK = rgb(0.09, 0.1, 0.13);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.86, 0.87, 0.9);
const SOFT = rgb(0.96, 0.97, 0.98);
const ACCENT = rgb(0.2, 0.33, 0.85);
const GREEN = rgb(0.07, 0.5, 0.3);
const AMBER = rgb(0.7, 0.42, 0.04);
const RED = rgb(0.75, 0.15, 0.15);

type Ctx = { page: PDFPage; regular: PDFFont; bold: PDFFont };

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) lines.push(line);
        // A single over-long word (e.g. a URL) is cut to fit.
        let w = word;
        while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
          let cut = w.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > width) cut--;
          lines.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        line = w;
      }
    }
    lines.push(line);
  }
  return lines;
}

function text(c: Ctx, value: string, x: number, y: number, size: number, opts: { bold?: boolean; color?: ReturnType<typeof rgb>; align?: "left" | "right" | "center" } = {}) {
  const font = opts.bold ? c.bold : c.regular;
  const w = font.widthOfTextAtSize(value, size);
  const dx = opts.align === "right" ? -w : opts.align === "center" ? -w / 2 : 0;
  c.page.drawText(value, { x: x + dx, y, size, font, color: opts.color ?? INK });
}

function statusColor(status: ReceiptSnapshot["totals"]["status"]) {
  return status === "PAID" ? GREEN : status === "OVERPAID" ? ACCENT : status === "PARTIAL" ? AMBER : RED;
}

export async function renderReceiptPdf(r: ReceiptSnapshot, opts: { voided?: { reason: string | null; at: string | null } | null } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regBytes, boldBytes] = await loadFonts();
  const regular = await doc.embedFont(regBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  doc.setTitle(`Payment receipt ${r.number}`);
  doc.setAuthor(r.business.name);
  doc.setSubject(`Payment receipt for ${r.client.name}`);
  doc.setCreator(r.business.name);
  doc.setProducer("Receipts & Payments");

  const W = 595.28;
  const H = 841.89;
  const M = 48;
  let page = doc.addPage([W, H]);
  let c: Ctx = { page, regular, bold };
  const money = (minor: number) => formatMinor(minor, r.currencySymbol);
  let y = H - M;

  // A long payment history can run past one page.
  const ensure = (needed: number) => {
    if (y - needed < M + 40) {
      page = doc.addPage([W, H]);
      c = { page, regular, bold };
      y = H - M;
      text(c, `${r.number} (continued)`, M, y, 9, { color: MUTED });
      y -= 24;
    }
  };

  // ---- header
  let logo: PDFImage | null = null;
  const logoBytes = await loadLogo(r.business.logoUrl);
  if (logoBytes) logo = await doc.embedPng(logoBytes).catch(() => null);
  let left = M;
  if (logo) {
    const s = 52 / Math.max(logo.width, logo.height);
    page.drawImage(logo, { x: M, y: y - 52, width: logo.width * s, height: logo.height * s });
    left = M + 64;
  }
  text(c, r.business.name, left, y - 14, 14, { bold: true });
  const contact = [r.business.email, r.business.phone, r.business.website].filter(Boolean).join("  ·  ");
  let hy = y - 30;
  for (const line of wrap(contact, regular, 8.5, 270)) {
    text(c, line, left, hy, 8.5, { color: MUTED });
    hy -= 12;
  }
  if (r.business.address) {
    for (const line of wrap(r.business.address, regular, 8.5, 270)) {
      text(c, line, left, hy, 8.5, { color: MUTED });
      hy -= 12;
    }
  }
  text(c, "PAYMENT RECEIPT", W - M, y - 14, 16, { bold: true, color: ACCENT, align: "right" });
  text(c, `Receipt No. ${r.number}`, W - M, y - 32, 10, { bold: true, align: "right" });
  text(c, `Issued ${r.issueDate}`, W - M, y - 46, 9, { color: MUTED, align: "right" });
  y = Math.min(hy, y - 60) - 14;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: LINE });
  y -= 24;

  // ---- parties
  const colW = (W - 2 * M - 24) / 2;
  const block = (title: string, lines: string[], x: number, top: number) => {
    text(c, title.toUpperCase(), x, top, 7.5, { bold: true, color: MUTED });
    let ly = top - 15;
    lines.forEach((l, i) => {
      for (const part of wrap(l, i === 0 ? bold : regular, i === 0 ? 11 : 9, colW)) {
        text(c, part, x, ly, i === 0 ? 11 : 9, { bold: i === 0, color: i === 0 ? INK : MUTED });
        ly -= i === 0 ? 15 : 12;
      }
    });
    return ly;
  };
  const clientEnd = block("Received from", [r.client.name, r.client.businessName, r.client.email, r.client.phone].filter((v): v is string => !!v), M, y);
  const projectLines = r.project
    ? [r.project.title, [r.project.category, r.project.reference && `Ref: ${r.project.reference}`].filter(Boolean).join("  ·  "), r.project.description ?? ""].filter((v) => !!v)
    : ["General payment"];
  const projectEnd = block("For project", projectLines.map((l, i) => (i === 2 && l.length > 220 ? `${l.slice(0, 217)}…` : l)), M + colW + 24, y);
  y = Math.min(clientEnd, projectEnd) - 12;

  // ---- this payment
  const boxH = 92;
  ensure(boxH + 10);
  page.drawRectangle({ x: M, y: y - boxH, width: W - 2 * M, height: boxH, color: SOFT, borderColor: LINE, borderWidth: 1 });
  text(c, "THIS PAYMENT", M + 16, y - 20, 7.5, { bold: true, color: MUTED });
  text(c, money(r.payment.amountKobo), M + 16, y - 46, 22, { bold: true, color: GREEN });
  text(c, r.payment.description, M + 16, y - 66, 10, { bold: true });
  const rows: [string, string][] = [
    ["Issue date", r.issueDate],
    ["Method", r.payment.methodLabel],
    ["Transaction ref.", r.payment.reference ?? "—"],
  ];
  let ry = y - 22;
  const rx = M + 250;
  for (const [k, v] of rows) {
    text(c, k, rx, ry, 9, { color: MUTED });
    const vv = wrap(v, regular, 9, W - M - 16 - (rx + 92))[0] ?? "";
    text(c, vv, W - M - 16, ry, 9, { align: "right" });
    ry -= 20;
  }
  y -= boxH + 22;

  // ---- account summary
  if (r.payment.kind === "PROJECT" && r.project) {
    ensure(170);
    text(c, "PROJECT ACCOUNT", M, y, 7.5, { bold: true, color: MUTED });
    y -= 8;
    const summary: [string, string, { bold?: boolean; color?: ReturnType<typeof rgb> }?][] = [];
    if (r.project.totalKobo !== null) {
      if (r.project.additionalChargesKobo || r.project.discountKobo) {
        summary.push(["Project price", money(r.project.basePriceKobo ?? 0)]);
        if (r.project.additionalChargesKobo) summary.push(["Additional charges", `+ ${money(r.project.additionalChargesKobo)}`]);
        if (r.project.discountKobo) summary.push(["Discount", `− ${money(r.project.discountKobo)}`]);
      }
      summary.push(["Total project cost", money(r.project.totalKobo), { bold: true }]);
    } else {
      summary.push(["Total project cost", "Not yet agreed"]);
    }
    summary.push(["Paid before this receipt", money(r.totals.paidBeforeKobo)]);
    summary.push(["This payment", money(r.totals.paidToDateKobo - r.totals.paidBeforeKobo)]);
    summary.push(["Total paid to date", money(r.totals.paidToDateKobo), { bold: true, color: GREEN }]);
    if (r.totals.creditKobo > 0) summary.push(["Overpaid (credit)", money(r.totals.creditKobo), { bold: true, color: ACCENT }]);
    else summary.push(["Outstanding balance", money(r.totals.outstandingKobo), { bold: true, color: r.totals.outstandingKobo > 0 ? AMBER : GREEN }]);
    for (const [k, v, o] of summary) {
      y -= 18;
      text(c, k, M, y, 9.5, { color: o?.bold ? INK : MUTED, bold: o?.bold });
      text(c, v, W - M, y, 9.5, { align: "right", bold: o?.bold, color: o?.color });
      page.drawLine({ start: { x: M, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.5, color: LINE });
    }
    y -= 26;
    text(c, "Payment status:", M, y, 9.5, { color: MUTED });
    text(c, r.totals.statusLabel, M + regular.widthOfTextAtSize("Payment status: ", 9.5), y, 9.5, { bold: true, color: statusColor(r.totals.status) });
    if (r.project.totalKobo) {
      text(c, `${r.totals.percent}% of the total paid`, W - M, y, 9, { color: MUTED, align: "right" });
      y -= 10;
      const barW = W - 2 * M;
      page.drawRectangle({ x: M, y: y - 5, width: barW, height: 5, color: LINE });
      page.drawRectangle({ x: M, y: y - 5, width: (barW * Math.min(r.totals.percent, 100)) / 100, height: 5, color: statusColor(r.totals.status) });
      y -= 12;
    }
    y -= 18;
  }

  // ---- payment history
  if (r.installments.length > 1) {
    ensure(60);
    text(c, "PAYMENTS ON THIS PROJECT TO DATE", M, y, 7.5, { bold: true, color: MUTED });
    y -= 6;
    r.installments.forEach((p, i) => {
      ensure(20);
      y -= 17;
      if (p.isThis) page.drawRectangle({ x: M - 4, y: y - 5, width: W - 2 * M + 8, height: 17, color: SOFT });
      const label = `${i + 1}.  ${p.paidOn}   ${p.description ?? ""}${p.isThis ? "   (this receipt)" : ""}`;
      text(c, wrap(label, regular, 9, W - 2 * M - 120)[0] ?? "", M, y, 9, { bold: p.isThis, color: p.isThis ? INK : MUTED });
      text(c, money(p.amountKobo), W - M, y, 9, { align: "right", bold: p.isThis });
    });
    y -= 26;
  }

  // ---- acknowledgement + signature
  const ack = wrap(r.acknowledgement, regular, 9, W - 2 * M);
  ensure(ack.length * 13 + 90);
  for (const line of ack) {
    text(c, line, M, y, 9, { color: MUTED });
    y -= 13;
  }
  y -= 44;
  page.drawLine({ start: { x: W - M - 190, y }, end: { x: W - M, y }, thickness: 0.8, color: INK });
  text(c, r.authorizedName ?? r.business.name, W - M - 190, y - 14, 9.5, { bold: true });
  text(c, r.authorizedTitle ? `${r.authorizedTitle}, authorized representative` : "Authorized representative", W - M - 190, y - 27, 8.5, { color: MUTED });
  text(c, `For ${r.business.name}`, M, y - 14, 9, { color: MUTED });

  // ---- footer on every page
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const fc: Ctx = { page: p, regular, bold };
    p.drawLine({ start: { x: M, y: M + 14 }, end: { x: W - M, y: M + 14 }, thickness: 0.5, color: LINE });
    const note = r.footerNote ? `${r.footerNote}  ·  ` : "";
    text(fc, wrap(`${note}Receipt ${r.number}  ·  Amounts in ${r.currency}`, regular, 7.5, W - 2 * M - 60)[0] ?? "", M, M, 7.5, { color: MUTED });
    text(fc, `Page ${i + 1} of ${pages.length}`, W - M, M, 7.5, { color: MUTED, align: "right" });
    if (opts.voided) {
      p.drawText("VOID", { x: W / 2 - 150, y: H / 2 - 60, size: 150, font: bold, color: RED, opacity: 0.14, rotate: degrees(35) });
      text(fc, `VOIDED${opts.voided.at ? ` on ${opts.voided.at.slice(0, 10)}` : ""}${opts.voided.reason ? `: ${opts.voided.reason}` : ""}`.slice(0, 120), W / 2, H - 26, 9, { bold: true, color: RED, align: "center" });
    }
  });

  return doc.save();
}
