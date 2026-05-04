-- ============================================================
-- Fix: Actualizar contraseñas de usuarios demo con hashes bcrypt válidos
-- Ejecutar en SQL Editor → "Run without RLS"
-- ============================================================

UPDATE auth.users SET encrypted_password = '$2b$10$VrRq25kxuopBy/CgiC3Ggupda9Qj6e.ruMfHWkEAoo0uCyKQQoAkS' WHERE email = 'doe@gmail.com';
UPDATE auth.users SET encrypted_password = '$2b$10$1UqwmgE.ty0DPFS2NmKcF.G6aH263zpl0BheOEJs1xqOrBVuK4tWy' WHERE email = 'preceptor@gie.com';
UPDATE auth.users SET encrypted_password = '$2b$10$yAWHFSV0qwzy9vKkm6YTH.MiWDFgeOcHL4zSZjbyrDXjLpr/Cvpi6' WHERE email = 'docente@gie.com';
UPDATE auth.users SET encrypted_password = '$2b$10$GMwT1oLsOugeE9qA7q9Jpe3nty5mXnFtrMLM34L0NgRR4iL0B44AO' WHERE email = 'regente@gie.com';
UPDATE auth.users SET encrypted_password = '$2b$10$my1Kql.j/uZzDGtpLx4ID.x/M9Z3uxPyH.yPdfjkqdFZNECk2ZUkC' WHERE email = 'admin@gie.com';
