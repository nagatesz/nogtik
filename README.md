# nogtik ⚡

> Clean, highest-resolution video downloader for TikTok, Instagram Reels & Snapchat — no watermarks, full quality.

[![Live Website](https://img.shields.io/badge/Live_Site-nogtik.vercel.app-25f4ee?style=for-the-badge&logo=vercel&logoColor=white)](https://nogtik.vercel.app)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/nagatesz/nogtik)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

### 🌐 Live Production App: [https://nogtik.vercel.app](https://nogtik.vercel.app)

---

## ✨ Features

- **🎬 Highest Resolution Available** — Extracts original HD and 4K source streams (1080p+, 60fps where available)
- **🚫 Zero Watermarks** — Removes platform branding, logos, and end cards before delivering your download
- **📱 Universal Device Compatibility** — Downloads direct `.mp4` video files ready for iOS Camera Roll, Android Gallery, and Desktop
- **⚡ Serverless Edge Speed** — Built on Next.js 15 App Router running on Vercel Edge Serverless functions
- **🔒 Privacy First** — No tracking, no user accounts, no videos stored on server
- **📦 Multi-Link Batch Processing** — Paste multiple links and download individual clips or batch download

---

## 📌 Supported Platforms

| Platform | Supported Links | Quality | Watermark Status |
|----------|-----------------|---------|------------------|
| **TikTok** | Videos, Slideshows, Stories | Highest HD Source | Clean / No Watermark |
| **Instagram** | Reels, Video Posts, Audio | Original Resolution | Clean / No Watermark |
| **Snapchat** | Spotlight, Public Stories | 1080p SpotlightSharing | Clean / No Watermark |

---

## 🚀 Live Demo & Deployment

### Try it Now
Visit the live deployment at **[nogtik.vercel.app](https://nogtik.vercel.app)**.

### Deploy Your Own Instance to Vercel
Click the button below to fork and deploy directly to Vercel in 1-click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nagatesz/nogtik)

Or deploy via terminal:

```bash
git clone https://github.com/nagatesz/nogtik.git
cd nogtik
npm install
npx vercel --prod
```

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/nagatesz/nogtik.git
cd nogtik

# Install dependencies
npm install

# Start development server
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 🛠️ Architecture

- **Framework**: Next.js 15 (Turbopack, App Router)
- **Styling**: Tailwind CSS + Glassmorphism Theme
- **Extraction Engine**: Pure Node.js Serverless Functions (Zero binary dependencies — no `ffmpeg` or `yt-dlp` needed)
- **Deployment Target**: Vercel Serverless Edge

```
nogtik/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── download/route.ts  # Multi-platform extraction API
│   │   │   └── proxy/route.ts     # Video streaming proxy (.mp4 stream)
│   │   ├── globals.css            # Dark glassmorphism styles & animations
│   │   ├── layout.tsx             # SEO metadata & fonts
│   │   └── page.tsx               # Reactive downloader frontend
│   └── lib/
│       ├── detect.ts              # URL parser & platform detector
│       └── platforms/
│           ├── tiktok.ts          # HD watermark-free TikTok extractor
│           ├── instagram.ts       # Instagram Reels extraction engine
│           └── snapchat.ts        # Spotlight CDN parser (.27. stream)
├── vercel.json                    # Edge timeouts & CORS headers
└── package.json
```

---

## ⚖️ License & Disclaimer

MIT License. Only download content you own or have explicit permission to use. Not affiliated with TikTok, Instagram, or Snapchat.
