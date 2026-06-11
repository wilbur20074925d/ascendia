import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/server";
import { getUploadsDir } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("video") as File | null;
    const title = (formData.get("title") as string) || "Untitled climb";

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    const allowedTypes = ["video/mp4", "video/quicktime", "video/mov", "video/webm"];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|webm)$/i)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload MP4 or MOV." },
        { status: 400 }
      );
    }

    const videoId = uuidv4();
    const ext = path.extname(file.name) || ".mp4";
    const filename = `${videoId}${ext}`;
    const uploadsDir = getUploadsDir();
    const filePath = path.join(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      videoId,
      filename,
      title,
      size: file.size,
      path: `/api/videos/${filename}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
