<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=240&color=0:0f172a,50:7c3aed,100:06b6d4&text=SwiftShare&fontSize=62&fontColor=ffffff&animation=fadeIn&fontAlignY=40&desc=Share%20Files%20Instantly%20Across%20Any%20Device&descAlignY=63&descColor=e2e8f0&descSize=18"/>
</p>

<p align="center">
  <a href="https://swiftsharegg.vercel.app"><img src="https://img.shields.io/badge/Live_Demo-swiftsharegg.vercel.app-7c3aed?style=for-the-badge"/></a>
  <a href="https://github.com/Superduash/SwiftShare-Backend"><img src="https://img.shields.io/badge/Backend_Repo-SwiftShare--Backend-111827?style=for-the-badge"/></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/Socket.IO-black?style=flat-square&logo=socketdotio"/>
  <img src="https://img.shields.io/badge/PWA-7C3AED?style=flat-square"/>
  <img src="https://img.shields.io/badge/MIT_License-success?style=flat-square"/>
</p>

<p align="center">No accounts. No installs. Send files instantly like a message. Works on any device, anywhere.</p>
  
---

## Preview

<p align="center">
  <img src="./docs/banner.png" alt="SwiftShare Banner" width="100%"/>
</p>

<p align="center">
  <sub>
    Share files instantly using transfer codes, links, or QR codes.
    Installable on desktop and mobile as a Progressive Web App.
  </sub>
</p>

> Try it yourself → <strong><a href="https://swiftsharegg.vercel.app">swiftsharegg.vercel.app</a></strong>

---

## Contents

- [Why](#why)
- [Features](#features)
- [Under the hood](#under-the-hood)
- [How a transfer works](#how-a-transfer-works)
- [Tech stack](#tech-stack)
- [Running locally](#running-locally)
- [Roadmap](#roadmap)

---

## Why

Most "send a file" tools want you to sign up, install something, or trust that your file isn't sitting on a server indefinitely. SwiftShare skips all of that: pick a file, get a 6-character code or QR, hand it to whoever needs it, and the file is gone once it expires or — in burn mode — the moment it's downloaded once.

Built for the boring-but-real use case: getting a screenshot or a PDF from your phone to your laptop without emailing it to yourself.

## Features

**Sharing**
- Transfer codes, QR codes, and shareable links — pick whichever fits the moment
- Multi-file uploads with drag & drop, ZIP download on the receiving end

**Privacy**
- Optional password-protected transfers
- Burn-after-download — the file is invalidated the moment it's claimed
- Everything expires automatically; nothing sits around "just in case"

**Live feedback**
- Upload progress, transfer status, and download notifications pushed over WebSockets in real time — no polling, no refreshing

**Previews**
- Images, video, audio, PDFs, and source/text files render in-browser before anyone downloads anything

**Everywhere**
- Installable PWA, works on desktop and mobile without a native app

## Under the hood

A few things that took more than "just call the API":

- **Progress that's actually accurate** — upload progress is driven off raw XHR byte events (not a fake timer), throttled through `requestAnimationFrame` so the UI never drops frames on slower phones.
- **Network-aware retries** — failed uploads back off and retry automatically, and the client distinguishes a genuinely dead connection from a slow one using the browser's Network Information API rather than guessing off a single timeout.
- **Stream-safe multi-file uploads** — files are validated (type, size, extension) client-side before they ever leave the device, so you get an error instantly instead of a failed request three seconds in.
- **PWA without breaking uploads** — the service worker caches the app shell for offline-install, but explicitly bypasses anything that isn't a `GET`, so large file uploads always go straight to the network instead of getting intercepted.

## How a transfer works

```text
Select files  →  Validate client-side  →  Stream to backend
                                                 │
                                                 ▼
                                     Transfer code + QR generated
                                                 │
                                                 ▼
                                Share code / QR / link with recipient
                                                 │
                                                 ▼
                              Recipient downloads (or transfer self-destructs)
                                                 │
                                                 ▼
                                  Expired / burned transfers are purged
```

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 18, Tailwind CSS |
| Build | Vite |
| Motion | Framer Motion |
| Routing | React Router |
| Data / state | React Query, Context API |
| Real-time | Socket.IO client |
| Hosting | Vercel |

## Running locally

```bash
git clone https://github.com/Superduash/SwiftShare.git
cd SwiftShare
npm install
npm run dev
```

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

You'll need the [backend](https://github.com/Superduash/SwiftShare-Backend) running locally too, or pointed at a deployed instance.

## Roadmap

- [ ] Peer-to-peer transfer mode (skip the server entirely for same-network devices)
- [ ] Folder uploads
- [ ] Native desktop build
- [ ] Self-hosting guide

---

<p align="center">
  MIT Licensed  ·  Free to use, modify, and distribute. 
</p>

<div align="center">

⭐ If you found SwiftShare useful, consider starring the repository.

Built with ❤️ by Superduash

</div>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=110&section=footer&color=0:06b6d4,50:7c3aed,100:0f172a"/>
</p>
