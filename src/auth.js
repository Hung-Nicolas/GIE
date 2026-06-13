import { USE_SUPABASE, supabaseClient } from './config.js';

// ==================== ESTADO DE AUTENTICACIÓN ====================
let _perfil = null;

export function getPerfil() { return _perfil; }
export function setPerfil(p) { _perfil = p; }
export function setPerfilCursos(cursos) { if (_perfil) _perfil.cursos = cursos; }
export function esRegente() {
    return ['regente', 'subregente', 'rector', 'vicerector', 'jefe_de_taller'].includes(_perfil?.rol);
}

// ==================== VISIBILIDAD ====================
export function showLogin() {
    document.getElementById('login').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

export function showApp() {
    document.getElementById('login').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

// ==================== PERFIL ====================
async function cargarPerfilGIE() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.user) return null;

    const { data: perfilData, error } = await supabaseClient
        .from('perfiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !perfilData) {
        console.error('[GIE] Error cargando perfil de GIE:', error);
        return null;
    }

    if (perfilData.activo === false) {
        await supabaseClient.auth.signOut();
        return null;
    }

    _perfil = {
        id: perfilData.id,
        email: perfilData.email,
        nombre: perfilData.nombre,
        apellido: perfilData.apellido,
        rol: perfilData.rol,
        activo: perfilData.activo ?? true,
        cursos: perfilData.cursos || [],
        alumnos_pat: perfilData.alumnos_pat || []
    };
    return _perfil;
}

// ==================== SESIÓN ====================
export async function restoreSession() {
    if (!USE_SUPABASE) return null;

    try {
        return await cargarPerfilGIE();
    } catch (err) {
        console.error('[GIE] Error restaurando sesión:', err);
        _perfil = null;
        return null;
    }
}

export async function clearSession() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    _perfil = null;
    sessionStorage.clear();
    localStorage.clear();
}

// ==================== LOGIN ====================
export async function doLogin(email, password) {
    if (!USE_SUPABASE) {
        return { ok: false, error: 'Servicio de autenticación no disponible.' };
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error || !data?.session) {
        return { ok: false, error: error?.message || 'Credenciales inválidas' };
    }

    const perfil = await cargarPerfilGIE();
    if (!perfil) {
        await supabaseClient.auth.signOut();
        return { ok: false, error: 'Perfil no encontrado en GIE. Contactá al administrador.' };
    }

    return { ok: true };
}

// ==================== LOGOUT ====================
export async function doLogout() {
    await clearSession();
    showLogin();
}

// ==================== UI HELPERS ====================
export function updateAuthUI() {
    if (!_perfil) return;
    document.getElementById('userName').textContent = `${_perfil.nombre} ${_perfil.apellido}`;
    document.getElementById('userInitials').textContent = `${_perfil.nombre[0]}${_perfil.apellido[0]}`;
    document.getElementById('userRole').textContent = _perfil.rol;
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
