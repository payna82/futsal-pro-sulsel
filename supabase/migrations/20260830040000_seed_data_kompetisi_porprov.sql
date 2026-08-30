-- ============================================================
-- SEED DATA KOMPETISI PORPROV SULSEL 2026 FUTSAL
-- Mapping 1:1 dari src/data/fixtures.ts ke PostgreSQL
-- ============================================================

-- ============ TOURNAMENT ============
INSERT INTO public.tournaments (id, name, season, host_city, start_date, end_date, status, description)
VALUES (
  'trn-1',
  'PORPROV Sulsel 2026',
  2026,
  'Makassar',
  '2026-09-05',
  '2026-09-19',
  'ACTIVE',
  'Pekan Olahraga Provinsi Sulawesi Selatan 2026 — Cabang Olahraga Futsal Putra dan Putri.'
) ON CONFLICT (id) DO NOTHING;

-- ============ CATEGORIES ============
INSERT INTO public.categories (id, tournament_id, key, name, team_count, format)
VALUES
  ('cat-men', 'trn-1', 'MEN', 'Futsal Putra', 8, '2 grup penyisihan, semifinal, final'),
  ('cat-women', 'trn-1', 'WOMEN', 'Futsal Putri', 6, '2 grup penyisihan, semifinal, final')
ON CONFLICT (id) DO NOTHING;

-- ============ CONTINGENTS ============
INSERT INTO public.contingents (id, tournament_id, name, short_name, region_code, manager_name, contact)
VALUES
  ('con-1', 'trn-1', 'Kota Makassar', 'MKS', '73.71', 'Manajer Kontingen MKS', '0812-3300-101'),
  ('con-2', 'trn-1', 'Kabupaten Gowa', 'GOW', '73.06', 'Manajer Kontingen GOW', '0812-3300-102'),
  ('con-3', 'trn-1', 'Kabupaten Bone', 'BON', '73.08', 'Manajer Kontingen BON', '0812-3300-103'),
  ('con-4', 'trn-1', 'Kota Parepare', 'PRE', '73.72', 'Manajer Kontingen PRE', '0812-3300-104'),
  ('con-5', 'trn-1', 'Kabupaten Luwu Timur', 'LWT', '73.25', 'Manajer Kontingen LWT', '0812-3300-105'),
  ('con-6', 'trn-1', 'Kabupaten Maros', 'MRS', '73.09', 'Manajer Kontingen MRS', '0812-3300-106'),
  ('con-7', 'trn-1', 'Kota Palopo', 'PLP', '73.73', 'Manajer Kontingen PLP', '0812-3300-107'),
  ('con-8', 'trn-1', 'Kabupaten Sinjai', 'SNJ', '73.07', 'Manajer Kontingen SNJ', '0812-3300-108')
ON CONFLICT (id) DO NOTHING;

-- ============ GROUPS ============
INSERT INTO public.groups (id, category_id, name, stage)
VALUES
  ('grp-ma', 'cat-men', 'Grup A', 'GROUP'),
  ('grp-mb', 'cat-men', 'Grup B', 'GROUP'),
  ('grp-wa', 'cat-women', 'Grup A', 'GROUP'),
  ('grp-wb', 'cat-women', 'Grup B', 'GROUP')
ON CONFLICT (id) DO NOTHING;

-- ============ VENUES ============
INSERT INTO public.venues (id, name, city, address, capacity, court_count, is_active)
VALUES
  ('ven-1', 'GOR Sudiang', 'Makassar', 'Jl. Poros Sudiang, Makassar', 2500, 2, true),
  ('ven-2', 'Futsal Center Panakkukang', 'Makassar', 'Jl. Boulevard, Panakkukang', 1200, 3, true),
  ('ven-3', 'GOR Mattoanging Gowa', 'Gowa', 'Jl. Sultan Hasanuddin, Sungguminasa', 900, 1, false)
ON CONFLICT (id) DO NOTHING;

-- ============ TEAMS ============
INSERT INTO public.teams (id, contingent_id, category_id, name, short_name, group_id, status, primary_color)
VALUES
  ('tm-m1', 'con-1', 'cat-men', 'Kota Makassar Putra', 'MKS', 'grp-ma', 'VERIFIED', '#8f1d1d'),
  ('tm-m2', 'con-2', 'cat-men', 'Kabupaten Gowa Putra', 'GOW', 'grp-mb', 'VERIFIED', '#123f7a'),
  ('tm-m3', 'con-3', 'cat-men', 'Kabupaten Bone Putra', 'BON', 'grp-ma', 'VERIFIED', '#1c6b3c'),
  ('tm-m4', 'con-4', 'cat-men', 'Kota Parepare Putra', 'PRE', 'grp-mb', 'VERIFIED', '#a9761a'),
  ('tm-m5', 'con-5', 'cat-men', 'Kabupaten Luwu Timur Putra', 'LWT', 'grp-ma', 'VERIFIED', '#4a2472'),
  ('tm-m6', 'con-6', 'cat-men', 'Kabupaten Maros Putra', 'MRS', 'grp-mb', 'VERIFIED', '#0f6f7a'),
  ('tm-m7', 'con-7', 'cat-men', 'Kota Palopo Putra', 'PLP', 'grp-ma', 'VERIFIED', '#7a2f4f'),
  ('tm-m8', 'con-8', 'cat-men', 'Kabupaten Sinjai Putra', 'SNJ', 'grp-mb', 'REGISTERED', '#2f3b46'),
  ('tm-w1', 'con-1', 'cat-women', 'Kota Makassar Putri', 'MKS', 'grp-wa', 'VERIFIED', '#8f1d1d'),
  ('tm-w2', 'con-2', 'cat-women', 'Kabupaten Gowa Putri', 'GOW', 'grp-wb', 'VERIFIED', '#123f7a'),
  ('tm-w3', 'con-3', 'cat-women', 'Kabupaten Bone Putri', 'BON', 'grp-wa', 'VERIFIED', '#1c6b3c'),
  ('tm-w4', 'con-4', 'cat-women', 'Kota Parepare Putri', 'PRE', 'grp-wb', 'VERIFIED', '#a9761a'),
  ('tm-w5', 'con-5', 'cat-women', 'Kabupaten Luwu Timur Putri', 'LWT', 'grp-wa', 'VERIFIED', '#4a2472'),
  ('tm-w6', 'con-6', 'cat-women', 'Kabupaten Maros Putri', 'MRS', 'grp-wb', 'VERIFIED', '#0f6f7a')
ON CONFLICT (id) DO NOTHING;
