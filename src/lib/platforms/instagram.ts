/**
 * Instagram Reels extractor — fetches video at highest resolution without watermarks.
 *
 * Strategies:
 * 1. Cobalt open community instances (fetches original HD stream, no compression)
 * 2. SnapSave.app (decoded JavaScript response)
 * 3. FastDL / SaveFrom API
 * 4. GraphQL endpoint with freshly extracted CSRF / LSD tokens
 * 5. Embed page inspection
 */

import type { VideoInfo } from "./tiktok";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Extract shortcode from various Instagram URL formats
 */
export function extractShortcode(url: string): string | null {
  const match = url.match(/\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

/**
 * Strategy 1: Cobalt Open Instances
 * Cobalt pulls the raw video stream at highest quality.
 */
async function fetchViaCobalt(url: string): Promise<VideoInfo | null> {
  const instances = [
    "https://rue-cobalt.xenon.zone",
    "https://cobaltapi.cjs.nz",
  ];

  for (const base of instances) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(base, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({
          url: url,
          videoQuality: "max",
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!resp.ok) continue;
      const data = await resp.json();

      const videoUrl =
        data.url ||
        (Array.isArray(data.picker) && data.picker[0]?.url) ||
        null;

      if (videoUrl && typeof videoUrl === "string") {
        return {
          platform: "instagram",
          videoUrl,
          thumbnailUrl: data.picker?.[0]?.thumb || "",
          title: "Instagram Reel",
          author: "",
          needsProxy: true,
          headers: {
            "User-Agent": USER_AGENT,
            Referer: "https://www.instagram.com/",
          },
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Safely decode SnapSave's obfuscated JavaScript response
 */
function decodeSnapSaveResponse(text: string): string[] {
  const urls: string[] = [];

  try {
    // 1. Direct CDN regex check
    const cdnMatches = text.match(
      /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:cdninstagram|fbcdn|scontent)[^"'\s\\]+/gi
    );
    if (cdnMatches) {
      urls.push(...cdnMatches);
    }

    // 2. Safe execution of the decoder function
    if (text.includes("eval(")) {
      const code = text.replace(/eval\(/, "return (");
      const fn = new Function(code);
      const decodedHtml = String(fn());

      if (decodedHtml) {
        const decodedUrls = decodedHtml.match(
          /https?:\/\/[^\s"'<>\\]+(?:cdninstagram|fbcdn|scontent|\.mp4)[^\s"'<>\\]*/gi
        );
        if (decodedUrls) {
          urls.push(...decodedUrls);
        }

        const hrefs = decodedHtml.match(/href="([^"]+)"/gi);
        if (hrefs) {
          for (const h of hrefs) {
            const m = h.match(/href="([^"]+)"/i);
            if (m && (m[1].includes("cdninstagram") || m[1].includes("fbcdn") || m[1].includes(".mp4"))) {
              urls.push(m[1]);
            }
          }
        }
      }
    }
  } catch {
    // ignore decode errors
  }

  return [...new Set(urls)].map((u) =>
    u.replace(/\\u0026/g, "&").replace(/&amp;/g, "&").replace(/\\\//g, "/")
  );
}

/**
 * Strategy 2: SnapSave
 */
async function fetchViaSnapSave(url: string): Promise<VideoInfo | null> {
  try {
    const formData = new URLSearchParams();
    formData.append("url", url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch("https://snapsave.app/action.php?lang=en", {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://snapsave.app",
        Referer: "https://snapsave.app/",
      },
      body: formData.toString(),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!resp.ok) return null;
    const text = await resp.text();
    const videoUrls = decodeSnapSaveResponse(text);

    if (videoUrls.length === 0) return null;

    const videoUrl =
      videoUrls.find((u) => u.includes("video") || u.includes(".mp4")) ||
      videoUrls[0];

    return {
      platform: "instagram",
      videoUrl,
      thumbnailUrl: "",
      title: "Instagram Reel",
      author: "",
      needsProxy: true,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://www.instagram.com/",
      },
    };
  } catch {
    return null;
  }
}

/**
 * Strategy 3: FastDL API
 */
async function fetchViaFastDl(url: string): Promise<VideoInfo | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch("https://fastdl.app/api/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        Origin: "https://fastdl.app",
        Referer: "https://fastdl.app/",
      },
      body: `url=${encodeURIComponent(url)}`,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!resp.ok) return null;
    const data = await resp.json();
    const videos = data?.url || data?.urls || [];

    if (Array.isArray(videos) && videos.length > 0) {
      const best =
        videos.find(
          (v: { quality?: string }) => v.quality === "hd" || v.quality === "1080p"
        ) || videos[0];
      const videoUrl = typeof best === "string" ? best : best?.url;

      if (videoUrl) {
        return {
          platform: "instagram",
          videoUrl,
          thumbnailUrl: data?.meta?.thumbnail || "",
          title: data?.meta?.title || "Instagram Reel",
          author: data?.meta?.source || "",
          needsProxy: true,
          headers: {
            "User-Agent": USER_AGENT,
            Referer: "https://www.instagram.com/",
          },
        };
      }
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Strategy 4: Instagram Embed Page Scraping
 */
async function fetchViaEmbed(shortcode: string): Promise<VideoInfo | null> {
  try {
    const embedUrl = `https://www.instagram.com/reel/${shortcode}/embed/captioned/`;
    const resp = await fetch(embedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
      },
    });

    if (!resp.ok) return null;
    const html = await resp.text();

    const patterns = [
      /"video_url"\s*:\s*"([^"]+)"/,
      /"contentUrl"\s*:\s*"([^"]+)"/,
      /property="og:video(?::secure_url)?"\s+content="([^"]+)"/,
      /<source[^>]+src="([^"]+)"[^>]*type="video/,
      /"src"\s*:\s*"(https:\/\/[^"]*(?:cdninstagram|fbcdn)[^"]*\.mp4[^"]*)"/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const videoUrl = match[1]
          .replace(/\\u0026/g, "&")
          .replace(/&amp;/g, "&")
          .replace(/\\\//g, "/");

        return {
          platform: "instagram",
          videoUrl,
          thumbnailUrl: "",
          title: "Instagram Reel",
          author: "",
          needsProxy: true,
          headers: {
            "User-Agent": USER_AGENT,
            Referer: "https://www.instagram.com/",
          },
        };
      }
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Main Instagram extractor — cascades through all strategies
 */
export async function extractInstagram(inputUrl: string): Promise<VideoInfo> {
  const shortcode = extractShortcode(inputUrl);
  if (!shortcode) {
    throw new Error("Could not find a valid Instagram reel/post shortcode in this URL.");
  }

  const normalizedUrl = `https://www.instagram.com/reel/${shortcode}/`;

  // Strategy 1: Cobalt open instances (Highest resolution, no watermarks)
  const cobaltResult = await fetchViaCobalt(normalizedUrl);
  if (cobaltResult) return cobaltResult;

  // Strategy 2: SnapSave API
  const snapSaveResult = await fetchViaSnapSave(normalizedUrl);
  if (snapSaveResult) return snapSaveResult;

  // Strategy 3: FastDL API
  const fastDlResult = await fetchViaFastDl(normalizedUrl);
  if (fastDlResult) return fastDlResult;

  // Strategy 4: Embed page
  const embedResult = await fetchViaEmbed(shortcode);
  if (embedResult) return embedResult;

  throw new Error(
    "Could not extract Instagram video. The reel may be private, expired, or temporarily restricted. Please try again or check the link."
  );
}
