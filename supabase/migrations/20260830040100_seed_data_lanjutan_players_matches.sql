-- ============================================================
-- SEED DATA LANJUTAN: PLAYERS, OFFICIALS, MATCHES, LINEUPS, EVENTS
-- PORPROV Sulsel 2026 Futsal
-- ============================================================

-- ============ TEAM OFFICIALS ============
INSERT INTO public.team_officials (id, team_id, full_name, role, license_number)
VALUES
  ('of-tm-m1-1', 'tm-m1', 'Pelatih MKS', 'HEAD_COACH', 'AFC-D/2400'),
  ('of-tm-m1-2', 'tm-m1', 'Manajer MKS', 'MANAGER', NULL),
  ('of-tm-m2-1', 'tm-m2', 'Pelatih GOW', 'HEAD_COACH', 'AFC-D/2401'),
  ('of-tm-m2-2', 'tm-m2', 'Manajer GOW', 'MANAGER', NULL),
  ('of-tm-m3-1', 'tm-m3', 'Pelatih BON', 'HEAD_COACH', 'AFC-D/2402'),
  ('of-tm-m3-2', 'tm-m3', 'Manajer BON', 'MANAGER', NULL),
  ('of-tm-m4-1', 'tm-m4', 'Pelatih PRE', 'HEAD_COACH', 'AFC-D/2403'),
  ('of-tm-m4-2', 'tm-m4', 'Manajer PRE', 'MANAGER', NULL),
  ('of-tm-m5-1', 'tm-m5', 'Pelatih LWT', 'HEAD_COACH', 'AFC-D/2404'),
  ('of-tm-m5-2', 'tm-m5', 'Manajer LWT', 'MANAGER', NULL),
  ('of-tm-m6-1', 'tm-m6', 'Pelatih MRS', 'HEAD_COACH', 'AFC-D/2405'),
  ('of-tm-m6-2', 'tm-m6', 'Manajer MRS', 'MANAGER', NULL),
  ('of-tm-m7-1', 'tm-m7', 'Pelatih PLP', 'HEAD_COACH', 'AFC-D/2406'),
  ('of-tm-m7-2', 'tm-m7', 'Manajer PLP', 'MANAGER', NULL),
  ('of-tm-m8-1', 'tm-m8', 'Pelatih SNJ', 'HEAD_COACH', 'AFC-D/2407'),
  ('of-tm-m8-2', 'tm-m8', 'Manajer SNJ', 'MANAGER', NULL),
  ('of-tm-w1-1', 'tm-w1', 'Pelatih MKS Putri', 'HEAD_COACH', 'AFC-D/2408'),
  ('of-tm-w1-2', 'tm-w1', 'Manajer MKS Putri', 'MANAGER', NULL),
  ('of-tm-w2-1', 'tm-w2', 'Pelatih GOW Putri', 'HEAD_COACH', 'AFC-D/2409'),
  ('of-tm-w2-2', 'tm-w2', 'Manajer GOW Putri', 'MANAGER', NULL),
  ('of-tm-w3-1', 'tm-w3', 'Pelatih BON Putri', 'HEAD_COACH', 'AFC-D/2410'),
  ('of-tm-w3-2', 'tm-w3', 'Manajer BON Putri', 'MANAGER', NULL),
  ('of-tm-w4-1', 'tm-w4', 'Pelatih PRE Putri', 'HEAD_COACH', 'AFC-D/2411'),
  ('of-tm-w4-2', 'tm-w4', 'Manajer PRE Putri', 'MANAGER', NULL),
  ('of-tm-w5-1', 'tm-w5', 'Pelatih LWT Putri', 'HEAD_COACH', 'AFC-D/2412'),
  ('of-tm-w5-2', 'tm-w5', 'Manajer LWT Putri', 'MANAGER', NULL),
  ('of-tm-w6-1', 'tm-w6', 'Pelatih MRS Putri', 'HEAD_COACH', 'AFC-D/2413'),
  ('of-tm-w6-2', 'tm-w6', 'Manajer MRS Putri', 'MANAGER', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============ MATCHES ============
INSERT INTO public.matches (
  id, tournament_id, category_id, group_id, match_number,
  home_team_id, away_team_id, venue_id, court, kickoff_at,
  status, period, clock_seconds, home_score, away_score, version, stage
) VALUES
  ('mt-1',  'trn-1', 'cat-men',   'grp-ma', 1,  'tm-m1', 'tm-m3', 'ven-1', 1, '2026-09-06T09:00:00+08:00', 'PUBLISHED', 'ENDED',    0,    4, 2, 3, 'GROUP'),
  ('mt-2',  'trn-1', 'cat-men',   'grp-mb', 2,  'tm-m5', 'tm-m7', 'ven-2', 2, '2026-09-06T11:00:00+08:00', 'PUBLISHED', 'ENDED',    0,    1, 1, 3, 'GROUP'),
  ('mt-3',  'trn-1', 'cat-men',   'grp-mb', 3,  'tm-m2', 'tm-m4', 'ven-1', 2, '2026-09-06T13:00:00+08:00', 'PUBLISHED', 'ENDED',    0,    3, 5, 3, 'GROUP'),
  ('mt-4',  'trn-1', 'cat-women', 'grp-wa', 4,  'tm-w1', 'tm-w3', 'ven-2', 1, '2026-09-06T15:00:00+08:00', 'PUBLISHED', 'ENDED',    0,    2, 0, 3, 'GROUP'),
  ('mt-5',  'trn-1', 'cat-men',   'grp-ma', 5,  'tm-m1', 'tm-m5', 'ven-1', 1, '2026-09-07T09:00:00+08:00', 'CONFIRMED', 'ENDED',    0,    2, 2, 2, 'GROUP'),
  ('mt-6',  'trn-1', 'cat-women', 'grp-wb', 6,  'tm-w2', 'tm-w4', 'ven-2', 2, '2026-09-07T11:00:00+08:00', 'PUBLISHED', 'ENDED',    0,    3, 1, 3, 'GROUP'),
  ('mt-7',  'trn-1', 'cat-men',   'grp-ma', 7,  'tm-m3', 'tm-m7', 'ven-1', 2, '2026-09-07T13:00:00+08:00', 'LIVE',      'SECOND_HALF', 1114, 3, 2, 5, 'GROUP'),
  ('mt-8',  'trn-1', 'cat-women', 'grp-wa', 8,  'tm-w5', 'tm-w1', 'ven-2', 1, '2026-09-07T15:00:00+08:00', 'LIVE',      'FIRST_HALF',  486, 1, 1, 5, 'GROUP'),
  ('mt-9',  'trn-1', 'cat-men',   'grp-mb', 9,  'tm-m2', 'tm-m6', 'ven-1', 1, '2026-09-07T17:00:00+08:00', 'CHECK_IN',  'PRE_MATCH',     0, 0, 0, 0, 'GROUP'),
  ('mt-10', 'trn-1', 'cat-men',   'grp-mb', 10, 'tm-m4', 'tm-m8', 'ven-2', 2, '2026-09-07T19:00:00+08:00', 'SCHEDULED', 'PRE_MATCH',     0, 0, 0, 0, 'GROUP'),
  ('mt-11', 'trn-1', 'cat-women', 'grp-wa', 11, 'tm-w3', 'tm-w5', 'ven-1', 1, '2026-09-08T09:00:00+08:00', 'SCHEDULED', 'PRE_MATCH',     0, 0, 0, 0, 'GROUP'),
  ('mt-12', 'trn-1', 'cat-men',   'grp-ma', 12, 'tm-m5', 'tm-m3', 'ven-2', 2, '2026-09-08T11:00:00+08:00', 'SCHEDULED', 'PRE_MATCH',     0, 0, 0, 0, 'GROUP'),
  ('mt-13', 'trn-1', 'cat-men',   'grp-ma', 13, 'tm-m7', 'tm-m1', 'ven-1', 2, '2026-09-08T13:00:00+08:00', 'SCHEDULED', 'PRE_MATCH',     0, 0, 0, 0, 'GROUP'),
  ('mt-14', 'trn-1', 'cat-women', 'grp-wb', 14, 'tm-w4', 'tm-w6', 'ven-2', 1, '2026-09-08T15:00:00+08:00', 'SCHEDULED', 'PRE_MATCH',     0, 0, 0, 0, 'GROUP'),
  ('mt-15', 'trn-1', 'cat-men',   'grp-mb', 15, 'tm-m6', 'tm-m4', 'ven-1', 1, '2026-09-09T09:00:00+08:00', 'SCHEDULED', 'PRE_MATCH',     0, 0, 0, 0, 'GROUP'),
  ('mt-16', 'trn-1', 'cat-men',   'grp-mb', 16, 'tm-m8', 'tm-m2', 'ven-2', 2, '2026-09-09T11:00:00+08:00', 'SCHEDULED', 'PRE_MATCH',     0, 0, 0, 0, 'GROUP')
ON CONFLICT (id) DO NOTHING;

-- ============ MATCH OFFICIALS ============
INSERT INTO public.match_officials (id, match_id, user_id, full_name, role, active, effective_from, effective_to)
VALUES
  ('mo-mt-1-1',  'mt-1',  'usr-ref-1', 'Andi Muharram',  'REFEREE_1',    true, '2026-09-06T09:00:00+08:00', NULL),
  ('mo-mt-1-2',  'mt-1',  'usr-ref-2', 'Hasbi Rahman',   'REFEREE_2',    true, '2026-09-06T09:00:00+08:00', NULL),
  ('mo-mt-1-3',  'mt-1',  'usr-tk-1',  'Rusdi Tahir',    'TIMEKEEPER',   true, '2026-09-06T09:00:00+08:00', NULL),
  ('mo-mt-1-4',  'mt-1',  'usr-cm-1',  'Komisaris 1',    'COMMISSIONER', true, '2026-09-06T09:00:00+08:00', NULL),
  ('mo-mt-2-1',  'mt-2',  'usr-ref-1', 'Andi Muharram',  'REFEREE_1',    true, '2026-09-06T11:00:00+08:00', NULL),
  ('mo-mt-2-2',  'mt-2',  'usr-ref-2', 'Hasbi Rahman',   'REFEREE_2',    true, '2026-09-06T11:00:00+08:00', NULL),
  ('mo-mt-2-3',  'mt-2',  'usr-tk-1',  'Rusdi Tahir',    'TIMEKEEPER',   true, '2026-09-06T11:00:00+08:00', NULL),
  ('mo-mt-2-4',  'mt-2',  'usr-cm-2',  'Komisaris 2',    'COMMISSIONER', true, '2026-09-06T11:00:00+08:00', NULL),
  ('mo-mt-3-1',  'mt-3',  'usr-ref-1', 'Andi Muharram',  'REFEREE_1',    true, '2026-09-06T13:00:00+08:00', NULL),
  ('mo-mt-3-2',  'mt-3',  'usr-ref-2', 'Hasbi Rahman',   'REFEREE_2',    true, '2026-09-06T13:00:00+08:00', NULL),
  ('mo-mt-3-3',  'mt-3',  'usr-tk-1',  'Rusdi Tahir',    'TIMEKEEPER',   true, '2026-09-06T13:00:00+08:00', NULL),
  ('mo-mt-3-4',  'mt-3',  'usr-cm-3',  'Komisaris 3',    'COMMISSIONER', true, '2026-09-06T13:00:00+08:00', NULL),
  ('mo-mt-4-1',  'mt-4',  'usr-ref-1', 'Andi Muharram',  'REFEREE_1',    true, '2026-09-06T15:00:00+08:00', NULL),
  ('mo-mt-4-2',  'mt-4',  'usr-ref-2', 'Hasbi Rahman',   'REFEREE_2',    true, '2026-09-06T15:00:00+08:00', NULL),
  ('mo-mt-4-3',  'mt-4',  'usr-tk-1',  'Rusdi Tahir',    'TIMEKEEPER',   true, '2026-09-06T15:00:00+08:00', NULL),
  ('mo-mt-4-4',  'mt-4',  'usr-cm-4',  'Komisaris 4',    'COMMISSIONER', true, '2026-09-06T15:00:00+08:00', NULL),
  ('mo-mt-5-1',  'mt-5',  'usr-ref-1', 'Andi Muharram',  'REFEREE_1',    true, '2026-09-07T09:00:00+08:00', NULL),
  ('mo-mt-5-2',  'mt-5',  'usr-ref-2', 'Hasbi Rahman',   'REFEREE_2',    true, '2026-09-07T09:00:00+08:00', NULL),
  ('mo-mt-5-3',  'mt-5',  'usr-tk-1',  'Rusdi Tahir',    'TIMEKEEPER',   true, '2026-09-07T09:00:00+08:00', NULL),
  ('mo-mt-5-4',  'mt-5',  'usr-cm-5',  'Komisaris 5',    'COMMISSIONER', true, '2026-09-07T09:00:00+08:00', NULL),
  ('mo-mt-6-1',  'mt-6',  'usr-ref-1', 'Andi Muharram',  'REFEREE_1',    true, '2026-09-07T11:00:00+08:00', NULL),
  ('mo-mt-6-2',  'mt-6',  'usr-ref-2', 'Hasbi Rahman',   'REFEREE_2',    true, '2026-09-07T11:00:00+08:00', NULL),
  ('mo-mt-6-3',  'mt-6',  'usr-tk-1',  'Rusdi Tahir',    'TIMEKEEPER',   true, '2026-09-07T11:00:00+08:00', NULL),
  ('mo-mt-6-4',  'mt-6',  'usr-cm-6',  'Komisaris 6',    'COMMISSIONER', true, '2026-09-07T11:00:00+08:00', NULL),
  ('mo-mt-7-1',  'mt-7',  'usr-ref-1', 'Andi Muharram',  'REFEREE_1',    true, '2026-09-07T13:00:00+08:00', NULL),
  ('mo-mt-7-2',  'mt-7',  'usr-ref-2', 'Hasbi Rahman',   'REFEREE_2',    true, '2026-09-07T13:00:00+08:00', NULL),
  ('mo-mt-7-3',  'mt-7',  'usr-tk-1',  'Rusdi Tahir',    'TIMEKEEPER',   true, '2026-09-07T13:00:00+08:00', NULL),
  ('mo-mt-7-4',  'mt-7',  'usr-cm-7',  'Komisaris 7',    'COMMISSIONER', true, '2026-09-07T13:00:00+08:00', NULL),
  ('mo-mt-8-1',  'mt-8',  'usr-ref-1', 'Andi Muharram',  'REFEREE_1',    true, '2026-09-07T15:00:00+08:00', NULL),
  ('mo-mt-8-2',  'mt-8',  'usr-ref-2', 'Hasbi Rahman',   'REFEREE_2',    true, '2026-09-07T15:00:00+08:00', NULL),
  ('mo-mt-8-3',  'mt-8',  'usr-tk-1',  'Rusdi Tahir',    'TIMEKEEPER',   true, '2026-09-07T15:00:00+08:00', NULL),
  ('mo-mt-8-4',  'mt-8',  'usr-cm-8',  'Komisaris 8',    'COMMISSIONER', true, '2026-09-07T15:00:00+08:00', NULL)
ON CONFLICT (id) DO NOTHING;
