/**
 * POST /api/download
 *
 * Accepts a JSON body with { url: string }
 * Returns { success: true, platform, proxyUrl, metadata } or { error: string }
 *
 * This route extracts the watermark-free video URL from the given platform
 * and returns a proxy URL that the client can use to download the video.
 */

import { NextRequest, NextResponse } from "next/server";
import { detectPlatform } from "@/lib/detect";
import {
  extractTikTok,
  extractInstagram,
  extractSnapchat,
} from "@/lib/platforms";

export const maxDuration = 60; // Vercel function timeout (seconds)
export const dynamic = "force-dynamic";

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Send JSON with a 'url' field." },
        { status: 400 }
      );
    }

    const url = body?.url?.trim();

    if (!url) {
      return NextResponse.json(
        { error: "Please provide a video URL." },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      const parsed = new URL(
        url.startsWith("http") ? url : `https://${url}`
      );
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format." },
        { status: 400 }
      );
    }

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const platform = detectPlatform(normalizedUrl);

    if (!platform) {
      return NextResponse.json(
        {
          error:
            "Unsupported platform. nogtik supports TikTok, Instagram Reels, and Snapchat.",
        },
        { status: 400 }
      );
    }

    // Extract video info using platform-specific logic
    let videoInfo;
    try {
      switch (platform) {
        case "tiktok":
          videoInfo = await extractTikTok(normalizedUrl);
          break;
        case "instagram":
          videoInfo = await extractInstagram(normalizedUrl);
          break;
        case "snapchat":
          videoInfo = await extractSnapchat(normalizedUrl);
          break;
      }
    } catch (extractErr) {
      const msg =
        extractErr instanceof Error
          ? extractErr.message
          : "Could not extract video from this link.";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    // Build the proxy URL for downloading through our server
    // This avoids CORS issues and lets us set proper headers for the download
    const proxyParams = new URLSearchParams({
      url: videoInfo.videoUrl,
      platform,
    });

    if (videoInfo.headers) {
      proxyParams.set("headers", JSON.stringify(videoInfo.headers));
    }

    const proxyUrl = `/api/proxy?${proxyParams.toString()}`;

    return NextResponse.json({
      success: true,
      platform: videoInfo.platform,
      proxyUrl,
      metadata: {
        title: videoInfo.title || "",
        author: videoInfo.author || "",
        thumbnailUrl: videoInfo.thumbnailUrl || "",
        duration: videoInfo.duration || 0,
        width: videoInfo.width || 0,
        height: videoInfo.height || 0,
      },
    });
  } catch (err) {
    console.error("Download API error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
