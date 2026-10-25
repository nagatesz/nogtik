/**
 * Instagram Reels extractor — fetches watermark-free video at highest resolution.
 *
 * Strategy:
 * 1. Use Instagram's GraphQL API endpoint to get video_url
 * 2. Fall back to page scraping for __additionalDataLoaded
 * 3. Use third-party API if direct methods fail
 */

import type { VideoInfo } from "./tiktok";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const INSTAGRAM_APP_ID = "936619743392459";

/**
 * Extract shortcode from various Instagram URL formats
 */
function extractShortcode(url: string): string | null {
  // /reel/XXXXX/ or /reels/XXXXX/ or /p/XXXXX/
  const match = url.match(/\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

/**
 * Strategy 1: Use Instagram's GraphQL API
 * Instagram videos (reels) don't have watermarks, so we just need the highest quality URL
 */
async function fetchViaGraphQL(shortcode: string): Promise<VideoInfo | null> {
  try {
    const variables = JSON.stringify({
      shortcode,
      child_comment_count: 0,
      fetch_comment_count: 0,
      parent_comment_count: 0,
      has_threaded_comments: false,
    });

    const url = `https://www.instagram.com/graphql/query/?query_hash=b3055c01b4b222b8a47dc12b090e4e64&variables=${encodeURIComponent(variables)}`;

    const resp = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "X-IG-App-ID": INSTAGRAM_APP_ID,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.instagram.com/",
        Origin: "https://www.instagram.com",
      },
    });

    if (!resp.ok) return null;
    const data = await resp.json();

    const media = data?.data?.shortcode_media;
    if (!media) return null;

    const videoUrl = media.video_url;
    if (!videoUrl) return null;

    return {
      platform: "instagram",
      videoUrl,
      thumbnailUrl:
        media.display_url || media.thumbnail_src || media.display_resources?.[0]?.src || "",
      title:
        media.edge_media_to_caption?.edges?.[0]?.node?.text?.slice(0, 200) ||
        "",
      author: media.owner?.username || "",
      width: media.dimensions?.width || 0,
      height: media.dimensions?.height || 0,
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
 * Strategy 2: Scrape the Instagram page for video data in embedded JSON
 */
async function fetchViaPageScrape(
  url: string,
  shortcode: string
): Promise<VideoInfo | null> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Mode": "navigate",
      },
    });

    if (!resp.ok) return null;
    const html = await resp.text();

    // Try multiple patterns to find the video URL
    const patterns = [
      /"video_url"\s*:\s*"([^"]+)"/,
      /"contentUrl"\s*:\s*"([^"]+)"/,
      /property="og:video"\s+content="([^"]+)"/,
      /property="og:video:secure_url"\s+content="([^"]+)"/,
    ];

    let videoUrl: string | null = null;
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        videoUrl = match[1]
          .replace(/\\u0026/g, "&")
          .replace(/&amp;/g, "&")
          .replace(/\\\//g, "/");
        break;
      }
    }

    if (!videoUrl) return null;

    // Try to get thumbnail
    const thumbMatch = html.match(
      /property="og:image"\s+content="([^"]+)"/
    );
    const titleMatch = html.match(
      /property="og:title"\s+content="([^"]+)"/
    );

    return {
      platform: "instagram",
      videoUrl,
      thumbnailUrl: thumbMatch?.[1] || "",
      title: titleMatch?.[1] || "",
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
 * Strategy 3: Use the Instagram API v1 media endpoint
 */
async function fetchViaApiV1(shortcode: string): Promise<VideoInfo | null> {
  try {
    const url = `https://www.instagram.com/api/v1/media/${shortcodeToMediaId(shortcode)}/info/`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "X-IG-App-ID": INSTAGRAM_APP_ID,
        Accept: "*/*",
      },
    });

    if (!resp.ok) return null;
    const data = await resp.json();

    const item = data?.items?.[0];
    if (!item) return null;

    // Get the highest quality video version
    const videoVersions = item.video_versions || [];
    videoVersions.sort(
      (a: { width: number }, b: { width: number }) => b.width - a.width
    );
    const videoUrl = videoVersions[0]?.url;

    if (!videoUrl) return null;

    return {
      platform: "instagram",
      videoUrl,
      thumbnailUrl:
        item.image_versions2?.candidates?.[0]?.url || "",
      title: item.caption?.text?.slice(0, 200) || "",
      author: item.user?.username || "",
      width: videoVersions[0]?.width || 0,
      height: videoVersions[0]?.height || 0,
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
 * Convert Instagram shortcode to media ID (base64-like to int)
 */
function shortcodeToMediaId(shortcode: string): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let id = BigInt(0);
  for (const char of shortcode) {
    id = id * BigInt(64) + BigInt(alphabet.indexOf(char));
  }
  return id.toString();
}

/**
 * Main Instagram extraction function — tries multiple strategies
 */
export async function extractInstagram(inputUrl: string): Promise<VideoInfo> {
  const shortcode = extractShortcode(inputUrl);
  if (!shortcode) {
    throw new Error("Could not extract Instagram shortcode from URL.");
  }

  // Strategy 1: GraphQL API
  const graphqlResult = await fetchViaGraphQL(shortcode);
  if (graphqlResult) return graphqlResult;

  // Strategy 2: API v1
  const apiResult = await fetchViaApiV1(shortcode);
  if (apiResult) return apiResult;

  // Strategy 3: Page scrape
  const scrapeResult = await fetchViaPageScrape(inputUrl, shortcode);
  if (scrapeResult) return scrapeResult;

  throw new Error(
    "Could not extract Instagram video. It may be private or require login. Try again later."
  );
}
