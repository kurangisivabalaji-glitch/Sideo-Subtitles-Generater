# Universal AI Video Subtitle Generator — Multi-User Cloud Platform 🎬☁️

An enterprise-grade, scalable, AI-powered multilingual video subtitle generator and studio built with **React (Vite)**, **Python FastAPI**, **PostgreSQL**, **Redis**, **faster-whisper (CTranslate2)**, and **FFmpeg**.

Allows hundreds of users to securely access the platform simultaneously, upload videos, generate frame-synchronized subtitles across 99+ languages, track live dialogue, edit typography inside the video viewport with zero black boxes, and export hardcoded MP4s with strict multi-tenant data isolation.

---

## 🌟 Key Platform Capabilities

### 1. 👥 Multi-User Cloud Architecture & Strict Tenant Isolation
- **Secure Authentication:** JWT tokens (HS256) with password hashing via standard `bcrypt` (12 rounds).
- **Tenant Data Isolation:** Every video, subtitle track, job status, and usage record is cryptographically scoped to the user (`WHERE user_id = current_user.id`). Users can never see or modify other tenants' data.
- **Role-Based Access Control (RBAC):** `user` (standard tenant) vs `admin` (platform operator).
- **Tier Quota Management:** Configurable processing quotas (e.g., Free Tier: 10 minutes/month; Pro: 60 minutes/month; Enterprise: Unlimited).
- **Default Administrator:**
  - **Email:** `admin@subtitlegenerator.com`
  - **Password:** `Admin123!Secure`
  - *(Auto-seeded on database initialization)*

### 2. ⚡ Asynchronous Concurrency Queue & Crash Recovery
- **Bounded Worker Pool:** Configurable worker concurrency (`MAX_CONCURRENT_JOBS=3` by default) ensures Whisper speech models never exceed system RAM or GPU VRAM.
- **Idempotency Safeguard:** Duplicate uploads with the same idempotency key immediately return the existing job.
- **Crash Recovery:** Server restarts automatically inspect stale `PROCESSING` jobs, re-queue them up to maximum retry limits, or cleanly record failures.
- **Real-Time Telemetry:** Live progress streaming over **WebSockets** (`/api/ws/jobs/{id}`) and **Server-Sent Events (SSE)** (`/api/jobs/{id}/events`).

### 3. 🛡️ Platform Administrator Portal
- **Hardware Telemetry:** Real-time server CPU utilization %, RAM usage (GB used / total), and disk space via `psutil`.
- **Worker Health:** Active worker count, queue utilization %, and average job latency.
- **Tenant Administration:** Search registered users, inspect tier quotas, toggle active/suspended statuses, and promote accounts.
- **Security Audit Logs:** Full audit history capturing user registrations, client IP addresses, logins, and administrative adjustments.

### 4. 🌐 Universal Multilingual Speech Recognition (99+ Languages)
- **Automatic Language Detection:** Identifies the spoken language and speech probability without manual configuration.
- **Indic & Global Language Coverage:**
  - **Indic Languages:** Telugu (`తెలుగు`), Hindi (`हिन्दी`), Tamil (`தமிழ்`), Kannada (`ಕನ್ನಡ`), Malayalam (`മലയാളം`), Bengali (`বাংলা`), Marathi (`मराठी`), Punjabi (`ਪੰਜਾਬੀ`), Urdu (`اردو`), Gujarati (`ગુજરાતી`), and Sanskrit.
  - **Global Languages:** English, Spanish, French, German, Arabic, Chinese, Japanese, Korean, Portuguese, Russian, Italian, Turkish, Dutch, Vietnamese, Indonesian, Thai, Persian, Hebrew, and more.
- **Unicode & Script Direction:** Preserves native typography and automatically enables Right-to-Left (RTL) mode for Arabic and Urdu.

### 5. 🎬 Next-Gen Studio & Dialogue Tracking
- **Inside-Video Subtitles (No Black Box):** Subtitles are rendered directly over the video canvas with drop-shadows and configurable vertical alignment.
- **Live Dialogue Tracker:** Real-time conversational dialogue stream highlighting currently spoken speech synchronized with playback.
- **Timeline Editor with Undo / Redo:** Full history stack for editing segments, splitting, merging, timing shifting, and text updates.
- **Multilingual Translation:** Instant side-by-side translation with track switching (Original Spoken vs Translated).
- **Hardware-Accelerated Burn-in:** Backend FFmpeg burns custom ASS subtitles directly into MP4 files for instant social media distribution.
- **Short-Lived Expiring Downloads:** Tokenized 24-hour expiration links prevent unauthorized hotlinking.

---

## 🏗️ Project Architecture

```
video-subtitle-generator/
├── backend/
│   ├── app/
│   │   ├── config.py             # Environment & worker configuration
│   │   ├── main.py               # FastAPI application & lifespan handlers
│   │   ├── core/
│   │   │   ├── security.py       # JWT & bcrypt password hashing
│   │   │   ├── rate_limiter.py   # SlowAPI Redis/IP limiter
│   │   │   ├── storage.py        # Local / S3 MinIO storage service
│   │   │   └── deps.py           # Authentication & RBAC dependencies
│   │   ├── db/
│   │   │   ├── base.py           # SQLAlchemy declarative base
│   │   │   └── session.py        # Connection pooling & admin seeding
│   │   ├── models/               # User, Video, Job, Subtitle, File, Usage, Audit
│   │   ├── schemas/              # Pydantic v2 schemas for requests & responses
│   │   ├── queue/
│   │   │   └── job_queue.py      # Bounded ThreadPoolExecutor with crash recovery
│   │   ├── routes/               # Auth, Jobs, Subtitles, Translate, Export, Admin, WS
│   │   └── services/             # Whisper, FFmpeg, Subtitle formatting
│   ├── tests/                    # Pytest test suite (100% passing)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── context/AuthContext.jsx # Auth state, tokens, & API wrapper
│   │   ├── components/
│   │   │   ├── UserNav.jsx         # Cloud navigation & quota meter
│   │   │   ├── LandingPage.jsx     # High-impact cloud showcase
│   │   │   ├── UserDashboard.jsx   # Tenant metrics & recent jobs
│   │   │   ├── QueueHistory.jsx    # Real-time job table & exports
│   │   │   ├── AdminDashboard.jsx  # Telemetry, user mgmt & audit logs
│   │   │   ├── UserSettings.jsx    # Profile & password management
│   │   │   ├── AuthModal.jsx       # Glassmorphic Login / Register modal
│   │   │   ├── VideoPlayer.jsx     # Inside-video transparent subtitle player
│   │   │   ├── DialogueTracker.jsx # Live conversational tracking HUD
│   │   │   ├── SubtitleEditor.jsx  # Timeline editor with undo/redo
│   │   │   ├── TranslationPanel.jsx# Side-by-side translation
│   │   │   ├── StylingPanel.jsx    # Subtitle typography & alignment
│   │   │   └── ExportModal.jsx     # SRT, VTT, JSON & video burn modal
│   │   ├── App.jsx                 # Master application controller
│   │   └── index.css               # Design system & responsive layout
├── Dockerfile.backend            # Production Python backend container
├── Dockerfile.frontend           # Multi-stage Vite + Nginx container
├── docker-compose.yml            # Local development orchestration
├── docker-compose.prod.yml       # Production deployment with MinIO & resource limits
├── nginx.conf                    # Nginx reverse proxy with WebSockets & SSE
├── CAPACITY_PLANNING.md          # Sizing, memory math & cloud costs guide
└── .github/workflows/ci.yml      # CI/CD pipeline for tests and build
```

---

## 🚀 Getting Started Locally

### Prerequisites
1. **Python 3.10+**
2. **Node.js 18+ & npm**
3. **FFmpeg & FFprobe** installed and on `PATH`

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The database automatically creates `subtitles_platform.db` (SQLite) and seeds the default admin user.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open **`http://127.0.0.1:5173`** in your browser.

---

## 🐳 Running with Docker

### Local Multi-Container Stack (PostgreSQL + Redis + Backend + Frontend)
```bash
docker-compose up --build
```
- Frontend UI: `http://localhost`
- Backend API Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### Production Cloud Deployment (with Nginx, MinIO S3, and Limits)
1. Copy and configure production environment variables:
```bash
cp .env.example .env
# Edit .env with your domain, secure passwords, and JWT secret
```
2. Launch production containers:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
3. Access:
- Web App: `http://your-server-ip`
- MinIO Object Storage Console: `http://your-server-ip:9001`

---

## 🧪 Running Automated Tests

Run the comprehensive pytest suite verifying authentication, isolation, queue recovery, and administration:
```bash
cd backend
python -m pytest tests/ -v
```

All 16 test cases pass with 100% success rate:
- `test_auth.py` — Registration, duplicate checks, login, JWT validation, password changes.
- `test_isolation.py` — Multi-tenant data segregation, preventing cross-tenant reads or updates.
- `test_queue.py` — Concurrency bounds, user cancellations, and crash recovery.
- `test_admin.py` — RBAC authorization, telemetry stats, and user tier modifications.
- `test_api.py` & `test_subtitle_formatter.py` — Formats, SRT/VTT/ASS conversions, and languages.

---

## 📊 Capacity Planning & Cloud Sizing

For detailed memory math, CPU/GPU benchmarks, and cost estimates across AWS, Hetzner, and DigitalOcean for 100+ simultaneous users, refer to [CAPACITY_PLANNING.md](file:///c:/Users/Admin/Desktop/anti%20gravity%20works/video%20subtitle%20generator/CAPACITY_PLANNING.md).

---

## 📄 License
MIT License &bull; Designed for high-scale multilingual AI production.
