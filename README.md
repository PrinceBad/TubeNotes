# TubeNotes PRO (Yt-2-Pdf) 🎥 ➔ 📄

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646cff?logo=vite)](https://vitejs.dev/)
[![jsPDF](https://img.shields.io/badge/jsPDF-Vector_Engine-ff3e00)](https://github.com/parallax/jsPDF)

> Transform YouTube Lectures, Tutorials, and Keynotes into **crisp, searchable, and professional PDF study guides**.

---

## ✨ Key Features

* **⚡ Native Vector PDF Engine**: Generates 100% searchable, copy-pasteable vector PDFs directly using `jsPDF`. Crystal-clear typography at any zoom level with ultra-compact file sizes (~70KB–150KB).
* **🎯 Dual Engine Options**:
  * **Native Vector PDF (Recommended)**: Ultra-fast (<200ms), crisp text, dynamic headers, footers, and page numbers.
  * **Visual Canvas Snapshot (Legacy)**: Renders exact browser DOM styling via `html2canvas`.
* **⏱️ Interactive Transcript Timeline**: Automatically fetches timecoded YouTube transcripts. Jump to any point in the video by clicking on a subtitle row.
* **📸 Video Slide Capture**: Capture slide frames directly into your notes cards and embed them into the generated PDF.
* **🎨 Multiple Design Themes**:
  * **Academic**: Clean editorial navy with serif accents for scholarly research notes.
  * **Digital Dark**: Modern slate aesthetic for technical guides.
  * **Minimalist**: Clean monochrome layout for executive briefs.
* **🛡️ Resilient Backend & Fallback**:
  * Robust subtitle extraction via `youtube-transcript` with automatic language fallback.
  * Manual transcript import with one-click auto-segmentation when captions are disabled.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, Vite, Lucide Icons, CSS3 Glassmorphism
* **Backend**: Node.js, Express, Axios, `youtube-transcript`
* **PDF Engines**: `jsPDF` (Vector Engine), `html2canvas` (Canvas Snapshot)

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org) (v18 or higher)
* npm or yarn

### Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/PrinceBad/Yt-2-Pdf.git
   cd Yt-2-Pdf
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server (concurrently runs frontend on port 5173 and backend on port 3001):
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## 📄 License
MIT License. Created by Prince Badsiwal.
