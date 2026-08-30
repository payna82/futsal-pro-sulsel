ALTER TABLE public.verification_history
  ADD COLUMN IF NOT EXISTS previous_status text NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS new_status text NOT NULL DEFAULT 'DRAFT';