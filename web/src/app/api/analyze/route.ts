import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/server";
import { saveAnalysis } from "@/lib/db";
import { processVideoAnalysis } from "@/lib/pose/processor";
import { generateAiFeedback } from "@/lib/ai/feedback";
import { toYouTubeVideoPath } from "@/lib/youtube";
import type { AnalysisResult } from "@/types/analysis";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      videoId,
      filename,
      youtubeVideoId,
      title,
      duration,
      width,
      height,
      fps,
    } = body;

    if (!videoId || (!filename && !youtubeVideoId)) {
      return NextResponse.json({ error: "Missing video data" }, { status: 400 });
    }

    const analysisId = uuidv4();
    const isYouTube = Boolean(youtubeVideoId);
    const videoPath = isYouTube
      ? toYouTubeVideoPath(youtubeVideoId)
      : `/api/videos/${filename}`;

    const processing = await processVideoAnalysis(
      {
        duration: duration || 30,
        fps: fps || 30,
        width: width || 1280,
        height: height || 720,
      },
      isYouTube ? undefined : filename
    );

    const aiFeedback = await generateAiFeedback(
      processing.metrics,
      processing.events,
      processing.duration,
      processing.aiFeedback
    );

    const analysis: AnalysisResult = {
      id: analysisId,
      videoId,
      userId: user.id,
      title: title || "Untitled climb",
      videoPath,
      videoSource: isYouTube ? "youtube" : "file",
      youtubeVideoId: isYouTube ? youtubeVideoId : undefined,
      duration: processing.duration,
      fps: processing.fps,
      width: processing.width,
      height: processing.height,
      frames: processing.frames,
      metrics: processing.metrics,
      events: processing.events,
      aiFeedback,
      status: "complete",
      createdAt: new Date().toISOString(),
      usedMockData: processing.usedMockData,
    };

    saveAnalysis(analysis);

    return NextResponse.json({ analysisId, status: "complete" });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
