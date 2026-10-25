/**
 * Snapchat video extractor — fetches Spotlight/Stories at highest resolution.
 *
 * Strategy:
 * 1. Scrape the Snapchat page for video URL in og:video or embedded JSON
 * 2. Use Snapchat's story API endpoints
 * 3. Snapchat videos don't have watermarks on the video itself,
 *    so no watermark removal needed — just get the clean source
 */

import type { VideoInfo } from "./tiktok";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Strategy 1: Scrape the Snapchat page for og:video meta tag
 * Snapchat Spotlight and Stories pages embed video URLs in meta tags
 */
async function fetchViaPageScrape(url: string): Promise<VideoInfo | null> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!resp.ok) return null;
    const html = await resp.text();

    // Look for og:video or video source
    const patterns = [
      /property="og:video"\s+content="([^"]+)"/,
      /property="og:video:secure_url"\s+content="([^"]+)"/,
      /<source\s+src="([^"]+)"\s+type="video\/mp4"/,
      /"video_url"\s*:\s*"([^"]+)"/,
      /"media_url"\s*:\s*"([^"]+)"/,
      /"url"\s*:\s*"(https:\/\/[^"]*(?:cf-st\.sc|snapchat)[^"]*\.mp4[^"]*)"/,
    ];

    let videoUrl: string | null = null;
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        videoUrl = match[1]
          .replace(/&amp;/g, "&")
          .replace(/\\u0026/g, "&")
          .replace(/\\\//g, "/");
        break;
      }
    }

    if (!videoUrl) {
      // Try looking for Snapchat's bolt CDN URLs
      const boltMatch = html.match(
        /(https:\/\/bolt-gcdn\.sc-cdn\.net\/[^"'\s]+)/
      );
      if (boltMatch) {
        videoUrl = boltMatch[1];
      }
    }

    if (!videoUrl) return null;

    // Extract metadata
    const thumbMatch = html.match(
      /property="og:image"\s+content="([^"]+)"/
    );
    const titleMatch = html.match(
      /property="og:title"\s+content="([^"]+)"/
    );

    return {
      platform: "snapchat",
      videoUrl,
      thumbnailUrl: thumbMatch?.[1] || "",
      title: titleMatch?.[1] || "Snapchat Video",
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
 * Strategy 2: Use Snapchat's story API for Spotlight content
 */
async function fetchViaSpotlightApi(url: string): Promise<VideoInfo | null> {
  try {
    // Extract the snap ID from the URL
    const idMatch = url.match(
      /\/(?:spotlight|story|s)\/([A-Za-z0-9_-]+)/
    );
    if (!idMatch) return null;

    const snapId = idMatch[1];

    // Try the Snapchat web API
    const apiUrl = `https://www.snapchat.com/web/deeplink/snapcode?data=${snapId}&type=spotlight`;
    const resp = await fetch(apiUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!resp.ok) return null;
    const data = await resp.json();

    const videoUrl = data?.media?.mediaUrl || data?.snapUrl;
    if (!videoUrl) return null;

    return {
      platform: "snapchat",
      videoUrl,
      thumbnailUrl: data?.media?.thumbnailUrl || "",
      title: data?.title || "Snapchat Video",
      author: data?.username || "",
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
 * Strategy 3: Use Snapchat's public stories web endpoint
 */
async function fetchViaStoriesWeb(url: string): Promise<VideoInfo | null> {
  try {
    // For story URLs like snapchat.com/add/username or stories
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!resp.ok) return null;
    const html = await resp.text();

    // Look for Snapchat's __NEXT_DATA__ or embedded snap data
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (!nextDataMatch) return null;

    const nextData = JSON.parse(nextDataMatch[1]);
    const props = nextData?.props?.pageProps;

    // Navigate through the data structure to find video URL
    const story =
      props?.story ||
      props?.snap ||
      props?.spotlight;
    if (!story) return null;

    const videoUrl =
      story.snapMediaUrl ||
      story.mediaUrl ||
      story.video?.url;

    if (!videoUrl) return null;

    return {
      platform: "snapchat",
      videoUrl,
      thumbnailUrl: story.thumbnailUrl || story.snapThumbnailUrl || "",
      title: story.title || "Snapchat Video",
      author: story.username || "",
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
  // Strategy 1: Page scraping (most reliable)
  const scrapeResult = await fetchViaPageScrape(inputUrl);
  if (scrapeResult) return scrapeResult;

  // Strategy 2: Spotlight API
  const spotlightResult = await fetchViaSpotlightApi(inputUrl);
  if (spotlightResult) return spotlightResult;

  // Strategy 3: Stories web data
  const storiesResult = await fetchViaStoriesWeb(inputUrl);
  if (storiesResult) return storiesResult;

  throw new Error(
    "Could not extract Snapchat video. The snap may have expired, be private, or the link may be invalid."
  );
}
