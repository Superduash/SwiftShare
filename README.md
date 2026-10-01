<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=280&color=0:0f172a,40:1e1040,70:4c1d95,100:06b6d4&text=SwiftShare&fontSize=72&fontColor=ffffff&animation=fadeIn&fontAlignY=42&desc=Share%20Files%20Between%20Devices.%20No%20Account.%20No%20Install.&descAlignY=62&descColor=c4b5fd&descSize=20&stroke=7c3aed&strokeWidth=2"/>
</p>

<p align="center">
  <a href="https://swiftsharegg.vercel.app">
    <img src="https://img.shields.io/badge/%F0%9F%9A%80%20Try%20SwiftShare-swiftsharegg.vercel.app-7c3aed?style=for-the-badge&labelColor=0f172a"/>
  </a>
  &nbsp;
  <a href="https://github.com/Superduash/SwiftShare-Backend">
    <img src="https://img.shields.io/badge/%F0%9F%94%A7%20Backend%20Repo-SwiftShare--Backend-06b6d4?style=for-the-badge&labelColor=0f172a"/>
  </a>
</p>

<p align="center">
  <b>No account. No installation. Just share.</b><br/>
  Pick a file or paste text → get a 6-character code or QR → share it.<br/>
  Try it instantly in your browser.
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

---

<img width="830" height="574" alt="swiftshare" src="https://github.com/user-attachments/assets/ad2afa21-51eb-4191-b4a8-d69c160a0f33" /><br>

<p align="center">
  <a href="https://swiftsharegg.vercel.app"><b>🚀 Try it now — no signup required</b></a>
</p>

<br/>

---

## Why SwiftShare?

**No account.** Start sharing immediately. No email, no password, no profile.

**No installation.** Runs entirely in the browser. Install as a PWA for a native app feel — optional.

**Temporary by design.** Transfers expire automatically and can optionally self-destruct after a single download.

**Built for device-to-device sharing.** Use a short code, QR, shareable link, or automatic nearby-device discovery on the same Wi-Fi or mobile hotspot.

<br/>

---

## Features

### 📤 Share

| | |
|---|---|
| **6-character codes** | Short, unambiguous alphabet — easy to read over the phone or type on any device |
| **📷 Built-in QR scanner** | Scan transfer codes with your phone camera. Native `BarcodeDetector` with `jsQR` software fallback |
| **Shareable links** | Instant full URLs with click-to-copy and Web Share API support |
| **Multi-file uploads** | Up to 10 files / 100 MB total, streamed directly to storage — no buffering |
| **Text & snippet sharing** | Share notes, passwords, and code snippets with syntax highlighting |
| **In-browser previews** | Images, video, audio, PDF, and source code render before download |

### 📡 Nearby

| | |
|---|---|
| **Wi-Fi discovery** | Automatically finds active transfers on your local network — zero config |
| **Mobile hotspot** | Works over phone tethering via IPv6 `/64` subnet prefix matching |
| **Manual refresh** | Dual-fetch (WebSocket + REST) for instant on-demand network scan |
| **Real-time broadcast** | New transfers appear on nearby devices the moment they go live |

### 🛡️ Privacy

| | |
|---|---|
| **No account required** | Nothing to sign up for, no email collected |
| **Password protection** | bcrypt-hashed passwords with brute-force lockout |
| **Burn after download** | One recipient only. Atomic claim gate prevents double downloads |
| **Auto-expiry** | 10 min, 1 hour, or 5 hours. Automatic purge from storage and database |
| **Ownership controls** | Extend or cancel your transfer from the same browser without logging in |

### ⚡ Experience

| | |
|---|---|
| **Real upload progress** | Byte-level XHR events, smoothed with EMA and `requestAnimationFrame` |
| **Instant download alerts** | WebSocket notification the moment someone downloads your file |
| **Live expiry countdown** | Synchronized server-side timer with drift correction |
| **Network-aware retries** | Exponential backoff for mobile network drops and cold starts |
| **PWA support** | Install on iOS/Android, custom splash screen, offline shell |
| **12 paired themes** | Six dark + six light, 1-to-1 paired for seamless mode switching |

### 🎨 12-Theme Paired System

| Mode | Themes |
|---|---|
| **Dark** | Sunset · Dark · Midnight · Lavender · Forest · Volcanic |
| **Light** | Sunrise · Light · Sakura · Lilac · Mint · Ember |

Each dark theme has a corresponding light theme for a 1-to-1 mode switch.

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

## Security & privacy

- TLS-protected network communication
- bcrypt-hashed passwords with brute-force lockout
- UUID ownership tokens for sender-only transfer controls (validated with `crypto.timingSafeEqual`)
- Atomic burn-after-download claiming — exactly one request succeeds
- Automatic TTL expiry with scheduled storage purge
- No account, no email, no persistent identity

<br/>

---

## Engineering highlights

- **Real byte-level upload progress** — XHR progress events through an exponential moving average, not a timer.
- **Atomic burn-after-download** — MongoDB `findOneAndUpdate` with a single atomic claim gate; concurrent downloaders get a 410 immediately.
- **Zero-disk streaming** — Busboy pipes multipart data directly into Cloudflare R2; nothing touches disk or full memory.
- **PWA uploads bypass the service worker** — all non-GET requests are explicitly excluded from interception so large uploads never fail silently.
- **Dual-stack peer discovery** — IPv4 `/24` for local Wi-Fi, IPv6 `/64` prefix for mobile hotspot tethering.

<br/>

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 8, Tailwind CSS, Framer Motion |
| Backend | Node.js 22, Express 5, Busboy |
| Database | MongoDB Atlas + Mongoose |
| Storage | Cloudflare R2 |
| Real-time | Socket.IO |
| Rate limiting | Upstash Redis |
| Monitoring | Sentry |
| PWA | vite-plugin-pwa |

Deployed on **Vercel** (frontend) and **Render / Railway** (backend).

<br/>

---

## Run locally

### 1. Frontend

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
npm run dev   # http://localhost:5173
```

### 2. Backend

```bash
git clone https://github.com/Superduash/SwiftShare-Backend.git
cd SwiftShare-Backend
npm install
```

```env
# .env  — see Backend README for full list
PORT=3001
MONGODB_URI=mongodb://localhost:27017/swiftshare
FRONTEND_URL=http://localhost:5173
```

```bash
npm start     # http://localhost:3001
```

<br/>

---

## The problem it solves

You need to get a file from your phone to your laptop. Or share a PDF with someone who isn't on Slack. Or hand off a folder of screenshots to someone standing next to you.

The existing options make you create an account, install an app, or pay for storage — and they keep your files indefinitely.

**SwiftShare does none of that.** It's closer to "AirDrop for the web" — ephemeral, instant, peer-aware, and gone when you want it gone.

<br/>

---

## Releases

See the [Product Changelog](https://swiftsharegg.vercel.app/changelog) for the full release history and major changes.

<br/>

---

## Roadmap

- [ ] WebRTC peer-to-peer transfers
- [ ] Folder uploads with nested ZIP
- [ ] Native desktop app (Tauri)
- [ ] Optional recipient notifications
- [ ] Self-hosting stack (Docker + MinIO + MongoDB)

<br/>

---

## Contributing

Issues and PRs are welcome. If you're fixing a bug, open an issue first — especially for anything touching the upload pipeline or burn logic.

```bash
git checkout -b fix/your-fix-name
npm run build   # must pass
npm test        # must pass
# open a PR against main
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
