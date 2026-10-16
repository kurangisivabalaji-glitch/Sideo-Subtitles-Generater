# Scalable Universal AI Video Subtitle Generator — Capacity Planning & Cloud Sizing Guide

This guide provides technical specifications, compute calculations, memory sizing models, and cloud infrastructure costs for operating the **Universal AI Video Subtitle Generator Platform** across development, growth, and enterprise multi-user tiers.

---

## 1. Architectural System Overview

The platform is designed around an asynchronous, non-blocking, multi-tenant cloud architecture:

```
[ Client Browsers / Apps ] (WebSockets + REST + SSE)
           │
           ▼
[ Nginx Reverse Proxy & TLS Terminator ]
    ├── Static React Vite SPA Assets
    ├── Byte-Range Video Streaming (/media/)
    └── API Proxying (/api/ & /api/ws/)
           │
           ▼
[ FastAPI Application Layer ] (Uvicorn / Async)
    ├── JWT Authentication & Tier Validation
    ├── Multi-Tenant Row-Level Isolation (PostgreSQL 15)
    ├── SlowAPI Rate Limiting (Redis 7)
    └── Bounded Concurrency Task Queue
           │
           ▼
[ Whisper Inference & FFmpeg Workers ]
    ├── FFmpeg 16kHz Mono Audio Extraction
    ├── faster-whisper CTranslate2 Engine (int8 / float16)
    └── Hardware-Accelerated Hard-sub Burn-in
           │
           ▼
[ Multi-Tier Storage Backend ]
    ├── Local Private Storage (Dev / Edge)
    └── AWS S3 / MinIO Object Storage (Presigned Expiring URLs)
```

---

## 2. Speech Engine Resource Math & Model Footprint

The platform utilizes **faster-whisper** powered by **CTranslate2**, which provides 4x speedups and 50% lower RAM footprint compared to vanilla PyTorch Whisper through 8-bit integer quantization (`int8`).

### Model Sizing & Memory Footprint

| Model | Disk Footprint | RAM Footprint (CPU `int8`) | VRAM Footprint (GPU `float16`) | Relative Speed (RTF) | Accuracy Index |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tiny** | 75 MB | ~380 MB | ~1.0 GB | 0.08x (Ultra-fast) | Good for clean speech |
| **Base (Default)** | 145 MB | ~650 MB | ~1.5 GB | 0.15x (Fast & Balanced) | 94% Multilingual |
| **Small** | 460 MB | ~1.4 GB | ~2.5 GB | 0.35x (Moderate) | 97% Multilingual |
| **Medium** | 1.5 GB | ~3.2 GB | ~5.0 GB | 0.70x (Slower) | 98.5% Complex Audio |
| **Large-v3** | 3.1 GB | ~5.8 GB | ~8.0 GB | 1.20x (Heavy) | 99.4% State-of-the-art |

> **Real-Time Factor (RTF) Definition:**  
> An RTF of `0.15` means a 60-second video is transcribed in **9 seconds** ($60 \times 0.15 = 9$).

---

## 3. Worker Concurrency & Capacity Sizing for 100+ Users

While hundreds of users can browse, edit subtitles, and stream video concurrently, speech transcription is compute-intensive. If 100 users hit the transcription endpoint at the exact same millisecond, executing 100 Whisper models in parallel would crash the server with an Out-Of-Memory (OOM) error.

The platform solves this with a **bounded worker concurrency queue** (`MAX_CONCURRENT_JOBS`):

$$\text{Peak Memory Required} = \text{OS Baseline} + \text{PostgreSQL/Redis} + (\text{Active Workers} \times \text{Peak RAM per Worker})$$

$$\text{Peak RAM per Worker} = \text{Model Memory} + \text{Audio Buffer (16kHz 16-bit)} + \text{FFmpeg Extraction Buffer} \approx 1.2\text{ GB (Base Model)}$$

### Recommended Tier Sizing

#### Tier 1: Small Community / SMB (100–300 Registered Users, 3 Concurrent Workers)
- **Concurrent Transcriptions:** 3 active jobs, remaining queued with real-time SSE/WebSocket status.
- **Compute:** 4 vCPUs (x86_64 or ARM64 AMD EPYC / Graviton)
- **RAM:** 8 GB
- **Storage:** 100 GB NVMe (Local or MinIO)
- **Estimated Cloud Cost:**
  - Hetzner Cloud CPX31: **~$16 / month**
  - DigitalOcean Droplet (4 vCPU / 8GB): **~$48 / month**
  - AWS EC2 `t4g.xlarge` (4 vCPU / 16GB): **~$45 / month**

#### Tier 2: Mid-Market SaaS (1,000–5,000 Registered Users, 8 Concurrent Workers)
- **Concurrent Transcriptions:** 8 active jobs, sub-second queue turn-around.
- **Compute:** 8 vCPUs / 1x NVIDIA T4 or L4 GPU (optional for ultra-speed)
- **RAM:** 32 GB
- **Storage:** S3 / MinIO with automated 7-day retention lifecycle
- **Estimated Cloud Cost:**
  - Hetzner Dedicated AX52 (AMD Ryzen 7 7700, 64GB DDR5): **~$65 / month**
  - AWS EC2 `g4dn.xlarge` (4 vCPU / 16GB / 1x T4 GPU): **~$180 / month** (Spot: **~$60 / month**)

#### Tier 3: Enterprise Cloud Cluster (50,000+ Users)
- **Architecture:** Kubernetes (EKS/GKE) with horizontal worker pod autoscaling (KEDA) based on Redis queue depth.
- **Transcribe Engine:** Dedicated GPU worker pods (NVIDIA A10G / L4) running TensorRT-LLM / faster-whisper.
- **Storage:** AWS S3 Private Bucket + CloudFront CDN for burned video deliveries.

---

## 4. Multi-Tenant Storage & Data Lifecycle Policy

### Storage Usage Calculations
- **Uploaded Source Video (Average 5 min 1080p):** ~75 MB
- **Extracted 16kHz Mono WAV:** ~9.6 MB *(Automatically unlinked immediately after transcription!)*
- **Generated Subtitles (SRT + VTT + JSON):** ~15 KB
- **Burned MP4 Output:** ~70 MB

### Automated Storage Lifecycle
1. **Immediate Purge:** Temporary extraction WAV audio files are automatically deleted upon job completion or failure in `job_queue.py`.
2. **24-Hour Presigned URLs:** `GeneratedFile` download tokens and S3 presigned URLs expire automatically after 24 hours.
3. **S3 Bucket Lifecycle Rule:**
```json
{
  "Rules": [
    {
      "ID": "PurgeOldBurnedVideos",
      "Status": "Enabled",
      "Filter": { "Prefix": "burned/" },
      "Expiration": { "Days": 7 }
    }
  ]
}
```

---

## 5. Security & Isolation Verification

- **Row-Level Tenant Isolation:** Every database read, update, or deletion query enforces `WHERE user_id = current_user.id` unless the requester possesses the `admin` role.
- **Cryptographic JWT:** Signed with HS256 / RS256, 1440-minute expiration with secure refresh rotation.
- **Zero Raw Passwords:** Passwords hashed using standard `bcrypt` with work factor 12.
- **Rate-Limiting Shields:** SlowAPI prevents brute-force login guessing and denial-of-service upload flooding.
