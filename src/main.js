import Chart from 'chart.js/auto';
import html2pdf from 'html2pdf.js';
import { USE_SUPABASE, supabaseClient } from './config.js';
import { getPerfil, esRegente, showLogin, showApp, restoreSession, doLogout, updateAuthUI, setupLoginForm, setupLoginBanner } from './auth.js';
import './styles.css';

// ==================== ESTADO GLOBAL ====================
let alumnos = [];
let informes = [];
let usuarios = [];
let categorias = [];
let charts = {};
let rechazoId = null;
let calCurrentDate = new Date();
let calSelectedDate = null;
let plantillas = [];
let tabInformesActivo = 'todos'; // 'todos' | 'pendientes' | 'resueltos'
let periodoTendenciaDias = 30;

// IntersectionObserver para animar cards al hacer scroll (repite al subir/bajar)
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
        } else {
            entry.target.classList.remove('is-visible');
        }
    });
}, { threshold: 0.05, rootMargin: '20px 0px 20px 0px' });

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
async function cargarCategorias() {
    if (!USE_SUPABASE) return;
    const { data, error } = await supabaseClient.from('categorias').select('*').eq('activo', true).order('nombre');
    if (error) { console.error('[GIE] Error cargando categorías:', error); return; }
    categorias = data || [];
    renderizarSelectCategorias();
}

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
    // Restaurar filtro persistido
    const savedCurso = sessionStorage.getItem('gie_filtro_filtroCurso');
    if (savedCurso) { select.value = savedCurso; }
    // Poblar filtro de divisiones (informes)
    const divisiones = [...new Set(alumnos.map(a => a.division).filter(Boolean))].sort();
    const selectDiv = document.getElementById('filtroDivisionInformes');
    if (selectDiv) {
        selectDiv.innerHTML = '<option value="">Todas las divisiones</option>';
        divisiones.forEach(d => selectDiv.innerHTML += `<option value="${d}">${d}</option>`);
    }
    // Poblar filtro de turnos (informes + alumnos)
    const turnos = [...new Set(alumnos.map(a => a.turno).filter(Boolean))].sort();
    const selectTurno = document.getElementById('filtroAlumnoTurno');
    if (selectTurno) {
        selectTurno.innerHTML = '<option value="">Todos</option>';
        turnos.forEach(t => selectTurno.innerHTML += `<option value="${t}">${t}</option>`);
    }
    const selectTurnoInf = document.getElementById('filtroTurnoInformes');
    if (selectTurnoInf) {
        selectTurnoInf.innerHTML = '<option value="">Todos los turnos</option>';
        turnos.forEach(t => selectTurnoInf.innerHTML += `<option value="${t}">${t}</option>`);
    }
}

async function cargarInformes() {
    if (!USE_SUPABASE) return;
    let query = supabaseClient.from('informes')
        .select('*, alumno:alumnos(nombre, apellido, curso, division), creador:perfiles!informes_creado_por_fkey(nombre, apellido), revisor:perfiles!informes_revisado_por_fkey(nombre, apellido), fecha_reunion')
        .order('fecha_creacion', { ascending: false });
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

// Parsea una fecha DATE de Supabase (string 'YYYY-MM-DD') sin problemas de zona horaria
function parseFechaLocal(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function getEstadoVisual(informe) {
    return informe.estado;
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
    showApp();
    const esRegente = getPerfil()?.rol === 'regente';

    // Navegación según rol
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const section = btn.dataset.section;
        if (section === 'dashboard' || section === 'estadisticas') {
            btn.classList.toggle('hidden', !esRegente);
        }
    });


    await Promise.all([cargarAlumnos(), cargarInformes(), cargarPlantillas(), cargarCategorias()]);
    initFiltros();

    if (esRegente) {
        showSection('dashboard');
        actualizarDashboard();
        ocultarSkeleton('dashboard');
    } else {
        showSection('informes');
        filtrarInformes();
        ocultarSkeleton('informes');
    }
}

function setupEventListeners() {
    document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
    document.getElementById('overlay').addEventListener('click', toggleSidebar);

    // Evitar scroll/deslizamiento en el sidebar en dispositivos táctiles
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    // Navegación lateral
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            if (section) showSection(section);
        });
    });

    let debounceTimer;
    const searchAlumno = document.getElementById('searchAlumno');
    const resultadosAlumno = document.getElementById('resultadosAlumno');
    if (searchAlumno) {
        searchAlumno.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => buscarAlumno(e.target.value), 300);
        });
        // Navegación por teclado en resultados de alumno
        searchAlumno.addEventListener('keydown', (e) => {
            if (!resultadosAlumno || resultadosAlumno.classList.contains('hidden')) return;
            const items = resultadosAlumno.querySelectorAll('[data-alumno-id]');
            if (items.length === 0) return;
            if (e.key === 'ArrowDown' || e.key === 'Tab') {
                e.preventDefault();
                items[0].focus();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const first = items[0];
                seleccionarAlumno(first.dataset.alumnoId, first.dataset.alumnoNombre, first.dataset.alumnoApellido, first.dataset.alumnoCurso, first.dataset.alumnoDivision, first.dataset.alumnoTurno);
            }
        });
    }
    if (resultadosAlumno) {
        resultadosAlumno.addEventListener('keydown', (e) => {
            const items = Array.from(resultadosAlumno.querySelectorAll('[data-alumno-id]'));
            const current = document.activeElement;
            const idx = items.indexOf(current);
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (idx >= 0 && idx < items.length - 1) items[idx + 1].focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (idx > 0) items[idx - 1].focus();
                else if (idx === 0) searchAlumno.focus();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (idx >= 0) {
                    const item = items[idx];
                    seleccionarAlumno(item.dataset.alumnoId, item.dataset.alumnoNombre, item.dataset.alumnoApellido, item.dataset.alumnoCurso, item.dataset.alumnoDivision, item.dataset.alumnoTurno);
                }
            } else if (e.key === 'Tab') {
                if (idx >= 0 && idx < items.length - 1) {
                    e.preventDefault();
                    items[idx + 1].focus();
                }
                // Si es el último, dejar que el Tab natural continúe al siguiente campo del formulario
            }
        });
    }

    ['filtroBusqueda', 'filtroCurso', 'filtroDivisionInformes', 'filtroTurnoInformes', 'filtroEstado', 'filtroInstancia'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const handler = () => {
            sessionStorage.setItem('gie_filtro_' + id, el.value);
            filtrarInformes();
        };
        el.addEventListener('change', handler);
        if (id === 'filtroBusqueda') el.addEventListener('input', handler);
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
            // Hacer foco en el campo de observaciones
            document.getElementById('observaciones').focus();
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

    ['filtroAlumnoCurso', 'filtroAlumnoDivision', 'filtroAlumnoTurno'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            sessionStorage.setItem('gie_filtro_' + id, el.value);
            filtrarAlumnos();
        });
    });
    const filtroAlumnoNombre = document.getElementById('filtroAlumnoNombre');
    if (filtroAlumnoNombre) filtroAlumnoNombre.addEventListener('input', () => {
        sessionStorage.setItem('gie_filtro_filtroAlumnoNombre', filtroAlumnoNombre.value);
        filtrarAlumnos();
    });
    const ordenAlumnos = document.getElementById('ordenAlumnos');
    if (ordenAlumnos) ordenAlumnos.addEventListener('change', () => {
        sessionStorage.setItem('gie_orden_alumnos', ordenAlumnos.value);
        filtrarAlumnos();
    });

    ['filtroDocenteNombre', 'filtroDocenteRol', 'ordenDocentes'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const handler = () => filtrarDocentes();
        el.addEventListener('change', handler);
        if (id === 'filtroDocenteNombre') el.addEventListener('input', handler);
    });

    const btnVolverNuevo = document.getElementById('btn-volver-nuevo');
    if (btnVolverNuevo) btnVolverNuevo.addEventListener('click', () => showSection('informes'));

    const btnVolverAlumno = document.getElementById('btn-volver-alumno');
    if (btnVolverAlumno) btnVolverAlumno.addEventListener('click', () => showSection('alumnos'));

    const btnVolverDocente = document.getElementById('btn-volver-docente');
    if (btnVolverDocente) btnVolverDocente.addEventListener('click', () => showSection('docentes'));

    const btnNuevoInforme = document.getElementById('btn-nuevo-informe');
    if (btnNuevoInforme) btnNuevoInforme.addEventListener('click', () => {
        showSection('nuevo');
    });

    const btnCancelarForm = document.getElementById('btn-cancelar-form');
    if (btnCancelarForm) btnCancelarForm.addEventListener('click', () => {
        cancelarForm();
        showSection('informes');
    });

    const selectInstancia = document.getElementById('instancia');
    if (selectInstancia) {
        selectInstancia.addEventListener('change', () => {
            selectInstancia.required = true;
        });
    }

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
function mostrarSkeleton(sectionId) {
    const skeleton = document.getElementById('skeleton-' + sectionId);
    const content = document.getElementById('content-' + sectionId);
    if (skeleton) skeleton.classList.remove('hidden');
    if (content) content.classList.add('hidden');
}

function ocultarSkeleton(sectionId) {
    const skeleton = document.getElementById('skeleton-' + sectionId);
    const content = document.getElementById('content-' + sectionId);
    if (skeleton) skeleton.classList.add('hidden');
    if (content) content.classList.remove('hidden');
}

function showSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target || !target.classList.contains('hidden')) return;
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    target.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => {
        if (b.dataset.section === sectionId) b.classList.add('bg-slate-800', 'text-blue-400');
        else b.classList.remove('bg-slate-800', 'text-blue-400');
    });
    if (sectionId === 'estadisticas') {
        mostrarSkeleton('estadisticas');
        requestAnimationFrame(() => {
            setTimeout(() => {
                ocultarSkeleton('estadisticas');
                setTimeout(() => {
                    cargarEstadisticas();
                }, 300);
            }, 50);
        });
    }
    if (sectionId === 'usuarios') { mostrarSkeleton('usuarios'); cargarUsuarios().then(() => ocultarSkeleton('usuarios')); }
    if (sectionId === 'docentes') { mostrarSkeleton('docentes'); cargarDocentes().then(() => ocultarSkeleton('docentes')); }
    if (sectionId === 'dashboard') { mostrarSkeleton('dashboard'); actualizarDashboard(); ocultarSkeleton('dashboard'); }
    if (sectionId === 'ajustes') { mostrarSkeleton('ajustes'); cargarEspacioBD().then(() => ocultarSkeleton('ajustes')); }
    if (sectionId === 'informes') {
        mostrarSkeleton('informes');
        requestAnimationFrame(() => {
            setTimeout(() => {
                ['filtroBusqueda', 'filtroCurso', 'filtroDivisionInformes', 'filtroTurnoInformes', 'filtroEstado', 'filtroInstancia'].forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    const saved = sessionStorage.getItem('gie_filtro_' + id);
                    if (saved !== null && el.value !== saved) el.value = saved;
                });
                const savedTab = sessionStorage.getItem('gie_tab_informes');
                if (savedTab && savedTab !== tabInformesActivo) {
                    tabInformesActivo = savedTab;
                }
                actualizarTabsInformes();
                filtrarInformes();
                ocultarSkeleton('informes');
            }, 50);
        });
    }
    if (sectionId === 'alumnos') {
        mostrarSkeleton('alumnos');
        requestAnimationFrame(() => {
            setTimeout(() => {
                ['filtroAlumnoCurso', 'filtroAlumnoDivision', 'filtroAlumnoTurno', 'filtroAlumnoNombre'].forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    const saved = sessionStorage.getItem('gie_filtro_' + id);
                    if (saved !== null && el.value !== saved) el.value = saved;
                });
                const ordenEl = document.getElementById('ordenAlumnos');
                if (ordenEl) {
                    const savedOrden = sessionStorage.getItem('gie_orden_alumnos');
                    if (savedOrden !== null && ordenEl.value !== savedOrden) ordenEl.value = savedOrden;
                }
                filtrarAlumnos();
                ocultarSkeleton('alumnos');
            }, 50);
        });
    }
    if (window.innerWidth < 1024) {
        document.getElementById('sidebar').classList.add('sidebar-hidden');
        document.getElementById('overlay').classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
    window.scrollTo(0,0);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isOpening = sidebar.classList.contains('sidebar-hidden');
    sidebar.classList.toggle('sidebar-hidden');
    document.getElementById('overlay').classList.toggle('hidden');
    if (isOpening) {
        document.body.classList.add('overflow-hidden');
    } else {
        document.body.classList.remove('overflow-hidden');
    }
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
    document.body.classList.add('overflow-hidden');
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
    document.body.classList.remove('overflow-hidden');
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
    if (!query || query.length < 1) { resultados.classList.add('hidden'); return; }
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
            <div tabindex="0"
                data-alumno-id="${a.id}"
                data-alumno-nombre="${a.nombre}"
                data-alumno-apellido="${a.apellido}"
                data-alumno-curso="${a.curso}"
                data-alumno-division="${a.division}"
                data-alumno-turno="${a.turno || ''}"
                onclick="seleccionarAlumno('${a.id}', '${a.nombre}', '${a.apellido}', '${a.curso}', '${a.division}', '${a.turno || ''}')"
                class="p-3 hover:bg-slate-50 focus:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 outline-none">
                <p class="font-medium text-sm">${a.apellido}, ${a.nombre}</p>
                <p class="text-xs text-slate-500">${a.curso} ${a.division}${a.turno ? ' · ' + a.turno : ''}</p>
            </div>`).join('');
        if (btnCrear) btnCrear.classList.add('hidden');
    }
    resultados.classList.remove('hidden');
}

function seleccionarAlumno(id, nombre, apellido, curso, division, turno = '') {
    document.getElementById('alumnoId').value = id;
    document.getElementById('alumnoNombre').textContent = `${apellido}, ${nombre}`;
    document.getElementById('alumnoCurso').textContent = `${curso} ${division}${turno ? ' · ' + turno : ''}`;
    document.getElementById('alumnoSeleccionado').classList.remove('hidden');
    document.getElementById('resultadosAlumno').classList.add('hidden');
    document.getElementById('searchAlumno').value = '';
    document.getElementById('buscadorAlumno').classList.add('hidden');
    document.getElementById('btn-cambiar-alumno').classList.remove('hidden');
}

function limpiarAlumno() {
    document.getElementById('alumnoId').value = '';
    document.getElementById('alumnoSeleccionado').classList.add('hidden');
    const btnCrear = document.getElementById('btn-crear-alumno-inline');
    if (btnCrear) btnCrear.classList.add('hidden');
    document.getElementById('buscadorAlumno').classList.remove('hidden');
    document.getElementById('btn-cambiar-alumno').classList.add('hidden');
    document.getElementById('searchAlumno').focus();
}

// ==================== ALUMNOS - LISTADO ====================
function filtrarAlumnos() {
    const curso = document.getElementById('filtroAlumnoCurso')?.value || '';
    const division = document.getElementById('filtroAlumnoDivision')?.value || '';
    const turno = document.getElementById('filtroAlumnoTurno')?.value || '';
    const nombre = document.getElementById('filtroAlumnoNombre')?.value.toLowerCase().trim() || '';
    const orden = document.getElementById('ordenAlumnos')?.value || 'informes_desc';

    // Eliminar duplicados por ID (defensa contra datos corruptos)
    const unicos = [...new Map(alumnos.map(a => [a.id, a])).values()];

    const filtrados = unicos.filter(a => {
        const matchCurso = !curso || a.curso === curso;
        const matchDivision = !division || a.division === division;
        const matchTurno = !turno || a.turno === turno;
        const matchNombre = !nombre ||
            `${a.nombre} ${a.apellido}`.toLowerCase().includes(nombre) ||
            `${a.apellido} ${a.nombre}`.toLowerCase().includes(nombre);
        return matchCurso && matchDivision && matchTurno && matchNombre;
    });

    // Calcular cantidad de informes por alumno para ordenamiento
    const informesPorAlumno = {};
    informes.forEach(i => {
        informesPorAlumno[i.alumno_id] = (informesPorAlumno[i.alumno_id] || 0) + 1;
    });

    const numCurso = c => {
        const n = parseInt(c, 10);
        return isNaN(n) ? 0 : n;
    };

    filtrados.sort((a, b) => {
        switch (orden) {
            case 'informes_desc': {
                const ca = informesPorAlumno[a.id] || 0;
                const cb = informesPorAlumno[b.id] || 0;
                if (cb !== ca) return cb - ca;
                return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`);
            }
            case 'informes_asc': {
                const ca = informesPorAlumno[a.id] || 0;
                const cb = informesPorAlumno[b.id] || 0;
                if (ca !== cb) return ca - cb;
                return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`);
            }
            case 'apellido_asc':
                return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`);
            case 'apellido_desc':
                return `${b.apellido} ${b.nombre}`.localeCompare(`${a.apellido} ${a.nombre}`);
            case 'nombre_asc':
                return `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`);
            case 'curso_asc': {
                const na = numCurso(a.curso);
                const nb = numCurso(b.curso);
                if (na !== nb) return na - nb;
                return (a.division || '').localeCompare(b.division || '');
            }
            case 'curso_desc': {
                const na = numCurso(a.curso);
                const nb = numCurso(b.curso);
                if (nb !== na) return nb - na;
                return (b.division || '').localeCompare(a.division || '');
            }
            default:
                return 0;
        }
    });

    renderizarAlumnos(filtrados, informesPorAlumno);
}

function renderizarAlumnos(lista, informesPorAlumno) {
    const container = document.getElementById('listaAlumnos');
    const empty = document.getElementById('alumnosEmpty');
    if (!container) return;

    if (lista.length === 0) {
        container.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');

    container.innerHTML = lista.map(a => {
        const cant = informesPorAlumno[a.id] || 0;
        const turnoColor = a.turno === 'Mañana' ? 'bg-amber-100 text-amber-700' : a.turno === 'Tarde' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700';
        return `
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer card-scroll" onclick="verAlumno('${a.id}')">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    ${a.nombre[0]}${a.apellido[0]}
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-slate-800 text-sm">${a.apellido}, ${a.nombre}</h3>
                    <div class="flex items-center gap-2 mt-0.5">
                        <p class="text-xs text-slate-500">${a.curso} ${a.division}</p>
                        ${a.turno ? `<span class="text-[10px] px-1.5 py-0.5 rounded font-medium ${turnoColor}">${a.turno}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-between pt-3 border-t border-slate-100">
                <span class="text-xs ${cant > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}">${cant} informe${cant !== 1 ? 's' : ''}</span>
                <span class="text-xs text-blue-600 font-medium">Ver historial <i class="fas fa-arrow-right text-xs"></i></span>
            </div>
        </div>
    `}).join('');
    container.querySelectorAll('.card-scroll').forEach(card => cardObserver.observe(card));
}

// ==================== INFORMES - CRUD ====================
function actualizarTabsInformes() {
    const tabs = { todos: document.getElementById('tabTodos'), pendientes: document.getElementById('tabPendientes'), resueltos: document.getElementById('tabResueltos') };
    Object.entries(tabs).forEach(([key, btn]) => {
        if (!btn) return;
        if (key === tabInformesActivo) {
            btn.classList.remove('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
            btn.classList.add('bg-blue-600', 'text-white');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
        }
    });
}

window.setTabInformes = function(tab) {
    tabInformesActivo = tab;
    sessionStorage.setItem('gie_tab_informes', tab);
    actualizarTabsInformes();
    filtrarInformes();
};

function filtrarInformes() {
    const busqueda = document.getElementById('filtroBusqueda').value.toLowerCase();
    const curso = document.getElementById('filtroCurso').value;
    const division = document.getElementById('filtroDivisionInformes')?.value || '';
    const turno = document.getElementById('filtroTurnoInformes')?.value || '';
    const estado = document.getElementById('filtroEstado').value;
    const instancia = document.getElementById('filtroInstancia').value;
    const esRegente = getPerfil()?.rol === 'regente';
    const filtrados = informes.filter(i => {
        const alumno = getAlumno(i.alumno_id);
        const matchBusqueda = !busqueda ||
            `${alumno?.apellido || ''} ${alumno?.nombre || ''}`.toLowerCase().includes(busqueda) ||
            i.titulo.toLowerCase().includes(busqueda) ||
            i.resumen.toLowerCase().includes(busqueda);
        const matchCurso = !curso || (alumno && alumno.curso === curso);
        const matchDivision = !division || (alumno && alumno.division === division);
        const matchTurno = !turno || (alumno && alumno.turno === turno);
        const matchEstado = !estado || i.estado === estado;
        const matchInstancia = !instancia || i.instancia === instancia;
        // Docentes solo ven sus propios informes en la lista general
        const matchCreador = esRegente || i.creado_por === getPerfil()?.id;
        // Filtro rápido por tab
        const matchTab = tabInformesActivo === 'todos' ? true :
            tabInformesActivo === 'pendientes' ? i.estado === 'pendiente' :
            i.estado !== 'pendiente';
        return matchBusqueda && matchCurso && matchDivision && matchTurno && matchEstado && matchInstancia && matchCreador && matchTab;
    });

    // Actualizar badges (filtrados por creador también para docentes)
    const baseFiltrados = informes.filter(i => {
        const alumno = getAlumno(i.alumno_id);
        const matchBusqueda = !busqueda ||
            `${alumno?.apellido || ''} ${alumno?.nombre || ''}`.toLowerCase().includes(busqueda) ||
            i.titulo.toLowerCase().includes(busqueda) ||
            i.resumen.toLowerCase().includes(busqueda);
        const matchCurso = !curso || (alumno && alumno.curso === curso);
        const matchDivision = !division || (alumno && alumno.division === division);
        const matchTurno = !turno || (alumno && alumno.turno === turno);
        const matchEstado = !estado || i.estado === estado;
        const matchInstancia = !instancia || i.instancia === instancia;
        const matchCreador = esRegente || i.creado_por === getPerfil()?.id;
        return matchBusqueda && matchCurso && matchDivision && matchTurno && matchEstado && matchInstancia && matchCreador;
    });
    const badgeTodos = document.getElementById('badgeTodos');
    const badgePendientes = document.getElementById('badgePendientes');
    const badgeResueltos = document.getElementById('badgeResueltos');
    if (badgeTodos) badgeTodos.textContent = baseFiltrados.length;
    if (badgePendientes) badgePendientes.textContent = baseFiltrados.filter(i => i.estado === 'pendiente').length;
    if (badgeResueltos) badgeResueltos.textContent = baseFiltrados.filter(i => i.estado !== 'pendiente').length;

    renderizarInformes(filtrados);
}

function renderCardInforme(i) {
    const alumno = getAlumno(i.alumno_id);
    const esRegente = getPerfil()?.rol === 'regente';
    const estadoVisual = i.estado;
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
    <div id="item-${i.id}" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-all instancia-${i.instancia} card-scroll">
        <div class="flex flex-col sm:flex-row justify-between items-start gap-3" onclick="verDetalle('${i.id}')">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <span class="status-${estadoVisual} px-2 py-0.5 rounded-full text-xs font-medium capitalize">${estadoVisual.replace('_', ' ')}</span>
                    <span class="text-xs text-slate-500">${formatearFechaCorta(i.fecha_creacion)}</span>
                </div>
                <h3 class="font-semibold text-slate-800 mb-1">${i.titulo}</h3>
                <p class="text-sm text-slate-600 mb-2"><i class="fas fa-user mr-1"></i>${alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Desconocido'} • ${alumno ? `${alumno.curso} ${alumno.division}${alumno.turno ? ' · ' + alumno.turno : ''}` : ''}</p>
                <p class="text-sm text-slate-500 line-clamp-2">${i.resumen}</p>
            </div>
            <div class="flex items-center gap-2">
                ${i.instancia === 'muy_grave' ? '<i class="fas fa-exclamation-triangle text-red-500" title="Muy Grave"></i>' : ''}
                <i class="fas fa-chevron-right text-slate-400"></i>
            </div>
        </div>
        ${accionesRapidas}
    </div>`;
}

function renderizarInformes(lista) {
    const contenedor = document.getElementById('listaInformes');
    const sinResultados = document.getElementById('sinResultados');
    if (lista.length === 0) { contenedor.innerHTML = ''; sinResultados.classList.remove('hidden'); return; }
    sinResultados.classList.add('hidden');

    const pendientes = lista.filter(i => i.estado === 'pendiente');
    const resueltos = lista.filter(i => i.estado !== 'pendiente');

    // Ordenar pendientes por instancia (muy_grave > grave > leve), luego fecha
    const ordenInstancia = { muy_grave: 0, grave: 1, leve: 2 };
    pendientes.sort((a, b) => {
        const ordA = ordenInstancia[a.instancia] ?? 3;
        const ordB = ordenInstancia[b.instancia] ?? 3;
        if (ordA !== ordB) return ordA - ordB;
        return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
    });
    // Ordenar resueltos por fecha más reciente
    resueltos.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

    let html = '';
    if (pendientes.length > 0) {
        html += `
        <div class="flex items-center gap-2 mb-3">
            <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide">Pendientes</h3>
            <span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">${pendientes.length}</span>
        </div>
        <div class="space-y-3 mb-6">${pendientes.map(renderCardInforme).join('')}</div>`;
    }
    if (resueltos.length > 0) {
        html += `
        <div class="flex items-center gap-2 mb-3">
            <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide">Resueltos</h3>
            <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">${resueltos.length}</span>
        </div>
        <div class="space-y-3">${resueltos.map(renderCardInforme).join('')}</div>`;
    }
    contenedor.innerHTML = html;
    // Registrar cards nuevas en el observer para animar al hacer scroll
    contenedor.querySelectorAll('.card-scroll').forEach(card => cardObserver.observe(card));
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
    const observaciones = document.getElementById('observaciones').value.trim();
    const instancia = document.getElementById('instancia').value;
    const categoriaId = document.getElementById('categoriaInforme').value;

    // Validación de límites
    if (titulo.length > 200) return mostrarToast('El título no puede exceder 200 caracteres', 'error');
    if (resumen.length > 2000) return mostrarToast('La descripción no puede exceder 2000 caracteres', 'error');
    if (observaciones.length > 1000) return mostrarToast('Las observaciones no pueden exceder 1000 caracteres', 'error');
    if (!instancia) return mostrarToast('Debe seleccionar una instancia', 'error');
    if (!categoriaId) return mostrarToast('Debe seleccionar una categoría', 'error');

    const datos = {
        alumno_id: alumnoId,
        categoria_id: categoriaId,
        tipo_falta: 'Otra',
        instancia,
        titulo,
        resumen,
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
    const otros = categorias.find(c => c.nombre.toLowerCase() === 'otros');
    document.getElementById('categoriaInforme').value = otros ? otros.id : '';

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
                <p class="text-sm text-slate-600">${alumno ? `${alumno.curso} ${alumno.division}${alumno.turno ? ' · ' + alumno.turno : ''}` : ''}</p>
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
                    <p class="text-slate-600 capitalize font-medium ${informe.instancia === 'muy_grave' ? 'text-red-600' : informe.instancia === 'grave' ? 'text-orange-600' : informe.instancia === 'leve' ? 'text-amber-600' : 'text-blue-600'}">${informe.instancia.replace('_', ' ')}</p>
                </div>
                <div><p class="text-sm font-medium text-slate-700 mb-1">Creado por</p><p class="text-slate-600">${getNombreUsuario(informe.creado_por)}</p></div>
            </div>
            <div><p class="text-sm font-medium text-slate-700 mb-1">Descripción de la problemática</p><p class="text-slate-600 whitespace-pre-wrap">${informe.resumen}</p></div>

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
    document.body.classList.add('overflow-hidden');
}

function cerrarModal() { document.getElementById('modalDetalle').classList.add('hidden'); document.body.classList.remove('overflow-hidden'); }

function cerrarModalGrupo() { document.getElementById('modalGrupoInformes').classList.add('hidden'); document.body.classList.remove('overflow-hidden'); }

function abrirModalGrupoInformes(informesGrupo, timestampDia, mostrarAlumno = false) {
    const modal = document.getElementById('modalGrupoInformes');
    const titulo = document.getElementById('tituloModalGrupo');
    const contenido = document.getElementById('contenidoModalGrupo');
    const instancia = informesGrupo[0].instancia;
    const labelInstancia = { leve: 'Leve', grave: 'Grave', muy_grave: 'Muy Grave' };
    const colorInstancia = { leve: 'text-amber-600', grave: 'text-orange-600', muy_grave: 'text-red-600' };

    const fechaHtml = timestampDia ? `<span class="text-sm text-slate-500 font-normal block">${formatearFechaCorta(new Date(timestampDia))}</span>` : '';
    titulo.innerHTML = `${fechaHtml}${informesGrupo.length} informes ${labelInstancia[instancia] ?? instancia}`;

    contenido.innerHTML = informesGrupo.map(i => {
        const alumno = mostrarAlumno ? getAlumno(i.alumno_id) : null;
        return `
        <div onclick="cerrarModalGrupo(); verDetalle('${i.id}')" class="cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-4 transition-colors">
            <div class="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <span class="status-${i.estado} px-2 py-0.5 rounded-full text-xs font-medium capitalize">${i.estado.replace('_', ' ')}</span>
                <span class="text-xs ${colorInstancia[i.instancia] ?? 'text-blue-600'} font-semibold capitalize">${labelInstancia[i.instancia] ?? i.instancia}</span>
            </div>
            <p class="font-medium text-slate-800 text-sm">${i.titulo}</p>
            ${alumno ? `<p class="text-xs text-slate-500 mt-0.5">${alumno.apellido}, ${alumno.nombre} • ${alumno.curso} ${alumno.division}${alumno.turno ? ' · ' + alumno.turno : ''}</p>` : ''}
            <p class="text-xs text-slate-500 mt-1 line-clamp-2">${i.resumen}</p>
        </div>
    `}).join('');

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

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
    document.body.classList.add('overflow-hidden');
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
    document.body.classList.remove('overflow-hidden');
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
    document.getElementById('alumnoCurso').textContent = alumno ? `${alumno.curso} ${alumno.division}${alumno.turno ? ' · ' + alumno.turno : ''}` : '';
    document.getElementById('alumnoSeleccionado').classList.remove('hidden');
    document.getElementById('categoriaInforme').value = informe.categoria_id || '';
    document.getElementById('instancia').value = informe.instancia;
    document.getElementById('titulo').value = informe.titulo;
    document.getElementById('resumen').value = informe.resumen;

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
        const d = parseFechaLocal(i.fecha_reunion);
        return d && d.getFullYear() === year && d.getMonth() === month;
    });

    const reunionesPorDia = {};
    reunionesMes.forEach(i => {
        const d = parseFechaLocal(i.fecha_reunion)?.getDate();
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
        const d = parseFechaLocal(i.fecha_reunion);
        if (!d) return false;
        if (dia !== null) return d.getFullYear() === year && d.getMonth() === month && d.getDate() === dia;
        return d.getFullYear() === year && d.getMonth() === month;
    }).sort((a, b) => parseFechaLocal(a.fecha_reunion) - parseFechaLocal(b.fecha_reunion));

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
        const fechaReunion = parseFechaLocal(i.fecha_reunion);
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
    document.getElementById('dashRechazados').textContent = estados.rechazado;
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
            <div id="dash-item-${i.id}" class="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 card-scroll">
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
    document.getElementById('dashPendientesLista')?.querySelectorAll('.card-scroll').forEach(card => cardObserver.observe(card));

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
            <div class="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer card-scroll" onclick="verDetalle('${i.id}')">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${i.estado === 'aprobado' ? 'bg-green-500' : 'bg-red-500'}">${alumno ? alumno.nombre[0] + alumno.apellido[0] : '?'}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-800 truncate">${i.titulo}</p>
                    <p class="text-xs text-slate-500">${alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Desconocido'} • ${formatearFechaCorta(i.fecha_revision || i.fecha_creacion)}</p>
                </div>
                <span class="status-${i.estado} px-2 py-0.5 rounded text-xs capitalize">${i.estado.replace('_', ' ')}</span>
            </div>`;
        }).join('');
    document.getElementById('dashHistorial').innerHTML = historialHTML;
    document.getElementById('dashHistorial')?.querySelectorAll('.card-scroll').forEach(card => cardObserver.observe(card));

    // ── 4. Gráfico de gravedad (bugfix: aspectRatio fijo + contenedor h-64) ──
    const ctx = document.getElementById('dashChart').getContext('2d');
    if (charts.dash) charts.dash.destroy();
    const dashLabels = ['Leve', 'Grave', 'Muy Grave'];
    const dashInstanciaPorLabel = { 'Leve': 'leve', 'Grave': 'grave', 'Muy Grave': 'muy_grave' };
    charts.dash = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: dashLabels,
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
            maintainAspectRatio: false,
            aspectRatio: 1,
            onClick: (e, elements) => {
                if (!elements.length) return;
                const label = dashLabels[elements[0].index];
                const instancia = dashInstanciaPorLabel[label];
                if (!instancia) return;
                const filtrados = informes.filter(i => i.instancia === instancia);
                if (filtrados.length) abrirModalGrupoInformes(filtrados, null, true);
            },
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
            maintainAspectRatio: false,
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

    const porCategoria = {};
    informes.forEach(i => {
        const cat = categorias.find(c => c.id === i.categoria_id);
        const nombre = cat ? cat.nombre : 'Sin categoría';
        porCategoria[nombre] = (porCategoria[nombre] || 0) + 1;
    });
    const catOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
    const tiposLabels = catOrdenadas.map(e => e[0]);
    const tiposData = catOrdenadas.map(e => e[1]);
    const catColors = catOrdenadas.map(e => {
        const cat = categorias.find(c => c.nombre === e[0]);
        return cat ? cat.color : '#94a3b8';
    });
    const ctxTipos = document.getElementById('chartTipos').getContext('2d');
    if (charts.tipos) charts.tipos.destroy();
    charts.tipos = new Chart(ctxTipos, {
        type: 'pie',
        data: { labels: tiposLabels, datasets: [{ data: tiposData, backgroundColor: catColors }] },
        options: {
            responsive: false,
            animation: { duration: 1200, easing: 'easeOutQuart' },
            onClick: (e, elements) => {
                if (!elements.length) return;
                const label = tiposLabels[elements[0].index];
                const cat = categorias.find(c => c.nombre === label);
                const filtrados = cat ? informes.filter(i => i.categoria_id === cat.id) : informes.filter(i => !i.categoria_id);
                if (filtrados.length) abrirModalGrupoInformes(filtrados, null, true);
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // Tendencia según período seleccionado (agrupado inteligentemente)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let grupos = [];
    let unidadLabel = '';

    if (periodoTendenciaDias <= 30) {
        // Por día
        unidadLabel = 'día';
        for (let i = periodoTendenciaDias - 1; i >= 0; i--) {
            const d = new Date(hoy);
            d.setDate(d.getDate() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            grupos.push({ label, key, ini: new Date(d), fin: new Date(d), conteo: 0 });
        }
    } else if (periodoTendenciaDias <= 90) {
        // Por semana
        unidadLabel = 'semana';
        const totalSemanas = Math.ceil(periodoTendenciaDias / 7);
        for (let i = totalSemanas - 1; i >= 0; i--) {
            const fin = new Date(hoy);
            fin.setDate(fin.getDate() - i * 7);
            const ini = new Date(fin);
            ini.setDate(ini.getDate() - 6);
            const key = `${ini.toISOString().split('T')[0]}_${fin.toISOString().split('T')[0]}`;
            const label = `${String(ini.getDate()).padStart(2, '0')}/${String(ini.getMonth() + 1).padStart(2, '0')} - ${String(fin.getDate()).padStart(2, '0')}/${String(fin.getMonth() + 1).padStart(2, '0')}`;
            grupos.push({ label, key, ini, fin, conteo: 0 });
        }
    } else {
        // Por mes
        unidadLabel = 'mes';
        const mesesAtras = Math.ceil(periodoTendenciaDias / 30);
        for (let i = mesesAtras - 1; i >= 0; i--) {
            const d = new Date(hoy);
            d.setMonth(d.getMonth() - i);
            const ini = new Date(d.getFullYear(), d.getMonth(), 1);
            const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.toLocaleString('es-AR', { month: 'short' })} ${d.getFullYear()}`;
            grupos.push({ label, key, ini, fin, conteo: 0 });
        }
    }

    // Contar informes en cada grupo
    informes.forEach(i => {
        const fecha = new Date(i.fecha_creacion);
        fecha.setHours(0, 0, 0, 0);
        const grupo = grupos.find(g => fecha >= g.ini && fecha <= g.fin);
        if (grupo) grupo.conteo++;
    });

    const ctxMensual = document.getElementById('chartMensual').getContext('2d');
    if (charts.mensual) charts.mensual.destroy();
    charts.mensual = new Chart(ctxMensual, {
        type: 'line',
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            animation: {
                x: {
                    type: 'number',
                    easing: 'linear',
                    duration: 800,
                    from: NaN,
                    delay(ctx) {
                        if (ctx.type !== 'data' || ctx.xStarted) {
                            return 0;
                        }
                        ctx.xStarted = true;
                        return ctx.index * (800 / ctx.chart.data.labels.length);
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    cornerRadius: 8,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        title: (items) => `${items[0].label}`,
                        label: (item) => `${item.raw} informe${item.raw !== 1 ? 's' : ''}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        },
        data: {
            labels: grupos.map(g => g.label),
            datasets: [{ label: `Informes por ${unidadLabel}`, data: grupos.map(g => g.conteo), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4, pointRadius: 3, pointHoverRadius: 5 }]
        }
    });

    const porAlumno = {};
    informes.forEach(i => {
        const alumno = getAlumno(i.alumno_id);
        if (!alumno) return;
        const key = `${alumno.apellido}, ${alumno.nombre}`;
        if (!porAlumno[key]) porAlumno[key] = { total: 0, leve: 0, grave: 0, muy_grave: 0, curso: `${alumno.curso} ${alumno.division}`, id: alumno.id };
        porAlumno[key].total++;
        if (['leve','grave','muy_grave'].includes(i.instancia)) porAlumno[key][i.instancia]++;
    });
    const topAlumnos = Object.entries(porAlumno).sort((a, b) => {
        const sa = a[1], sb = b[1];
        if (sb.total !== sa.total) return sb.total - sa.total;
        if (sb.muy_grave !== sa.muy_grave) return sb.muy_grave - sa.muy_grave;
        if (sb.grave !== sa.grave) return sb.grave - sa.grave;
        return sb.leve - sa.leve;
    }).slice(0, 10);
    document.getElementById('bodyTopAlumnos').innerHTML = topAlumnos.map(([nombre, stats], index) => `
        <tr class="hover:bg-slate-50 cursor-pointer" onclick="verAlumno('${stats.id}')">
            <td class="px-4 py-3 text-center text-slate-400 font-medium">${index + 1}</td>
            <td class="px-4 py-3 font-medium">${nombre}</td>
            <td class="px-4 py-3 text-slate-500">${stats.curso}</td>
            <td class="px-4 py-3 text-center font-bold">${stats.total}</td>
            <td class="px-4 py-3 text-center text-amber-600">${stats.leve}</td>
            <td class="px-4 py-3 text-center text-orange-600">${stats.grave}</td>
            <td class="px-4 py-3 text-center text-red-600">${stats.muy_grave}</td>
        </tr>
    `).join('');
}

function cambiarPeriodoTendencia(dias) {
    periodoTendenciaDias = dias;
    document.querySelectorAll('.periodo-btn').forEach(btn => {
        const esActivo = parseInt(btn.dataset.dias) === dias;
        btn.classList.toggle('bg-white', esActivo);
        btn.classList.toggle('shadow-sm', esActivo);
        btn.classList.toggle('text-slate-800', esActivo);
        btn.classList.toggle('text-slate-600', !esActivo);
    });
    const titulo = document.getElementById('tituloTendencia');
    if (titulo) titulo.textContent = `Tendencia Últimos ${dias} Días`;
    cargarEstadisticas();
}

// ==================== VISTA ALUMNO ====================
function verAlumno(alumnoId) {
    mostrarSkeleton('vistaAlumno');
    const alumno = getAlumno(alumnoId);
    if (!alumno) { ocultarSkeleton('vistaAlumno'); return; }
    const lista = informes.filter(i => i.alumno_id === alumnoId).sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    const stats = { total: lista.length, leve: 0, grave: 0, muy_grave: 0 };
    lista.forEach(i => { if (stats[i.instancia] !== undefined) stats[i.instancia]++; });

    const turnoColorDetalle = alumno.turno === 'Mañana' ? 'bg-amber-100 text-amber-700' : alumno.turno === 'Tarde' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700';
    document.getElementById('tarjetaAlumno').innerHTML = `
        <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">${alumno.nombre[0]}${alumno.apellido[0]}</div>
            <div>
                <h2 class="text-xl font-bold text-slate-800">${alumno.apellido}, ${alumno.nombre}</h2>
                <div class="flex items-center gap-2 mt-1">
                    <p class="text-slate-500">${alumno.curso} ${alumno.division}</p>
                    ${alumno.turno ? `<span class="text-xs px-2 py-0.5 rounded-md font-medium ${turnoColorDetalle}">${alumno.turno}</span>` : ''}
                </div>
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
    const chartLabels = ['Leve', 'Grave', 'Muy Grave'];
    const chartData = [stats.leve, stats.grave, stats.muy_grave];
    const chartColors = ['#fbbf24', '#f97316', '#ef4444'];
    const instanciaPorLabel = { 'Leve': 'leve', 'Grave': 'grave', 'Muy Grave': 'muy_grave' };
    charts.alumno = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: chartLabels, datasets: [{ data: chartData, backgroundColor: chartColors, borderWidth: 0 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, elements) => {
                if (!elements.length) return;
                const label = chartLabels[elements[0].index];
                const instancia = instanciaPorLabel[label];
                if (!instancia) return;
                const filtrados = lista.filter(i => i.instancia === instancia);
                if (filtrados.length) abrirModalGrupoInformes(filtrados);
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // ── Timeline: instancia vs tiempo ──
    const ctxTimeline = document.getElementById('chartAlumnoTimeline').getContext('2d');
    if (charts.alumnoTimeline) charts.alumnoTimeline.destroy();
    const nivelInstancia = { leve: 1, grave: 2, muy_grave: 3 };
    const colorInstancia = { leve: '#fbbf24', grave: '#f97316', muy_grave: '#ef4444' };
    const labelInstancia = { leve: 'Leve', grave: 'Grave', muy_grave: 'Muy Grave' };

    const diaKey = (fecha) => {
        const d = new Date(fecha);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    };

    // Agrupar informes por (dia, instancia) para mostrar un solo punto por grupo
    const grupos = new Map();
    lista.forEach(i => {
        const k = `${diaKey(i.fecha_creacion)}|${i.instancia}`;
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k).push(i);
    });

    const puntos = [];
    grupos.forEach((informesGrupo, k) => {
        const instancia = informesGrupo[0].instancia;
        const avgX = informesGrupo.reduce((sum, i) => sum + new Date(i.fecha_creacion).getTime(), 0) / informesGrupo.length;
        puntos.push({
            x: avgX,
            y: nivelInstancia[instancia] ?? 4,
            instancia,
            informes: informesGrupo
        });
    });

    const crosshairPlugin = {
        id: 'crosshair',
        afterDraw: (chart) => {
            if (chart.tooltip?._active?.length) {
                const ctx = chart.ctx;
                const pt = chart.tooltip._active[0].element;
                const x = pt.x;
                const y = pt.y;
                const topY = chart.scales.y.top;
                const bottomY = chart.scales.y.bottom;
                const leftX = chart.scales.x.left;
                const rightX = chart.scales.x.right;
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
                ctx.moveTo(x, topY);
                ctx.lineTo(x, bottomY);
                ctx.moveTo(leftX, y);
                ctx.lineTo(rightX, y);
                ctx.stroke();
                ctx.restore();
            }
        }
    };

    charts.alumnoTimeline = new Chart(ctxTimeline, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Informes',
                data: puntos,
                backgroundColor: puntos.map(p => colorInstancia[p.instancia] ?? '#3b82f6'),
                pointRadius: puntos.map(p => p.informes.length > 1 ? 9 : 7),
                pointHoverRadius: 11
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, elements, chart) => {
                if (!elements.length) return;
                const punto = chart.data.datasets[elements[0].datasetIndex].data[elements[0].index];
                if (!punto || !punto.informes) return;
                if (punto.informes.length === 1) {
                    verDetalle(punto.informes[0].id);
                } else {
                    abrirModalGrupoInformes(punto.informes, punto.x);
                }
            },
            plugins: {
                legend: { display: false },
                crosshair: true,
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    cornerRadius: 8,
                    padding: 10,
                    displayColors: true,
                    callbacks: {
                        title: (items) => formatearFechaCorta(new Date(items[0].raw.x)),
                        label: (item) => {
                            const g = item.raw.informes;
                            if (g.length === 1) {
                                return `${labelInstancia[g[0].instancia] ?? g[0].instancia} • ${g[0].titulo}`;
                            }
                            return `${g.length} informes ${labelInstancia[g[0].instancia] ?? g[0].instancia}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    ticks: {
                        callback: (v) => formatearFechaCorta(new Date(v)),
                        maxTicksLimit: 6
                    },
                    grid: { color: '#f1f5f9' }
                },
                y: {
                    min: 0.5,
                    max: 4.5,
                    ticks: {
                        stepSize: 1,
                        callback: (v) => {
                            const labels = { 1: 'Leve', 2: 'Grave', 3: 'Muy Grave' };
                            return labels[v] ?? '';
                        }
                    },
                    grid: { color: '#f1f5f9' }
                }
            }
        }
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
    ocultarSkeleton('vistaAlumno');
}

function verDocente(userId) {
    mostrarSkeleton('vistaDocente');
    const u = usuarios.find(x => x.id === userId);
    if (!u) { ocultarSkeleton('vistaDocente'); return; }
    const lista = informes.filter(i => i.creado_por === userId).sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    const stats = { total: lista.length, pendiente: 0, aprobado: 0, rechazado: 0, archivado: 0 };
    lista.forEach(i => { if (stats[i.estado] !== undefined) stats[i.estado]++; });

    const rolColor = { regente: 'bg-purple-100 text-purple-700', preceptor: 'bg-blue-100 text-blue-700', docente: 'bg-green-100 text-green-700' };
    document.getElementById('tarjetaDocente').innerHTML = `
        <div class="flex items-center gap-4">
            <div class="w-16 h-16 ${u.rol === 'regente' ? 'bg-purple-500' : u.rol === 'preceptor' ? 'bg-blue-500' : 'bg-green-500'} rounded-full flex items-center justify-center text-white text-2xl font-bold">${(u.nombre || '?')[0]}${(u.apellido || '?')[0]}</div>
            <div>
                <h2 class="text-xl font-bold text-slate-800">${u.apellido || ''}, ${u.nombre || ''}</h2>
                <div class="flex items-center gap-2 mt-1">
                    <p class="text-slate-500">${u.email}</p>
                    ${u.rol ? `<span class="text-xs px-2 py-0.5 rounded-md font-medium ${rolColor[u.rol] || 'bg-slate-100 text-slate-600'}">${u.rol}</span>` : ''}
                </div>
                <p class="text-sm text-slate-400 mt-1">${stats.total} informe${stats.total !== 1 ? 's' : ''} creado${stats.total !== 1 ? 's' : ''}</p>
            </div>
        </div>
        <div class="grid grid-cols-4 gap-4 mt-6">
            <div class="text-center p-3 bg-amber-50 rounded-lg"><p class="text-2xl font-bold text-amber-600">${stats.pendiente}</p><p class="text-xs text-amber-700">Pendientes</p></div>
            <div class="text-center p-3 bg-green-50 rounded-lg"><p class="text-2xl font-bold text-green-600">${stats.aprobado}</p><p class="text-xs text-green-700">Aprobados</p></div>
            <div class="text-center p-3 bg-red-50 rounded-lg"><p class="text-2xl font-bold text-red-600">${stats.rechazado}</p><p class="text-xs text-red-700">Rechazados</p></div>
            <div class="text-center p-3 bg-slate-50 rounded-lg"><p class="text-2xl font-bold text-slate-600">${stats.archivado}</p><p class="text-xs text-slate-700">Archivados</p></div>
        </div>
    `;

    const ctx = document.getElementById('chartDocenteEstado').getContext('2d');
    if (charts.docenteEstado) charts.docenteEstado.destroy();
    const estadoLabels = ['Pendiente', 'Aprobado', 'Rechazado', 'Archivado'];
    const estadoData = [stats.pendiente, stats.aprobado, stats.rechazado, stats.archivado];
    const estadoColors = ['#fbbf24', '#22c55e', '#ef4444', '#94a3b8'];
    charts.docenteEstado = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: estadoLabels, datasets: [{ data: estadoData, backgroundColor: estadoColors, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    const ctxTimeline = document.getElementById('chartDocenteTimeline').getContext('2d');
    if (charts.docenteTimeline) charts.docenteTimeline.destroy();
    const nivelInstancia = { leve: 1, grave: 2, muy_grave: 3 };
    const colorInstancia = { leve: '#fbbf24', grave: '#f97316', muy_grave: '#ef4444' };
    const labelInstancia = { leve: 'Leve', grave: 'Grave', muy_grave: 'Muy Grave' };

    const diaKey = (fecha) => {
        const d = new Date(fecha);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    };
    const grupos = new Map();
    lista.forEach(i => {
        const k = `${diaKey(i.fecha_creacion)}|${i.instancia}`;
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k).push(i);
    });
    const puntos = [];
    grupos.forEach((informesGrupo, k) => {
        const instancia = informesGrupo[0].instancia;
        const avgX = informesGrupo.reduce((sum, i) => sum + new Date(i.fecha_creacion).getTime(), 0) / informesGrupo.length;
        puntos.push({ x: avgX, y: nivelInstancia[instancia] ?? 4, instancia, informes: informesGrupo });
    });

    const crosshairPlugin = {
        id: 'crosshair',
        afterDraw: (chart) => {
            if (chart.tooltip?._active?.length) {
                const ctx = chart.ctx;
                const pt = chart.tooltip._active[0].element;
                const x = pt.x, y = pt.y;
                const topY = chart.scales.y.top, bottomY = chart.scales.y.bottom;
                const leftX = chart.scales.x.left, rightX = chart.scales.x.right;
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
                ctx.moveTo(x, topY); ctx.lineTo(x, bottomY);
                ctx.moveTo(leftX, y); ctx.lineTo(rightX, y);
                ctx.stroke();
                ctx.restore();
            }
        }
    };

    charts.docenteTimeline = new Chart(ctxTimeline, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Informes',
                data: puntos,
                backgroundColor: puntos.map(p => colorInstancia[p.instancia] ?? '#3b82f6'),
                pointRadius: puntos.map(p => p.informes.length > 1 ? 9 : 7),
                pointHoverRadius: 11
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            onClick: (e, elements, chart) => {
                if (!elements.length) return;
                const punto = chart.data.datasets[elements[0].datasetIndex].data[elements[0].index];
                if (!punto || !punto.informes) return;
                if (punto.informes.length === 1) { verDetalle(punto.informes[0].id); }
                else { abrirModalGrupoInformes(punto.informes, punto.x); }
            },
            plugins: {
                legend: { display: false }, crosshair: true,
                tooltip: {
                    backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#f8fafc', cornerRadius: 8, padding: 10, displayColors: true,
                    callbacks: {
                        title: (items) => formatearFechaCorta(new Date(items[0].raw.x)),
                        label: (item) => {
                            const g = item.raw.informes;
                            if (g.length === 1) return `${labelInstancia[g[0].instancia] ?? g[0].instancia} • ${g[0].titulo}`;
                            return `${g.length} informes ${labelInstancia[g[0].instancia] ?? g[0].instancia}`;
                        }
                    }
                }
            },
            scales: {
                x: { type: 'linear', ticks: { callback: (v) => formatearFechaCorta(new Date(v)), maxTicksLimit: 6 }, grid: { color: '#f1f5f9' } },
                y: { min: 0.5, max: 4.5, ticks: { stepSize: 1, callback: (v) => { const labels = { 1: 'Leve', 2: 'Grave', 3: 'Muy Grave' }; return labels[v] ?? ''; } }, grid: { color: '#f1f5f9' } }
            }
        }
    });

    document.getElementById('historialDocente').innerHTML = lista.map(i => {
        const alumno = getAlumno(i.alumno_id);
        return `
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 instancia-${i.instancia}">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="status-${i.estado} px-2 py-0.5 rounded-full text-xs font-medium capitalize">${i.estado.replace('_', ' ')}</span>
                <span class="text-xs text-slate-500">${formatearFechaCorta(i.fecha_creacion)}</span>
            </div>
            <h4 class="font-semibold text-slate-800">${i.titulo}</h4>
            <p class="text-sm text-slate-600 line-clamp-2">${i.resumen}</p>
            <p class="text-xs text-slate-500 mt-1">${alumno ? `${alumno.apellido}, ${alumno.nombre} · ${alumno.curso} ${alumno.division}` : 'Alumno desconocido'}</p>
            <button onclick="verDetalle('${i.id}')" class="text-sm text-blue-600 hover:text-blue-700 mt-2">Ver detalle <i class="fas fa-arrow-right text-xs"></i></button>
        </div>
    `;
    }).join('');

    showSection('vistaDocente');
    ocultarSkeleton('vistaDocente');
}

// ==================== USUARIOS ====================
async function cargarUsuarios() {
    if (getPerfil().rol !== 'regente') return;
    await cargarUsuariosSupa();
    const lista = usuarios.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const renderRow = (u) => {
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
                ${u.id !== getPerfil().id && u.email !== 'admin@gie.com' ? `<button onclick="mostrarModalEliminar('${u.id}')" class="text-sm text-red-600 hover:text-red-700" title="Eliminar"><i class="fas fa-trash-alt"></i></button>` : ''}
            `}`;
        return { nombreCompleto, rolBadge, activoBadge, acciones, sinPerfil };
    };

    // Desktop
    document.getElementById('listaUsuariosDesktop').innerHTML = lista.map(u => {
        const r = renderRow(u);
        return `
        <tr id="user-row-${u.id}" class="hover:bg-slate-50 transition-colors ${r.sinPerfil ? 'bg-amber-50/50' : ''}">
            <td class="px-4 py-3 font-medium">${r.nombreCompleto}</td>
            <td class="px-4 py-3 text-slate-500">${u.email}</td>
            <td class="px-4 py-3">${r.rolBadge}</td>
            <td class="px-4 py-3">${r.activoBadge}</td>
            <td class="px-4 py-3">
                <div class="flex items-center gap-2">${r.acciones}</div>
            </td>
        </tr>`;
    }).join('');

    // Mobile cards
    document.getElementById('listaUsuariosMobile').innerHTML = lista.map(u => {
        const r = renderRow(u);
        return `
        <div id="user-card-${u.id}" class="p-4 ${r.sinPerfil ? 'bg-amber-50/50' : ''}">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <p class="font-medium text-slate-800 text-sm">${r.nombreCompleto}</p>
                    <p class="text-xs text-slate-500 mt-0.5 truncate">${u.email}</p>
                    <div class="flex items-center gap-2 mt-2">
                        ${r.rolBadge}
                        ${r.activoBadge}
                    </div>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                    ${r.acciones}
                </div>
            </div>
        </div>`;
    }).join('');
}

async function cargarDocentes() {
    await cargarUsuariosSupa();
    filtrarDocentes();
}

function filtrarDocentes() {
    const busqueda = (document.getElementById('filtroDocenteNombre')?.value || '').toLowerCase().trim();
    const rol = document.getElementById('filtroDocenteRol')?.value || '';
    const orden = document.getElementById('ordenDocentes')?.value || 'nombre_asc';

    let lista = usuarios.filter(u => {
        const matchBusqueda = !busqueda ||
            `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase().includes(busqueda) ||
            (u.email || '').toLowerCase().includes(busqueda);
        const matchRol = !rol || u.rol === rol;
        return matchBusqueda && matchRol;
    });

    lista = lista.map(u => {
        const creados = informes.filter(i => i.creado_por === u.id).length;
        const pendientes = informes.filter(i => i.creado_por === u.id && i.estado === 'pendiente').length;
        const aprobados = informes.filter(i => i.creado_por === u.id && i.estado === 'aprobado').length;
        const rechazados = informes.filter(i => i.creado_por === u.id && i.estado === 'rechazado').length;
        const revisados = informes.filter(i => i.revisado_por === u.id && (i.estado === 'aprobado' || i.estado === 'rechazado')).length;
        return { ...u, creados, pendientes, aprobados, rechazados, revisados };
    });

    lista.sort((a, b) => {
        if (orden === 'nombre_asc') return `${a.apellido || ''}, ${a.nombre || ''}`.localeCompare(`${b.apellido || ''}, ${b.nombre || ''}`);
        if (orden === 'nombre_desc') return `${b.apellido || ''}, ${b.nombre || ''}`.localeCompare(`${a.apellido || ''}, ${a.nombre || ''}`);
        if (orden === 'rol_asc') return (a.rol || '').localeCompare(b.rol || '');
        if (orden === 'rol_desc') return (b.rol || '').localeCompare(a.rol || '');
        if (orden === 'informes_desc') return b.creados - a.creados;
        if (orden === 'informes_asc') return a.creados - b.creados;
        return 0;
    });

    const rolColor = { regente: 'bg-purple-100 text-purple-700', preceptor: 'bg-blue-100 text-blue-700', docente: 'bg-green-100 text-green-700' };
    const rolLabel = { regente: 'Regente', preceptor: 'Preceptor', docente: 'Docente' };

    const nombreCompleto = (u) => `${u.apellido || ''}, ${u.nombre || ''}`;

    document.getElementById('listaDocentesDesktop').innerHTML = lista.map(u => `
        <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="verDocente('${u.id}')">
            <td class="px-4 py-3 font-medium">${nombreCompleto(u)}</td>
            <td class="px-4 py-3 text-slate-500">${u.email}</td>
            <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs font-medium capitalize ${rolColor[u.rol] || 'bg-slate-100 text-slate-600'}">${rolLabel[u.rol] || u.rol}</span></td>
            <td class="px-4 py-3 text-center font-semibold text-slate-700">${u.creados}</td>
            <td class="px-4 py-3 text-center"><span class="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">${u.pendientes}</span></td>
            <td class="px-4 py-3 text-center"><span class="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">${u.aprobados}</span></td>
            <td class="px-4 py-3 text-center"><span class="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">${u.rechazados}</span></td>
        </tr>
    `).join('');

    document.getElementById('listaDocentesMobile').innerHTML = lista.map(u => `
        <div class="p-4 cursor-pointer" onclick="verDocente('${u.id}')">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <p class="font-medium text-slate-800 text-sm">${nombreCompleto(u)}</p>
                    <p class="text-xs text-slate-500 mt-0.5 truncate">${u.email}</p>
                    <div class="mt-2">${u.rol ? `<span class="px-2 py-1 rounded-full text-xs font-medium capitalize ${rolColor[u.rol] || 'bg-slate-100 text-slate-600'}">${rolLabel[u.rol] || u.rol}</span>` : ''}</div>
                </div>
            </div>
            <div class="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                <div><p class="text-lg font-bold text-slate-700">${u.creados}</p><p class="text-[10px] text-slate-500 uppercase">Creados</p></div>
                <div><p class="text-lg font-bold text-amber-600">${u.pendientes}</p><p class="text-[10px] text-slate-500 uppercase">Pendientes</p></div>
                <div><p class="text-lg font-bold text-green-600">${u.aprobados}</p><p class="text-[10px] text-slate-500 uppercase">Aprobados</p></div>
                <div><p class="text-lg font-bold text-red-600">${u.rechazados}</p><p class="text-[10px] text-slate-500 uppercase">Rechazados</p></div>
            </div>
        </div>
    `).join('');

    const empty = document.getElementById('docentesEmpty');
    if (lista.length === 0) {
        document.getElementById('listaDocentesDesktop').innerHTML = '';
        document.getElementById('listaDocentesMobile').innerHTML = '';
        empty?.classList.remove('hidden');
    } else {
        empty?.classList.add('hidden');
    }
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
    document.body.classList.add('overflow-hidden');
};

window.cerrarModalEditarUsuario = function() {
    document.getElementById('modalEditarUsuario').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
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

let _eliminarUserId = null;

window.mostrarModalEliminar = function(id) {
    const u = usuarios.find(x => x.id === id);
    if (!u) return;
    if (id === getPerfil().id) {
        return mostrarToast('No podés eliminar tu propio usuario', 'error');
    }
    if (u.email === 'admin@gie.com') {
        return mostrarToast('No se puede eliminar al usuario administrador', 'error');
    }
    _eliminarUserId = id;
    document.getElementById('eliminarUserNombre').textContent = `${u.nombre || u.email} (${u.email})`;
    document.getElementById('modalConfirmarEliminar').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
};

window.cerrarModalEliminar = function() {
    _eliminarUserId = null;
    document.getElementById('modalConfirmarEliminar').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
};

window.confirmarEliminarUsuario = async function() {
    if (!_eliminarUserId) return;
    const id = _eliminarUserId;
    const u = usuarios.find(x => x.id === id);
    const row = document.getElementById(`user-row-${id}`);
    const card = document.getElementById(`user-card-${id}`);
    if (row) row.classList.add('animate-slide-out');
    if (card) card.classList.add('animate-slide-out');

    console.log('[GIE] Intentando eliminar usuario:', id, 'perfil actual:', getPerfil());
    const { error } = await supabaseClient.rpc('eliminar_usuario_completo', { user_id: id });
    if (error) {
        console.error('[GIE] Error RPC eliminar_usuario_completo:', error);
        if (row) row.classList.remove('animate-slide-out');
        if (card) card.classList.remove('animate-slide-out');
        return mostrarToast('Error eliminando usuario: ' + error.message, 'error');
    }

    mostrarToast(`Usuario ${u.nombre || u.email} eliminado`);
    cerrarModalEliminar();
    setTimeout(() => {
        if (row) row.remove();
        if (card) card.remove();
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

    const predefinidas = Object.entries(PLANTILLAS_INFORME).map(([key, p]) => ({
        key, titulo: p.titulo, instancia: p.instancia, resumen: p.resumen
    })).sort((a, b) => a.titulo.localeCompare(b.titulo));

    const personalizadas = plantillas.slice().sort((a, b) => a.titulo.localeCompare(b.titulo));

    let html = '<option value="">Seleccionar plantilla...</option>';

    if (predefinidas.length > 0) {
        html += '<optgroup label="Predefinidas">';
        predefinidas.forEach(p => {
            html += `<option value="${p.key}" data-predefinida="true">${p.titulo}</option>`;
        });
        html += '</optgroup>';
    }

    if (personalizadas.length > 0) {
        html += '<optgroup label="Personalizadas">';
        personalizadas.forEach(p => {
            html += `<option value="${p.id}" data-predefinida="false">${p.titulo}</option>`;
        });
        html += '</optgroup>';
    }

    select.innerHTML = html;
}

function renderizarSelectCategorias() {
    const select = document.getElementById('categoriaInforme');
    if (!select) return;
    const actual = select.value;
    let html = '<option value="">Seleccione...</option>';
    categorias.forEach(c => {
        html += `<option value="${c.id}">${c.nombre}</option>`;
    });
    select.innerHTML = html;
    if (actual) {
        select.value = actual;
    } else {
        const otros = categorias.find(c => c.nombre.toLowerCase() === 'otros');
        if (otros) select.value = otros.id;
    }
}

window.abrirModalPlantillas = function() {
    document.getElementById('modalPlantillas').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    renderizarListaPlantillas();
};
window.cerrarModalPlantillas = function() {
    document.getElementById('modalPlantillas').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
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
            <div class="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-700 truncate">${p.titulo}</p>
                    <p class="text-xs text-slate-500 capitalize">${p.instancia}</p>
                </div>
                <button onclick="eliminarPlantilla('${p.id}')" class="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs font-medium rounded-md transition-colors border border-red-200" title="Eliminar plantilla">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
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
async function exportarPDF(id) {
    const informe = getInforme(id);
    if (!informe) return;
    const alumno = getAlumno(informe.alumno_id);
    const creador = getNombreUsuario(informe.creado_por);
    const chk = (val) => informe.instancia === val ? '☑' : '☐';

    // Cargar logo como base64
    let logoSrc = '';
    try {
        const res = await fetch('./logo-informe.png');
        const blob = await res.blob();
        logoSrc = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) { /* sin logo */ }

    const container = document.createElement('div');
    container.style.cssText = 'padding:12px 24px; font-family:Arial,Helvetica,sans-serif; color:#000; max-width:800px; margin:0 auto; background:#fff; font-size:11px; line-height:1.4;';
    container.innerHTML = `
        <div style="text-align:center; margin-bottom:10px;">
            ${logoSrc ? `<img src="${logoSrc}" style="height:50px; margin:0 auto 4px; display:block;" />` : ''}
            <div style="font-size:10px; font-weight:bold;">GOBIERNO DE LA CIUDAD AUTÓNOMA DE BUENOS AIRES</div>
            <div style="font-size:10px; font-weight:bold;">MINISTERIO DE EDUCACIÓN</div>
            <div style="font-size:10px; font-weight:bold; margin-top:2px;">E.T. N°35 D.E. 18, "Ing. Eduardo Latzina"</div>
            <div style="font-size:12px; font-weight:bold; margin-top:4px; text-decoration:underline;">INFORME DE CONVIVENCIA ESCOLAR</div>
        </div>

        <div style="margin-bottom:6px;">
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">1. Datos del Alumno/a</div>
            <table style="width:100%; border-collapse:collapse;">
                <tr><td style="padding:2px 0 10px 0; width:80px;">Alumno/a:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;">${alumno ? `${alumno.apellido}, ${alumno.nombre}` : ''}</td></tr>
                <tr><td style="padding:2px 0 10px 0;">Año:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;">${alumno ? alumno.curso : ''}</td></tr>
                <tr><td style="padding:2px 0 10px 0;">División:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;">${alumno ? alumno.division : ''}</td></tr>
                ${alumno?.turno ? `<tr><td style="padding:2px 0 10px 0;">Turno:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;">${alumno.turno}</td></tr>` : ''}
            </table>
        </div>

        <div style="margin-bottom:6px;">
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">2. Descripción de la Acción</div>
            <p style="margin:0 0 4px;">Ha realizado la acción que se describe a continuación:</p>
            <div style="border:1px solid #000; padding:6px; min-height:100px; margin-bottom:4px;">
                <div style="font-weight:bold; margin-bottom:2px;">${informe.titulo}</div>
                <div style="white-space:pre-wrap;">${informe.resumen}</div>
            </div>
            <p style="margin:0;">transgrediendo normas del reglamento y convivencia de la escuela.</p>
        </div>

        <div style="margin-bottom:6px;">
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">3. Solicitud de Sanción</div>
            <table style="width:100%; border-collapse:collapse;">
                <tr><td style="padding:2px 0 10px 0; width:100px;">Docente:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;">${creador}</td></tr>
                <tr><td style="padding:2px 0 10px 0;">Cargo / Función:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;">Docente</td></tr>
                <tr><td style="padding:2px 0 10px 0;">Fecha:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;">${formatearFecha(informe.fecha_creacion)}</td></tr>
                <tr><td style="padding:2px 0 10px 0;">Firma:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td></tr>
            </table>
        </div>

        <div style="margin-bottom:6px;">
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">4. Descargo del Alumno/a</div>
            <div style="border:1px solid #000; padding:6px; min-height:80px;">${informe.descargo ? `<div style="white-space:pre-wrap;">${informe.descargo}</div>` : ''}</div>
        </div>

        <div style="margin-bottom:6px;">
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">5. Observaciones</div>
            <div style="border:1px solid #000; padding:6px; min-height:80px;">${informe.observaciones ? `<div style="white-space:pre-wrap;">${informe.observaciones}</div>` : ''}</div>
        </div>

        <div>
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">6. Determinación de la Sanción</div>
            <p style="margin:0 0 4px;">Se considera que corresponde:</p>
            <div style="display:flex; gap:16px; flex-wrap:wrap;">
                <span>${chk('leve')}&nbsp;&nbsp;1° Instancia — LEVE</span>
                <span>${chk('grave')}&nbsp;&nbsp;2° Instancia — GRAVE</span>
                <span>${chk('muy_grave')}&nbsp;&nbsp;3° Instancia — MUY GRAVE</span>
            </div>
            <div style="margin-top:4px;">
                <div style="margin-bottom:6px;">Otra consideración:</div>
                <div style="border-bottom:1px solid #000; height:24px;"></div>
            </div>
            <div style="margin-top:8px;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr><td style="padding:2px 0 10px 0; width:50%;">Firma del Directivo:</td><td style="padding:2px 0 10px 0;">Fecha:</td></tr>
                    <tr><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;">${formatearFecha(new Date().toISOString())}</td></tr>
                </table>
            </div>
        </div>
    `;
    document.body.appendChild(container);
    await html2pdf().set({ margin: [8,8,8,8], filename: `informe_${alumno ? alumno.apellido : 'doc'}_${informe.fecha_creacion.split('T')[0]}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(container).save();
    document.body.removeChild(container);
}

async function exportarPDFEnBlanco() {
    // Cargar logo como base64
    let logoSrc = '';
    try {
        const res = await fetch('./logo-informe.png');
        const blob = await res.blob();
        logoSrc = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) { /* sin logo */ }

    const container = document.createElement('div');
    container.style.cssText = 'padding:12px 24px; font-family:Arial,Helvetica,sans-serif; color:#000; max-width:800px; margin:0 auto; background:#fff; font-size:11px; line-height:1.4;';
    container.innerHTML = `
        <div style="text-align:center; margin-bottom:10px;">
            ${logoSrc ? `<img src="${logoSrc}" style="height:50px; margin:0 auto 4px; display:block;" />` : ''}
            <div style="font-size:10px; font-weight:bold;">GOBIERNO DE LA CIUDAD AUTÓNOMA DE BUENOS AIRES</div>
            <div style="font-size:10px; font-weight:bold;">MINISTERIO DE EDUCACIÓN</div>
            <div style="font-size:10px; font-weight:bold; margin-top:2px;">E.T. N°35 D.E. 18, "Ing. Eduardo Latzina"</div>
            <div style="font-size:12px; font-weight:bold; margin-top:4px; text-decoration:underline;">INFORME DE CONVIVENCIA ESCOLAR</div>
        </div>

        <div style="margin-bottom:6px;">
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">1. Datos del Alumno/a</div>
            <table style="width:100%; border-collapse:collapse;">
                <tr><td style="padding:2px 0 10px 0; width:80px;">Alumno/a:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td></tr>
                <tr><td style="padding:2px 0 10px 0;">Año:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td></tr>
                <tr><td style="padding:2px 0 10px 0;">División:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td></tr>
                <tr><td style="padding:2px 0 10px 0;">Turno:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td></tr>
            </table>
        </div>

        <div style="margin-bottom:6px;">
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">2. Descripción de la Acción</div>
            <p style="margin:0 0 4px;">Ha realizado la acción que se describe a continuación:</p>
            <div style="border:1px solid #000; padding:6px; min-height:100px; margin-bottom:4px;">
                <div style="font-weight:bold; margin-bottom:2px;"></div>
                <div></div>
            </div>
            <p style="margin:0;">transgrediendo normas del reglamento y convivencia de la escuela.</p>
        </div>

        <div style="margin-bottom:6px;">
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">3. Solicitud de Sanción</div>
            <table style="width:100%; border-collapse:collapse;">
                <tr><td style="padding:2px 0 10px 0; width:100px;">Docente:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td></tr>
                <tr><td style="padding:2px 0 10px 0;">Cargo / Función:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td></tr>
                <tr><td style="padding:2px 0 10px 0;">Fecha:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td></tr>
                <tr><td style="padding:2px 0 10px 0;">Firma:</td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td></tr>
            </table>
        </div>

        <div style="margin-bottom:6px;">
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">4. Descargo del Alumno/a</div>
            <div style="border:1px solid #000; padding:6px; min-height:80px;"></div>
        </div>

        <div style="margin-bottom:6px;">
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">5. Observaciones</div>
            <div style="border:1px solid #000; padding:6px; min-height:80px;"></div>
        </div>

        <div>
            <div style="font-weight:bold; font-size:10px; margin-bottom:2px;">6. Determinación de la Sanción</div>
            <p style="margin:0 0 4px;">Se considera que corresponde:</p>
            <div style="display:flex; gap:16px; flex-wrap:wrap;">
                <span>☐&nbsp;&nbsp;1° Instancia — LEVE</span>
                <span>☐&nbsp;&nbsp;2° Instancia — GRAVE</span>
                <span>☐&nbsp;&nbsp;3° Instancia — MUY GRAVE</span>
            </div>
            <div style="margin-top:4px;">
                <div style="margin-bottom:6px;">Otra consideración:</div>
                <div style="border-bottom:1px solid #000; height:24px;"></div>
            </div>
            <div style="margin-top:8px;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr><td style="padding:2px 0 10px 0; width:50%;">Firma del Directivo:</td><td style="padding:2px 0 10px 0;">Fecha:</td></tr>
                    <tr><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td><td style="padding:2px 0 10px 0; border-bottom:1px solid #000;"></td></tr>
                </table>
            </div>
        </div>
    `;
    document.body.appendChild(container);
    await html2pdf().set({ margin: [8,8,8,8], filename: `informe_en_blanco_${new Date().toISOString().split('T')[0]}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(container).save();
    document.body.removeChild(container);
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
window.cambiarPeriodoTendencia = cambiarPeriodoTendencia;

// ==================== ESPACIO BASE DE DATOS ====================
const DB_LIMITE_MB_DEFAULT = 500; // Límite por defecto (plan Free Supabase)

async function cargarEspacioBD() {
    if (!USE_SUPABASE) return;
    const esRegente = getPerfil()?.rol === 'regente';
    const card = document.getElementById('cardDbSpace');
    if (!esRegente) {
        if (card) card.classList.add('hidden');
        return;
    }
    if (card) card.classList.remove('hidden');

    const { data, error } = await supabaseClient.rpc('obtener_espacio_bd');
    if (error || !data || !data.length) {
        document.getElementById('dbSpaceUsedLabel').textContent = 'Error';
        console.error('[GIE] Error obteniendo espacio BD:', error);
        return;
    }
    const row = data[0];
    renderizarEspacioBD(row.usado_bytes, row.usado_texto);
}

function renderizarEspacioBD(usadoBytes, usadoTexto) {
    const usedLabel = document.getElementById('dbSpaceUsedLabel');
    const totalLabel = document.getElementById('dbSpaceTotalLabel');
    const percentLabel = document.getElementById('dbSpacePercentLabel');
    const bar = document.getElementById('dbSpaceBar');
    const alertEl = document.getElementById('dbSpaceAlert');

    const limiteMB = parseInt(localStorage.getItem('gie_db_limite_mb') || DB_LIMITE_MB_DEFAULT, 10);
    const limiteBytes = limiteMB * 1024 * 1024;
    let porcentaje = usadoBytes ? Math.round((usadoBytes / limiteBytes) * 100) : 0;
    if (porcentaje > 100) porcentaje = 100;

    usedLabel.textContent = usadoTexto || '—';
    totalLabel.textContent = formatearBytes(limiteBytes);
    percentLabel.textContent = porcentaje + '%';
    bar.style.width = porcentaje + '%';

    bar.classList.remove('bg-blue-500', 'bg-amber-500', 'bg-red-500');
    alertEl.classList.add('hidden');
    if (porcentaje >= 90) {
        bar.classList.add('bg-red-500');
        alertEl.classList.remove('hidden');
    } else if (porcentaje >= 70) {
        bar.classList.add('bg-amber-500');
    } else {
        bar.classList.add('bg-blue-500');
    }
}

function formatearBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return Number.isInteger(val) ? val + ' ' + sizes[i] : val + ' ' + sizes[i];
}

// Exponer funciones usadas en onclick al scope global
window.showSection = showSection;
window.logout = logout;

// Debug helper: ejecutar debugGIE() en la consola del navegador
window.debugGIE = function() {
    // Debug helper desactivado en producción
};

window.verDetalle = verDetalle;
window.verAlumno = verAlumno;
window.verDocente = verDocente;
window.editarInforme = editarInforme;
window.cambiarEstado = cambiarEstado;
window.mostrarRechazo = mostrarRechazo;
window.cerrarModal = cerrarModal;
window.cerrarModalGrupo = cerrarModalGrupo;
window.abrirModalGrupoInformes = abrirModalGrupoInformes;
window.cerrarModalRechazo = cerrarModalRechazo;
window.confirmarRechazo = confirmarRechazo;
window.exportarPDF = exportarPDF;
window.exportarPDFEnBlanco = exportarPDFEnBlanco;
window.limpiarAlumno = limpiarAlumno;
window.cancelarForm = cancelarForm;
window.filtrarInformes = filtrarInformes;
window.seleccionarAlumno = seleccionarAlumno;
window.abrirModalPlantillas = abrirModalPlantillas;
window.cerrarModalPlantillas = cerrarModalPlantillas;
window.crearPlantilla = crearPlantilla;
window.eliminarPlantilla = eliminarPlantilla;
window.mostrarModalEliminar = mostrarModalEliminar;
window.cerrarModalEliminar = cerrarModalEliminar;
window.confirmarEliminarUsuario = confirmarEliminarUsuario;

// ==================== CREAR ALUMNO INLINE ====================
window.mostrarModalCrearAlumno = function() {
    document.getElementById('modalCrearAlumno').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    document.getElementById('newAlumnoNombre').value = '';
    document.getElementById('newAlumnoApellido').value = '';
    document.getElementById('newAlumnoCurso').value = '';
    document.getElementById('newAlumnoDivision').value = '';
    document.getElementById('newAlumnoTurno').value = '';
};
window.cerrarModalCrearAlumno = function() {
    document.getElementById('modalCrearAlumno').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
};
window.guardarNuevoAlumno = async function() {
    const nombre = document.getElementById('newAlumnoNombre').value.trim();
    const apellido = document.getElementById('newAlumnoApellido').value.trim();
    const curso = document.getElementById('newAlumnoCurso').value;
    const division = document.getElementById('newAlumnoDivision').value;
    const turno = document.getElementById('newAlumnoTurno').value;
    if (!nombre || !apellido || !curso || !division || !turno) {
        return mostrarToast('Todos los campos son obligatorios', 'error');
    }
    const { data, error } = await supabaseClient.from('alumnos').insert({ nombre, apellido, curso, division, turno }).select().single();
    if (error) {
        return mostrarToast('Error creando alumno: ' + error.message, 'error');
    }
    await cargarAlumnos();
    cerrarModalCrearAlumno();
    mostrarToast('Alumno creado correctamente');
    const enSeccionAlumnos = document.getElementById('alumnos') && !document.getElementById('alumnos').classList.contains('hidden');
    if (enSeccionAlumnos) {
        filtrarAlumnos();
        verAlumno(data.id);
    } else {
        seleccionarAlumno(data.id, data.nombre, data.apellido, data.curso, data.division, data.turno);
    }
};

// ==================== FECHA DE REUNIÓN ====================
let _reunionCallback = null;
window.mostrarModalFechaReunion = function(informeId, callback) {
    _reunionCallback = callback;
    document.getElementById('reunionInformeId').value = informeId;
    document.getElementById('fechaReunionInput').value = '';
    document.getElementById('reunionObservacion').value = '';
    document.getElementById('modalFechaReunion').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
};
window.cerrarModalFechaReunion = function() {
    document.getElementById('modalFechaReunion').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    _reunionCallback = null;
};
window.confirmarFechaReunion = async function(omitir) {
    const informeId = document.getElementById('reunionInformeId').value;
    let fechaReunion = null;
    if (!omitir) {
        fechaReunion = document.getElementById('fechaReunionInput').value || null;
    }
    document.getElementById('modalFechaReunion').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
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
    document.body.classList.add('overflow-hidden');
};
window.cerrarModalGestionReunion = function() {
    document.getElementById('modalGestionReunion').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
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
