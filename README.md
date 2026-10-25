# nogtik

> Clean, high-res video downloader for TikTok, Instagram Reels & Snapchat — no watermark, best quality.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![Vercel](https://img.shields.io/badge/Vercel-Ready-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)

## Features

- **🎬 Best Quality** — Always grabs the highest resolution available
- **✨ No Watermark** — Uses clean source streams, skips watermarked formats
- **📱 All Devices** — Downloads as `.mp4` that works on iPhone, Android & desktop
- **⚡ Lightning Fast** — Serverless edge functions for instant processing
- **🔒 Privacy First** — No data stored, no accounts required
- **📦 Batch Download** — Process multiple links at once

## Supported Platforms

| Platform | Content Types |
|----------|--------------|
| **TikTok** | Videos, Slideshows |
| **Instagram** | Reels, Posts |
| **Snapchat** | Spotlight, Stories |

## Deploy to Vercel

The easiest way to deploy nogtik:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/nogtik)

Or manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# → Open http://localhost:3000
```

## How It Works

1. **Paste a link** — TikTok, Instagram, or Snapchat
2. **We extract** — Platform-specific APIs fetch the best available quality without watermarks
3. **You download** — Clean `.mp4` file ready for any device

### Platform-Specific Strategies

**TikTok**: Uses multiple extraction strategies including tikwm API for HD watermark-free streams, TikTok's internal API for direct access, and web scraping as fallback.

**Instagram**: Leverages Instagram's GraphQL API and API v1 endpoints to fetch the highest quality video versions. Instagram Reels don't have watermarks on the video itself.

**Snapchat**: Scrapes Spotlight and Story pages for embedded video URLs via og:video tags and __NEXT_DATA__ JSON.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS
- **Deployment**: Vercel Serverless Functions
- **No Dependencies**: Pure Node.js `fetch` — no yt-dlp, no ffmpeg, no binaries

## Project Structure

```
nogtik/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── download/route.ts  # Video info extraction API
│   │   │   └── proxy/route.ts     # Video streaming proxy
│   │   ├── globals.css            # Styles
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Main UI
│   └── lib/
│       ├── detect.ts              # Platform detection
│       └── platforms/
│           ├── index.ts           # Platform exports
│           ├── tiktok.ts          # TikTok extractor
│           ├── instagram.ts       # Instagram extractor
│           └── snapchat.ts        # Snapchat extractor
├── vercel.json                    # Vercel deployment config
└── package.json
```

## License

MIT
