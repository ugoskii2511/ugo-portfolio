import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { adminRoute, BusinessError } from "@/lib/business-api";
import { auditLog } from "@/lib/crm";

/// Receipts live in a PRIVATE Supabase Storage bucket (unlike the public
/// portfolio images). They're only ever served through short-lived signed
/// URLs created here, after the admin session has been checked.
const BUCKET = "receipts";
const MAX_BYTES = 4 * 1024 * 1024; // Vercel's request body limit is 4.5 MB
const TYPES: Record<string, { ext: string; magic: (b: Uint8Array) => boolean }> = {
  "application/pdf": { ext: "pdf", magic: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  "image/png": { ext: "png", magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/webp": { ext: "webp", magic: (b) => b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45 },
};

type Params = { params: Promise<{ id: string }> };

function storage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new BusinessError("File storage isn't configured.", 503);
  return { url, headers: { Authorization: `Bearer ${key}`, apikey: key } };
}

async function ensureBucket() {
  const { url, headers } = storage();
  const res = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers });
  if (res.ok) {
    const bucket = (await res.json()) as { public?: boolean };
    if (bucket.public) throw new BusinessError("The receipts bucket is public; make it private in Supabase first.", 500);
    return;
  }
  const create = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: MAX_BYTES }),
  });
  if (!create.ok && create.status !== 409) {
    console.error("receipts bucket create failed", create.status);
    throw new BusinessError("Couldn't prepare receipt storage.", 502);
  }
}

async function removeObject(path: string) {
  const { url, headers } = storage();
  await fetch(`${url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [path] }),
  }).catch(() => undefined);
}

export function POST(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({ where: { id }, select: { id: true, receiptPath: true, deletedAt: true } });
    if (!expense || expense.deletedAt) throw new BusinessError("Expense not found", 404);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new BusinessError("Choose a file to upload.");
    const type = TYPES[file.type];
    if (!type) throw new BusinessError("Receipts can be PDF, JPG, PNG or WebP.");
    if (file.size > MAX_BYTES) throw new BusinessError("That file is over 4 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!type.magic(bytes)) throw new BusinessError("That file doesn't look like a real PDF or image.");

    await ensureBucket();
    const { url, headers } = storage();
    const path = `${id}/${randomUUID()}.${type.ext}`;
    const upload = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": file.type },
      body: bytes,
    });
    if (!upload.ok) {
      console.error("receipt upload failed", upload.status);
      throw new BusinessError("Upload failed. Please try again.", 502);
    }
    await prisma.expense.update({ where: { id }, data: { receiptPath: path } });
    if (expense.receiptPath) await removeObject(expense.receiptPath);
    await auditLog(session.email, "business.expense.receipt", id);
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}

/// Opens the receipt through a 60-second signed link.
export function GET(request: NextRequest, { params }: Params) {
  return adminRoute(request, async () => {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({ where: { id }, select: { receiptPath: true } });
    if (!expense?.receiptPath) throw new BusinessError("No receipt attached", 404);
    const { url, headers } = storage();
    const res = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${expense.receiptPath}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 60 }),
    });
    const data = (await res.json().catch(() => null)) as { signedURL?: string } | null;
    if (!res.ok || !data?.signedURL) throw new BusinessError("Couldn't open the receipt.", 502);
    const response = NextResponse.redirect(`${url}/storage/v1${data.signedURL}`);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  });
}

export function DELETE(request: NextRequest, { params }: Params) {
  return adminRoute(request, async (session) => {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({ where: { id }, select: { receiptPath: true } });
    if (!expense?.receiptPath) return NextResponse.json({ ok: true });
    await prisma.expense.update({ where: { id }, data: { receiptPath: null } });
    await removeObject(expense.receiptPath);
    await auditLog(session.email, "business.expense.receipt_remove", id);
    return NextResponse.json({ ok: true });
  });
}
