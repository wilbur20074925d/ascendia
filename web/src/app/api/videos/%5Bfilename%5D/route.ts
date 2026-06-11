import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getUploadsDir } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const safeName = path.basename(filename);
    const filePath = path.join(getUploadsDir(), safeName);

    const buffer = await readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType =
      ext === ".mov" ? "video/quicktime" : ext === ".webm" ? "video/webm" : "video/mp4";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
}
