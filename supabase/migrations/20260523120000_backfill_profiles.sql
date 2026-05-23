-- ============================================================
-- BACKFILL: create profile rows for any auth users who signed up
-- before the handle_new_user trigger was deployed.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).
-- ============================================================

INSERT INTO public.profiles (id, full_name, avatar_url, plan, created_at, updated_at)
SELECT
  u.id,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'avatar_url',
  'free',
  u.created_at,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);
