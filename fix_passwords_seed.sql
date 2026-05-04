-- Fix: Completar/actualizar usuarios demo para que funcionen con Supabase Auth
-- Ejecutar en SQL Editor → "Run without RLS"

UPDATE auth.users SET 
    encrypted_password = '$2b$10$HIdCtPUpkCj1jxGK6k.VmO/0WncVhHXu4ihaEMWTeoze7YfyXCcjC',
    aud = 'authenticated',
    role = 'authenticated',
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}',
    updated_at = now()
WHERE email = 'doe@gmail.com';

UPDATE auth.users SET 
    encrypted_password = '$2b$10$HIdCtPUpkCj1jxGK6k.VmO/0WncVhHXu4ihaEMWTeoze7YfyXCcjC',
    aud = 'authenticated',
    role = 'authenticated',
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}',
    updated_at = now()
WHERE email = 'preceptor@gie.com';

UPDATE auth.users SET 
    encrypted_password = '$2b$10$HIdCtPUpkCj1jxGK6k.VmO/0WncVhHXu4ihaEMWTeoze7YfyXCcjC',
    aud = 'authenticated',
    role = 'authenticated',
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}',
    updated_at = now()
WHERE email = 'docente@gie.com';

UPDATE auth.users SET 
    encrypted_password = '$2b$10$HIdCtPUpkCj1jxGK6k.VmO/0WncVhHXu4ihaEMWTeoze7YfyXCcjC',
    aud = 'authenticated',
    role = 'authenticated',
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}',
    updated_at = now()
WHERE email = 'regente@gie.com';

UPDATE auth.users SET 
    encrypted_password = '$2b$10$HIdCtPUpkCj1jxGK6k.VmO/0WncVhHXu4ihaEMWTeoze7YfyXCcjC',
    aud = 'authenticated',
    role = 'authenticated',
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}',
    updated_at = now()
WHERE email = 'admin@gie.com';

-- Asegurar que los perfiles tengan los datos correctos
UPDATE public.perfiles SET nombre = 'test', apellido = 'DOE', rol = 'doe', activo = true WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.perfiles SET nombre = 'test', apellido = 'preceptor', rol = 'preceptor', activo = true WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.perfiles SET nombre = 'test', apellido = 'docente', rol = 'docente', activo = true WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE public.perfiles SET nombre = 'test', apellido = 'regente', rol = 'regente', activo = true WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE public.perfiles SET nombre = 'Sistema', apellido = 'Admin', rol = 'regente', activo = true WHERE id = '55555555-5555-5555-5555-555555555555';
