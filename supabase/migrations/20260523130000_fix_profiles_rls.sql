-- Fix profiles RLS: add missing INSERT policy and fix wrong column in UPDATE policy

-- Drop the broken UPDATE policy (used user_id which doesn't exist on profiles)
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- Re-add with correct column (id, not user_id)
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Add missing INSERT policy so users can create their own profile row
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
