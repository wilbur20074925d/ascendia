import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/server";
import {
  getYouTubeWatchUrl,
  parseYouTubeVideoId,
} from "@/lib/youtube";

interface YouTubeOEmbed {
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
}

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
    const url = (body.url as string | undefined)?.trim();
    const customTitle = (body.title as string | undefined)?.trim();

    if (!url) {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
    }

    const youtubeVideoId = parseYouTubeVideoId(url);
    if (!youtubeVideoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL. Paste a link from youtube.com or youtu.be." },
        { status: 400 }
      );
    }

    let title = customTitle || "Untitled climb";
    let thumbnailUrl: string | undefined;

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(getYouTubeWatchUrl(youtubeVideoId))}&format=json`,
        { next: { revalidate: 3600 } }
      );

      if (oembedRes.ok) {
        const oembed = (await oembedRes.json()) as YouTubeOEmbed;
        if (!customTitle && oembed.title) {
          title = oembed.title;
        }
        thumbnailUrl = oembed.thumbnail_url;
      } else if (!customTitle) {
        return NextResponse.json(
          { error: "Could not find that YouTube video. Check the link and try again." },
          { status: 400 }
        );
      }
    } catch {
      if (!customTitle) {
        return NextResponse.json(
          { error: "Could not verify the YouTube video. Try again in a moment." },
          { status: 502 }
        );
      }
    }

    const videoId = uuidv4();

    return NextResponse.json({
      videoId,
      youtubeVideoId,
      title,
      thumbnailUrl,
    });
  } catch (error) {
    console.error("YouTube upload error:", error);
    return NextResponse.json({ error: "Failed to process YouTube link" }, { status: 500 });
  }
}
