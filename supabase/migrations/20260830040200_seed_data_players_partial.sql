-- ============================================================
-- SEED DATA PLAYERS (14 tim x 12 pemain = 168 pemain)
-- + MATCH LINEUPS + MATCH EVENTS untuk pertandingan published/confirmed/live
-- ============================================================

-- ============ PLAYERS: Tim Putra ============
INSERT INTO public.players (id, team_id, full_name, jersey_number, position, birth_date, nik_verified, is_captain, status, registration_status)
VALUES
  -- tm-m1 (MKS Putra)
  ('pl-tm-m1-1',  'tm-m1', 'Andi Pratama',       1,  'GOALKEEPER', '2002-01-11', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m1-2',  'tm-m1', 'Muh. Ramadhan',      2,  'ANCHOR',     '2002-02-12', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m1-3',  'tm-m1', 'Rifky Saputra',      3,  'FLANK',      '2002-03-13', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m1-4',  'tm-m1', 'Ahmad Maulana',      4,  'FLANK',      '2002-04-14', true,  true,  'ELIGIBLE', NULL),
  ('pl-tm-m1-5',  'tm-m1', 'Fajar Hidayat',      5,  'PIVOT',      '2002-05-15', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m1-6',  'tm-m1', 'Rian Kurniawan',     6,  'GOALKEEPER', '2003-06-16', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m1-7',  'tm-m1', 'Yusuf Sanjaya',      7,  'ANCHOR',     '2003-07-17', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m1-8',  'tm-m1', 'Bahar Alamsyah',     8,  'FLANK',      '2003-08-18', false, false, 'PENDING',  NULL),
  ('pl-tm-m1-9',  'tm-m1', 'Ilham Wijaya',       9,  'FLANK',      '2003-09-19', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m1-10', 'tm-m1', 'Reza Fadillah',      10, 'PIVOT',      '2003-01-11', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m1-11', 'tm-m1', 'Dedi Nugraha',       11, 'ANCHOR',     '2004-02-12', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m1-12', 'tm-m1', 'Arya Halim',         12, 'FLANK',      '2004-03-13', true,  false, 'ELIGIBLE', NULL),
  -- tm-m2 (GOW Putra)
  ('pl-tm-m2-1',  'tm-m2', 'Andi Syahputra',     1,  'GOALKEEPER', '2002-04-14', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m2-2',  'tm-m2', 'Muh. Amelia',        2,  'ANCHOR',     '2002-05-15', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m2-3',  'tm-m2', 'Rifky Ashari',       3,  'FLANK',      '2002-06-16', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m2-4',  'tm-m2', 'Ahmad Pratama',      4,  'FLANK',      '2002-07-17', true,  true,  'ELIGIBLE', NULL),
  ('pl-tm-m2-5',  'tm-m2', 'Fajar Ramadhan',     5,  'PIVOT',      '2002-08-18', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m2-6',  'tm-m2', 'Rian Saputra',       6,  'GOALKEEPER', '2003-09-19', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m2-7',  'tm-m2', 'Yusuf Maulana',      7,  'ANCHOR',     '2003-01-11', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m2-8',  'tm-m2', 'Bahar Hidayat',      8,  'FLANK',      '2003-02-12', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m2-9',  'tm-m2', 'Ilham Kurniawan',    9,  'FLANK',      '2003-03-13', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m2-10', 'tm-m2', 'Reza Sanjaya',       10, 'PIVOT',      '2003-04-14', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m2-11', 'tm-m2', 'Dedi Alamsyah',      11, 'ANCHOR',     '2004-05-15', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m2-12', 'tm-m2', 'Arya Wijaya',        12, 'FLANK',      '2004-06-16', true,  false, 'ELIGIBLE', NULL),
  -- tm-m3 (BON Putra)
  ('pl-tm-m3-1',  'tm-m3', 'Andi Fadillah',      1,  'GOALKEEPER', '2002-07-17', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m3-2',  'tm-m3', 'Muh. Nugraha',       2,  'ANCHOR',     '2002-08-18', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m3-3',  'tm-m3', 'Rifky Halim',        3,  'FLANK',      '2002-09-19', false, false, 'PENDING',  NULL),
  ('pl-tm-m3-4',  'tm-m3', 'Ahmad Syahputra',    4,  'FLANK',      '2002-01-11', true,  true,  'ELIGIBLE', NULL),
  ('pl-tm-m3-5',  'tm-m3', 'Fajar Amelia',       5,  'PIVOT',      '2002-02-12', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m3-6',  'tm-m3', 'Rian Ashari',        6,  'GOALKEEPER', '2003-03-13', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m3-7',  'tm-m3', 'Yusuf Pratama',      7,  'ANCHOR',     '2003-04-14', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m3-8',  'tm-m3', 'Bahar Ramadhan',     8,  'FLANK',      '2003-05-15', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m3-9',  'tm-m3', 'Ilham Saputra',      9,  'FLANK',      '2003-06-16', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m3-10', 'tm-m3', 'Reza Maulana',       10, 'PIVOT',      '2003-07-17', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m3-11', 'tm-m3', 'Dedi Hidayat',       11, 'ANCHOR',     '2004-08-18', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m3-12', 'tm-m3', 'Arya Kurniawan',     12, 'FLANK',      '2004-09-19', true,  false, 'ELIGIBLE', NULL),
  -- tm-m4 (PRE Putra)
  ('pl-tm-m4-1',  'tm-m4', 'Andi Sanjaya',       1,  'GOALKEEPER', '2002-03-13', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m4-2',  'tm-m4', 'Muh. Alamsyah',      2,  'ANCHOR',     '2002-04-14', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m4-3',  'tm-m4', 'Rifky Wijaya',       3,  'FLANK',      '2002-05-15', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m4-4',  'tm-m4', 'Ahmad Fadillah',     4,  'FLANK',      '2002-06-16', true,  true,  'ELIGIBLE', NULL),
  ('pl-tm-m4-5',  'tm-m4', 'Fajar Nugraha',      5,  'PIVOT',      '2002-07-17', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m4-6',  'tm-m4', 'Rian Halim',         6,  'GOALKEEPER', '2003-08-18', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m4-7',  'tm-m4', 'Yusuf Syahputra',    7,  'ANCHOR',     '2003-09-19', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m4-8',  'tm-m4', 'Bahar Amelia',       8,  'FLANK',      '2003-01-11', false, false, 'PENDING',  NULL),
  ('pl-tm-m4-9',  'tm-m4', 'Ilham Ashari',       9,  'FLANK',      '2003-02-12', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m4-10', 'tm-m4', 'Reza Pratama',       10, 'PIVOT',      '2003-03-13', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m4-11', 'tm-m4', 'Dedi Ramadhan',      11, 'ANCHOR',     '2004-04-14', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m4-12', 'tm-m4', 'Arya Saputra',       12, 'FLANK',      '2004-05-15', true,  false, 'ELIGIBLE', NULL),
  -- tm-m5 (LWT Putra)
  ('pl-tm-m5-1',  'tm-m5', 'Andi Maulana',       1,  'GOALKEEPER', '2002-08-18', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m5-2',  'tm-m5', 'Muh. Hidayat',       2,  'ANCHOR',     '2002-09-19', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m5-3',  'tm-m5', 'Rifky Kurniawan',    3,  'FLANK',      '2002-01-11', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m5-4',  'tm-m5', 'Ahmad Sanjaya',      4,  'FLANK',      '2002-02-12', true,  true,  'ELIGIBLE', NULL),
  ('pl-tm-m5-5',  'tm-m5', 'Fajar Alamsyah',     5,  'PIVOT',      '2002-03-13', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m5-6',  'tm-m5', 'Rian Wijaya',        6,  'GOALKEEPER', '2003-04-14', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m5-7',  'tm-m5', 'Yusuf Fadillah',     7,  'ANCHOR',     '2003-05-15', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m5-8',  'tm-m5', 'Bahar Nugraha',      8,  'FLANK',      '2003-06-16', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m5-9',  'tm-m5', 'Ilham Halim',        9,  'FLANK',      '2003-07-17', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m5-10', 'tm-m5', 'Reza Syahputra',     10, 'PIVOT',      '2003-08-18', false, false, 'PENDING',  NULL),
  ('pl-tm-m5-11', 'tm-m5', 'Dedi Amelia',        11, 'ANCHOR',     '2004-09-19', true,  false, 'ELIGIBLE', NULL),
  ('pl-tm-m5-12', 'tm-m5', 'Arya Ashari',        12, 'FLANK',      '2004-01-11', true,  false, 'ELIGIBLE', NULL)
ON CONFLICT (id) DO NOTHING;
