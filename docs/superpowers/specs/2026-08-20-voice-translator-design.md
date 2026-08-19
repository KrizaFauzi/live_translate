# Desain Arsitektur: Voice Translator MVP

## 1. Ringkasan Proyek
Aplikasi web penerjemah suara dua arah (Bahasa Indonesia ↔ Bahasa Inggris) yang berjalan secara lokal menggunakan model AI *Open-Source*. Aplikasi ini di-deploy sepenuhnya di dalam Docker dengan arsitektur yang memisahkan Frontend dan Backend.

## 2. Arsitektur & Teknologi (Tech Stack)
- **Frontend:** React.js (Vite) + TailwindCSS.
- **Backend:** Python + FastAPI.
- **Infrastruktur:** Docker & Docker Compose (2 Container).

## 3. Komponen AI
- **Mesin Speech-to-Text (STT):** `faster-whisper` (ringan dan sangat cepat).
- **Mesin Translator:** `MarianMT` (model *Helsinki-NLP* via HuggingFace) khusus untuk translasi ID-EN dan EN-ID.

## 4. Alur Data & User Experience (UX)
Sistem menggunakan pendekatan *2-Step REST API* agar teks asli bisa muncul lebih dulu sebelum terjemahannya, meniru *experience* aplikasi penerjemah profesional.

1. **Step 1: Transkripsi (Voice to Text)**
   - Pengguna merekam suara via browser.
   - Frontend mengirim *file audio* ke `POST /api/transcribe`.
   - Backend memproses audio dengan Faster-Whisper.
   - Backend mengembalikan *Teks Asli*.
   - Frontend langsung memunculkan teks di Panel Bahasa Awal.
2. **Step 2: Translasi (Text to Text)**
   - Frontend otomatis mengirim *Teks Asli* ke `POST /api/translate`.
   - Backend menerjemahkan dengan MarianMT.
   - Backend mengembalikan *Teks Terjemahan*.
   - Frontend memunculkan teks di Panel Terjemahan.

## 5. Strategi Docker
- **`docker-compose.yml`** akan mengelola dua *service*:
  - `frontend`: Berbasis Node.js, menjalankan server Vite.
  - `backend`: Berbasis Python, menginstal `ffmpeg` (syarat wajib untuk pemrosesan audio), mengunduh model AI, dan menjalankan server FastAPI. Model akan disimpan dalam *volume* agar tidak perlu diunduh ulang setiap kali *container* direstart.

## 6. Batasan MVP (Minimum Viable Product)
- Tidak menggunakan WebSockets (menggunakan REST API).
- Tidak ada fitur login/database (murni *stateless* untuk pemrosesan AI).
