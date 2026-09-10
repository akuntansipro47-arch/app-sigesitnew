-- Dev-only seed: creates a default super_admin so you can log in immediately.
-- Change the password after first login, then remove/skip this migration in production.
do $$
declare
  new_user_id uuid := gen_random_uuid();
  seed_email text := 'admin@sigesit.local';
  seed_password text := 'SigesitAdmin!2026';
begin
  if not exists (select 1 from auth.users where email = seed_email) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
      seed_email, crypt(seed_password, gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), new_user_id, new_user_id::text,
      jsonb_build_object('sub', new_user_id::text, 'email', seed_email),
      'email', now(), now(), now()
    );

    insert into public.profiles (id, nik, phone, full_name, username, email, role)
    values (new_user_id, '0000000000000000', '0000000000', 'Admin SIGESIT', 'admin', seed_email, 'super_admin');
  end if;
end $$;
