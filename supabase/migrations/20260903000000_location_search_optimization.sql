-- Location search optimization with trigram index and RPC function

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fast trigram similarity search on location name and address
CREATE INDEX IF NOT EXISTS idx_locations_name_trgm ON locations USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_address_trgm ON locations USING gin (address gin_trgm_ops);

-- RPC function for fuzzy location search
CREATE OR REPLACE FUNCTION search_locations(
  p_query TEXT,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  address TEXT,
  kelurahan_id UUID,
  rw_id UUID,
  rt_id UUID,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.code,
    l.address,
    l.kelurahan_id,
    l.rw_id,
    l.rt_id,
    GREATEST(
      similarity(l.name, p_query),
      COALESCE(similarity(l.address, p_query), 0) * 0.5
    ) AS similarity
  FROM locations l
  WHERE 
    l.name % p_query 
    OR (l.address IS NOT NULL AND l.address % p_query)
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_locations TO authenticated;
