"use client";

import { useState, useCallback, useRef, useEffect, type JSX } from "react";

type Platform = "tiktok" | "instagram" | "snapchat";
type Status = "idle" | "processing" | "success" | "error";

interface VideoResult {
  platform: string;
  proxyUrl: string;
  metadata: {
    title: string;
    author: string;
    thumbnailUrl: string;
    duration: number;
    width: number;
    height: number;
  };
}

const PLATFORM_REGEX: Record<string, RegExp> = {
  tiktok: /tiktok\.com/i,
  instagram: /instagram\.com/i,
  snapchat: /snapchat\.com/i,
};

function detectPlatforms(text: string): Set<string> {
  const platforms = new Set<string>();
  for (const [platform, regex] of Object.entries(PLATFORM_REGEX)) {
    if (regex.test(text)) platforms.add(platform);
  }
  return platforms;
}

function detectPlatform(url: string): Platform | null {
  for (const [platform, regex] of Object.entries(PLATFORM_REGEX)) {
    if (regex.test(url)) return platform as Platform;
  }
  return null;
}

function getIsMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function parseUrlsFromText(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const PLATFORM_ICONS: Record<string, JSX.Element> = {
  tiktok: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.01-.3z" />
    </svg>
  ),
  instagram: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  snapchat: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.979-.291a.993.993 0 01.42-.091c.27 0 .48.09.601.27.166.239.174.48.009.72-.18.27-.48.449-.84.554a3.46 3.46 0 01-.539.12c-.15.029-.3.06-.42.09-.18.06-.39.18-.45.48-.06.36.09.63.27.93.24.36.51.72.81 1.05.45.48.96.9 1.53 1.26.31.18.6.27.87.36.09.03.18.06.27.09.45.12.57.45.51.72-.06.24-.27.48-.69.57a4.21 4.21 0 01-.99.12c-.27 0-.54-.03-.78-.06h-.03c-.27-.03-.48-.06-.69-.06-.21 0-.39.03-.54.12-.18.12-.36.33-.51.6-.24.45-.57.96-1.26 1.14-.15.03-.33.06-.51.06a4.3 4.3 0 01-1.02-.18 7.13 7.13 0 00-1.65-.36 5.89 5.89 0 00-.57.03 7.13 7.13 0 00-1.65.36 4.3 4.3 0 01-1.02.18c-.18 0-.36-.03-.51-.06-.69-.18-1.02-.69-1.26-1.14-.15-.27-.33-.48-.51-.6-.15-.09-.33-.12-.54-.12-.21 0-.42.03-.69.06h-.03c-.24.03-.51.06-.78.06a4.21 4.21 0 01-.99-.12c-.42-.09-.63-.33-.69-.57-.06-.27.06-.6.51-.72.09-.03.18-.06.27-.09.27-.09.57-.18.87-.36a7.13 7.13 0 001.53-1.26c.3-.33.57-.69.81-1.05.18-.3.33-.57.27-.93-.06-.3-.27-.42-.45-.48a3.57 3.57 0 00-.42-.09c-.18-.03-.39-.06-.54-.12-.36-.105-.66-.285-.84-.555-.165-.24-.157-.48.009-.72.12-.18.33-.27.6-.27a.99.99 0 01.42.09c.33.18.66.27.96.291.21 0 .36-.045.42-.09-.009-.165-.019-.33-.03-.51l-.003-.06c-.105-1.626-.225-3.654.3-4.848C7.853 1.069 11.216.793 12.206.793z" />
    </svg>
  ),
};

export default function Home() {
  const [urls, setUrls] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [results, setResults] = useState<VideoResult[]>([]);
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(
    new Set()
  );
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [downloadCount, setDownloadCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useRef(false);

  useEffect(() => {
    isMobile.current = getIsMobile();
    // Load download count from localStorage
    try {
      const saved = localStorage.getItem("nogtik_downloads");
      if (saved) setDownloadCount(parseInt(saved, 10) || 0);
    } catch {
      // ignore
    }
  }, []);

  const incrementDownloads = useCallback((count: number) => {
    setDownloadCount((prev) => {
      const next = prev + count;
      try {
        localStorage.setItem("nogtik_downloads", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Detect platforms from input
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setUrls(value);
      setActivePlatforms(detectPlatforms(value));
      // Clear status when user starts editing after an error
      if (status === "error" || status === "success") {
        setStatus("idle");
        setStatusMessage("");
      }
    },
    [status]
  );

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrls((prev) => {
        const newVal = prev ? prev + "\n" + text : text;
        setActivePlatforms(detectPlatforms(newVal));
        return newVal;
      });
    } catch {
      setStatus("error");
      setStatusMessage("Clipboard blocked — paste manually with Ctrl/Cmd+V");
    }
  }, []);

  // Clear input
  const handleClear = useCallback(() => {
    setUrls("");
    setActivePlatforms(new Set());
    setStatus("idle");
    setStatusMessage("");
    setResults([]);
    setProcessingIndex(-1);
    textareaRef.current?.focus();
  }, []);

  // Download a single result
  const handleSingleDownload = useCallback(
    (result: VideoResult) => {
      const a = document.createElement("a");
      a.href = result.proxyUrl;
      a.download = `nogtik_${result.platform}_${Date.now()}.mp4`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 5000);
      incrementDownloads(1);
    },
    [incrementDownloads]
  );

  // Main download handler
  const handleDownload = useCallback(async () => {
    const urlList = parseUrlsFromText(urls);

    if (urlList.length === 0) {
      setStatus("error");
      setStatusMessage("Paste at least one link to get started.");
      return;
    }

    if (urlList.length > 10) {
      setStatus("error");
      setStatusMessage("Maximum 10 links at a time. Remove some and try again.");
      return;
    }

    // Validate platforms
    const invalid = urlList.filter((u) => !detectPlatform(u));
    if (invalid.length > 0) {
      const shortUrl =
        invalid[0].length > 50
          ? invalid[0].slice(0, 47) + "..."
          : invalid[0];
      setStatus("error");
      setStatusMessage(
        `Unsupported link: ${shortUrl} — we support TikTok, Instagram, and Snapchat.`
      );
      return;
    }

    setStatus("processing");
    setResults([]);
    setProcessingIndex(0);

    const newResults: VideoResult[] = [];
    const errorMessages: string[] = [];

    for (let i = 0; i < urlList.length; i++) {
      setProcessingIndex(i);
      setStatusMessage(
        urlList.length === 1
          ? "Extracting video..."
          : `Processing video ${i + 1} of ${urlList.length}...`
      );

      try {
        const resp = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlList[i] }),
        });

        const data = await resp.json();

        if (!resp.ok || data.error) {
          errorMessages.push(data.error || `Failed: ${urlList[i]}`);
          continue;
        }

        newResults.push(data);
      } catch (err) {
        errorMessages.push(
          `Network error for ${urlList[i].slice(0, 40)}...`
        );
      }
    }

    setResults(newResults);
    setProcessingIndex(-1);

    if (newResults.length === 0) {
      setStatus("error");
      setStatusMessage(
        errorMessages.length > 0
          ? errorMessages[0]
          : "Download failed. Please check the links and try again."
      );
      return;
    }

    // Auto-download if single video
    if (newResults.length === 1) {
      handleSingleDownload(newResults[0]);
    }

    setStatus("success");
    const failCount = errorMessages.length;
    if (failCount > 0) {
      setStatusMessage(
        `${newResults.length} video${newResults.length > 1 ? "s" : ""} ready. ${failCount} failed.`
      );
    } else {
      setStatusMessage(
        newResults.length === 1
          ? "Your video is downloading!"
          : `${newResults.length} videos ready to download!`
      );
    }
  }, [urls, handleSingleDownload]);

  const totalUrls = parseUrlsFromText(urls).length;

  return (
    <main className="flex flex-col items-center min-h-screen px-4 py-10 sm:py-16 md:py-20">
      {/* Logo */}
      <div className="fade-in-up mb-2 select-none">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none">
          nog<span className="gradient-text">tik</span>
        </h1>
      </div>

      {/* Tagline */}
      <p className="fade-in-up-delay-1 text-sm sm:text-base text-[var(--text-muted)] mb-8 sm:mb-10 text-center max-w-md">
        TikTok · Instagram Reels · Snapchat — best quality, no watermark.
      </p>

      {/* Main Card */}
      <div className="fade-in-up-delay-2 card-glass w-full max-w-2xl p-5 sm:p-6 shadow-2xl shadow-black/50">
        {/* Platform badges */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["tiktok", "instagram", "snapchat"] as const).map((p) => (
            <div
              key={p}
              data-platform={p}
              className={`badge ${activePlatforms.has(p) ? "active" : ""}`}
            >
              {PLATFORM_ICONS[p]}
              <span className="capitalize">{p === "instagram" ? "Instagram" : p === "tiktok" ? "TikTok" : "Snapchat"}</span>
            </div>
          ))}

          {/* Download counter */}
          {downloadCount > 0 && (
            <div className="ml-auto text-xs text-[var(--text-muted)] self-center opacity-60">
              {downloadCount} video{downloadCount !== 1 ? "s" : ""} saved
            </div>
          )}
        </div>

        {/* URL input */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="url-input"
            placeholder={
              isMobile.current
                ? "Paste a video link here..."
                : "Paste one or more video links here (one per line)..."
            }
            value={urls}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleDownload();
              }
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            rows={4}
          />
        </div>

        {/* URL counter */}
        {totalUrls > 0 && (
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-[var(--text-muted)]">
              {totalUrls > 10 && (
                <span className="text-[#f87171]">⚠ Max 10 links — </span>
              )}
              {totalUrls} link{totalUrls !== 1 ? "s" : ""} detected
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button className="btn-secondary" onClick={handlePaste} title="Paste from clipboard">
            📋 Paste
          </button>
          <button className="btn-secondary" onClick={handleClear} title="Clear all">
            ✕ Clear
          </button>
          <button
            className="btn-download flex-1"
            onClick={handleDownload}
            disabled={status === "processing"}
          >
            {status === "processing" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" />
                Processing...
              </span>
            ) : (
              <span>⬇ Download{totalUrls > 1 ? ` (${totalUrls})` : ""}</span>
            )}
          </button>
        </div>

        {/* Progress bar */}
        {status === "processing" && totalUrls > 1 && (
          <div className="progress-bar mt-4">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(((processingIndex + 1) / totalUrls) * 100, 100)}%`,
              }}
            />
          </div>
        )}

        {/* Status message */}
        {statusMessage && (
          <div
            className={`mt-4 flex items-center gap-2 text-sm ${
              status === "error"
                ? "status-error"
                : status === "success"
                  ? "status-success"
                  : "status-processing"
            }`}
          >
            {status === "processing" && <span className="spinner" />}
            {status === "success" && <span>✓</span>}
            {status === "error" && <span>✕</span>}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Ready to download
            </div>
            {results.map((result, i) => (
              <div key={i} className="preview-card p-4">
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  {result.metadata.thumbnailUrl && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.metadata.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="badge active text-xs py-1 px-2"
                        data-platform={result.platform}
                      >
                        {result.platform === "tiktok" ? "TikTok" : result.platform === "instagram" ? "Instagram" : "Snapchat"}
                      </span>
                      {result.metadata.width > 0 && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {result.metadata.width}×{result.metadata.height}
                        </span>
                      )}
                    </div>
                    {result.metadata.title && (
                      <p className="text-sm text-[var(--text-muted)] truncate">
                        {result.metadata.title}
                      </p>
                    )}
                    {result.metadata.author && (
                      <p className="text-xs text-[var(--text-muted)] opacity-70">
                        @{result.metadata.author}
                      </p>
                    )}
                  </div>

                  {/* Download button */}
                  <button
                    className="btn-download text-sm py-2 px-4 flex-shrink-0"
                    onClick={() => handleSingleDownload(result)}
                  >
                    ⬇ Save .mp4
                  </button>
                </div>
              </div>
            ))}

            {/* Download all button */}
            {results.length > 1 && (
              <div className="text-center pt-2">
                <button
                  className="btn-secondary text-sm"
                  onClick={() => {
                    results.forEach((r, i) => {
                      setTimeout(() => handleSingleDownload(r), i * 500);
                    });
                  }}
                >
                  ⬇ Download All ({results.length} videos)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="fade-in-up-delay-3 w-full max-w-2xl mt-8">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4 text-center">
          How it works
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-0 justify-between">
          {[
            { step: "1", icon: "📋", label: "Paste link", desc: "Copy a TikTok, Instagram, or Snapchat video URL" },
            { step: "2", icon: "⚡", label: "We extract", desc: "Our servers fetch the cleanest, highest quality version" },
            { step: "3", icon: "⬇", label: "Download", desc: "Save as .mp4 — works on iPhone, Android & desktop" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center max-w-[180px]">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-bold text-sm mb-1">{item.label}</div>
              <div className="text-xs text-[var(--text-muted)]">{item.desc}</div>
              {i < 2 && (
                <div className="hidden sm:block absolute" style={{ transform: `translateX(${90 * (i + 1)}px)` }}>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="fade-in-up-delay-3 grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-2xl w-full mt-8">
        <div className="feature-card">
          <div className="text-lg mb-1">🎬</div>
          <div className="font-bold text-sm mb-1">Best Quality</div>
          <div className="text-xs text-[var(--text-muted)]">
            Always grabs the highest resolution available — up to 4K.
          </div>
        </div>
        <div className="feature-card">
          <div className="text-lg mb-1">✨</div>
          <div className="font-bold text-sm mb-1">No Watermark</div>
          <div className="text-xs text-[var(--text-muted)]">
            Clean videos without platform branding or overlays.
          </div>
        </div>
        <div className="feature-card">
          <div className="text-lg mb-1">📱</div>
          <div className="font-bold text-sm mb-1">All Devices</div>
          <div className="text-xs text-[var(--text-muted)]">
            MP4 files that save directly to Camera Roll or Gallery.
          </div>
        </div>
        <div className="feature-card">
          <div className="text-lg mb-1">🔒</div>
          <div className="font-bold text-sm mb-1">No Sign-up</div>
          <div className="text-xs text-[var(--text-muted)]">
            No accounts, no tracking, no data stored.
          </div>
        </div>
      </div>

      {/* Keyboard shortcut hint (desktop only) */}
      <div className="mt-6 text-xs text-[var(--text-muted)] opacity-40 hidden sm:block">
        Press Ctrl/⌘ + Enter to download instantly
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-10 pb-6 text-center text-xs text-[#4a4a5e] max-w-lg space-y-2">
        <p>
          Only download content you own or have permission to use.
        </p>
        <p className="opacity-60">
          Not affiliated with TikTok, Instagram, or Snapchat. Built with Next.js.
        </p>
      </footer>
    </main>
  );
}
