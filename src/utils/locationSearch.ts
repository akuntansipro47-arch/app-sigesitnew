import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Location } from '../types'

export async function searchLocationsServer(query: string, limit = 10): Promise<Location[]> {
  if (!supabaseConfigured || !supabase || !query.trim()) return []
  
  const { data, error } = await supabase.rpc('search_locations', {
    p_query: query.trim(),
    p_limit: limit,
  })
  
  if (error) {
    console.error('Server search failed, falling back to client search:', error)
    return []
  }
  
  return (data || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name),
    code: row.code ? String(row.code) : undefined,
    address: row.address ? String(row.address) : undefined,
    kelurahanId: row.kelurahan_id ? String(row.kelurahan_id) : undefined,
    rwId: row.rw_id ? String(row.rw_id) : undefined,
    rtId: row.rt_id ? String(row.rt_id) : undefined,
  }))
}
