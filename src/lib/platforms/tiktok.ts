/**
 * TikTok video extractor — fetches watermark-free video URL at highest resolution.
 *
 * Strategy:
 * 1. Use TikTok's internal API (oembed + web scraping) to get the video ID
 * 2. Fetch the video via TikTok's API which returns watermark-free playAddr
 * 3. Fall back to third-party APIs if direct fails
 */

export interface VideoInfo {
  platform: "tiktok" | "instagram" | "snapchat";
  videoUrl: string;
  thumbnailUrl?: string;
  title?: string;
  author?: string;
  duration?: number;
  width?: number;
  height?: number;
  needsProxy: boolean;
  headers?: Record<string, string>;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Extract video ID from various TikTok URL formats
 */
function extractVideoId(url: string): string | null {
  // Standard format: https://www.tiktok.com/@user/video/1234567890
  const stdMatch = url.match(/video\/(\d+)/);
  if (stdMatch) return stdMatch[1];

  // Short link: https://vm.tiktok.com/XXXXX/
  return null;
}

/**
 * Resolve short TikTok URLs (vm.tiktok.com) to full URLs
 */
async function resolveShortUrl(url: string): Promise<string> {
  if (!url.match(/vm\.tiktok\.com|vt\.tiktok\.com/i)) return url;

  const resp = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": USER_AGENT },
  });
  return resp.url;
}

/**
 * Strategy 1: Use TikTok's oembed API + web page scrape for video data
 */
async function fetchViaTikTokWeb(url: string): Promise<VideoInfo | null> {
  try {
    // Try oembed first for metadata
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedResp = await fetch(oembedUrl, {
      headers: { "User-Agent": USER_AGENT },
    });

    let title = "";
    let author = "";
    let thumbnailUrl = "";

    if (oembedResp.ok) {
      const oembed = await oembedResp.json();
      title = oembed.title || "";
      author = oembed.author_name || "";
      thumbnailUrl = oembed.thumbnail_url || "";
    }

    // Fetch the TikTok page to extract __UNIVERSAL_DATA_FOR_REHYDRATION__
    const pageResp = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!pageResp.ok) return null;
    const html = await pageResp.text();

    // Try to extract video URL from the page's JSON data
    // Look for __UNIVERSAL_DATA_FOR_REHYDRATION__ or SIGI_STATE
    const patterns = [
      /"playAddr"\s*:\s*"([^"]+)"/,
      /"downloadAddr"\s*:\s*"([^"]+)"/,
      /"play_addr"\s*:\s*\{[^}]*"url_list"\s*:\s*\["([^"]+)"/,
      /"download_addr"\s*:\s*\{[^}]*"url_list"\s*:\s*\["([^"]+)"/,
    ];

    let videoUrl: string | null = null;
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        videoUrl = match[1].replace(/\\u002F/g, "/").replace(/\\\//g, "/");
        break;
      }
    }

    if (!videoUrl) return null;

    return {
      platform: "tiktok",
      videoUrl,
      thumbnailUrl,
      title,
      author,
      needsProxy: true,
      headers: {
        Referer: "https://www.tiktok.com/",
        "User-Agent": USER_AGENT,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Strategy 2: Use third-party TikTok API services
 * tikwm.com provides watermark-free TikTok videos
 */
async function fetchViaTikwm(url: string): Promise<VideoInfo | null> {
  try {
    // Request HD quality explicitly
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1&count=12&cursor=0&web=1&is_b2c=1`;
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!resp.ok) return null;
    const data = await resp.json();

    if (data.code !== 0 || !data.data) return null;

    const videoData = data.data;
    // Prefer HD play URL (highest quality), then regular play, then download
    // hdplay = watermark-free HD, play = watermark-free SD, wmplay = watermarked
    const videoUrl =
      videoData.hdplay || videoData.play || videoData.wmplay || null;

    if (!videoUrl) return null;

    return {
      platform: "tiktok",
      videoUrl: videoUrl.startsWith("http")
        ? videoUrl
        : `https://www.tikwm.com${videoUrl}`,
      thumbnailUrl: videoData.cover || videoData.origin_cover || "",
      title: videoData.title || "",
      author: videoData.author?.nickname || videoData.author?.unique_id || "",
      duration: videoData.duration || 0,
      width: videoData.width || 0,
      height: videoData.height || 0,
      needsProxy: true,
      headers: {
        Referer: "https://www.tikwm.com/",
        "User-Agent": USER_AGENT,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Strategy 3: Use tikcdn API
 */
async function fetchViaTikcdn(videoId: string): Promise<VideoInfo | null> {
  try {
    const apiUrl = `https://api22-normal-c-useast2a.tiktokv.com/aweme/v1/feed/?aweme_id=${videoId}&iid=7318518857994389254&device_id=7318517321748022790&channel=googleplay&app_name=musical_ly&version_code=300904&device_platform=android&device_type=ASUS_Z01QD&os_version=9`;

    const resp = await fetch(apiUrl, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!resp.ok) return null;
    const data = await resp.json();

    const aweme = data?.aweme_list?.[0];
    if (!aweme) return null;

    const video = aweme.video;
    // play_addr typically has no watermark, download_addr may have one
    const playUrl = video?.play_addr?.url_list?.[0];
    if (!playUrl) return null;

    return {
      platform: "tiktok",
      videoUrl: playUrl,
      thumbnailUrl: video?.cover?.url_list?.[0] || "",
      title: aweme.desc || "",
      author: aweme.author?.nickname || "",
      duration: video?.duration ? video.duration / 1000 : 0,
      width: video?.width || 0,
      height: video?.height || 0,
      needsProxy: true,
      headers: { "User-Agent": USER_AGENT },
    };
  } catch {
    return null;
  }
}

/**
 * Main TikTok extraction function — tries multiple strategies
 */
export async function extractTikTok(inputUrl: string): Promise<VideoInfo> {
  // Resolve short URLs first
  const url = await resolveShortUrl(inputUrl);
  const videoId = extractVideoId(url);

  // Strategy 1: tikwm API (most reliable for watermark-free)
  const tikwmResult = await fetchViaTikwm(url);
  if (tikwmResult) return tikwmResult;

  // Strategy 2: Direct TikTok API (if we have videoId)
  if (videoId) {
    const apiResult = await fetchViaTikcdn(videoId);
    if (apiResult) return apiResult;
  }

  // Strategy 3: Web scraping
  const webResult = await fetchViaTikTokWeb(url);
  if (webResult) return webResult;

  throw new Error(
    "Could not extract TikTok video. The video may be private or the link may be invalid."
  );
}
