import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authGuard";
import { handleApiError } from "@/lib/apiError";

// Vercel Functions cap request bodies at 4.5MB platform-wide — stay safely
// under that (rather than Render, which had no such limit) so uploads don't
// get rejected before this handler even runs.
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BUCKET = "project-images";

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use JPG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File is too large. Max 4MB." }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Image storage is not configured.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${randomUUID()}.${extension}`;

    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      console.error("Supabase Storage upload failed:", await uploadResponse.text());
      throw new Error("Upload failed. Please try again.");
    }

    const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
