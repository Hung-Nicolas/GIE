import { USE_SUPABASE, supabaseClient } from './config.js';

// ==================== ESTADO DE AUTENTICACIÓN ====================
let _perfil = null;

export function getPerfil() { return _perfil; }
export function setPerfil(p) { _perfil = p; }
export function setPerfilCursos(cursos) { if (_perfil) _perfil.cursos = cursos; }
export function esRegente() { return _perfil?.rol === 'regente'; }

// ==================== VISIBILIDAD ====================
export function showLogin() {
    document.getElementById('login').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

export function showApp() {
    document.getElementById('login').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

// ==================== SESIÓN ====================
export async function restoreSession() {
    if (!USE_SUPABASE) return null;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.user) return null;

        const { data: perfilData } = await supabaseClient
            .from('perfiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (!perfilData || perfilData.activo === false) {
            await supabaseClient.auth.signOut();
            _perfil = null;
            return null;
        }

        _perfil = {
            id: perfilData.id,
            email: perfilData.email,
            nombre: perfilData.nombre,
            apellido: perfilData.apellido,
            rol: perfilData.rol,
            cursos: perfilData.cursos || [],
            alumnos_pat: perfilData.alumnos_pat || []
        };
        // Sesión restaurada
        return _perfil;
    } catch (err) {
        // Error restaurando sesión
        _perfil = null;
        return null;
    }
}

export function clearSession() {
    if (USE_SUPABASE) supabaseClient.auth.signOut();
    _perfil = null;
    sessionStorage.clear();
    localStorage.clear();
}

// ==================== LOGIN ====================
export async function doLogin(email, password) {
    if (!USE_SUPABASE) {
        return { ok: false, error: 'Servicio de autenticación no disponible.' };
    }

    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
        return { ok: false, error: 'Credenciales inválidas' };
    }

    const { data: perfilData } = await supabaseClient
        .from('perfiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

    if (!perfilData) {
        await supabaseClient.auth.signOut();
        return { ok: false, error: 'Perfil no encontrado. Contactá al administrador.' };
    }
    if (perfilData.activo === false) {
        await supabaseClient.auth.signOut();
        return { ok: false, error: 'Usuario desactivado. Contactá al administrador.' };
    }

    _perfil = {
        id: perfilData.id,
        email: perfilData.email,
        nombre: perfilData.nombre,
        apellido: perfilData.apellido,
        rol: perfilData.rol,
        cursos: perfilData.cursos || [],
        alumnos_pat: perfilData.alumnos_pat || []
    };
    // Login exitoso
    return { ok: true };
}

// ==================== LOGOUT ====================
export async function doLogout() {
    clearSession();
    showLogin();
}

// ==================== UI HELPERS ====================
export function updateAuthUI() {
    if (!_perfil) return;
    document.getElementById('userName').textContent = `${_perfil.nombre} ${_perfil.apellido}`;
    document.getElementById('userInitials').textContent = `${_perfil.nombre[0]}${_perfil.apellido[0]}`;
    document.getElementById('userRole').textContent = _perfil.rol;

    const btnUsuarios = document.getElementById('btnUsuarios');
    if (btnUsuarios) {
        if (_perfil.rol === 'regente') btnUsuarios.classList.remove('hidden');
        else btnUsuarios.classList.add('hidden');
    }
}

export function setupLoginForm(onSuccess, onError) {
    const form = document.getElementById('loginForm');
    const btn = document.getElementById('txtBtn');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        if (btn) btn.textContent = 'Verificando...';

        const result = await doLogin(email, password);
        if (btn) btn.textContent = 'Ingresar';

        if (result.ok) {
            form.reset();
            if (onSuccess) onSuccess(_perfil);
        } else {
            if (onError) onError(result.error);
        }
    });
}

export function setupLogoutButton(onLogout) {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        await doLogout();
        if (onLogout) onLogout();
    });
}

export function setupLoginBanner() {
    const demoCreds = document.getElementById('demoCreds');
    const modoDemoBox = document.getElementById('modoDemoBox');

    if (demoCreds) demoCreds.classList.add('hidden');
    if (modoDemoBox) modoDemoBox.classList.add('hidden');

    const loginCard = document.querySelector('#login .bg-white');
    if (!USE_SUPABASE) {
        if (loginCard && !loginCard.querySelector('.no-supabase-banner')) {
            const banner = document.createElement('div');
            banner.className = 'mt-4 p-3 bg-red-50 rounded-lg border border-red-200 text-center no-supabase-banner';
            banner.innerHTML = '<p class="text-xs text-red-700"><i class="fas fa-exclamation-circle mr-1"></i> Supabase no configurado. La autenticación no está disponible.</p>';
            loginCard.appendChild(banner);
        }
    }
}
