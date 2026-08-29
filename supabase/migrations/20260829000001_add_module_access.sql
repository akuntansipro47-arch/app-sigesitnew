-- Add module_access column to profiles table
alter table public.profiles add column if not exists module_access jsonb default '{"entry": true, "wilayah": true, "pengguna": false}';

-- Update existing users to have default module access
update public.profiles 
set module_access = '{"entry": true, "wilayah": true, "pengguna": false}'::jsonb 
where module_access is null;
