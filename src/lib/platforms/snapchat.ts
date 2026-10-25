/**
 * Snapchat video extractor — fetches Spotlight/Stories at highest resolution.
 *
 * Key discovery: Snapchat's Spotlight pages are Next.js apps with __NEXT_DATA__
 * containing all video URLs from their CDN (bolt-gcdn.sc-cdn.net and cf-st.sc-cdn.net).
 *
 * URL pattern analysis:
 * - `.27.IRZXSOY` suffix = SpotlightSharing quality (video, best for download)
 * - `.256.IRZXSOY` suffix = DfLargeThumbnail (thumbnail image)
 * - `cf-st.sc-cdn.net/d/` = primary CDN
 * - `bolt-gcdn.sc-cdn.net` = backup CDN
 * - `cf-st.sc-cdn.net/a/` = alternate video path
 *
 * Snapchat videos don't have watermarks, so we just need the clean source.
 */

import type { VideoInfo } from "./tiktok";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

interface SnapVideo {
  videoUrl: string;
  thumbnailUrl: string;
}

/**
 * Parse Snapchat's __NEXT_DATA__ to extract video and thumbnail URLs.
 *
 * Videos use the SpotlightSharing quality suffix (.27.)
 * Thumbnails use DfLargeThumbnail suffix (.256.)
 *
 * For the first/primary snap, we want the first .27. URL with the
 * cf-st or bolt-gcdn CDN prefix.
 */
function extractVideosFromNextData(html: string): SnapVideo[] {
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!nextDataMatch) return [];

  let pageProps: Record<string, unknown>;
  try {
    const data = JSON.parse(nextDataMatch[1]);
    pageProps = data?.props?.pageProps;
    if (!pageProps) return [];
  } catch {
    return [];
  }

  // Serialize the entire pageProps to find all CDN URLs
  const jsonStr = JSON.stringify(pageProps);

  // Find all video URLs (SpotlightSharing quality, .27. suffix)
  const videoPattern =
    /https?:\/\/(?:cf-st\.sc-cdn\.net\/[ad]|bolt-gcdn\.sc-cdn\.net\/[a-z0-9]+)\/[A-Za-z0-9_-]+\.27\.[A-Za-z0-9]+\?[^"\\]*/g;
  const videoUrls = [
    ...new Set(
      (jsonStr.match(videoPattern) || []).map((u) =>
        u.replace(/\\u0026/g, "&").replace(/&amp;/g, "&")
      )
    ),
  ];

  // Find all thumbnail URLs (.256. suffix)
  const thumbPattern =
    /https?:\/\/(?:cf-st\.sc-cdn\.net\/[ad]|bolt-gcdn\.sc-cdn\.net\/[a-z0-9]+)\/[A-Za-z0-9_-]+\.256\.[A-Za-z0-9]+\?[^"\\]*/g;
  const thumbUrls = [
    ...new Set(
      (jsonStr.match(thumbPattern) || []).map((u) =>
        u.replace(/\\u0026/g, "&").replace(/&amp;/g, "&")
      )
    ),
  ];

  if (videoUrls.length === 0) return [];

  // Group videos: each unique base ID (before .27.) is one snap
  const grouped = new Map<string, SnapVideo>();

  for (const vUrl of videoUrls) {
    const idMatch = vUrl.match(/\/([A-Za-z0-9_-]+)\.27\./);
    if (!idMatch) continue;
    const baseId = idMatch[1];

    if (grouped.has(baseId)) continue;

    // Find matching thumbnail
    const thumb = thumbUrls.find((t) => t.includes(baseId)) || "";

    grouped.set(baseId, {
      videoUrl: vUrl,
      thumbnailUrl: thumb,
    });
  }

  return [...grouped.values()];
}

/**
 * Also look for direct video URLs in the page HTML (og:video, source tags, etc.)
 */
function extractVideoFromMeta(html: string): string | null {
  const patterns = [
    /property="og:video(?::secure_url)?"\s+content="([^"]+)"/,
    /<source\s+[^>]*src="([^"]+)"[^>]*type="video\/mp4"/,
    /"video_url"\s*:\s*"([^"]+)"/,
    /"media_url"\s*:\s*"([^"]+\.mp4[^"]*)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1]
        .replace(/\\u0026/g, "&")
        .replace(/&amp;/g, "&")
        .replace(/\\\//g, "/");
    }
  }

  return null;
}

/**
 * Strategy 1: Fetch the Snapchat page and parse __NEXT_DATA__ for CDN URLs
 * This is the most reliable approach for Spotlight content
 */
async function fetchViaPageData(url: string): Promise<VideoInfo | null> {
  try {
    // Try desktop UA first, then mobile
    for (const ua of [USER_AGENT, MOBILE_UA]) {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": ua,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });

      // Even 404 pages from Snapchat contain __NEXT_DATA__ with spotlight feed
      const html = await resp.text();

      // Try __NEXT_DATA__ extraction first
      const videos = extractVideosFromNextData(html);
      if (videos.length > 0) {
        // Get the first video (primary snap)
        const primary = videos[0];

        // Try to get metadata from og tags
        const titleMatch = html.match(
          /property="og:title"\s+content="([^"]+)"/
        );
        const descMatch = html.match(
          /property="og:description"\s+content="([^"]+)"/
        );

        return {
          platform: "snapchat",
          videoUrl: primary.videoUrl,
          thumbnailUrl: primary.thumbnailUrl,
          title: titleMatch?.[1] || descMatch?.[1] || "Snapchat Video",
          author: "",
          needsProxy: true,
          headers: {
            "User-Agent": USER_AGENT,
            Referer: "https://www.snapchat.com/",
          },
        };
      }

      // Fallback: try og:video meta tag
      const metaVideo = extractVideoFromMeta(html);
      if (metaVideo) {
        const titleMatch = html.match(
          /property="og:title"\s+content="([^"]+)"/
        );
        const thumbMatch = html.match(
          /property="og:image"\s+content="([^"]+)"/
        );

        return {
          platform: "snapchat",
          videoUrl: metaVideo,
          thumbnailUrl: thumbMatch?.[1] || "",
          title: titleMatch?.[1] || "Snapchat Video",
          author: "",
          needsProxy: true,
          headers: {
            "User-Agent": USER_AGENT,
            Referer: "https://www.snapchat.com/",
          },
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Strategy 2: Try fetching the page with /embed suffix
 * Some Snapchat story URLs support embedded views
 */
async function fetchViaEmbed(url: string): Promise<VideoInfo | null> {
  try {
    // Try adding /embed to the URL
    const embedUrl = url.replace(/\/?$/, "/embed");
    const resp = await fetch(embedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
      },
      redirect: "follow",
    });

    if (!resp.ok) return null;
    const html = await resp.text();

    const metaVideo = extractVideoFromMeta(html);
    if (!metaVideo) return null;

    return {
      platform: "snapchat",
      videoUrl: metaVideo,
      thumbnailUrl: "",
      title: "Snapchat Video",
      author: "",
      needsProxy: true,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://www.snapchat.com/",
      },
    };
  } catch {
    return null;
  }
}

/**
 * Strategy 3: Use SnapSave.app for Snapchat videos
 */
async function fetchViaSnapSave(url: string): Promise<VideoInfo | null> {
  try {
    const formData = new URLSearchParams();
    formData.append("url", url);

    const resp = await fetch("https://snapsave.app/action.php?lang=en", {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://snapsave.app",
        Referer: "https://snapsave.app/",
      },
      body: formData.toString(),
    });

    if (!resp.ok) return null;
    const text = await resp.text();

    // Look for CDN URLs in the response
    const cdnUrls = text.match(
      /https?:\/\/[^\s"'\\]+(?:sc-cdn\.net|snapchat)[^\s"'\\]*\.mp4[^\s"'\\]*/g
    );

    // Also look for general video URLs
    const videoUrls = text.match(
      /https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/g
    );

    const url_list = cdnUrls || videoUrls;
    if (!url_list || url_list.length === 0) return null;

    return {
      platform: "snapchat",
      videoUrl: url_list[0]
        .replace(/\\u0026/g, "&")
        .replace(/&amp;/g, "&"),
      thumbnailUrl: "",
      title: "Snapchat Video",
      author: "",
      needsProxy: true,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://www.snapchat.com/",
      },
    };
  } catch {
    return null;
  }
}

/**
 * Main Snapchat extraction function — tries multiple strategies
 */
export async function extractSnapchat(inputUrl: string): Promise<VideoInfo> {
  // Strategy 1: Page data parsing (__NEXT_DATA__ + og:video)
  // This is the most reliable since Snapchat's Spotlight pages include
  // all video CDN URLs in the server-rendered data
  const pageResult = await fetchViaPageData(inputUrl);
  if (pageResult) return pageResult;

  // Strategy 2: Embed page
  const embedResult = await fetchViaEmbed(inputUrl);
  if (embedResult) return embedResult;

  // Strategy 3: SnapSave third-party
  const snapSaveResult = await fetchViaSnapSave(inputUrl);
  if (snapSaveResult) return snapSaveResult;

  throw new Error(
    "Could not extract Snapchat video. The snap may have expired, be private, or the link format isn't supported."
  );
}
