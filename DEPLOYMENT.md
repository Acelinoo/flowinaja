# PANDUAN DEPLOYMENT & OPERASIONAL PRODUKSI FLOWINAJA

Dokumen ini adalah referensi resmi tata cara perilisan, konfigurasi lingkungan, dan penerapan produksi (*deployment*) platform **Flowinaja**.

---

## 1. Persyaratan Lingkungan Produksi

- **Node.js**: v20.x LTS atau lebih baru
- **Basis Data**: PostgreSQL 14+ (didukung di AWS RDS, Supabase, Neon, Railway, atau server lokal)
- **Manajer Paket**: npm (mengikuti lockfile `package-lock.json`)
- **Domain**: Domain berprotokol HTTPS dengan sertifikat SSL/TLS valid

---

## 2. Variabel Lingkungan Wajib (*Required Environment Variables*)

| Variabel | Deskripsi | Contoh Produksi |
|---|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL pooling | `postgresql://user:pass@ep-pooler.neon.tech/flowinaja?pgbouncer=true` |
| `DIRECT_URL` | Koneksi langsung untuk migrasi Prisma | `postgresql://user:pass@ep-direct.neon.tech/flowinaja` |
| `NEXT_PUBLIC_APP_URL` | URL domain publik aplikasi | `https://flowinaja.perusahaan.co.id` |
| `AUTH_SECRET` | Kunci enkripsi JWT (min 32 byte) | String acak dari `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Wajib `true` untuk reverse proxy | `true` |
| `AUTH_GOOGLE_ID` | Client ID Google OAuth | `xxxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Client Secret Google OAuth | `GOCSPX-xxxx` |
| `AUTH_GITHUB_ID` | Client ID GitHub OAuth | `Iv1.xxxx` |
| `AUTH_GITHUB_SECRET` | Client Secret GitHub OAuth | `ghp_xxxx` |

---

## 3. Strategi Migrasi Basis Data Produksi

> **PERINGATAN KRITIS**:
> JANGAN PERNAH menjalankan `prisma migrate reset` atau `prisma db push --force-reset` di lingkungan produksi. Perintah tersebut akan menghapus seluruh data.

### Langkah Migrasi di Produksi:
```bash
# 1. Pastikan skema valid
npx prisma validate

# 2. Periksa status migrasi terhadap basis data produksi
npx prisma migrate status

# 3. Terapkan migrasi tertunda secara aman
npx prisma migrate deploy
```

### Inisialisasi Data Awal (*Seeding*):
Skrip seed Flowinaja bersifat **idempoten** (`upsert` di seluruh entitas) dan aman dijalankan pada inisialisasi awal:
```bash
npm run db:seed
```

---

## 4. Opsi Deployment

### A. Deployment ke Platform Vercel
1. Hubungkan repositori GitHub `Acelinoo/flowinaja`.
2. Pada **Project Settings > Environment Variables**, masukkan seluruh variabel dari tabel di atas.
3. Konfigurasi **Build Command**: `prisma generate && next build` (atau biarkan default karena `postinstall` telah memuat `prisma generate`).
4. Daftarkan Domain Produksi pada OAuth Console Google dan GitHub.

### B. Deployment Menggunakan Docker Container
Gunakan `Dockerfile` multi-stage yang telah disediakan:
```bash
# 1. Build Docker image
docker build -t flowinaja:latest .

# 2. Jalankan container
docker run -d \
  -p 3000:3000 \
  --name flowinaja-app \
  --env-file .env.production \
  flowinaja:latest
```

### C. Deployment Server Mandiri (Node.js / PM2 / NGINX)
```bash
# 1. Install dependensi
npm ci

# 2. Generate Prisma Client & Build
npx prisma generate
npm run build

# 3. Jalankan aplikasi menggunakan PM2
pm2 start npm --name "flowinaja" -- run start
```

---

## 5. Pemeriksaan Kesehatan Produksi (*Health Check Probe*)

Endpoint pemeriksaan kesehatan tersedia di:
- **URL**: `GET /api/health`
- **Tujuan**: Liveness & Readiness probe untuk load balancer (k8s, AWS ALB, NGINX, Railway).
- **Respons Normal**:
  ```json
  {
    "status": "healthy",
    "app": "Flowinaja",
    "version": "1.0.0",
    "environment": "production",
    "database": "connected",
    "timestamp": "2026-09-20T15:00:00.000Z"
  }
  ```
- **Respons Kegagalan (Status 503)**:
  Jika konektivitas basis data terputus, endpoint mengembalikan kode HTTP `503 Service Unavailable`.
