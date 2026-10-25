/**
 * GET /api/proxy
 *
 * Proxies video downloads through our server to avoid CORS issues.
 * Streams the video data directly to the client with proper Content-Type
 * and Content-Disposition headers for download.
 *
 * On iOS Safari, videos download as .mp4 and can be saved to Camera Roll.
 * On Android, they save to the Downloads folder.
 * On desktop, standard browser download behavior.
 *
 * Query params:
 * - url: The source video URL to proxy
 * - platform: tiktok | instagram | snapchat
 * - headers: JSON-encoded headers to send to the source (optional)
 * - filename: Custom filename (optional)
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120; // Allow up to 2 minutes for large videos
export const dynamic = "force-dynamic";

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoUrl = searchParams.get("url");
  const platform = searchParams.get("platform") || "video";
  const headersJson = searchParams.get("headers");
  const customFilename = searchParams.get("filename");

  if (!videoUrl) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 }
    );
  }

  // Validate the URL
  try {
    const parsed = new URL(videoUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid video URL" },
      { status: 400 }
    );
  }

  try {
    // Parse custom headers for the upstream request
    let upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };

    if (headersJson) {
      try {
        const parsed = JSON.parse(headersJson);
        if (typeof parsed === "object" && parsed !== null) {
          upstreamHeaders = { ...upstreamHeaders, ...parsed };
        }
      } catch {
        // ignore parse errors, use defaults
      }
    }

    // Fetch the video from the source with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout

    let resp: Response;
    try {
      resp = await fetch(videoUrl, {
        headers: upstreamHeaders,
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!resp.ok) {
      return NextResponse.json(
        {
          error: `Video source returned ${resp.status}. The video may have been removed or the link expired.`,
        },
        { status: 502 }
      );
    }

    // Determine content type — always prefer video/mp4 for maximum compatibility
    const sourceContentType =
      resp.headers.get("content-type") || "application/octet-stream";
    // Force video/mp4 for best iOS/Android compatibility
    const contentType = sourceContentType.includes("video")
      ? sourceContentType
      : "video/mp4";

    // Determine file extension based on content type
    let ext = "mp4";
    if (contentType.includes("quicktime")) ext = "mov";
    else if (contentType.includes("webm")) ext = "webm";
    else if (contentType.includes("3gpp")) ext = "3gp";

    // Generate filename
    const timestamp = Date.now();
    const filename =
      customFilename || `nogtik_${platform}_${timestamp}.${ext}`;

    // Build response headers
    const responseHeaders = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "X-Nogtik-Platform": platform,
      // CORS headers
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers":
        "Content-Disposition, Content-Length, X-Nogtik-Platform",
    });

    // Forward content-length if available
    const contentLength = resp.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    // Stream the response body directly to the client
    return new NextResponse(resp.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Proxy error:", err);

    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Download timed out. The video may be too large or the source is slow." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch the video. Please try again." },
      { status: 500 }
    );
  }
}
