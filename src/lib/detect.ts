/**
 * Platform detection and URL validation utilities
 */

export type Platform = "tiktok" | "instagram" | "snapchat";

const PLATFORM_PATTERNS: Record<Platform, RegExp> = {
  tiktok:
    /^https?:\/\/(?:(?:www|vm|vt|m)\.)?tiktok\.com\//i,
  instagram:
    /^https?:\/\/(?:(?:www|m)\.)?instagram\.com\//i,
  snapchat:
    /^https?:\/\/(?:(?:www|story|t|spotlight)\.)?snapchat\.com\//i,
};

/**
 * Detect which platform a URL belongs to, or null if unsupported.
 */
export function detectPlatform(url: string): Platform | null {
  for (const [platform, regex] of Object.entries(PLATFORM_PATTERNS)) {
    if (regex.test(url)) return platform as Platform;
  }
  return null;
}

/**
 * Validate and normalize a URL.
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim();
  // Add protocol if missing
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = "https://" + normalized;
  }
  return normalized;
}

/**
 * Parse and validate URLs from user input (newline or comma separated)
 */
export function parseUrls(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeUrl)
    .filter((url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
}
