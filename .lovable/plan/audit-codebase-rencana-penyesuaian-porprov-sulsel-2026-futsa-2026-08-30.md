# Audit Codebase & Rencana Penyesuaian — PORPROV Sulsel 2026 Futsal

## Hasil audit (kondisi saat ini)

Sudah ada dan berjalan (typecheck, lint, build, 32 rute terverifikasi):

- Design system PORPROV, layout publik/admin/tim.
- Domain: `types`, `match-state` (state machine + `canTransition`), `permissions` (11 peran), `standings`, `match-operations`, `registration`, `authentication`.
- Repository abstraction + adapter in-memory (1016 baris) dengan event immutable, audit log, dan optimistic version.
- 47 rute: publik, `/admin/*` (18 modul), `/team/*`, Match Center `/match/$matchId/control`.
- TanStack Query hooks + 16 mutation hooks.

## Gap terhadap prompt awal

1. **Tidak ada backend/persistensi.** Semua data hidup di memori proses; data hilang saat reload/deploy. Lovable Cloud belum diaktifkan, tidak ada tabel PostgreSQL, tidak ada RLS. Prompt awal meminta model siap-PostgreSQL dan otorisasi otoritatif di backend.
2. **Autentikasi belum nyata.** `use-session.tsx` melakukan auto-login demo sebagai SUPER_ADMIN (`superadmin@porprovsulsel.id`) pada mount, sehingga `/admin` terbuka untuk siapa pun. `/masuk` tidak menjadi gerbang. RBAC hanya lapisan UI.
3. **Skor/event belum otoritatif server.** Validasi event dan transisi hanya di klien/adapter memori; tidak ada penolakan sisi server, idempotensi lintas klien, atau realtime.
4. **CRUD admin sebagian read-only.** Repository belum punya create/update untuk kontingen, venue, grup, kategori, turnamen, dan pengguna — modul-modul itu hanya tabel baca.
5. **Belum ada generator jadwal & undian grup.** Penjadwalan hanya edit satu-satu; tidak ada pembangkit round-robin per grup maupun deteksi bentrok venue/lapangan/waktu.
6. **Babak gugur belum ada.** `stage` sudah ada di tipe, tetapi tidak ada pembangkit bracket, progresi pemenang, atau tampilan bagan.
7. **Live scoreboard belum realtime.** `/live` membaca dari cache query; tidak ada langganan realtime.
8. **Upload dokumen hanya metadata.** Registrasi menyimpan nama berkas saja, tanpa storage nyata.
9. **Ekspor laporan placeholder.** Tombol cetak/ekspor menampilkan toast informasi.

## Rencana penyesuaian (bertahap, tanpa menulis ulang arsitektur)

### Fase A — Backend Lovable Cloud (fondasi)

- Aktifkan Lovable Cloud.
- Migrasi skema dipetakan 1:1 dari `src/domain/types.ts`: tournaments, categories, contingents, teams, players, team_officials, venues, groups, matches, match_officials, match_lineups, match_events, audit_logs, user_roles (tabel peran terpisah + fungsi `has_role`), registration_documents, verification_history.
- GRANT + RLS untuk setiap tabel; baca publik hanya untuk data kompetisi yang memang publik.
- Seed data kompetisi memakai INSERT literal dari fixture yang ada.

### Fase B — Adapter Supabase

- Implementasi `SupabaseCompetitionRepository` mengikuti interface `CompetitionRepository` yang sudah ada; `src/data/index.ts` menjadi satu titik tukar adapter. Adapter in-memory tetap ada untuk test.
- Tidak ada perubahan pada komponen, hook query, atau domain.

### Fase C — Autentikasi & otorisasi nyata

- Hapus auto-login demo; `/masuk` memakai auth Lovable Cloud, `/team/login` memakai akun tim.
- `useSession` membaca sesi nyata + peran dari tabel `user_roles`.
- Gate rute admin dan Match Center; UI tetap menyembunyikan aksi, backend (RLS) menjadi otoritas.

### Fase D — Operasi pertandingan otoritatif

- Server function untuk `recordMatchEvent`, `transitionMatchStatus`, `updateMatchClock`: validasi ulang `canTransition()` dan `validateMatchEvent()` di server, idempotensi via `command_id`, cek `expected_version`.
- Skor selalu diturunkan ulang dari event GOAL di server.
- Realtime untuk `/live`, halaman pertandingan publik, dan Match Center.

### Fase E — Melengkapi modul yang masih read-only

- CRUD kontingen, venue, grup, kategori, turnamen, pengguna/peran memakai pola tabel + drawer form yang sudah ada.
- Undian grup dan generator jadwal round-robin dengan deteksi bentrok venue/lapangan/waktu.
- Bracket babak gugur: pembangkitan dari klasemen grup, progresi pemenang otomatis, halaman bagan publik.

### Fase F — Dokumen, laporan, penyelesaian

- Storage Lovable Cloud untuk dokumen registrasi (upload, unduh, kebijakan akses).
- Ekspor laporan nyata (CSV; PDF cetak lewat layout print).
- Laporan pertandingan resmi yang bisa dicetak dari event immutable.

## Catatan teknis

- Semua fase memakai domain, repository interface, permission catalog, standings, dan komponen yang sudah ada. Tidak ada duplikasi sistem otorisasi, transisi, skor, atau akses data.
- Server-side memakai `createServerFn` TanStack Start; endpoint publik/webhook (jika perlu) di `src/routes/api/public/*`.
- Setiap fase ditutup dengan typecheck, lint, build, dan verifikasi rute browser.

## Urutan eksekusi yang diusulkan

Mulai dari Fase A + B sekaligus (backend + adapter) karena semua gap lain bergantung pada persistensi nyata, lalu Fase C, D, E, F.
