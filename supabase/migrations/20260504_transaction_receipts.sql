-- ── Transaction Receipts ──────────────────────────────────────────────
-- Supports attaching photo receipts to personal transactions and
-- group expenses.  Create the `receipts` bucket in the Supabase
-- dashboard (Storage → New bucket → name `receipts`, public-read,
-- private-write) before applying this migration.

CREATE TABLE transaction_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES personal_transactions(id) ON DELETE CASCADE,
  group_expense_id UUID REFERENCES group_expenses(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  thumbnail_url TEXT,
  mime_type TEXT,
  file_size_bytes INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_transaction_or_expense CHECK (
    (transaction_id IS NOT NULL AND group_expense_id IS NULL)
    OR (transaction_id IS NULL AND group_expense_id IS NOT NULL)
  )
);

CREATE INDEX idx_receipts_transaction ON transaction_receipts(transaction_id);
CREATE INDEX idx_receipts_group_expense ON transaction_receipts(group_expense_id);
CREATE INDEX idx_receipts_user ON transaction_receipts(user_id);
