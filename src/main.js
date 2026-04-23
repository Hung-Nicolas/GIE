import Chart from 'chart.js/auto';
import html2pdf from 'html2pdf.js';
import { USE_SUPABASE, supabaseClient } from './config.js';
import { getPerfil, esRegente, showLogin, showApp, restoreSession, doLogout, updateAuthUI, setupLoginForm, setupLoginBanner } from './auth.js';
import './styles.css';

// ==================== ESTADO GLOBAL ====================
let alumnos = [];
let informes = [];
let usuarios = [];
let charts = {};
let rechazoId = null;
let calCurrentDate = new Date();
let calSelectedDate = null;
let plantillas = [];

// ==================== PLANTILLAS DE INFORMES ====================
const PLANTILLAS_INFORME = {
    interrupcion: {
        titulo: 'Interrupción reiterada de clase',
        instancia: 'leve',
        resumen: 'El alumno interrumpió la clase en múltiples ocasiones pese a las advertencias del docente. Se solicitó que mantenga silencio y respete los turnos de palabra, pero persistió en la conducta disruptiva.'
    },
    falta_respeto_companero: {
        titulo: 'Falta de respeto hacia un compañero',
        instancia: 'grave',
        resumen: 'Durante el recreo, el alumno utilizó un lenguaje inapropiado e irrespetuoso hacia un compañero, generando un incidente que afectó el clima del aula.'
    },
    celular_clase: {
        titulo: 'Uso de celular durante clase',
        instancia: 'leve',
        resumen: 'El alumno fue sorprendido utilizando su teléfono celular durante el desarrollo de la clase, a pesar de las normas establecidas de no uso de dispositivos.'
    },
    llegadas_tarde: {
        titulo: 'Llegadas tarde consecutivas',
        instancia: 'leve',
        resumen: 'El alumno acumula llegadas tarde sin justificación en el período evaluado. Se le ha llamado la atención en reiteradas oportunidades.'
    },
    plagio: {
        titulo: 'Plagio en trabajo práctico',
        instancia: 'grave',
        resumen: 'Se detectó que el trabajo práctico presentado por el alumno fue copiado de internet sin citar las fuentes correspondientes, infringiendo las normas de integridad académica.'
    },
    celular_evaluacion: {
        titulo: 'Uso de celular durante evaluación',
        instancia: 'muy_grave',
        resumen: 'El alumno fue sorprendido utilizando su teléfono celular durante una evaluación escrita, vulnerando la seriedad del examen y las normas de conducta establecidas.'
    },
    agresion_docente: {
        titulo: 'Agresión verbal a docente',
        instancia: 'muy_grave',
        resumen: 'El alumno dirigió insultos y expresiones ofensivas al docente al ser llamado la atención por su conducta, faltando gravemente al respeto debido.'
    },
    ausencia: {
        titulo: 'Ausencia injustificada',
        instancia: 'leve',
        resumen: 'El alumno faltó a clases sin presentar justificación válida. Se intentó contactar a los responsables sin obtener respuesta.'
    },
    grafitti: {
        titulo: 'Grafitti en baño',
        instancia: 'grave',
        resumen: 'Se identificó al alumno realizando dibujos y escrituras en las paredes del baño de varones, causando daños materiales al establecimiento.'
    },
    materiales: {
        titulo: 'Olvido de materiales reiterado',
        instancia: 'leve',
        resumen: 'El alumno olvidó los materiales necesarios para la clase por tercera vez en el período, a pesar de las recomendaciones previas.'
    },
    no_entrega: {
        titulo: 'No entrega de tarea',
        instancia: 'leve',
        resumen: 'La alumna no cumplió con la entrega del trabajo asignado dentro del plazo establecido, sin presentar justificación válida.'
    },
    alteracion: {
        titulo: 'Alteración del orden en clase',
        instancia: 'leve',
        resumen: 'El alumno generó disturbios y alteró el orden durante el desarrollo de la clase, impidiendo la normal continuidad de las actividades.'
    }
};

// --- Carga inicial de datos ---
async function cargarAlumnos() {
    if (!USE_SUPABASE) return;
    const { data, error } = await supabaseClient.from('alumnos').select('*').eq('activo', true).order('apellido');
    if (error) { mostrarToast('Error cargando alumnos', 'error'); return; }
    alumnos = data || [];
    // Alumnos cargados
    // Poblar filtro de cursos
    const cursos = [...new Set(alumnos.map(a => a.curso))].sort();
    const select = document.getElementById('filtroCurso');
    select.innerHTML = '<option value="">Todos los cursos</option>';
    cursos.forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);
}

async function cargarInformes() {
    if (!USE_SUPABASE) return;
    let query = supabaseClient.from('informes')
        .select('*, alumno:alumnos(nombre, apellido, curso, division), creador:perfiles!informes_creado_por_fkey(nombre, apellido), revisor:perfiles!informes_revisado_por_fkey(nombre, apellido), fecha_reunion')
        .order('fecha_creacion', { ascending: false });
    if (getPerfil().rol !== 'regente') query = query.eq('creado_por', getPerfil().id);
    const { data, error } = await query;
    if (error) { mostrarToast('Error cargando informes', 'error'); return; }
    informes = data || [];
    // Informes cargados
}

async function cargarUsuariosSupa() {
    if (!USE_SUPABASE) return;
    const { data, error } = await supabaseClient.rpc('listar_usuarios_completos');
    if (error) { mostrarToast('Error cargando usuarios', 'error'); return; }
    usuarios = data || [];
    // Usuarios cargados
}

// --- Helpers de acceso sincrónico ---
function getAlumno(id) { return alumnos.find(a => a.id === id); }
function getInforme(id) { return informes.find(i => i.id === id); }
function getNombreUsuario(id) {
    if (!id) return 'N/A';
    const u = usuarios.find(x => x.id === id);
    return u ? `${u.apellido}, ${u.nombre}` : 'N/A';
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    setupLoginBanner();
    setupLoginForm(
        async () => { await iniciarApp(); },
        (error) => { mostrarToast(error, 'error'); }
    );
    setupEventListeners();

    if (!USE_SUPABASE) {
        showLogin();
        return;
    }

    const perfil = await restoreSession();
    if (!perfil) {
        showLogin();
        return;
    }

    await iniciarApp();
});

async function iniciarApp() {
    updateAuthUI();
    await Promise.all([cargarAlumnos(), cargarInformes(), cargarPlantillas()]);
    initFiltros();

    // Navegación según rol
    const esRegente = getPerfil()?.rol === 'regente';
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const section = btn.dataset.section;
        if (section === 'dashboard' || section === 'estadisticas') {
            btn.classList.toggle('hidden', !esRegente);
        }
    });

    if (esRegente) {
        showSection('dashboard');
    } else {
        showSection('informes');
    }
    showApp();
}

function setupEventListeners() {
    document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
    document.getElementById('overlay').addEventListener('click', toggleSidebar);

    // Navegación lateral
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            if (section) showSection(section);
        });
    });

    let debounceTimer;
    const searchAlumno = document.getElementById('searchAlumno');
    if (searchAlumno) {
        searchAlumno.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => buscarAlumno(e.target.value), 300);
        });
    }

    ['filtroBusqueda', 'filtroCurso', 'filtroEstado', 'filtroInstancia'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', filtrarInformes);
        if (id === 'filtroBusqueda') el.addEventListener('input', filtrarInformes);
    });

    const formInforme = document.getElementById('formInforme');
    if (formInforme) formInforme.addEventListener('submit', guardarInforme);

    const selectPlantilla = document.getElementById('plantillaInforme');
    if (selectPlantilla) {
        selectPlantilla.addEventListener('change', (e) => {
            const key = e.target.value;
            if (!key) return;
            let p = PLANTILLAS_INFORME[key];
            // Si no es predefinida, buscar en plantillas personalizadas
            if (!p && plantillas.length > 0) {
                p = plantillas.find(pl => pl.id === key);
            }
            if (!p) return;
            document.getElementById('titulo').value = p.titulo;
            document.getElementById('resumen').value = p.resumen;
            document.getElementById('instancia').value = p.instancia;
            // Hacer foco en el campo de descargo para que el docente complete la sanción
            document.getElementById('descargo').focus();
        });
    }

    const formUsuario = document.getElementById('formUsuario');
    if (formUsuario) formUsuario.addEventListener('submit', crearUsuario);

    const modalDetalle = document.getElementById('modalDetalle');
    if (modalDetalle) {
        modalDetalle.addEventListener('click', (e) => {
            if (e.target.id === 'modalDetalle') cerrarModal();
        });
    }
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModal);

    const btnCerrarRechazo = document.getElementById('btn-cerrar-rechazo');
    if (btnCerrarRechazo) btnCerrarRechazo.addEventListener('click', cerrarModalRechazo);

    const btnConfirmarRechazo = document.getElementById('btn-confirmar-rechazo');
    if (btnConfirmarRechazo) btnConfirmarRechazo.addEventListener('click', confirmarRechazo);

    const modalRechazo = document.getElementById('modalRechazo');
    if (modalRechazo) {
        modalRechazo.addEventListener('click', (e) => {
            if (e.target.id === 'modalRechazo') cerrarModalRechazo();
        });
    }

    const calPrev = document.getElementById('calPrev');
    const calNext = document.getElementById('calNext');
    if (calPrev) calPrev.addEventListener('click', () => { calCurrentDate.setMonth(calCurrentDate.getMonth() - 1); calSelectedDate = null; actualizarDashboard(); });
    if (calNext) calNext.addEventListener('click', () => { calCurrentDate.setMonth(calCurrentDate.getMonth() + 1); calSelectedDate = null; actualizarDashboard(); });
    const calVerTodos = document.getElementById('calVerTodos');
    if (calVerTodos) calVerTodos.addEventListener('click', () => { calSelectedDate = null; renderCalendarioReuniones(); renderReunionesDiaSeleccionado(); });

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', logout);

    ['filtroAlumnoCurso', 'filtroAlumnoDivision'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', filtrarAlumnos);
    });
    const filtroAlumnoNombre = document.getElementById('filtroAlumnoNombre');
    if (filtroAlumnoNombre) filtroAlumnoNombre.addEventListener('input', filtrarAlumnos);

    const btnVolverNuevo = document.getElementById('btn-volver-nuevo');
    if (btnVolverNuevo) btnVolverNuevo.addEventListener('click', () => showSection('informes'));

    const btnVolverAlumno = document.getElementById('btn-volver-alumno');
    if (btnVolverAlumno) btnVolverAlumno.addEventListener('click', () => showSection('informes'));

    // Suscripción realtime (solo Supabase)
    if (USE_SUPABASE) {
        supabaseClient.channel('informes_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'informes' }, async () => {
                await cargarInformes();
                if (!document.getElementById('informes').classList.contains('hidden')) filtrarInformes();
                if (!document.getElementById('dashboard').classList.contains('hidden')) actualizarDashboard();
            })
            .subscribe();
    }
}

// ==================== NAVEGACIÓN ====================
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => {
        if (b.dataset.section === sectionId) b.classList.add('bg-slate-800', 'text-blue-400');
        else b.classList.remove('bg-slate-800', 'text-blue-400');
    });
    if (sectionId === 'estadisticas') cargarEstadisticas();
    if (sectionId === 'usuarios') cargarUsuarios();
    if (sectionId === 'dashboard') actualizarDashboard();
    if (sectionId === 'informes') filtrarInformes();
    if (sectionId === 'alumnos') filtrarAlumnos();
    if (window.innerWidth < 1024) {
        document.getElementById('sidebar').classList.add('sidebar-hidden');
        document.getElementById('overlay').classList.add('hidden');
    }
    window.scrollTo(0,0);
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('sidebar-hidden');
    document.getElementById('overlay').classList.toggle('hidden');
}

let _logoutCountdownInterval = null;

async function logout() {
    mostrarModalLogout();
}

function mostrarModalLogout() {
    const modal = document.getElementById('modalLogout');
    const btn = document.getElementById('btn-confirmar-logout');
    const countdownEl = document.getElementById('logoutCountdown');
    if (!modal || !btn || !countdownEl) return;

    modal.classList.remove('hidden');
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    btn.classList.remove('hover:bg-red-700');

    let segundos = 5;
    countdownEl.textContent = segundos;

    if (_logoutCountdownInterval) clearInterval(_logoutCountdownInterval);
    _logoutCountdownInterval = setInterval(() => {
        segundos--;
        countdownEl.textContent = segundos;
        if (segundos <= 0) {
            clearInterval(_logoutCountdownInterval);
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            btn.classList.add('hover:bg-red-700');
            btn.innerHTML = 'Cerrar sesión';
        }
    }, 1000);
}

window.cerrarModalLogout = function() {
    const modal = document.getElementById('modalLogout');
    if (modal) modal.classList.add('hidden');
    if (_logoutCountdownInterval) {
        clearInterval(_logoutCountdownInterval);
        _logoutCountdownInterval = null;
    }
    // Restaurar texto del botón para la próxima vez
    const btn = document.getElementById('btn-confirmar-logout');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.innerHTML = 'Cerrar (<span id="logoutCountdown">5</span>)';
    }
};

window.confirmarLogout = async function() {
    cerrarModalLogout();
    await doLogout();
    alumnos = [];
    informes = [];
    usuarios = [];
    document.getElementById('sidebar').classList.add('sidebar-hidden');
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('loginForm').reset();
};

// ==================== UTILIDADES ====================
function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatearFechaCorta(fecha) {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function generarId() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2); }
function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMsg');
    msg.textContent = mensaje;
    icon.className = tipo === 'error' ? 'fas fa-exclamation-circle text-red-400' : 'fas fa-check-circle text-green-400';
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}

// ==================== ALUMNOS ====================
function initFiltros() {
    // Ya se poblaron en cargarAlumnos
}

function buscarAlumno(query) {
    const resultados = document.getElementById('resultadosAlumno');
    if (!query || query.length < 2) { resultados.classList.add('hidden'); return; }
    const filtrados = alumnos.filter(a =>
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(query.toLowerCase()) ||
        `${a.apellido} ${a.nombre}`.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
    const btnCrear = document.getElementById('btn-crear-alumno-inline');
    if (filtrados.length === 0) {
        resultados.innerHTML = '<div class="p-3 text-sm text-slate-500">No se encontraron alumnos</div>';
        if (btnCrear) btnCrear.classList.remove('hidden');
    } else {
        resultados.innerHTML = filtrados.map(a => `
            <div onclick="seleccionarAlumno('${a.id}', '${a.nombre}', '${a.apellido}', '${a.curso}', '${a.division}')"
                class="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                <p class="font-medium text-sm">${a.apellido}, ${a.nombre}</p>
                <p class="text-xs text-slate-500">${a.curso} ${a.division}</p>
            </div>`).join('');
        if (btnCrear) btnCrear.classList.add('hidden');
    }
    resultados.classList.remove('hidden');
}

function seleccionarAlumno(id, nombre, apellido, curso, division) {
    document.getElementById('alumnoId').value = id;
    document.getElementById('alumnoNombre').textContent = `${apellido}, ${nombre}`;
    document.getElementById('alumnoCurso').textContent = `${curso} ${division}`;
    document.getElementById('alumnoSeleccionado').classList.remove('hidden');
    document.getElementById('resultadosAlumno').classList.add('hidden');
    document.getElementById('searchAlumno').value = '';
}

function limpiarAlumno() {
    document.getElementById('alumnoId').value = '';
    document.getElementById('alumnoSeleccionado').classList.add('hidden');
    const btnCrear = document.getElementById('btn-crear-alumno-inline');
    if (btnCrear) btnCrear.classList.add('hidden');
}

// ==================== ALUMNOS - LISTADO ====================
function filtrarAlumnos() {
    const curso = document.getElementById('filtroAlumnoCurso')?.value || '';
    const division = document.getElementById('filtroAlumnoDivision')?.value || '';
    const nombre = document.getElementById('filtroAlumnoNombre')?.value.toLowerCase().trim() || '';

    // Eliminar duplicados por ID (defensa contra datos corruptos)
    const unicos = [...new Map(alumnos.map(a => [a.id, a])).values()];

    const filtrados = unicos.filter(a => {
        const matchCurso = !curso || a.curso === curso;
        const matchDivision = !division || a.division === division;
        const matchNombre = !nombre ||
            `${a.nombre} ${a.apellido}`.toLowerCase().includes(nombre) ||
            `${a.apellido} ${a.nombre}`.toLowerCase().includes(nombre);
        return matchCurso && matchDivision && matchNombre;
    });

    renderizarAlumnos(filtrados);
}

function renderizarAlumnos(lista) {
    const container = document.getElementById('listaAlumnos');
    const empty = document.getElementById('alumnosEmpty');
    if (!container) return;

    if (lista.length === 0) {
        container.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');

    // Calcular cantidad de informes por alumno
    const informesPorAlumno = {};
    informes.forEach(i => {
        informesPorAlumno[i.alumno_id] = (informesPorAlumno[i.alumno_id] || 0) + 1;
    });

    // Ordenar: primero los que tienen más informes, luego por apellido
    const ordenados = lista.slice().sort((a, b) => {
        const cantA = informesPorAlumno[a.id] || 0;
        const cantB = informesPorAlumno[b.id] || 0;
        if (cantB !== cantA) return cantB - cantA; // más informes primero
        return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`);
    });

    container.innerHTML = ordenados.map(a => {
        const cant = informesPorAlumno[a.id] || 0;
        return `
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer" onclick="verAlumno('${a.id}')">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    ${a.nombre[0]}${a.apellido[0]}
                </div>
                <div>
                    <h3 class="font-semibold text-slate-800 text-sm">${a.apellido}, ${a.nombre}</h3>
                    <p class="text-xs text-slate-500">${a.curso} ${a.division}</p>
                </div>
            </div>
            <div class="flex items-center justify-between pt-3 border-t border-slate-100">
                <span class="text-xs ${cant > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}">${cant} informe${cant !== 1 ? 's' : ''}</span>
                <span class="text-xs text-blue-600 font-medium">Ver historial <i class="fas fa-arrow-right text-xs"></i></span>
            </div>
        </div>
    `}).join('');
}

// ==================== INFORMES - CRUD ====================
function filtrarInformes() {
    const busqueda = document.getElementById('filtroBusqueda').value.toLowerCase();
    const curso = document.getElementById('filtroCurso').value;
    const estado = document.getElementById('filtroEstado').value;
    const instancia = document.getElementById('filtroInstancia').value;
    const filtrados = informes.filter(i => {
        const alumno = getAlumno(i.alumno_id);
        const matchBusqueda = !busqueda ||
            `${alumno?.apellido || ''} ${alumno?.nombre || ''}`.toLowerCase().includes(busqueda) ||
            i.titulo.toLowerCase().includes(busqueda) ||
            i.resumen.toLowerCase().includes(busqueda);
        const matchCurso = !curso || (alumno && alumno.curso === curso);
        const matchEstado = !estado || i.estado === estado;
        const matchInstancia = !instancia || i.instancia === instancia;
        return matchBusqueda && matchCurso && matchEstado && matchInstancia;
    });
    renderizarInformes(filtrados);
}

function renderizarInformes(lista) {
    const contenedor = document.getElementById('listaInformes');
    const sinResultados = document.getElementById('sinResultados');
    if (lista.length === 0) { contenedor.innerHTML = ''; sinResultados.classList.remove('hidden'); return; }
    sinResultados.classList.add('hidden');
    const esRegente = getPerfil()?.rol === 'regente';
    contenedor.innerHTML = lista.map(i => {
        const alumno = getAlumno(i.alumno_id);
        const accionesRapidas = (esRegente && i.estado === 'pendiente') ? `
            <div class="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button onclick="event.stopPropagation(); accionRapidaAprobar('${i.id}', this)" class="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1">
                    <i class="fas fa-check"></i> Aprobar
                </button>
                <button onclick="event.stopPropagation(); accionRapidaRechazar('${i.id}', this)" class="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1">
                    <i class="fas fa-times"></i> Rechazar
                </button>
            </div>` : '';
        return `
        <div id="item-${i.id}" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-all instancia-${i.instancia}">
            <div class="flex flex-col sm:flex-row justify-between items-start gap-3" onclick="verDetalle('${i.id}')">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <span class="status-${i.estado} px-2 py-0.5 rounded-full text-xs font-medium capitalize">${i.estado.replace('_', ' ')}</span>
                        <span class="text-xs text-slate-500">${formatearFechaCorta(i.fecha_creacion)}</span>
                    </div>
                    <h3 class="font-semibold text-slate-800 mb-1">${i.titulo}</h3>
                    <p class="text-sm text-slate-600 mb-2"><i class="fas fa-user mr-1"></i>${alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Desconocido'} • ${alumno ? `${alumno.curso} ${alumno.division}` : ''}</p>
                    <p class="text-sm text-slate-500 line-clamp-2">${i.resumen}</p>
                </div>
                <div class="flex items-center gap-2">
                    ${i.instancia === 'muy_grave' ? '<i class="fas fa-exclamation-triangle text-red-500" title="Muy Grave"></i>' : ''}
                    <i class="fas fa-chevron-right text-slate-400"></i>
                </div>
            </div>
            ${accionesRapidas}
        </div>`;
    }).join('');
}

window.accionRapidaAprobar = async function(id, btn) {
    const item = document.getElementById('item-' + id);
    if (!item) return;
    mostrarModalFechaReunion(id, async (informeId, fechaReunion) => {
        btn.innerHTML = '<span class="btn-spinner"></span>';
        btn.disabled = true;
        await new Promise(r => setTimeout(r, 300));
        item.classList.add('animate-slide-out');
        await new Promise(r => setTimeout(r, 400));
        item.remove();
        await cambiarEstado(informeId, 'aprobado', { cerrarModal: false, recargarLista: false, fecha_reunion: fechaReunion });
    });
};

window.accionRapidaRechazar = function(id, btn) {
    const item = document.getElementById('item-' + id);
    if (!item) return;
    // Guardar referencia para animar al confirmar
    window._rechazoItemId = id;
    window._rechazoItemEl = item;
    mostrarRechazo(id);
};

window.aprobarDesdeDashboard = async function(id, btn) {
    const item = document.getElementById('dash-item-' + id);
    if (!item) return;
    mostrarModalFechaReunion(id, async (informeId, fechaReunion) => {
        btn.innerHTML = '<span class="btn-spinner"></span>';
        btn.disabled = true;
        await new Promise(r => setTimeout(r, 300));
        item.classList.add('animate-slide-out');
        await new Promise(r => setTimeout(r, 400));
        item.remove();
        await cambiarEstado(informeId, 'aprobado', { cerrarModal: false, recargarLista: false, fecha_reunion: fechaReunion });
    });
};

window.rechazarDesdeDashboard = function(id, btn) {
    const item = document.getElementById('dash-item-' + id);
    if (!item) return;
    window._rechazoItemId = id;
    window._rechazoItemEl = item;
    mostrarRechazo(id);
};

window.aprobarConAnimacion = async function(id, btn) {
    mostrarModalFechaReunion(id, async (informeId, fechaReunion) => {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner mr-2"></span> Aprobando...';
        await new Promise(r => setTimeout(r, 500));
        btn.innerHTML = '<i class="fas fa-check animate-pop mr-2"></i> Aprobado';
        btn.classList.remove('bg-green-600', 'hover:bg-green-700');
        btn.classList.add('bg-green-700');
        await new Promise(r => setTimeout(r, 400));
        await cambiarEstado(informeId, 'aprobado', { fecha_reunion: fechaReunion });
    });
};

async function guardarInforme(e) {
    e.preventDefault();
    const alumnoId = document.getElementById('alumnoId').value;
    if (!alumnoId) return mostrarToast('Debe seleccionar un alumno', 'error');
    const editId = document.getElementById('editId').value;
    const titulo = document.getElementById('titulo').value.trim();
    const resumen = document.getElementById('resumen').value.trim();
    const descargo = document.getElementById('descargo').value.trim();
    const observaciones = document.getElementById('observaciones').value.trim();

    // Validación de límites
    if (titulo.length > 200) return mostrarToast('El título no puede exceder 200 caracteres', 'error');
    if (resumen.length > 2000) return mostrarToast('La descripción no puede exceder 2000 caracteres', 'error');
    if (descargo.length > 1000) return mostrarToast('La sanción no puede exceder 1000 caracteres', 'error');
    if (observaciones.length > 1000) return mostrarToast('Las observaciones no pueden exceder 1000 caracteres', 'error');

    const datos = {
        alumno_id: alumnoId,
        tipo_falta: 'Otra',
        instancia: document.getElementById('instancia').value,
        titulo,
        resumen,
        descargo: descargo || null,
        observaciones: observaciones || null
    };

    if (editId) {
        const inf = getInforme(editId);
        if (!inf) return mostrarToast('Informe no encontrado', 'error');
        if (inf.estado === 'aprobado') return mostrarToast('No se puede editar un informe aprobado', 'error');
        if (inf.creado_por !== getPerfil().id && getPerfil().rol !== 'regente') return mostrarToast('No tiene permiso para editar', 'error');

        const { error } = await supabaseClient.from('informes').update(datos).eq('id', editId);
        if (error) { return mostrarToast('Error actualizando informe', 'error'); }
        // Informe actualizado
        await cargarInformes();
        mostrarToast('Informe actualizado correctamente');
    } else {
        const nuevo = {
            id: generarId(),
            ...datos,
            estado: 'pendiente',
            creado_por: getPerfil().id,
            revisado_por: null,
            fecha_creacion: new Date().toISOString(),
            fecha_revision: null,
            motivo_rechazo: null
        };
        const { error } = await supabaseClient.from('informes').insert(nuevo);
        if (error) { return mostrarToast('Error guardando informe', 'error'); }
        // Informe creado
        await cargarInformes();
        mostrarToast('Informe creado correctamente');
    }
    cancelarForm();
    showSection('informes');
}

function cancelarForm() {
    document.getElementById('formInforme').reset();
    limpiarAlumno();
    document.getElementById('searchAlumno').value = '';
    document.getElementById('resultadosAlumno').classList.add('hidden');
    document.getElementById('plantillaInforme').value = '';
    document.getElementById('editId').value = '';
    document.getElementById('tituloForm').textContent = 'Nuevo Informe';
    document.getElementById('txtBtnGuardar').textContent = 'Guardar Informe';
}

// ==================== DETALLE Y ACCIONES ====================
function verDetalle(id) {
    const informe = getInforme(id);
    if (!informe) return;
    const alumno = getAlumno(informe.alumno_id);
    const modal = document.getElementById('modalDetalle');
    const contenido = document.getElementById('contenidoModal');
    const acciones = document.getElementById('accionesModal');

    contenido.innerHTML = `
        <div class="flex items-center gap-3 mb-4 flex-wrap">
            <span class="status-${informe.estado} px-3 py-1 rounded-full text-sm font-medium capitalize">${informe.estado.replace('_', ' ')}</span>
            <span class="text-sm text-slate-500">${formatearFecha(informe.fecha_creacion)}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors" onclick="verAlumno('${alumno?.id}')">
                <p class="text-xs text-slate-500 mb-1">Alumno</p>
                <p class="font-medium">${alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Desconocido'}</p>
                <p class="text-sm text-slate-600">${alumno ? `${alumno.curso} ${alumno.division}` : ''}</p>
                <p class="text-xs text-blue-600 mt-1"><i class="fas fa-eye mr-1"></i>Ver resumen</p>
            </div>
            <div class="p-3 bg-slate-50 rounded-lg">
                <p class="text-xs text-slate-500 mb-1">Creado por</p>
                <p class="font-medium">${getNombreUsuario(informe.creado_por)}</p>
            </div>
        </div>
        <div class="space-y-4">
            <div><p class="text-sm font-medium text-slate-700 mb-1">Título</p><p class="text-slate-600">${informe.titulo}</p></div>
            <div class="grid grid-cols-2 gap-4">
                <div><p class="text-sm font-medium text-slate-700 mb-1">Instancia</p>
                    <p class="text-slate-600 capitalize font-medium ${informe.instancia === 'muy_grave' ? 'text-red-600' : informe.instancia === 'grave' ? 'text-orange-600' : 'text-amber-600'}">${informe.instancia.replace('_', ' ')}</p>
                </div>
                <div><p class="text-sm font-medium text-slate-700 mb-1">Creado por</p><p class="text-slate-600">${getNombreUsuario(informe.creado_por)}</p></div>
            </div>
            <div><p class="text-sm font-medium text-slate-700 mb-1">Descripción de la problemática</p><p class="text-slate-600 whitespace-pre-wrap">${informe.resumen}</p></div>
            ${informe.descargo ? `<div class="p-3 bg-amber-50 border border-amber-200 rounded-lg"><p class="text-sm font-medium text-amber-800 mb-1">Solicitud de sanción</p><p class="text-amber-700 whitespace-pre-wrap">${informe.descargo}</p></div>` : ''}
            ${informe.observaciones ? `<div class="p-3 bg-blue-50 border border-blue-200 rounded-lg"><p class="text-sm font-medium text-blue-800 mb-1">Observaciones</p><p class="text-blue-700 whitespace-pre-wrap">${informe.observaciones}</p></div>` : ''}
            ${informe.motivo_rechazo ? `<div class="p-3 bg-red-50 border border-red-200 rounded-lg"><p class="text-sm font-medium text-red-800 mb-1">Motivo del rechazo</p><p class="text-red-700">${informe.motivo_rechazo}</p></div>` : ''}
            ${informe.fecha_revision ? `<div class="text-sm text-slate-500"><i class="fas fa-check-double mr-1"></i>Revisado por ${getNombreUsuario(informe.revisado_por)} el ${formatearFecha(informe.fecha_revision)}</div>` : ''}
        </div>
    `;

    acciones.innerHTML = '';
    if (informe.creado_por === getPerfil().id && informe.estado === 'pendiente') {
        acciones.innerHTML += `<button onclick="editarInforme('${informe.id}')" class="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"><i class="fas fa-edit mr-2"></i>Editar</button>`;
    }
    if (getPerfil().rol === 'regente') {
        if (informe.estado === 'pendiente') {
            acciones.innerHTML += `
                <button id="btn-modal-aprobar-${informe.id}" onclick="aprobarConAnimacion('${informe.id}', this)" class="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"><i class="fas fa-check mr-2"></i>Aprobar</button>
                <button onclick="mostrarRechazo('${informe.id}')" class="flex-1 min-w-[120px] bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"><i class="fas fa-times mr-2"></i>Rechazar</button>`;
        }
        if (informe.estado === 'rechazado') {
            acciones.innerHTML += `<button onclick="cambiarEstado('${informe.id}', 'pendiente')" class="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"><i class="fas fa-redo mr-2"></i>Reactivar</button>`;
        }
    }
    acciones.innerHTML += `<button onclick="exportarPDF('${informe.id}')" class="min-w-[120px] bg-slate-600 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors"><i class="fas fa-file-pdf mr-2"></i>PDF</button>`;
    modal.classList.remove('hidden');
}

function cerrarModal() { document.getElementById('modalDetalle').classList.add('hidden'); }

async function cambiarEstado(id, nuevoEstado, options = {}) {
    const { silent = false, cerrarModal: debeCerrarModal = true, recargarLista = true, fecha_reunion } = options;
    const updates = {
        estado: nuevoEstado,
        revisado_por: getPerfil().id,
        fecha_revision: new Date().toISOString()
    };
    if (nuevoEstado !== 'rechazado') updates.motivo_rechazo = null;
    if (fecha_reunion !== undefined) updates.fecha_reunion = fecha_reunion;

    const { error } = await supabaseClient.from('informes').update(updates).eq('id', id);
    if (error) { return mostrarToast('Error actualizando estado', 'error'); }
    // Estado cambiado
    await cargarInformes();
    if (!silent) mostrarToast(`Informe ${nuevoEstado.replace('_', ' ')} correctamente`);
    if (debeCerrarModal) cerrarModal();
    if (recargarLista) filtrarInformes();
    actualizarDashboard();
}

function mostrarRechazo(id) {
    rechazoId = id;
    document.getElementById('modalRechazo').classList.remove('hidden');
    document.getElementById('motivoRechazo').value = '';
    const modalContent = document.getElementById('modalRechazo').querySelector('.bg-white');
    if (modalContent) {
        modalContent.classList.remove('animate-fade-in');
        void modalContent.offsetWidth; // trigger reflow
        modalContent.classList.add('animate-fade-in');
    }
}
function cerrarModalRechazo() {
    document.getElementById('modalRechazo').classList.add('hidden');
    rechazoId = null;
    window._rechazoItemId = null;
    window._rechazoItemEl = null;
}
async function confirmarRechazo() {
    const motivo = document.getElementById('motivoRechazo').value.trim();
    const btnConfirmar = document.getElementById('btn-confirmar-rechazo');
    if (!motivo) {
        const textarea = document.getElementById('motivoRechazo');
        textarea.classList.add('animate-shake');
        setTimeout(() => textarea.classList.remove('animate-shake'), 400);
        return mostrarToast('Debe indicar un motivo', 'error');
    }

    // Animación del botón
    if (btnConfirmar) {
        btnConfirmar.dataset.originalText = btnConfirmar.innerHTML;
        btnConfirmar.innerHTML = '<span class="btn-spinner mr-2"></span> Rechazando...';
        btnConfirmar.disabled = true;
    }

    // Si venía desde la lista, animar slide-out del item y remover del DOM
    const vinoDesdeLista = !!window._rechazoItemEl;
    if (window._rechazoItemEl) {
        window._rechazoItemEl.classList.add('animate-slide-out');
        await new Promise(r => setTimeout(r, 400));
        window._rechazoItemEl.remove();
    }

    const updates = {
        estado: 'rechazado',
        motivo_rechazo: motivo,
        revisado_por: getPerfil().id,
        fecha_revision: new Date().toISOString()
    };
    const { error } = await supabaseClient.from('informes').update(updates).eq('id', rechazoId);
    if (error) { return mostrarToast('Error rechazando informe', 'error'); }
    // Informe rechazado
    await cargarInformes();

    mostrarToast('Informe rechazado');
    cerrarModalRechazo();
    if (!vinoDesdeLista) filtrarInformes();
    actualizarDashboard();

    // Restaurar botón
    if (btnConfirmar) {
        btnConfirmar.innerHTML = btnConfirmar.dataset.originalText || 'Rechazar';
        btnConfirmar.disabled = false;
    }
}

function editarInforme(id) {
    const informe = getInforme(id);
    if (!informe) return;
    const alumno = getAlumno(informe.alumno_id);
    document.getElementById('editId').value = informe.id;
    document.getElementById('alumnoId').value = informe.alumno_id;
    document.getElementById('alumnoNombre').textContent = alumno ? `${alumno.apellido}, ${alumno.nombre}` : '';
    document.getElementById('alumnoCurso').textContent = alumno ? `${alumno.curso} ${alumno.division}` : '';
    document.getElementById('alumnoSeleccionado').classList.remove('hidden');
    document.getElementById('instancia').value = informe.instancia;
    document.getElementById('titulo').value = informe.titulo;
    document.getElementById('resumen').value = informe.resumen;
    document.getElementById('descargo').value = informe.descargo || '';
    document.getElementById('observaciones').value = informe.observaciones || '';
    document.getElementById('tituloForm').textContent = 'Editar Informe';
    document.getElementById('txtBtnGuardar').textContent = 'Actualizar Informe';
    cerrarModal();
    showSection('nuevo');
}

// ==================== DASHBOARD ====================
function renderCalendarioReuniones() {
    const grid = document.getElementById('calGrid');
    const label = document.getElementById('calMesAnio');
    if (!grid || !label) return;

    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    label.textContent = calCurrentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Reuniones del mes (con fecha_reunion asignada)
    const reunionesMes = informes.filter(i => {
        if (!i.fecha_reunion) return false;
        const d = new Date(i.fecha_reunion);
        return d.getFullYear() === year && d.getMonth() === month;
    });

    const reunionesPorDia = {};
    reunionesMes.forEach(i => {
        const d = new Date(i.fecha_creacion).getDate();
        if (!reunionesPorDia[d]) reunionesPorDia[d] = [];
        reunionesPorDia[d].push(i);
    });

    let html = '';
    // Celdas vacías antes del primer día
    for (let i = 0; i < firstDay; i++) {
        html += '<div></div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const tiene = reunionesPorDia[d];
        const isSelected = calSelectedDate && calSelectedDate.getDate() === d && calSelectedDate.getMonth() === month && calSelectedDate.getFullYear() === year;
        const baseCls = 'h-8 flex flex-col items-center justify-center rounded-lg text-sm cursor-pointer transition-colors relative ';
        const dayCls = isSelected
            ? baseCls + 'bg-blue-600 text-white font-semibold'
            : tiene
                ? baseCls + 'bg-amber-50 text-slate-700 hover:bg-amber-100 font-medium'
                : baseCls + 'text-slate-600 hover:bg-slate-100';
        const dot = tiene
            ? `<span class="absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}"></span>`
            : '';
        html += `<div class="${dayCls}" onclick="seleccionarDiaCal(${d})">${d}${dot}</div>`;
    }
    grid.innerHTML = html;

    // Mostrar/ocultar botón "Ver todos"
    const btnVerTodos = document.getElementById('calVerTodos');
    if (btnVerTodos) {
        btnVerTodos.classList.toggle('hidden', !calSelectedDate);
    }
}

window.seleccionarDiaCal = function(dia) {
    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    // Si ya está seleccionado, deseleccionar
    if (calSelectedDate && calSelectedDate.getDate() === dia && calSelectedDate.getMonth() === month && calSelectedDate.getFullYear() === year) {
        calSelectedDate = null;
    } else {
        calSelectedDate = new Date(year, month, dia);
    }
    renderCalendarioReuniones();
    renderReunionesDiaSeleccionado();
};

function renderReunionesDiaSeleccionado() {
    const container = document.getElementById('dashReuniones');
    if (!container) return;

    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    const dia = calSelectedDate ? calSelectedDate.getDate() : null;

    const reuniones = informes.filter(i => {
        if (!i.fecha_reunion) return false;
        const d = new Date(i.fecha_reunion);
        if (dia !== null) return d.getFullYear() === year && d.getMonth() === month && d.getDate() === dia;
        return d.getFullYear() === year && d.getMonth() === month;
    }).sort((a, b) => new Date(a.fecha_reunion) - new Date(b.fecha_reunion));

    if (reuniones.length === 0) {
        const msg = dia !== null
            ? `Sin reuniones el ${dia}/${month + 1}.`
            : 'Sin reuniones este mes.';
        container.innerHTML = `<p class="text-sm text-slate-400 italic">${msg}</p>`;
        return;
    }

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    container.innerHTML = reuniones.map(i => {
        const alumno = getAlumno(i.alumno_id);
        const fechaReunion = new Date(i.fecha_reunion);
        const esPasada = fechaReunion < hoy;
        const estadoClase = esPasada ? 'bg-slate-400' : 'bg-blue-500';
        return `
        <div class="flex items-start gap-2 p-2 hover:bg-slate-50 rounded-lg transition-colors">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${estadoClase}">${alumno ? alumno.nombre[0] + alumno.apellido[0] : '?'}</div>
            <div class="flex-1 min-w-0 cursor-pointer" onclick="verDetalle('${i.id}')">
                <p class="text-sm font-medium text-slate-800 truncate">${i.titulo}</p>
                <p class="text-xs text-slate-500">${alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Desconocido'} • ${formatearFechaCorta(i.fecha_reunion)}</p>
            </div>
            <div class="flex gap-1">
                <button onclick="event.stopPropagation(); mostrarModalGestionReunion('${i.id}', '${i.fecha_reunion}')" class="text-xs text-blue-600 hover:text-blue-800 p-1" title="Gestionar"><i class="fas fa-edit"></i></button>
            </div>
        </div>`;
    }).join('');
}

function actualizarDashboard() {
    const estados = { pendiente: 0, aprobado: 0, rechazado: 0, archivado: 0 };
    const instancias = { leve: 0, grave: 0, muy_grave: 0 };
    informes.forEach(i => {
        if (estados[i.estado] !== undefined) estados[i.estado]++;
        if (instancias[i.instancia] !== undefined) instancias[i.instancia]++;
    });
    document.getElementById('dashPendientes').textContent = estados.pendiente;
    document.getElementById('dashAprobados').textContent = estados.aprobado;
    document.getElementById('dashTotal').textContent = informes.length;

    // ── 1. Calendario + Reuniones ──
    // Por defecto mostramos TODOS los pendientes del mes (sin día seleccionado)
    renderCalendarioReuniones();
    renderReunionesDiaSeleccionado();

    // ── 2. Pendientes de revisión (con acciones rápidas) ──
    const pendientesLista = informes
        .filter(i => i.estado === 'pendiente')
        .sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion));
    const pendientesHTML = pendientesLista.length === 0
        ? '<p class="text-sm text-slate-400 italic">No hay informes pendientes.</p>'
        : pendientesLista.map(i => {
            const alumno = getAlumno(i.alumno_id);
            return `
            <div id="dash-item-${i.id}" class="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div class="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onclick="verDetalle('${i.id}')">
                    <div class="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white shrink-0">${alumno ? alumno.nombre[0] + alumno.apellido[0] : '?'}</div>
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-slate-800 truncate">${i.titulo}</p>
                        <p class="text-xs text-slate-500">${alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Desconocido'} • ${formatearFechaCorta(i.fecha_creacion)}</p>
                    </div>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button onclick="event.stopPropagation(); aprobarDesdeDashboard('${i.id}', this)" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"><i class="fas fa-check mr-1"></i>Aprobar</button>
                    <button onclick="event.stopPropagation(); rechazarDesdeDashboard('${i.id}', this)" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"><i class="fas fa-times mr-1"></i>Rechazar</button>
                </div>
            </div>`;
        }).join('');
    document.getElementById('dashPendientesLista').innerHTML = pendientesHTML;

    // ── 3. Historial reciente (aprobados + rechazados) ──
    const historial = informes
        .filter(i => i.estado === 'aprobado' || i.estado === 'rechazado')
        .sort((a, b) => new Date(b.fecha_revision || b.fecha_creacion) - new Date(a.fecha_revision || a.fecha_creacion))
        .slice(0, 12);
    const historialHTML = historial.length === 0
        ? '<p class="text-sm text-slate-400 italic">Sin historial.</p>'
        : historial.map(i => {
            const alumno = getAlumno(i.alumno_id);
            return `
            <div class="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onclick="verDetalle('${i.id}')">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${i.estado === 'aprobado' ? 'bg-green-500' : 'bg-red-500'}">${alumno ? alumno.nombre[0] + alumno.apellido[0] : '?'}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-800 truncate">${i.titulo}</p>
                    <p class="text-xs text-slate-500">${alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Desconocido'} • ${formatearFechaCorta(i.fecha_revision || i.fecha_creacion)}</p>
                </div>
                <span class="status-${i.estado} px-2 py-0.5 rounded text-xs capitalize">${i.estado.replace('_', ' ')}</span>
            </div>`;
        }).join('');
    document.getElementById('dashHistorial').innerHTML = historialHTML;

    // ── 4. Gráfico de gravedad (bugfix: aspectRatio fijo + contenedor h-64) ──
    const ctx = document.getElementById('dashChart').getContext('2d');
    if (charts.dash) charts.dash.destroy();
    charts.dash = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Leve', 'Grave', 'Muy Grave'],
            datasets: [{
                data: [instancias.leve, instancias.grave, instancias.muy_grave],
                backgroundColor: ['#fbbf24', '#f97316', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } }
            }
        }
    });
}

// ==================== ESTADÍSTICAS ====================
let _drillDownPorCurso = {};

function cargarEstadisticas() {
    // Gráfico por CURSO (año/grado) con drill-down por división
    const porCurso = {};
    _drillDownPorCurso = {};
    informes.forEach(i => {
        const alumno = getAlumno(i.alumno_id);
        if (!alumno) return;
        porCurso[alumno.curso] = (porCurso[alumno.curso] || 0) + 1;
        const divKey = `${alumno.curso} ${alumno.division}`;
        if (!_drillDownPorCurso[alumno.curso]) _drillDownPorCurso[alumno.curso] = {};
        _drillDownPorCurso[alumno.curso][divKey] = (_drillDownPorCurso[alumno.curso][divKey] || 0) + 1;
    });
    const cursos = Object.keys(porCurso).sort((a, b) => {
        // Ordenar numéricamente: 1°, 2°, 3°... quitando el ° para comparar
        const na = parseInt(a.replace('°', ''));
        const nb = parseInt(b.replace('°', ''));
        return na - nb;
    });
    const ctxCursos = document.getElementById('chartCursos').getContext('2d');
    if (charts.cursos) charts.cursos.destroy();
    charts.cursos = new Chart(ctxCursos, {
        type: 'bar',
        data: { labels: cursos, datasets: [{ label: 'Informes', data: cursos.map(c => porCurso[c]), backgroundColor: '#3b82f6', borderRadius: 6 }] },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const curso = cursos[idx];
                    mostrarDrillDownAnio(curso, _drillDownPorCurso[curso]);
                }
            }
        }
    });

    const porTipo = {};
    informes.forEach(i => { porTipo[i.tipo_falta] = (porTipo[i.tipo_falta] || 0) + 1; });
    const ctxTipos = document.getElementById('chartTipos').getContext('2d');
    if (charts.tipos) charts.tipos.destroy();
    charts.tipos = new Chart(ctxTipos, {
        type: 'pie',
        data: { labels: Object.keys(porTipo), datasets: [{ data: Object.values(porTipo), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    const mensual = {};
    informes.forEach(i => {
        const fecha = new Date(i.fecha_creacion);
        const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        mensual[key] = (mensual[key] || 0) + 1;
    });
    const sortedKeys = Object.keys(mensual).sort();
    const ctxMensual = document.getElementById('chartMensual').getContext('2d');
    if (charts.mensual) charts.mensual.destroy();
    charts.mensual = new Chart(ctxMensual, {
        type: 'line',
        data: {
            labels: sortedKeys.map(k => { const [a, m] = k.split('-'); return `${m}/${a}`; }),
            datasets: [{ label: 'Informes por mes', data: sortedKeys.map(k => mensual[k]), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    const porAlumno = {};
    informes.forEach(i => {
        const alumno = getAlumno(i.alumno_id);
        if (!alumno) return;
        const key = `${alumno.apellido}, ${alumno.nombre}`;
        if (!porAlumno[key]) porAlumno[key] = { total: 0, leve: 0, grave: 0, muy_grave: 0, curso: `${alumno.curso} ${alumno.division}`, id: alumno.id };
        porAlumno[key].total++;
        porAlumno[key][i.instancia]++;
    });
    const topAlumnos = Object.entries(porAlumno).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    document.getElementById('bodyTopAlumnos').innerHTML = topAlumnos.map(([nombre, stats]) => `
        <tr class="hover:bg-slate-50 cursor-pointer" onclick="verAlumno('${stats.id}')">
            <td class="px-4 py-3 font-medium">${nombre}</td>
            <td class="px-4 py-3 text-slate-500">${stats.curso}</td>
            <td class="px-4 py-3 text-center font-bold">${stats.total}</td>
            <td class="px-4 py-3 text-center text-amber-600">${stats.leve}</td>
            <td class="px-4 py-3 text-center text-orange-600">${stats.grave}</td>
            <td class="px-4 py-3 text-center text-red-600">${stats.muy_grave}</td>
        </tr>
    `).join('');
}

// ==================== VISTA ALUMNO ====================
function verAlumno(alumnoId) {
    const alumno = getAlumno(alumnoId);
    if (!alumno) return;
    const lista = informes.filter(i => i.alumno_id === alumnoId).sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    const stats = { total: lista.length, leve: 0, grave: 0, muy_grave: 0 };
    lista.forEach(i => stats[i.instancia]++);

    document.getElementById('tarjetaAlumno').innerHTML = `
        <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">${alumno.nombre[0]}${alumno.apellido[0]}</div>
            <div>
                <h2 class="text-xl font-bold text-slate-800">${alumno.apellido}, ${alumno.nombre}</h2>
                <p class="text-slate-500">${alumno.curso} ${alumno.division}</p>
                <p class="text-sm text-slate-400 mt-1">${stats.total} informe${stats.total !== 1 ? 's' : ''} registrado${stats.total !== 1 ? 's' : ''}</p>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-4 mt-6">
            <div class="text-center p-3 bg-amber-50 rounded-lg"><p class="text-2xl font-bold text-amber-600">${stats.leve}</p><p class="text-xs text-amber-700">Leves</p></div>
            <div class="text-center p-3 bg-orange-50 rounded-lg"><p class="text-2xl font-bold text-orange-600">${stats.grave}</p><p class="text-xs text-orange-700">Graves</p></div>
            <div class="text-center p-3 bg-red-50 rounded-lg"><p class="text-2xl font-bold text-red-600">${stats.muy_grave}</p><p class="text-xs text-red-700">Muy Graves</p></div>
        </div>
    `;

    const ctx = document.getElementById('chartAlumno').getContext('2d');
    if (charts.alumno) charts.alumno.destroy();
    charts.alumno = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Leve', 'Grave', 'Muy Grave'], datasets: [{ data: [stats.leve, stats.grave, stats.muy_grave], backgroundColor: ['#fbbf24', '#f97316', '#ef4444'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    document.getElementById('historialAlumno').innerHTML = lista.map(i => `
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 instancia-${i.instancia}">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="status-${i.estado} px-2 py-0.5 rounded-full text-xs font-medium capitalize">${i.estado.replace('_', ' ')}</span>
                <span class="text-xs text-slate-500">${formatearFechaCorta(i.fecha_creacion)}</span>
            </div>
            <h4 class="font-semibold text-slate-800">${i.titulo}</h4>
            <p class="text-sm text-slate-600 line-clamp-2">${i.resumen}</p>
            <button onclick="verDetalle('${i.id}')" class="text-sm text-blue-600 hover:text-blue-700 mt-2">Ver detalle <i class="fas fa-arrow-right text-xs"></i></button>
        </div>
    `).join('');

    cerrarModal();
    showSection('vistaAlumno');
}

// ==================== USUARIOS ====================
async function cargarUsuarios() {
    if (getPerfil().rol !== 'regente') return;
    await cargarUsuariosSupa();
    const lista = usuarios.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    document.getElementById('listaUsuarios').innerHTML = lista.map(u => {
        const sinPerfil = !u.tiene_perfil;
        const nombreCompleto = sinPerfil ? '<span class="text-slate-400 italic">Sin perfil</span>' : `${u.apellido}, ${u.nombre}`;
        const rolBadge = sinPerfil
            ? '<span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">sin perfil</span>'
            : `<span class="px-2 py-1 rounded-full text-xs font-medium capitalize ${u.rol === 'regente' ? 'bg-purple-100 text-purple-700' : u.rol === 'preceptor' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}">${u.rol}</span>`;
        const activoBadge = sinPerfil
            ? '<span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">-</span>'
            : `<span class="px-2 py-1 rounded-full text-xs font-medium ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${u.activo ? 'Activo' : 'Inactivo'}</span>`;
        const acciones = sinPerfil
            ? `<button onclick="sincronizarPerfilUsuario('${u.id}', '${u.email}')" class="text-sm text-amber-600 hover:text-amber-700" title="Crear perfil"><i class="fas fa-user-plus"></i></button>`
            : `${u.id === getPerfil().id ? '<span class="text-xs text-slate-400">Usted</span>' : `
                <button onclick="editarUsuarioForm('${u.id}')" class="text-sm text-blue-600 hover:text-blue-700" title="Editar"><i class="fas fa-edit"></i></button>
                ${u.rol !== 'regente' ? `<button onclick="eliminarUsuario('${u.id}')" class="text-sm text-red-600 hover:text-red-700" title="Eliminar"><i class="fas fa-trash-alt"></i></button>` : ''}
            `}`;
        return `
        <tr id="user-row-${u.id}" class="hover:bg-slate-50 transition-colors ${sinPerfil ? 'bg-amber-50/50' : ''}">
            <td class="px-4 py-3 font-medium">${nombreCompleto}</td>
            <td class="px-4 py-3 text-slate-500">${u.email}</td>
            <td class="px-4 py-3">${rolBadge}</td>
            <td class="px-4 py-3">${activoBadge}</td>
            <td class="px-4 py-3">
                <div class="flex items-center gap-2">${acciones}</div>
            </td>
        </tr>
    `}).join('');
}

async function crearUsuario(e) {
    e.preventDefault();
    const email = document.getElementById('newEmail').value.trim().toLowerCase();
    const password = document.getElementById('newPassword').value;
    const nombre = document.getElementById('newNombre').value.trim();
    const apellido = document.getElementById('newApellido').value.trim();
    const rol = document.getElementById('newRol').value;

    if (!email || !password || !nombre || !apellido) {
        return mostrarToast('Todos los campos son obligatorios', 'error');
    }
    if (password.length < 6) {
        return mostrarToast('La contraseña debe tener al menos 6 caracteres', 'error');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return mostrarToast('El email no tiene un formato válido', 'error');
    }
    if (nombre.length > 100) return mostrarToast('El nombre no puede exceder 100 caracteres', 'error');
    if (apellido.length > 100) return mostrarToast('El apellido no puede exceder 100 caracteres', 'error');
    if (email.length > 200) return mostrarToast('El email no puede exceder 200 caracteres', 'error');

    if (USE_SUPABASE) {
        // Creando usuario en Supabase
        // Verificar si ya existe en auth.users (usando la función RPC)
        const { data: usuariosExistentes } = await supabaseClient.rpc('listar_usuarios_completos');
        if (usuariosExistentes?.some(u => u.email === email)) {
            return mostrarToast('El email ya está registrado', 'error');
        }
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email, password,
            options: { data: { nombre, apellido, rol } }
        });
        if (authError) {
            // Error creando usuario
            return mostrarToast('Error: ' + authError.message, 'error');
        }
        if (!authData.user) {
            return mostrarToast('No se pudo crear el usuario', 'error');
        }
        // Si el trigger no generó el perfil, crearlo manualmente
        const { data: perfilCreado } = await supabaseClient.from('perfiles').select('*').eq('id', authData.user.id).single();
        if (!perfilCreado) {
            // Trigger no generó perfil, creando manualmente
            const { error: syncError } = await supabaseClient.rpc('sincronizar_perfil', {
                p_id: authData.user.id,
                p_email: email,
                p_nombre: nombre,
                p_apellido: apellido,
                p_rol: rol,
                p_activo: true
            });
            if (syncError) {
                // Error sincronizando perfil
                return mostrarToast('Usuario creado pero error al generar perfil', 'error');
            }
        }
        mostrarToast(`Usuario ${nombre} ${apellido} creado exitosamente`);
    } else {
        return mostrarToast('Servicio de autenticación no disponible', 'error');
    }
    document.getElementById('formUsuario').reset();
    await cargarUsuarios();
}

// ==================== EDITAR / ELIMINAR USUARIOS ====================
window.sincronizarPerfilUsuario = async function(id, email) {
    const { error } = await supabaseClient.rpc('sincronizar_perfil', {
        p_id: id,
        p_email: email,
        p_nombre: 'Sin',
        p_apellido: 'Nombre',
        p_rol: 'docente',
        p_activo: true
    });
    if (error) {
        // Error sincronizando perfil
        return mostrarToast('Error al crear perfil', 'error');
    }
    mostrarToast('Perfil creado correctamente');
    await cargarUsuarios();
};

window.editarUsuarioForm = function(id) {
    const u = usuarios.find(x => x.id === id);
    if (!u) return mostrarToast('Usuario no encontrado', 'error');
    document.getElementById('editUserId').value = u.id;
    document.getElementById('editUserNombre').value = u.nombre || '';
    document.getElementById('editUserApellido').value = u.apellido || '';
    document.getElementById('editUserEmail').value = u.email;
    document.getElementById('editUserRol').value = u.rol || 'docente';
    document.getElementById('editUserActivo').checked = u.activo !== false;
    document.getElementById('editUserPassword').value = '';
    // Email no editable en Supabase (requiere confirmación), contraseña sí vía RPC
    const esSupa = USE_SUPABASE;
    document.getElementById('editUserEmail').disabled = esSupa;
    document.getElementById('editUserEmail').classList.toggle('bg-slate-100', esSupa);
    document.getElementById('editUserPassword').placeholder = 'Dejar vacío para no cambiar';
    document.getElementById('editUserPassword').disabled = false;
    document.getElementById('editUserPassword').classList.remove('bg-slate-100');
    document.getElementById('modalEditarUsuario').classList.remove('hidden');
};

window.cerrarModalEditarUsuario = function() {
    document.getElementById('modalEditarUsuario').classList.add('hidden');
};

window.guardarEdicionUsuario = async function() {
    const id = document.getElementById('editUserId').value;
    const nombre = document.getElementById('editUserNombre').value.trim();
    const apellido = document.getElementById('editUserApellido').value.trim();
    const email = document.getElementById('editUserEmail').value.trim().toLowerCase();
    const rol = document.getElementById('editUserRol').value;
    const activo = document.getElementById('editUserActivo').checked;
    const password = document.getElementById('editUserPassword').value;

    if (!nombre || !apellido || !email) {
        return mostrarToast('Nombre, apellido y email son obligatorios', 'error');
    }
    if (nombre.length > 100) return mostrarToast('El nombre no puede exceder 100 caracteres', 'error');
    if (apellido.length > 100) return mostrarToast('El apellido no puede exceder 100 caracteres', 'error');
    if (email.length > 200) return mostrarToast('El email no puede exceder 200 caracteres', 'error');

    if (USE_SUPABASE) {
        // 1. Actualizar perfil
        const updates = { nombre, apellido, rol, activo };
        const { error } = await supabaseClient.from('perfiles').update(updates).eq('id', id);
        if (error) { return mostrarToast('Error editando usuario', 'error'); }

        // 2. Actualizar contraseña vía RPC si se ingresó una nueva
        if (password) {
            if (password.length < 6) {
                return mostrarToast('La contraseña debe tener al menos 6 caracteres', 'error');
            }
            const { error: rpcError } = await supabaseClient.rpc('actualizar_password_usuario', {
                user_id: id,
                new_password: password
            });
            if (rpcError) {
                // Error cambiando contraseña
                if (rpcError.message?.includes('function') || rpcError.message?.includes('does not exist') || rpcError.code === '42883') {
                    return mostrarToast('La función RPC no está configurada en Supabase. Ejecutá el SQL de supabase.sql en el SQL Editor.', 'error');
                }
                return mostrarToast('Error cambiando contraseña: ' + rpcError.message, 'error');
            }
            // Contraseña actualizada
        }
        // Usuario editado
    } else {
        return mostrarToast('Servicio de autenticación no disponible', 'error');
    }
    mostrarToast('Usuario actualizado correctamente');
    cerrarModalEditarUsuario();
    await cargarUsuarios();
};

window.eliminarUsuario = async function(id) {
    const u = usuarios.find(x => x.id === id);
    if (!u) return;
    if (u.rol === 'regente' && id !== getPerfil().id) {
        return mostrarToast('No se puede eliminar a un usuario con rol regente', 'error');
    }
    if (!confirm(`¿Estás seguro de que querés eliminar a ${u.nombre || u.email} (${u.email})?\n\nEsta acción no se puede deshacer.`)) return;

    const row = document.getElementById(`user-row-${id}`);
    if (row) {
        row.classList.add('animate-slide-out');
    }

    const { error } = await supabaseClient.rpc('eliminar_usuario_completo', { user_id: id });
    if (error) {
        // Error eliminando usuario
        if (row) row.classList.remove('animate-slide-out');
        return mostrarToast('Error eliminando usuario: ' + error.message, 'error');
    }

    // Usuario eliminado
    mostrarToast(`Usuario ${u.nombre || u.email} eliminado`);

    // Remover del DOM después de la animación
    setTimeout(() => {
        if (row) row.remove();
        // Actualizar array local sin recargar toda la lista
        usuarios = usuarios.filter(x => x.id !== id);
    }, 400);
};

// ==================== PLANTILLAS CRUD ====================
async function cargarPlantillas() {
    if (!USE_SUPABASE) return;
    const { data, error } = await supabaseClient.from('plantillas').select('*').eq('activo', true).order('created_at', { ascending: false });
    if (error) { return; }
    plantillas = data || [];
    // Plantillas cargadas
    renderizarSelectPlantillas();
}

function calcularTendenciaPlantillas() {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    const frecuencia = {};

    // Contar informes recientes por título
    informes.forEach(i => {
        const fecha = new Date(i.fecha_creacion);
        if (fecha >= hace30Dias) {
            frecuencia[i.titulo] = (frecuencia[i.titulo] || 0) + 1;
        }
    });

    return frecuencia;
}

function renderizarSelectPlantillas() {
    const select = document.getElementById('plantillaInforme');
    if (!select) return;
    const frecuencia = calcularTendenciaPlantillas();

    // Combinar predefinidas + personalizadas en un array uniforme
    const todas = [];
    Object.entries(PLANTILLAS_INFORME).forEach(([key, p]) => {
        todas.push({ key, titulo: p.titulo, instancia: p.instancia, resumen: p.resumen, predefinida: true, usos: frecuencia[p.titulo] || 0 });
    });
    plantillas.forEach(p => {
        todas.push({ key: p.id, titulo: p.titulo, instancia: p.instancia, resumen: p.resumen, predefinida: false, usos: (frecuencia[p.titulo] || 0) + (p.usos || 0) });
    });

    // Ordenar por usos (tendencia) descendente
    todas.sort((a, b) => b.usos - a.usos);

    // Renderizar
    let html = '<option value="">Seleccionar plantilla...</option>';
    if (todas.length > 0) {
        html += '<optgroup label="Más usadas últimamente">';
        todas.forEach(p => {
            const icon = p.predefinida ? '' : '✏️ ';
            const trend = p.usos > 0 ? ` 🔥` : '';
            html += `<option value="${p.key}" data-predefinida="${p.predefinida}">${icon}${p.titulo}${trend}</option>`;
        });
        html += '</optgroup>';
    }
    select.innerHTML = html;
}

window.abrirModalPlantillas = function() {
    document.getElementById('modalPlantillas').classList.remove('hidden');
    renderizarListaPlantillas();
};
window.cerrarModalPlantillas = function() {
    document.getElementById('modalPlantillas').classList.add('hidden');
};

function renderizarListaPlantillas() {
    const container = document.getElementById('listaPlantillas');
    if (!container) return;

    // Predefinidas (solo lectura)
    let html = '<div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Predefinidas</div>';
    Object.entries(PLANTILLAS_INFORME).forEach(([key, p]) => {
        html += `
        <div class="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
            <div class="min-w-0">
                <p class="text-sm font-medium text-slate-700 truncate">${p.titulo}</p>
                <p class="text-xs text-slate-500 capitalize">${p.instancia}</p>
            </div>
            <span class="text-xs text-slate-400">Sistema</span>
        </div>`;
    });

    // Personalizadas
    if (plantillas.length > 0) {
        html += '<div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3 mb-1">Personalizadas</div>';
        plantillas.filter(p => p.activo !== false).forEach(p => {
            html += `
            <div class="flex items-center justify-between p-2 bg-white rounded border border-slate-100">
                <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-700 truncate">${p.titulo}</p>
                    <p class="text-xs text-slate-500 capitalize">${p.instancia}</p>
                </div>
                <button onclick="eliminarPlantilla('${p.id}')" class="text-red-500 hover:text-red-700 text-xs px-2" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>`;
        });
    } else {
        html += '<p class="text-sm text-slate-400 italic mt-2">No hay plantillas personalizadas.</p>';
    }

    container.innerHTML = html;
}

window.crearPlantilla = async function() {
    const titulo = document.getElementById('newPlantillaTitulo').value.trim();
    const instancia = document.getElementById('newPlantillaInstancia').value;
    const resumen = document.getElementById('newPlantillaResumen').value.trim();

    if (!titulo || !instancia || !resumen) {
        return mostrarToast('Completa todos los campos', 'error');
    }
    if (titulo.length > 200) return mostrarToast('El título no puede exceder 200 caracteres', 'error');
    if (resumen.length > 2000) return mostrarToast('El resumen no puede exceder 2000 caracteres', 'error');

    if (USE_SUPABASE) {
        const { data, error } = await supabaseClient.from('plantillas').insert({
            titulo, instancia, resumen, creado_por: getPerfil().id, usos: 0, activo: true
        }).select().single();
        if (error) { return mostrarToast('Error creando plantilla', 'error'); }
        // Plantilla creada
    } else {
        return mostrarToast('Servicio de autenticación no disponible', 'error');
    }

    mostrarToast('Plantilla creada');
    document.getElementById('newPlantillaTitulo').value = '';
    document.getElementById('newPlantillaInstancia').value = '';
    document.getElementById('newPlantillaResumen').value = '';
    await cargarPlantillas();
    renderizarListaPlantillas();
};

window.eliminarPlantilla = async function(id) {
    const p = plantillas.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`¿Eliminar la plantilla "${p.titulo}"?`)) return;

    const { error } = await supabaseClient.from('plantillas').delete().eq('id', id);
    if (error) { return mostrarToast('Error eliminando plantilla', 'error'); }

    mostrarToast('Plantilla eliminada');
    await cargarPlantillas();
    renderizarListaPlantillas();
};

// ==================== EXPORTAR PDF ====================
function exportarPDF(id) {
    const informe = getInforme(id);
    if (!informe) return;
    const alumno = getAlumno(informe.alumno_id);
    const container = document.createElement('div');
    container.style.cssText = 'padding:40px; font-family:Inter,sans-serif; color:#334155; max-width:800px; margin:0 auto; background:#fff;';
    container.innerHTML = `
        <div style="text-align:center; margin-bottom:30px; border-bottom:3px solid #3b82f6; padding-bottom:20px;">
            <h1 style="font-size:24px; color:#1e293b; margin:0;">GIE - Gestor de Informes Escolares</h1>
            <p style="font-size:14px; color:#64748b; margin:5px 0 0;">Informe Oficial</p>
        </div>
        <div style="margin-bottom:20px;">
            <span style="display:inline-block; padding:4px 12px; border-radius:999px; font-size:12px; font-weight:600; text-transform:capitalize; ${
                informe.estado === 'aprobado' ? 'background:#d1fae5; color:#065f46;' :
                informe.estado === 'rechazado' ? 'background:#fee2e2; color:#991b1b;' :
                informe.estado === 'pendiente' ? 'background:#fef3c7; color:#92400e;' :
                'background:#fef3c7; color:#92400e;'
            }">${informe.estado.replace('_', ' ')}</span>
            <span style="font-size:13px; color:#64748b; margin-left:10px;">${formatearFecha(informe.fecha_creacion)}</span>
        </div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr><td style="padding:8px 0; font-weight:600; width:140px;">Alumno:</td><td style="padding:8px 0;">${alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Desconocido'}</td></tr>
            <tr><td style="padding:8px 0; font-weight:600;">Curso:</td><td style="padding:8px 0;">${alumno ? `${alumno.curso} ${alumno.division}` : ''}</td></tr>
            <tr><td style="padding:8px 0; font-weight:600;">Instancia:</td><td style="padding:8px 0; text-transform:capitalize; font-weight:600; ${informe.instancia==='muy_grave'?'color:#dc2626;':informe.instancia==='grave'?'color:#ea580c;':'color:#d97706;'}">${informe.instancia.replace('_', ' ')}</td></tr>
            <tr><td style="padding:8px 0; font-weight:600;">Creado por:</td><td style="padding:8px 0;">${getNombreUsuario(informe.creado_por)}</td></tr>
            ${informe.fecha_revision ? `<tr><td style="padding:8px 0; font-weight:600;">Revisado por:</td><td style="padding:8px 0;">${getNombreUsuario(informe.revisado_por)} el ${formatearFecha(informe.fecha_revision)}</td></tr>` : ''}
        </table>
        <div style="margin-bottom:20px;">
            <h3 style="font-size:14px; font-weight:700; color:#1e293b; margin-bottom:8px;">Título</h3>
            <p style="margin:0; line-height:1.6;">${informe.titulo}</p>
        </div>
        <div style="margin-bottom:20px;">
            <h3 style="font-size:14px; font-weight:700; color:#1e293b; margin-bottom:8px;">Descripción de la problemática</h3>
            <p style="margin:0; line-height:1.6; white-space:pre-wrap;">${informe.resumen}</p>
        </div>
        ${informe.descargo ? `
        <div style="margin-bottom:20px; background:#fffbeb; border:1px solid #fcd34d; padding:16px; border-radius:8px;">
            <h3 style="font-size:14px; font-weight:700; color:#92400e; margin-bottom:8px;">Solicitud de sanción</h3>
            <p style="margin:0; line-height:1.6; white-space:pre-wrap; color:#78350f;">${informe.descargo}</p>
        </div>` : ''}
        ${informe.observaciones ? `
        <div style="margin-bottom:20px; background:#eff6ff; border:1px solid #bfdbfe; padding:16px; border-radius:8px;">
            <h3 style="font-size:14px; font-weight:700; color:#1e40af; margin-bottom:8px;">Observaciones</h3>
            <p style="margin:0; line-height:1.6; white-space:pre-wrap; color:#1e3a8a;">${informe.observaciones}</p>
        </div>` : ''}
        ${informe.motivo_rechazo ? `
        <div style="margin-bottom:20px; background:#fef2f2; border:1px solid #fecaca; padding:16px; border-radius:8px;">
            <h3 style="font-size:14px; font-weight:700; color:#991b1b; margin-bottom:8px;">Motivo del rechazo</h3>
            <p style="margin:0; line-height:1.6; color:#7f1d1d;">${informe.motivo_rechazo}</p>
        </div>` : ''}
        <div style="margin-top:40px; padding-top:20px; border-top:1px solid #e2e8f0; text-align:center; font-size:12px; color:#94a3b8;">
            Documento generado automáticamente por GIE • ${new Date().toLocaleDateString('es-AR')}
        </div>
    `;
    document.body.appendChild(container);
    html2pdf().set({ margin: 0, filename: `informe_${alumno ? alumno.apellido : 'doc'}_${informe.fecha_creacion.split('T')[0]}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(container).save().then(() => { document.body.removeChild(container); });
}

function mostrarDrillDownAnio(anio, data) {
    const container = document.getElementById('drillDownAnio');
    const titulo = document.getElementById('drillDownTitulo');
    const contenido = document.getElementById('drillDownContenido');
    if (!container || !data) return;

    titulo.textContent = `Desglose ${anio}`;
    const items = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
    contenido.innerHTML = items.map(([cursoDiv, cantidad]) => `
        <div class="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg">
            <span class="text-sm font-medium text-slate-700">${cursoDiv}</span>
            <span class="text-sm font-bold text-blue-600">${cantidad}</span>
        </div>
    `).join('');
    container.classList.remove('hidden');
}

window.cerrarDrillDownAnio = function() {
    const container = document.getElementById('drillDownAnio');
    if (container) container.classList.add('hidden');
};

// Exponer funciones usadas en onclick al scope global
window.showSection = showSection;
window.logout = logout;

// Debug helper: ejecutar debugGIE() en la consola del navegador
window.debugGIE = function() {
    // Debug helper desactivado en producción
};

window.verDetalle = verDetalle;
window.verAlumno = verAlumno;
window.editarInforme = editarInforme;
window.cambiarEstado = cambiarEstado;
window.mostrarRechazo = mostrarRechazo;
window.cerrarModal = cerrarModal;
window.cerrarModalRechazo = cerrarModalRechazo;
window.confirmarRechazo = confirmarRechazo;
window.exportarPDF = exportarPDF;
window.limpiarAlumno = limpiarAlumno;
window.cancelarForm = cancelarForm;
window.filtrarInformes = filtrarInformes;
window.seleccionarAlumno = seleccionarAlumno;
window.abrirModalPlantillas = abrirModalPlantillas;
window.cerrarModalPlantillas = cerrarModalPlantillas;
window.crearPlantilla = crearPlantilla;
window.eliminarPlantilla = eliminarPlantilla;

// ==================== CREAR ALUMNO INLINE ====================
window.mostrarModalCrearAlumno = function() {
    document.getElementById('modalCrearAlumno').classList.remove('hidden');
    document.getElementById('newAlumnoNombre').value = '';
    document.getElementById('newAlumnoApellido').value = '';
    document.getElementById('newAlumnoCurso').value = '';
    document.getElementById('newAlumnoDivision').value = '';
};
window.cerrarModalCrearAlumno = function() {
    document.getElementById('modalCrearAlumno').classList.add('hidden');
};
window.guardarNuevoAlumno = async function() {
    const nombre = document.getElementById('newAlumnoNombre').value.trim();
    const apellido = document.getElementById('newAlumnoApellido').value.trim();
    const curso = document.getElementById('newAlumnoCurso').value;
    const division = document.getElementById('newAlumnoDivision').value;
    if (!nombre || !apellido || !curso || !division) {
        return mostrarToast('Todos los campos son obligatorios', 'error');
    }
    const { data, error } = await supabaseClient.from('alumnos').insert({ nombre, apellido, curso, division }).select().single();
    if (error) {
        return mostrarToast('Error creando alumno: ' + error.message, 'error');
    }
    await cargarAlumnos();
    seleccionarAlumno(data.id, data.nombre, data.apellido, data.curso, data.division);
    cerrarModalCrearAlumno();
    mostrarToast('Alumno creado correctamente');
};

// ==================== FECHA DE REUNIÓN ====================
let _reunionCallback = null;
window.mostrarModalFechaReunion = function(informeId, callback) {
    _reunionCallback = callback;
    document.getElementById('reunionInformeId').value = informeId;
    document.getElementById('fechaReunionInput').value = '';
    document.getElementById('reunionObservacion').value = '';
    document.getElementById('modalFechaReunion').classList.remove('hidden');
};
window.cerrarModalFechaReunion = function() {
    document.getElementById('modalFechaReunion').classList.add('hidden');
    _reunionCallback = null;
};
window.confirmarFechaReunion = async function(omitir) {
    const informeId = document.getElementById('reunionInformeId').value;
    let fechaReunion = null;
    if (!omitir) {
        fechaReunion = document.getElementById('fechaReunionInput').value || null;
    }
    document.getElementById('modalFechaReunion').classList.add('hidden');
    if (_reunionCallback) {
        await _reunionCallback(informeId, fechaReunion);
        _reunionCallback = null;
    }
};

// ==================== GESTIÓN DE REUNIONES ====================
window.mostrarModalGestionReunion = function(informeId, fechaActual) {
    document.getElementById('gestionReunionInformeId').value = informeId;
    document.getElementById('gestionReunionFecha').value = fechaActual || '';
    document.getElementById('modalGestionReunion').classList.remove('hidden');
};
window.cerrarModalGestionReunion = function() {
    document.getElementById('modalGestionReunion').classList.add('hidden');
};
window.guardarCambioReunion = async function() {
    const id = document.getElementById('gestionReunionInformeId').value;
    const fecha = document.getElementById('gestionReunionFecha').value || null;
    const { error } = await supabaseClient.from('informes').update({ fecha_reunion: fecha }).eq('id', id);
    if (error) return mostrarToast('Error actualizando reunión', 'error');
    await cargarInformes();
    actualizarDashboard();
    cerrarModalGestionReunion();
    mostrarToast('Reunión actualizada');
};
window.posponerReunion = async function(dias) {
    const id = document.getElementById('gestionReunionInformeId').value;
    const fechaActual = document.getElementById('gestionReunionFecha').value;
    const fecha = new Date(fechaActual || new Date());
    fecha.setDate(fecha.getDate() + dias);
    const fechaStr = fecha.toISOString().split('T')[0];
    const { error } = await supabaseClient.from('informes').update({ fecha_reunion: fechaStr }).eq('id', id);
    if (error) return mostrarToast('Error posponiendo reunión', 'error');
    await cargarInformes();
    actualizarDashboard();
    cerrarModalGestionReunion();
    mostrarToast(`Reunión pospuesta ${dias} días`);
};
window.eliminarReunion = async function() {
    const id = document.getElementById('gestionReunionInformeId').value;
    if (!confirm('¿Eliminar la fecha de reunión?')) return;
    const { error } = await supabaseClient.from('informes').update({ fecha_reunion: null }).eq('id', id);
    if (error) return mostrarToast('Error eliminando reunión', 'error');
    await cargarInformes();
    actualizarDashboard();
    cerrarModalGestionReunion();
    mostrarToast('Reunión eliminada');
};

// ==================== VER CONTRASEÑA ====================
window.togglePassword = function(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (!input || !icon) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        btn.classList.add('text-blue-500');
        btn.classList.remove('text-slate-400');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        btn.classList.remove('text-blue-500');
        btn.classList.add('text-slate-400');
    }
};
