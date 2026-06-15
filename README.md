# SwiftShare

### ⚡ Share files in seconds. No accounts. No friction.

SwiftShare is a modern temporary file sharing platform that lets you transfer files, text snippets, and media between devices using a simple 6-character code or QR scan.

Designed as a browser-native alternative to traditional file sharing tools, SwiftShare focuses on speed, simplicity, and privacy. Upload files, share the code, and download from any device — no sign-ups, no installations, and no unnecessary complexity.

---

## ✨ Why SwiftShare?

Most file sharing platforms suffer from at least one of these problems:

* Account creation before sharing
* Slow or cluttered user experience
* Files stored indefinitely
* Poor mobile experience
* No real-time feedback
* Limited security controls

SwiftShare was built to solve all of them.

---

## 🚀 Core Features

### 📂 Temporary File Transfers

Share files instantly through:

* Drag & drop uploads
* File picker selection
* Clipboard image pasting
* Multi-file transfers

Every upload generates:

* A unique 6-character transfer code
* A shareable link
* A QR code for mobile devices

---

### 🔒 Secure Sharing

Protect transfers with:

* Optional password protection
* Burn-after-download mode
* Automatic expiry
* Secure transfer validation
* Download ownership tracking

Files disappear automatically after expiry or successful burn-mode downloads.

---

### ⚡ Real-Time Experience

Powered by WebSockets for live updates:

* Upload progress
* Download notifications
* Transfer activity
* Live transfer status
* Device discovery updates

No refreshes required.

---

### 📱 QR Join & Cross-Device Sharing

Move files seamlessly between:

* Windows
* Linux
* macOS
* Android
* iPhone
* Tablets

Simply scan the QR code or enter the transfer code.

---

### 🌐 Nearby Device Discovery

SwiftShare can automatically detect active transfers from devices connected to the same local network.

Perfect for:

* College labs
* Classrooms
* Offices
* Shared Wi-Fi environments

---

### 📝 Text Sharing

Share:

* Notes
* Logs
* Source code
* URLs
* Commands

without creating files first.

---

### 👀 File Preview Support

Preview before downloading:

* Images
* Videos
* Audio
* PDFs
* Documents
* Text files
* Source code

---

### 🎨 Beautiful Interface

Built with a modern UI featuring:

* Multiple themes
* Responsive layouts
* Smooth animations
* Mobile-first design
* PWA support

---

## 🏗 Architecture

SwiftShare uses a decoupled full-stack architecture.

```text
Frontend
React • Vite • Tailwind CSS • Socket.IO

        ↓

Backend
Node.js • Express • MongoDB • Cloudflare R2

        ↓

Infrastructure
Render • Vercel • Redis • WebSockets
```

---

## 🛠 Tech Stack

### Frontend

* React 18
* Vite 8
* Tailwind CSS
* Framer Motion
* React Query
* Socket.IO Client

### Backend

* Node.js 22
* Express 5
* MongoDB
* Cloudflare R2
* Socket.IO
* Redis

---

## 📦 Repository Structure

```text
SwiftShare/
│
├── Frontend (This Repository)
│
└── Backend Repository
```

### Backend Repository

👉 https://github.com/Superduash/SwiftShare-Backend

The backend contains:

* API routes
* File storage logic
* Transfer lifecycle management
* Real-time infrastructure
* Security systems
* Cleanup services

---

## 🚀 Running Locally

```bash
git clone https://github.com/Superduash/SwiftShare.git

npm install

npm run dev
```

---

## 🎯 Project Goals

SwiftShare aims to become the fastest way to move files between devices without requiring:

* Accounts
* Apps
* Cloud drives
* Permanent storage

Just upload, share, download, and move on.

---

## 🌟 Highlights

* Temporary transfers
* QR-based sharing
* Real-time updates
* Nearby discovery
* Burn-after-download
* Password protection
* Multi-file support
* Text sharing
* Mobile friendly
* Open source

---

## 🔗 Related Repository

**SwiftShare Backend**

https://github.com/Superduash/SwiftShare-Backend

---

## 📜 License

MIT License

Free to use, modify, and distribute.

---

<div align="center">

Built with ❤️ by **Ashwin A (Superduash)**

**Simple, yet too effective.**

</div>
