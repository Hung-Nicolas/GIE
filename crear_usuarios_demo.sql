-- ============================================================
-- Crear usuarios demo correctamente
-- Ejecutar en SQL Editor → "Run without RLS"
-- ============================================================

INSERT INTO auth.users (
  id, 
  instance_id, 
  aud, 
  role, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  raw_app_meta_data, 
  raw_user_meta_data, 
  created_at, 
  updated_at
) VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doe@gmail.com', '$2a$10$E9AZcqwBoBzactsE4Rbb.uWs.5sV8YPh5EzLMeXnRAvjwLXAYroGC', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'preceptor@gie.com', '$2a$10$E9AZcqwBoBzactsE4Rbb.uWs.5sV8YPh5EzLMeXnRAvjwLXAYroGC', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'docente@gie.com', '$2a$10$E9AZcqwBoBzactsE4Rbb.uWs.5sV8YPh5EzLMeXnRAvjwLXAYroGC', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'regente@gie.com', '$2a$10$E9AZcqwBoBzactsE4Rbb.uWs.5sV8YPh5EzLMeXnRAvjwLXAYroGC', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@gie.com', '$2a$10$E9AZcqwBoBzactsE4Rbb.uWs.5sV8YPh5EzLMeXnRAvjwLXAYroGC', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

-- El trigger on_auth_user_created ya creó los perfiles automáticamente.
-- Ahora actualizamos los datos de cada perfil:
UPDATE public.perfiles SET nombre = 'test', apellido = 'DOE', rol = 'doe', activo = true WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.perfiles SET nombre = 'test', apellido = 'preceptor', rol = 'preceptor', activo = true WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.perfiles SET nombre = 'test', apellido = 'docente', rol = 'docente', activo = true WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE public.perfiles SET nombre = 'test', apellido = 'regente', rol = 'regente', activo = true WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE public.perfiles SET nombre = 'Sistema', apellido = 'Admin', rol = 'regente', activo = true WHERE id = '55555555-5555-5555-5555-555555555555';
