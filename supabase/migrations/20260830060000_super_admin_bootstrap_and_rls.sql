-- ============================================================
-- PRIORITAS 1: BOOTSTRAP SUPER_ADMIN + RBAC RLS COMPLETENESS
-- Menutup SA-01 (chicken-and-egg admin gap) + RLS admin insert policy
-- untuk assignUserRole adapter (pendukung RR-01)
-- ============================================================
-- CATATAN KEAMANAN:
-- * Policy role_requests_admin_insert sengaja membolehkan is_admin()
--   untuk INSERT row permintaan peran. Ini dibutuhkan oleh method
--   assignUserRole() pada adapter supabaseRepository untuk skenario
--   penugasan peran langsung TANPA melalui flow self-request user.
-- * Risiko SA-02 (TOURNAMENT_ADMIN dapat menyetujui SUPER_ADMIN)
--   TIDAK ditutup pada migration ini; akan ditangani terpisah di
--   PRIORITAS 2 dengan menambahkan guard gradasi peran pada function
--   approve_role_request dan revoke_user_role.
-- ============================================================

BEGIN;

/* ------------------------------------------------------------------ */
/* 1. RLS ADMIN INSERT — dibutuhkan assignUserRole adapter            */
/* ------------------------------------------------------------------ */

CREATE POLICY role_requests_admin_insert ON public.role_requests
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

/* ------------------------------------------------------------------ */
/* 2. BOOTSTRAP AKUN SUPER_ADMIN PERTAMA                              */
/* ------------------------------------------------------------------ */
--
-- MEMECAHKAN MASALAH CHICKEN-AND-EGG (SA-01):
--   Tidak ada admin pertama → tidak ada yang approve role →
--   tidak ada cara menciptakan admin lain di production.
--
-- KREDENSIAL DEFAULT:
--   Email     : superadmin@porprovsulsel.id
--   Password  : DIRANDOMKAN dengan UUID (TIDAK ADA default password!)
--               Admin wajib menggunakan fitur "Lupa Password" di
--               halaman /masuk untuk mengatur password pertama.
--
-- TINDAKAN POST-DEPLOY WAJIB:
--   1. Kunjungi halaman /masuk
--   2. Klik "Lupa Password" → masukkan superadmin@porprovsulsel.id
--   3. Ikuti link reset password di email untuk menetapkan password
--   4. SEGERA ganti email jika alamat di atas bukan alamat resmi
--
-- CATATAN IMPLEMENTASI:
--   * Kita TIDAK men-disable trigger handle_new_user, sehingga insert
--     ke auth.users OTOMATIS memicu insert profiles + user_roles(PUBLIC)
--   * Setelah trigger berjalan, kita HAPUS row PUBLIC dan INSERT
--     row SUPER_ADMIN di user_roles.
--   * Column user_roles UNIQUE(user_id, role) mencegah duplikat.
-- ------------------------------------------------------------------

DO $$
DECLARE
  v_admin_id       uuid := gen_random_uuid();
  v_user_role_id   uuid;
  v_public_role_id uuid;
  v_instance_id    uuid;
BEGIN

  -- 2a. Tentukan instance_id (default Supabase local/studio = zero UUID)
  v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;

  -- 2b. Cegah duplicate bootstrap: jika superadmin@porprovsulsel.id
  --     sudah ada di auth.users, SKIP insert.
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin@porprovsulsel.id') THEN
    RAISE NOTICE 'SUPER_ADMIN bootstrap DILEWATI: akun superadmin@porprovsulsel.id sudah ada.';
    RETURN;
  END IF;

  -- 2c. Insert ke auth.users
  --     Password di-set ke UUID acak → admin WAJIB reset password via email.
  --     email_confirmed_at di-set agar email langsung ter-verified dan
  --     reset password flow dapat bekerja tanpa perlu konfirmasi ulang.
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    is_sso_user
  ) VALUES (
    v_admin_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    'superadmin@porprovsulsel.id',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Super Administrator Bootstrap"}'::jsonb,
    false,
    false
  );

  -- 2d. handle_new_user trigger SUDAH berjalan pada saat INSERT di atas.
  --     Trigger menciptakan:
  --       - 1 row di public.profiles (id = v_admin_id, full_name dari metadata)
  --       - 1 row di public.user_roles (user_id = v_admin_id, role = 'PUBLIC')
  --
  --     Kita HAPUS row PUBLIC lalu INSERT SUPER_ADMIN role.
  DELETE FROM public.user_roles
   WHERE user_id = v_admin_id
     AND role = 'PUBLIC';

  INSERT INTO public.user_roles (id, user_id, role)
  VALUES (gen_random_uuid(), v_admin_id, 'SUPER_ADMIN');

  -- 2e. Isi kolom profil pendukung agar profile query admin tidak NULL
  UPDATE public.profiles
     SET full_name    = COALESCE(NULLIF(full_name, ''), 'Super Administrator'),
         email        = 'superadmin@porprovsulsel.id',
         is_active    = true,
         last_login_at = now()
   WHERE id = v_admin_id;

  RAISE NOTICE '========================================================';
  RAISE NOTICE 'SUPER_ADMIN BERHASIL DI-BOOTSTRAP';
  RAISE NOTICE 'ID     : %', v_admin_id;
  RAISE NOTICE 'Email  : superadmin@porprovsulsel.id';
  RAISE NOTICE 'Password: DI-RANDOM → GUNAKAN LUPA PASSWORD di /masuk';
  RAISE NOTICE '========================================================';

END $$;

COMMIT;
