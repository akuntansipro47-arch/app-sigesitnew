-- Add flag for temporary password
alter table public.profiles 
add column if not exists is_temp_password boolean default true;

-- Update existing users to have temp password flag
update public.profiles 
set is_temp_password = true
where is_temp_password is null;
