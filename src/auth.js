import { USE_SUPABASE, supabaseClient, nexusClient, GIE_URL, GIE_KEY } from './config.js';

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

// ==================== HELPERS ====================
function mapearRolNexusAGIE(rolNexus) {
    const map = {
        regente: 'regente', subregente: 'regente', rector: 'regente', vicerector: 'regente', jefe_de_taller: 'regente',
        docente: 'docente', preceptor: 'preceptor', doe: 'doe', pat: 'pat'
    };
    return map[rolNexus] || 'docente';
}

async function obtenerRolDesdeNexus(email) {
    try {
        const { data, error } = await nexusClient
            .from('personal')
            .select('rol')
            .eq('email', email)
            .maybeSingle();
        if (error) {
            console.warn('[GIE] Error leyendo personal de Nexus:', error);
            return null;
        }
        return data?.rol || null;
    } catch (err) {
        console.warn('[GIE] Excepción leyendo personal de Nexus:', err);
        return null;
    }
}

/**
 * Valida la sesión de Nexus contra la Edge Function de GIE y genera/devuelve
 * un token_hash para iniciar sesión en GIE.
 */
async function provisionarGIE(nexusAccessToken, email, rolNexus, nombre, apellido) {
    const rolGIE = mapearRolNexusAGIE(rolNexus);

    const res = await fetch(`${GIE_URL}/functions/v1/nexus-auth-provision`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GIE_KEY}`,
            'x-nexus-auth': nexusAccessToken
        },
        body: JSON.stringify({
            rol: rolGIE,
            nombre: nombre || undefined,
            apellido: apellido || undefined
        })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success || !json.token_hash) {
        throw new Error(json.error || 'Error provisionando sesión en GIE');
    }

    return json;
}

async function iniciarSesionGIE(email, tokenHash) {
    const { data, error } = await supabaseClient.auth.verifyOtp({
        email,
        token: tokenHash,
        type: 'magiclink'
    });

    if (error || !data?.session) {
        throw new Error(error?.message || 'No se pudo iniciar sesión en GIE');
    }

    return data.session;
}

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
        // 1. Intentar recuperar sesión de GIE
        const perfil = await cargarPerfilGIE();
        if (perfil) return perfil;

        // 2. Si no hay sesión de GIE, intentar renovarla desde Nexus
        const { data: { session: nexusSession } } = await nexusClient.auth.getSession();
        if (!nexusSession?.access_token || !nexusSession?.user?.email) return null;

        const rolNexus = await obtenerRolDesdeNexus(nexusSession.user.email);
        const provision = await provisionarGIE(
            nexusSession.access_token,
            nexusSession.user.email,
            rolNexus,
            nexusSession.user.user_metadata?.nombre,
            nexusSession.user.user_metadata?.apellido
        );

        await iniciarSesionGIE(provision.email, provision.token_hash);
        return await cargarPerfilGIE();
    } catch (err) {
        console.error('[GIE] Error restaurando sesión:', err);
        _perfil = null;
        return null;
    }
}

export async function clearSession() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    if (nexusClient) await nexusClient.auth.signOut();
    _perfil = null;
    sessionStorage.clear();
    localStorage.clear();
}

// ==================== LOGIN ====================
export async function doLogin(email, password) {
    if (!USE_SUPABASE) {
        return { ok: false, error: 'Servicio de autenticación no disponible.' };
    }

    // 1. Autenticar contra Nexus
    const { data: nexusData, error: nexusError } = await nexusClient.auth.signInWithPassword({ email, password });
    if (nexusError || !nexusData?.session?.access_token) {
        return { ok: false, error: 'Credenciales inválidas' };
    }

    try {
        // 2. Obtener rol desde personal de Nexus
        const rolNexus = await obtenerRolDesdeNexus(nexusData.session.user.email);

        // 3. Provisionar usuario/sesión en GIE
        const provision = await provisionarGIE(
            nexusData.session.access_token,
            nexusData.session.user.email,
            rolNexus,
            nexusData.session.user.user_metadata?.nombre,
            nexusData.session.user.user_metadata?.apellido
        );

        // 4. Iniciar sesión en GIE con el magiclink token
        await iniciarSesionGIE(provision.email, provision.token_hash);

        // 5. Cargar perfil local
        const perfil = await cargarPerfilGIE();
        if (!perfil) {
            return { ok: false, error: 'Perfil no encontrado en GIE. Contactá al administrador.' };
        }

        return { ok: true };
    } catch (err) {
        console.error('[GIE] Error en doLogin:', err);
        await nexusClient.auth.signOut();
        await supabaseClient.auth.signOut();
        return { ok: false, error: err.message || 'Error iniciando sesión en GIE' };
    }
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
