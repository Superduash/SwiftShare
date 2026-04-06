# SwiftShare – Frontend ⚡📦🚀

**Zero-Login | Ultra-Fast | Cross-Platform File Transfer**

SwiftShare is a browser-based temporary file sharing platform that allows users to send files instantly using a **6-digit code or QR scan** — no login, no app install, no waiting. Files are automatically deleted after download or expiry.

---

## 🚀 Features

### Core Transfer

* Drag & drop file and folder upload
* Auto ZIP for folders
* Instant 6-digit session code
* QR code sharing
* Shareable link
* Real-time upload & download progress
* File preview (images, PDF, video thumbnail)
* Download single file or all as ZIP
* File size + file type icons
* Mobile responsive design

### 🔒 Security & Session

* Auto delete after download
* Auto delete after 10 minutes
* Countdown timer
* One-time download option
* Encrypted temporary session storage
* Zero permanent file storage

### 🤖 AI Features

* AI summary for PDF, DOCX, TXT
* AI-generated filename suggestions
* AI file category tags
* AI image description
* Summary shown before download

### 📡 Nearby Transfer

* Detect devices on same WiFi
* One-tap send to nearby device
* No code needed for nearby transfer

### 🎨 UI / UX

* Dark mode (default)
* Glassmorphism UI
* Animated drag & drop zone
* Big 6-digit code display
* QR code large and scannable
* Confetti on successful transfer
* Toast notifications
* Loading skeletons
* Smooth transitions
* Transfer speed indicator

---

## 🖥️ Frontend Tech Stack

* **React (Vite)**
* **Tailwind CSS**
* **Socket.io Client**
* **Axios**
* **QR Code Generator**
* **Framer Motion**

> According to the project abstract, SwiftShare uses React + Tailwind on the frontend and communicates with a Node.js + Socket.io backend for real-time transfer updates. 

---

## 📄 Pages / Routes

| Page              | Description               |
| ----------------- | ------------------------- |
| `/`               | Upload / Home page        |
| `/send`           | Sender dashboard          |
| `/get`            | Enter code / Receive file |
| `/download/:code` | Download page             |
| `/expired`        | Expired transfer page     |
| `/about`          | Project & architecture    |

---

## 🔌 API Endpoints Used (Backend)

| Method | Endpoint          | Purpose           |
| ------ | ----------------- | ----------------- |
| POST   | `/upload`         | Upload file       |
| GET    | `/file/:code`     | Get file metadata |
| GET    | `/download/:code` | Download file     |
| GET    | `/nearby`         | Nearby devices    |
| WS     | Socket.io         | Progress + timer  |

---

## 🧠 How It Works

1. User uploads file
2. Server generates **6-digit code + QR**
3. File stored temporarily
4. Receiver enters code or scans QR
5. File downloaded
6. File auto-deletes

---

## 🏗️ Run Frontend Locally

```bash
git clone https://github.com/yourusername/swiftshare-frontend
cd swiftshare-frontend
npm install
npm run dev
```

---

## 🌍 Deployment

* Frontend: **Vercel**
* Backend: **Render**
* AI: **Gemini API**

---

## 🆚 Competitive Advantage

| Feature        | SwiftShare |
| -------------- | ---------- |
| No login       | ✅          |
| No app install | ✅          |
| QR + Code      | ✅          |
| Auto delete    | ✅          |
| Cross platform | ✅          |
| AI Summary     | ✅          |

---

## 📌 Tagline

**Simple, yet too effective.**

---

