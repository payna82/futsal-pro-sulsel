# PORPROV Sulsel 2026 — Sistem Manajemen Pertandingan Futsal

Membangun fondasi aplikasi: arsitektur rute, design system olahraga, model domain bertipe, dan UI lengkap untuk modul utama (publik, admin, match center). Bahasa UI: Indonesia. Identifier kode: Inggris.

## Fase 1 (yang dibangun sekarang)

### Design system
- Palet resmi kompetisi: merah-maroon PORPROV + emas aksen, netral gelap untuk match center, kontras tinggi.
- Token warna oklch di `src/styles.css` (semantic: primary, accent, live, scheduled, warning, success, surface). Tidak ada warna hardcoded di komponen.
- Tipografi: display kondensasi untuk angka skor besar, sans netral untuk isi.
- Status badge terpadu untuk 10 state pertandingan.

### Arsitektur
```text
src/
  domain/        tipe entitas + enum state machine + guard transisi
  data/          repository interface + adapter mock (sementara)
  hooks/         hook query (siap ditukar ke Supabase)
  components/
    layout/      shell publik, shell admin, sidebar, topbar, bottom nav mobile
    match/       scoreboard, jam pertandingan, timeline, panel event
    ui/          shadcn
  routes/        rute publik, /admin/*, /match/$matchId
```
- Aturan: komponen visual tidak memuat aturan bisnis. Transisi status, validasi event, agregasi klasemen semua di `src/domain`.
- Data mock hanya di layer `data/` sebagai satu adapter yang bisa diganti; komponen tidak pernah mengimpor mock langsung.

### Rute publik
`/` beranda turnamen, `/putra`, `/putri`, `/jadwal`, `/hasil`, `/klasemen`, `/tim`, `/tim/$teamId`, `/pemain`, `/top-skor`, `/pertandingan/$matchId`, `/venue`, `/live` (papan skor langsung).

### Rute admin
`/admin` dashboard operasional (pertandingan hari ini, live, selesai, mendatang, tim, pemain, venue aktif, konfirmasi tertunda), lalu `/admin/tournaments`, `/competitions`, `/contingents`, `/teams`, `/players`, `/officials`, `/venues`, `/groups`, `/schedule`, `/matches`, `/match-officials`, `/reports`, `/statistics`, `/users`, `/roles`, `/permissions`, `/audit-logs`.
Modul CRUD dibangun dengan pola tabel + filter + drawer form yang dapat digunakan ulang.

### Match Center — `/match/$matchId/control`
- Papan skor dominan (angka skor sangat besar), periode, jam pertandingan, status.
- Kontrol: mulai/jeda jam, transisi periode, input GOAL / CARD / FOUL / SUBSTITUTION / TIMEOUT, koreksi.
- Panel lineup starting + cadangan, akumulasi foul per tim per babak, perangkat pertandingan, timeline event kronologis.
- Layout tablet-first: tombol besar, target sentuh ≥44px, kolom tunggal di ponsel.

### State machine
`SCHEDULED → CHECK_IN → LINEUP → READY → LIVE ⇄ HALFTIME → FULL_TIME → CONFIRMED → PUBLISHED`, ditegakkan lewat fungsi `canTransition()`; UI hanya menampilkan aksi yang legal.

### Autentikasi & peran
Layar masuk + 11 peran didefinisikan sebagai matriks izin di domain, dipakai untuk menyembunyikan navigasi/aksi. Otorisasi sebenarnya menyusul di backend (RLS), UI tidak dianggap otoritatif.

## Yang belum dikerjakan di fase ini
Backend Lovable Cloud (skema PostgreSQL, RLS, auth nyata, event immutable, realtime scoreboard) dilakukan pada langkah berikutnya setelah arsitektur UI disetujui, agar tabel dipetakan langsung dari tipe domain yang sudah ada.

## Catatan teknis
- TanStack Start + TanStack Router file-based, TanStack Query untuk semua pembacaan data.
- Setiap rute punya `head()` sendiri (title, description, og) berbahasa Indonesia.
- Skor dan event tidak pernah dianggap benar dari klien; struktur event sudah menyertakan `operator`, `metadata`, `created_at` untuk audit.
