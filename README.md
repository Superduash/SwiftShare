<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=280&color=0:0f172a,40:1e1040,70:4c1d95,100:06b6d4&text=SwiftShare&fontSize=72&fontColor=ffffff&animation=fadeIn&fontAlignY=42&desc=File%20sharing%20that%20gets%20out%20of%20your%20way&descAlignY=62&descColor=c4b5fd&descSize=20&stroke=7c3aed&strokeWidth=2"/>
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
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=white"/>
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
  Pick a file → get a 6-character code → done.<br/>
  Your recipient has it in seconds, on any device, anywhere.
</p>

<br/>

---

## What it looks like

<img width="830" height="574" alt="swiftshare" src="https://github.com/user-attachments/assets/ad2afa21-51eb-4191-b4a8-d69c160a0f33" /><br>

> **Try it right now →** [swiftsharegg.vercel.app](https://swiftsharegg.vercel.app) — no sign-up, works instantly

<br/>

---

## The problem it solves

You need to get a file from your phone to your laptop. Or send a PDF to a client who isn't on Slack. Or hand off a folder of screenshots to someone standing next to you.

The existing options make you:
- Create an account
- Install an app
- Pay for storage
- Trust that your file isn't sitting on a server forever

**SwiftShare does none of that.** It's closer to "airdrop for the web" — ephemeral, instant, and gone when you want it gone.

<br/>

---

## Features

### 🔥 Core transfer experience

| | |
|---|---|
| **6-character codes** | Short enough to read over the phone, unique enough to never collide |
| **QR codes** | Generated instantly — point your camera and you're on the receive page |
| **Shareable links** | Full URL for anything with a browser — paste and go |
| **Multi-file uploads** | Drag and drop up to 10 files, delivered as a single ZIP on the other end |
| **In-browser previews** | Images, video, audio, PDFs, and source code render before anyone downloads |

### 🛡️ Privacy controls

| | |
|---|---|
| **Burn after download** | Files self-destruct the instant they're claimed. One recipient, no exceptions |
| **Password protection** | bcrypt-hashed, brute-force locked. Only people with the password get through |
| **Auto-expiry** | 10 minutes, 1 hour, or 5 hours. Nothing sits around indefinitely |
| **Ownership tokens** | Extend or delete your transfer from the same browser only — no login required |

### ⚡ Real-time everything

| | |
|---|---|
| **Live upload progress** | Driven from raw XHR byte events, throttled through `requestAnimationFrame` — no fake spinners |
| **Instant download alerts** | WebSocket push the moment someone downloads. No polling, no page refresh |
| **Live transfer stats** | Download count and view count update in the sender page as they happen |
| **Network-aware retries** | Distinguishes a dead connection from a slow one. Backs off and retries automatically |

### 🌐 Works everywhere

| | |
|---|---|
| **Installable PWA** | Add to home screen on iOS and Android. Full offline shell, native feel |
| **Responsive design** | The same experience on a 6-inch phone as a 4K monitor |
| **Ambient themes** | Sakura, Lavender, Midnight, Forest, Volcanic — particle effects, glassmorphism, dark/light |

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
    │  Recipient  │ ────────────────> │  Download   | <───────────────── │  (live stats,    │
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
| **Vite** | Build tooling — sub-second HMR, tree-shaking, PWA plugin |
| **Framer Motion** | Animations — spring physics, layout transitions, ambient particle effects |
| **Socket.IO client** | Real-time — upload progress, download notifications, live stats |
| **Tailwind CSS** | Utility-first styling with custom CSS variable theme system |
| **react-qr-code** | Client-side QR rendering — no server round-trip |

### Backend
| Technology | Role |
|---|---|
| **Node.js + Express** | HTTP server — streaming uploads, REST API |
| **Busboy** | Multipart parsing — zero temp-file writes, direct pipe to R2 |
| **Socket.IO** | WebSocket server — transfer rooms, real-time events |
| **MongoDB + Mongoose** | Transfer metadata, activity logs, expiry tracking |
| **Cloudflare R2** | File storage — S3-compatible, no egress fees |
| **Sentry** | Error tracking and performance monitoring |

### Infrastructure
| | |
|---|---|
| **Frontend** | Vercel (edge-cached static assets, global CDN) |
| **Backend** | Render (containerised Node.js, always-on with keep-alive pings) |
| **Database** | MongoDB Atlas M0 (free tier, auto-managed) |
| **Storage** | Cloudflare R2 (zero egress cost, S3-compatible API) |

<br/>

---

## A few things that weren't obvious to build

**Upload progress that's actually real** — most apps fake this with a timer or use `axios` which gives you total-bytes, not transmitted-bytes. SwiftShare hooks into raw `xhr.upload` progress events and smooths them through an exponential moving average before handing them to `requestAnimationFrame`, so the bar moves at exactly the speed your bytes are moving — even on a 2G connection.

**Burn-after-download without race conditions** — if two people open the download link simultaneously (which happens), naive implementations let both through. SwiftShare uses MongoDB's `findOneAndUpdate` with a `burnClaimed: false` filter as an atomic gate — exactly one request wins, the other gets a 410 immediately.

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

- [ ] **P2P mode** — WebRTC data channels for same-network transfers that skip the server entirely
- [ ] **Folder uploads** — preserve directory structure, deliver as nested ZIP
- [ ] **Native desktop build** — Tauri wrapper for drag-and-drop from the OS file manager
- [ ] **Recipient notifications** — optional webhook/email ping when someone downloads your transfer
- [ ] **Self-hosting guide** — Docker Compose stack with Nginx, Minio, and MongoDB

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
