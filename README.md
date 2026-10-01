<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=280&color=0:0f172a,40:1e1040,70:4c1d95,100:06b6d4&text=SwiftShare&fontSize=72&fontColor=ffffff&animation=fadeIn&fontAlignY=42&desc=Share%20Files%20Instantly%20Across%20Any%20Device&descAlignY=62&descColor=c4b5fd&descSize=20&stroke=7c3aed&strokeWidth=2"/>
</p>

<p align="center">
  <a href="https://swiftsharegg.vercel.app">
    <img src="https://img.shields.io/badge/%F0%9F%9A%80%20Live%20App-swiftsharegg.vercel.app-7c3aed?style=for-the-badge&labelColor=0f172a"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/Superduash/SwiftShare-Backend">
    <img src="https://img.shields.io/badge/%F0%9F%94%A7%20Backend%20Repo-SwiftShare--Backend-06b6d4?style=for-the-badge&labelColor=0f172a"/>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v0.8.2-7c3aed?style=flat-square"/>
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white"/>
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white"/>
  <img src="https://img.shields.io/badge/Cloudflare_R2-F38020?style=flat-square&logo=cloudflare&logoColor=white"/>
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white"/>
  <img src="https://img.shields.io/badge/MIT_License-22c55e?style=flat-square"/>
</p>

<br/>

<p align="center">
  <b>No accounts. No installs. No nonsense.</b><br/>
  Pick a file or paste text → get a 6-character code or QR → done.<br/>
  Your recipient has it in seconds, on any device, anywhere.
</p>

<br/>

---

<img width="830" height="574" alt="swiftshare" src="https://github.com/user-attachments/assets/ad2afa21-51eb-4191-b4a8-d69c160a0f33" /><br>

> **Try it right now →** [swiftsharegg.vercel.app](https://swiftsharegg.vercel.app) — no sign-up, works instantly

<br/>

---

## The problem it solves

You need to get a file from your phone to your laptop. Or send a PDF to a client who isn't on Slack. Or hand off a folder of screenshots or a text snippet to someone standing next to you.

The existing options make you:
- Create an account
- Install a heavy app
- Pay for persistent storage
- Trust that your file isn't sitting on an unmonitored server forever

**SwiftShare does none of that.** It's closer to "airdrop for the web" — ephemeral, instant, peer-aware, and gone when you want it gone.

<br/>

---

## Features

### 🔥 Core transfer experience

| | |
|---|---|
| **6-character codes** | Short, unambiguous alphabet (excludes `0`, `O`, `1`, `I`, `L`) — easy to read over the phone |
| **Inbuilt QR Scanner** | Native camera barcode detection with `jsQR` engine fallback and direct screenshot/photo QR upload |
| **Shareable links** | Instant full URLs with click-to-copy and native Web Share API support |
| **Multi-file uploads** | Drag and drop up to 10 files (up to 1 GB), streamed directly to storage |
| **Text & snippet sharing** | Share formatted notes, passwords, and code snippets with syntax highlighting |
| **In-browser previews** | Images, videos, audio, PDFs, and code render directly before downloading |

### 📡 Local Wi-Fi & Hotspot discovery

| | |
|---|---|
| **Zero-config peer discovery** | Detects active transfers on the same local network automatically |
| **Wi-Fi & Mobile Hotspot support** | Dual-stack matching supports IPv4 (`/24`) and IPv6 carrier tethering (`/64` prefix) |
| **Instant manual refresh** | One-tap manual sync polls REST and WebSocket channels simultaneously for instant matching |
| **Real-time broadcast** | New transfers broadcast instantly to connected peers on the same subnet room |

### 🛡️ Privacy controls

| | |
|---|---|
| **Burn after download** | Files self-destruct the instant they're claimed. Atomic MongoDB gate prevents race conditions |
| **Password protection** | bcrypt-hashed, brute-force protected. Only recipients with the password get through |
| **Auto-expiry** | 10 minutes, 1 hour, or 5 hours. Automatic cron purge removes expired data from storage and database |
| **Ownership tokens** | UUID token stored in client storage lets senders extend or cancel transfers without login |

### ⚡ Real-time everything

| | |
|---|---|
| **Live upload progress** | Driven from raw XHR byte events, smoothed via EMA and `requestAnimationFrame` — zero fake progress |
| **Instant download alerts** | WebSocket push notifications trigger the moment someone downloads |
| **Live countdown sync** | Synchronized countdown timer with server time reconciliation |
| **Network-aware retries** | Exponential backoff for network drops, cold starts, and mobile Wi-Fi/cellular handoffs |

### 🎨 12-Theme Paired System

| Mode | Theme Options |
|---|---|
| **Dark Modes (6)** | **Dark Velocity** (Default Void/Cyan), **Cyberpunk** (Neon Amber), **Sunset** (Warm Glow), **Tokyo Glow** (Neon Magenta), **Midnight** (Deep Indigo), **Forest** (Emerald Night) |
| **Light Modes (6)** | **Crisp Minimal** (Pure Monochrome), **Solar Glow** (Sunlight Gold), **Sunset Glow** (Peachy Dusk), **Tokyo Day** (Cool Morning), **Clean Slate** (Slate Ice), **Botanical** (Sage Garden) |
| **Theme Pairing** | Seamless dark/light toggle switches between corresponding pairs while preserving custom styling |

### 🌐 Works everywhere & Admin Dashboard

| | |
|---|---|
| **Installable PWA** | Add to home screen on iOS/Android. Custom splash, status bar integration, and offline caching |
| **Responsive design** | Tailored UX for everything from a 5.4-inch mobile screen to 4K desktop displays |
| **Admin Analytics** | Real-time dashboard with granular 24h, 7d, 30d, 90d, and All windows, conversion charts, and live visitor counter |

<br/>

---

## How a transfer works

```
    ┌─────────────┐     validate      ┌─────────────┐    stream via      ┌──────────────────┐
    │   Sender    │ ───────────────>  │   Browser   │ ─────────────────> │  Express/Busboy  │
    │ picks files │   (type, size,    │  (client-   │   XHR + FormData   │  (no temp disk   │
    └─────────────┘    extension)     │   side)     │                    │   writes)        │
                                      └─────────────┘                    └────────┬─────────┘
                                                                                  │
                                                                   pipe directly  │
                                                                                  ▼
                                                                          ┌─────────────────┐
                                                                          │  Cloudflare R2  │
                                                                          │  (object store) │
                                                                          └────────┬────────┘
                                                                                   │
                                                                      on complete  │
                                                                                   ▼
                                                                          ┌──────────────────┐
                                                                          │   MongoDB Atlas  │
                                                                          │ (transfer meta,  │
                                                                          │  expiry, stats)  │
                                                                          └────────┬─────────┘
                                                                                   │
                                                                  Socket.IO push  │
                                                                                   ▼
                                                                          ┌──────────────────┐
    ┌─────────────┐    enters code    ┌─────────────┐                    │   Sender page    │
    │  Recipient  │ ────────────────> │  Download   │ <───────────────── │  (live stats,    │
    │             │   or scans QR     │    page     │      download      │   extend/delete) │
    └─────────────┘                   └─────────────┘      complete      └──────────────────┘
```

<br/>

---

## Tech stack

### Frontend
| Technology | Role |
|---|---|
| **React 18** | UI — concurrent rendering, Suspense-based lazy loading |
| **Vite 8** | Build tooling — sub-second HMR, tree-shaking, PWA plugin |
| **Framer Motion** | Animations — spring physics, layout transitions, ambient particle effects |
| **Socket.IO client** | Real-time — upload progress, download notifications, live stats |
| **Tailwind CSS** | Utility-first styling with custom 12-theme CSS variable engine |
| **Native Barcode / jsQR** | Inbuilt camera QR scanning with image file fallback |

### Backend
| Technology | Role |
|---|---|
| **Node.js 22 + Express 5** | HTTP server — streaming uploads, REST API, admin analytics |
| **Busboy** | Multipart parsing — zero temp-file writes, direct pipe to R2 |
| **Socket.IO** | WebSocket server — transfer rooms, subnet discovery, real-time events |
| **MongoDB + Mongoose** | Transfer metadata, time-series analytics, TTL indexing |
| **Cloudflare R2** | File storage — S3-compatible, zero egress fees |
| **Upstash Redis** | Distributed rate limiting across server instances |
| **Sentry** | Error tracking and performance monitoring |

### Infrastructure
| | |
|---|---|
| **Frontend** | Vercel (edge-cached static assets, global CDN, pre-rendered SEO routes) |
| **Backend** | Render / Railway (containerised Node.js, keep-alive monitoring) |
| **Database** | MongoDB Atlas (auto-managed replica sets) |
| **Storage** | Cloudflare R2 (zero egress cost, S3-compatible API) |

<br/>

---

## A few things that weren't obvious to build

**Upload progress that's actually real** — most apps fake this with a timer or use `axios` which gives you total-bytes, not transmitted-bytes. SwiftShare hooks into raw `xhr.upload` progress events and smooths them through an exponential moving average before handing them to `requestAnimationFrame`, so the bar moves at exactly the speed your bytes are moving — even on a flaky connection.

**Dual-stack Hotspot & Wi-Fi Discovery** — local device discovery traditionally fails on mobile hotspots because mobile carriers allocate IPv6 addresses to tethered devices. SwiftShare extracts the `/64` IPv6 prefix (and `/24` IPv4 octets) to reliably pair devices connected over phone hotspots and local networks.

**Burn-after-download without race conditions** — if two people open the download link simultaneously, naive implementations let both through. SwiftShare uses MongoDB's `findOneAndUpdate` with an atomic claim filter — exactly one request wins, the other gets a 410 immediately.

**PWA that doesn't break uploads** — service workers intercept all fetch requests by default, including multipart file uploads to the backend. Large requests intercepted by a service worker can fail silently or hit memory limits. The SwiftShare service worker explicitly bypasses any non-GET request, so uploads always go straight to the network with no interception.

**Security without accounts** — extending or deleting a transfer requires a UUID `ownershipToken` that's only returned in the upload HTTP response and cached in the sender's browser. It's never in the public metadata API. The backend validates it with `crypto.timingSafeEqual` before executing any destructive action.

<br/>

---

## Running locally

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas URI)
- Cloudflare R2 bucket + API keys

### Frontend

```bash
git clone https://github.com/Superduash/SwiftShare.git
cd SwiftShare
npm install
```

```env
# .env.local
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_SHARE_BASE_URL=http://localhost:5173
```

```bash
npm run dev   # starts at http://localhost:5173
```

### Backend

```bash
git clone https://github.com/Superduash/SwiftShare-Backend.git
cd SwiftShare-Backend
npm install
```

```env
# .env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/swiftshare
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=swiftshare
R2_PUBLIC_URL=https://your-bucket.r2.dev
FRONTEND_URL=http://localhost:5173
```

```bash
npm start     # starts at http://localhost:3001
```

<br/>

---

## Roadmap

- [ ] **P2P mode** — WebRTC data channels for direct peer-to-peer transfers that skip the server entirely
- [ ] **Folder uploads** — preserve directory structure, deliver as nested ZIP
- [ ] **Native desktop build** — Tauri wrapper for drag-and-drop from the OS file manager
- [ ] **Recipient notifications** — optional webhook/email ping when someone downloads your transfer
- [ ] **Self-hosting guide** — Docker Compose stack with Nginx, MinIO, and MongoDB

<br/>

---

## Contributing

Issues and PRs are welcome. If you're fixing a bug, open an issue first so we can agree on the approach — especially for anything touching the upload pipeline or burn logic, where subtle ordering matters.

```bash
# Fork → clone → branch
git checkout -b fix/your-fix-name

# Make changes, then
npm run build   # must pass
npm test        # must pass

# Open a PR against main
```

<br/>

---

<p align="center">
  <sub>MIT Licensed — free to use, modify, and deploy.</sub><br/>
  <sub>If SwiftShare saved you five minutes, consider starring the repo.</sub>
</p>

<p align="center">
  Built with ❤️ by <a href="https://github.com/Superduash"><b>Superduash</b></a>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=120&section=footer&color=0:06b6d4,50:4c1d95,100:0f172a"/>
</p>
