# Validasi Lint, Production Build, dan Browser Route — PORPROV Sulsel 2026 Futsal

## Tujuan
Menyelesaikan fase validasi teknis yang belum sempat dijalankan: lint, production build, dan verifikasi rute di browser. Tetap mempertahankan arsitektur, domain, repository, mutation hook, dan komponen yang sudah ada. Tidak menulis ulang modul fungsional admin atau Match Center.

## Langkah-langkah

### 1. Lint (ESLint)
- Jalankan `bun run lint` (atau `bunx eslint .`).
- Kategorikan error/warning:
  - Error yang memblokir build → perbaiki.
  - Warning yang relevan (unused vars, a11y, hooks deps) → perbaiki jika tidak mengganggu fungsionalitas.
  - Warning yang berasal dari konvensi proyek → dokumentasikan.
- Fokus pada file baru: `src/routes/admin.*.tsx`, `src/routes/match.$matchId.control.tsx`, `src/components/admin/AdminPage.tsx`, `src/components/match/MatchEventDialog.tsx`.

### 2. Production Build
- Jalankan `bun run build`.
- Perbaiki error build (SSR, routing, type, module resolution, exactOptionalPropertyTypes, worker-incompatible imports).
- Pastikan `src/routeTree.gen.ts` tidak diedit manual — biarkan plugin TanStack Router meregenerasi dari `src/routes/`.
- Verifikasi artifact `dist/` terhasilkan tanpa error fatal.

### 3. Browser Route Verification
- Gunakan Playwright untuk mengakses rute-rute kunci:
  - Public: `/`, `/putra`, `/putri`, `/jadwal`, `/hasil`, `/klasemen`, `/tim`, `/pemain`, `/top-skor`, `/venue`, `/live`, `/pertandingan/$matchId`.
  - Admin: `/admin`, `/admin/schedule`, `/admin/matches`, `/admin/contingents`, `/admin/teams`, `/admin/players`, `/admin/officials`, `/admin/venues`, `/admin/groups`, `/admin/match-officials`, `/admin/reports`, `/admin/statistics`, `/admin/users`, `/admin/roles`, `/admin/permissions`, `/admin/audit-logs`, `/admin/tournaments`, `/admin/competitions`.
  - Match Center: `/match/$matchId/control` dengan `matchId` dari fixture.
- Periksa: tidak ada blank page, error 500, route mismatch, atau crash runtime.
- Screenshot halaman kunci sebagai bukti visual.

### 4. Ringkasan dan Laporan
- Catat hasil typecheck, lint, build, dan browser verification.
- Daftar file yang dimodifikasi (jika ada perbaikan).
- Sebutkan error yang masih tersisa dan langkah selanjutnya.

## Hasil yang Diharapkan
- `bunx tsgo --noEmit`: lolos (sudah terkonfirmasi).
- `bun run lint`: lolos atau hanya tersisa warning yang dapat diterima.
- `bun run build`: lolos dan menghasilkan artifact.
- Browser: semua rute publik, admin, dan Match Center dapat diakses tanpa crash.
