-- Fix: Actualizar contraseñas de usuarios demo a 'asd123'
UPDATE auth.users SET encrypted_password = '$2b$10$HIdCtPUpkCj1jxGK6k.VmO/0WncVhHXu4ihaEMWTeoze7YfyXCcjC' WHERE email = 'doe@gmail.com';
UPDATE auth.users SET encrypted_password = '$2b$10$HIdCtPUpkCj1jxGK6k.VmO/0WncVhHXu4ihaEMWTeoze7YfyXCcjC' WHERE email = 'preceptor@gie.com';
UPDATE auth.users SET encrypted_password = '$2b$10$HIdCtPUpkCj1jxGK6k.VmO/0WncVhHXu4ihaEMWTeoze7YfyXCcjC' WHERE email = 'docente@gie.com';
UPDATE auth.users SET encrypted_password = '$2b$10$HIdCtPUpkCj1jxGK6k.VmO/0WncVhHXu4ihaEMWTeoze7YfyXCcjC' WHERE email = 'regente@gie.com';
UPDATE auth.users SET encrypted_password = '$2b$10$HIdCtPUpkCj1jxGK6k.VmO/0WncVhHXu4ihaEMWTeoze7YfyXCcjC' WHERE email = 'admin@gie.com';
