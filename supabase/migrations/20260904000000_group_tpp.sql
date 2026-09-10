-- Group/Jenis TPP module table

-- Create table
CREATE TABLE IF NOT EXISTS group_tpp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on name
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_tpp_name ON group_tpp (name);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_group_tpp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_group_tpp_updated_at ON group_tpp;
CREATE TRIGGER trg_group_tpp_updated_at
  BEFORE UPDATE ON group_tpp
  FOR EACH ROW
  EXECUTE FUNCTION update_group_tpp_updated_at();

-- RLS
ALTER TABLE group_tpp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read group_tpp"
  ON group_tpp FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert group_tpp"
  ON group_tpp FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update group_tpp"
  ON group_tpp FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete group_tpp"
  ON group_tpp FOR DELETE
  TO authenticated
  USING (true);
