# Rencana Fase 2 dan Seterusnya — PORPROV Sulsel 2026 Futsal

Fase 1 (fondasi) sudah selesai: backend Lovable Cloud aktif, adapter Supabase menggantikan data memori, autentikasi email/password nyata, registrasi tim persisten, aktor query memakai sesi terautentikasi, dan logout membersihkan cache lalu kembali ke beranda.

Dokumen ini merinci fase berikutnya.

## Fase 2 — Operasi Pertandingan Otoritatif di Server

Tujuan: skor dan status pertandingan tidak lagi bisa dipercaya dari klien.

- Tambah server function (`createServerFn`, middleware auth) untuk:
  - `recordMatchEvent` — validasi ulang `validateMatchEvent()`, idempotensi `command_id`, cek `expected_version`.
  - `transitionMatchStatus` — validasi ulang `canTransition()`.
  - `updateMatchClock` — jam pertandingan hanya boleh maju dari server.
- Skor selalu diturunkan ulang dari event GOAL di sisi server, bukan dikirim klien.
- Adapter Supabase memanggil server function untuk ketiga operasi ini; pembacaan tetap langsung ke database.
- Setiap operasi menulis audit log dengan `actor_id` dari sesi server.

## Fase 3 — Realtime Papan Skor

- Langganan realtime pada tabel `matches` dan `match_events`.
- Hook bersama `useMatchRealtime(matchId)` yang meng-invalidate/patch cache TanStack Query.
- Dipakai di `/live`, `/pertandingan/$matchId`, dan Match Center; hapus polling.

## Fase 4 — Undian Grup, Generator Jadwal, dan Babak Gugur

- Undian grup: distribusi tim ke grup per kategori, dapat diulang sebelum jadwal terbit.
- Generator round-robin per grup dengan alokasi venue/lapangan/slot waktu.
- Deteksi bentrok: venue+lapangan+waktu, tim bermain ganda, jeda minimum antar pertandingan.
- Bracket: pembangkitan semifinal/perebutan juara 3/final dari klasemen grup, progresi pemenang otomatis saat status `PUBLISHED`, halaman bagan publik.

## Fase 5 — Melengkapi CRUD Admin

Modul yang masih read-only mendapat create/update memakai pola tabel + drawer form yang sudah ada:

- Turnamen, kategori/kompetisi, kontingen, venue, grup.
- Pengguna dan penetapan peran (lewat tabel `user_roles`, bukan kolom di profil).
- Setiap mutasi disertai kebijakan RLS yang sesuai dan pencatatan audit.

## Fase 6 — Dokumen dan Laporan

- Storage Lovable Cloud untuk dokumen registrasi: upload nyata, unduh terbatas, kebijakan akses per tim/panitia.
- Ekspor CSV untuk klasemen, jadwal, hasil, top skor, dan daftar pemain.
- Laporan pertandingan resmi siap cetak yang dibangkitkan dari event immutable.

## Fase 7 — Pengerasan dan Verifikasi

- Selesaikan empat peringatan `SECURITY DEFINER` yang tersisa dan jalankan security linter.
- E2E berbasis peran (super admin, panitia, official tim, publik) untuk memastikan gerbang rute dan RLS.
- Uji beban ringan pada jalur event pertandingan.

## Catatan teknis

- Semua fase memakai domain, repository interface, katalog izin, dan komponen yang sudah ada — tanpa sistem paralel.
- Logika internal aplikasi memakai `createServerFn`; endpoint eksternal (jika ada) di `src/routes/api/public/*`.
- Setiap fase ditutup dengan typecheck, lint, build, dan verifikasi rute di browser.

## Urutan eksekusi

Fase 2 → 3 (keduanya menyentuh jalur pertandingan, paling berdampak), lalu 4, 5, 6, dan ditutup 7.
