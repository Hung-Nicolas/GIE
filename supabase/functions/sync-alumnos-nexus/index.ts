import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const ALLOWED_ORIGINS = [
  "https://hung-nicolas.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for") || req.headers.get("host") || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gie-auth",
    "Vary": "Origin",
  };
}

function errorResponse(req: Request, status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
  );
}

function sanitizeString(value: unknown, maxLength = 255): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeTurno(value: string | null): string {
  const v = (value || "Mañana").trim().toLowerCase();
  if (v === "tarde") return "Tarde";
  if (v === "noche") return "Noche";
  return "Mañana";
}

interface NexusCurso {
  id_curso?: number;
  anio?: number;
  division?: string;
  turno?: string;
  especialidad?: string;
}

interface NexusAlumno {
  id?: number;
  dni?: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  especialidad?: string;
  division?: string;
  turno?: string;
  email_padre?: string;
  telefono?: string;
  id_curso?: number;
}

interface GatewayPayload {
  tabla: string;
  datos: {
    campos: string;
    filtros?: Record<string, unknown>;
    orden?: { columna: string; ascendente?: boolean };
    limite?: number;
    offset?: number;
  };
}

interface GatewayResponse {
  data?: unknown;
  error?: string;
  meta?: { duracionMs?: number };
}

async function fetchNexusTabla<T>(
  gatewayUrl: string,
  apiKey: string,
  tabla: string,
  campos: string,
  orden?: { columna: string; ascendente?: boolean }
): Promise<T[]> {
  const resultados: T[] = [];
  const limite = 1000;
  let offset = 0;

  while (true) {
    const payload: GatewayPayload = {
      tabla,
      datos: { campos, limite, offset, orden },
    };

    const res = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const bodyText = await res.text();
    let json: GatewayResponse;
    try {
      json = JSON.parse(bodyText) as GatewayResponse;
    } catch {
      throw new Error(`Respuesta no JSON de gateway Nexus (${res.status}): ${bodyText.slice(0, 200)}`);
    }

    if (!res.ok || json.error) {
      throw new Error(json.error || `Gateway Nexus respondió ${res.status}`);
    }

    const data = Array.isArray(json.data) ? (json.data as T[]) : [];
    resultados.push(...data);

    if (data.length < limite) break;
    offset += limite;
  }

  return resultados;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return errorResponse(req, 405, "Método no permitido");
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return errorResponse(req, 429, "Demasiados intentos. Probá más tarde.");
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const xGieAuth = req.headers.get("x-gie-auth") || "";
    const gieJwt = xGieAuth || authHeader.replace(/^Bearer\s+/i, "");

    if (!gieJwt) {
      return errorResponse(req, 401, "Falta token de autenticación de GIE");
    }

    const gieUrl = Deno.env.get("SUPABASE_URL")!;
    const gieAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const gieServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const gieClient = createClient(gieUrl, gieAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await gieClient.auth.getUser(gieJwt);

    if (authError || !user?.id) {
      return errorResponse(req, 401, "Token de GIE inválido");
    }

    const gieAdmin = createClient(gieUrl, gieServiceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: perfil, error: perfilError } = await gieAdmin
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil) {
      console.error("[sync-alumnos-nexus] Error verificando perfil:", perfilError);
      return errorResponse(req, 500, "Error interno del servidor");
    }

    if (perfil.rol !== "regente") {
      return errorResponse(req, 403, "Solo regentes pueden sincronizar alumnos");
    }

    const nexusGatewayUrl = Deno.env.get("NEXUS_GATEWAY_URL")!;
    const nexusApiKey = Deno.env.get("NEXUS_API_KEY")!;

    if (!nexusGatewayUrl || !nexusApiKey) {
      console.error("[sync-alumnos-nexus] Faltan NEXUS_GATEWAY_URL o NEXUS_API_KEY");
      return errorResponse(req, 500, "Configuración de Nexus incompleta");
    }

    // Leer catálogo de cursos y alumnos desde el gateway de Nexus.
    let nexusCursos: NexusCurso[];
    let nexusAlumnos: NexusAlumno[];
    try {
      [nexusCursos, nexusAlumnos] = await Promise.all([
        fetchNexusTabla<NexusCurso>(
          nexusGatewayUrl,
          nexusApiKey,
          "cursos",
          "id_curso, anio, division, turno, especialidad",
          { columna: "id_curso", ascendente: true }
        ),
        fetchNexusTabla<NexusAlumno>(
          nexusGatewayUrl,
          nexusApiKey,
          "alumnos",
          "id, dni, nombre, apellido, email, especialidad, division, turno, email_padre, telefono, id_curso",
          { columna: "apellido", ascendente: true }
        ),
      ]);
    } catch (gatewayErr) {
      console.error("[sync-alumnos-nexus] Error consultando gateway de Nexus:", gatewayErr);
      return errorResponse(req, 502, "Error leyendo datos de Nexus");
    }

    if (!nexusAlumnos || nexusAlumnos.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sincronizados: 0, insertados: 0, actualizados: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
      );
    }

    const cursoPorId = new Map((nexusCursos || []).map((c) => [c.id_curso, c]));

    const { data: gieAlumnos, error: gieError } = await gieAdmin
      .from("alumnos")
      .select("id, dni, nombre, apellido, curso, division, turno, origen, activo");

    if (gieError) {
      console.error("[sync-alumnos-nexus] Error leyendo alumnos de GIE:", gieError);
      return errorResponse(req, 500, "Error interno del servidor");
    }

    const giePorDni = new Map((gieAlumnos || []).filter(a => a.dni).map(a => [String(a.dni), a]));

    let insertados = 0;
    let actualizados = 0;
    let reactivados = 0;
    const batchSize = 100;

    for (let i = 0; i < nexusAlumnos.length; i += batchSize) {
      const batch = nexusAlumnos.slice(i, i + batchSize);
      const upserts: any[] = [];

      for (const na of batch) {
        if (!na.dni) continue;

        const dniStr = String(na.dni);
        const nombre = sanitizeString(na.nombre, 100);
        const apellido = sanitizeString(na.apellido, 100);

        if (!nombre || !apellido) {
          console.warn(`[sync-alumnos-nexus] Alumno con DNI ${dniStr} tiene nombre/apellido inválido`);
          continue;
        }

        const curso = na.id_curso ? cursoPorId.get(na.id_curso) : undefined;
        const divisionAlumno = sanitizeString(na.division, 50) || "";
        const divisionCurso = sanitizeString(curso?.division, 50) || "";
        const cursoNexus = curso?.anio ? `${curso.anio}°` : divisionAlumno;
        const divisionNexus = divisionAlumno || divisionCurso;
        const turnoNexus = normalizeTurno(
          sanitizeString(na.turno, 50) || sanitizeString(curso?.turno, 50)
        );

        const existente = giePorDni.get(dniStr);

        if (existente) {
          upserts.push({
            id: existente.id,
            nombre,
            apellido,
            curso: cursoNexus,
            division: divisionNexus,
            turno: turnoNexus,
            dni: na.dni,
            origen: "nexus",
            activo: true,
          });
        } else {
          upserts.push({
            nombre,
            apellido,
            curso: cursoNexus,
            division: divisionNexus,
            turno: turnoNexus,
            dni: na.dni,
            origen: "nexus",
            activo: true,
          });
        }
      }

      if (upserts.length > 0) {
        const nuevos = upserts.filter(u => !u.id).length;
        const existentes = upserts.filter(u => !!u.id).length;
        const reactivar = upserts.filter(u => !!u.id && !giePorDni.get(String(u.dni))?.activo).length;
        const { error: errUpsert } = await gieAdmin
          .from("alumnos")
          .upsert(upserts, { onConflict: "id", ignoreDuplicates: false });

        if (errUpsert) {
          console.error("[sync-alumnos-nexus] Error en batch upsert:", errUpsert);
        } else {
          insertados += nuevos;
          actualizados += existentes;
          reactivados += reactivar;
        }
      }
    }

    // Soft-delete: desactivar alumnos de origen nexus que ya no están en Nexus
    const nexusDnis = new Set(nexusAlumnos.map(a => a.dni).filter(Boolean).map(String));
    const paraDesactivar = (gieAlumnos || []).filter(
      a => a.origen === "nexus" && a.dni && !nexusDnis.has(String(a.dni)) && a.activo !== false
    );

    let desactivados = 0;
    if (paraDesactivar.length > 0) {
      const { error: errDel } = await gieAdmin
        .from("alumnos")
        .update({ activo: false })
        .in("id", paraDesactivar.map(a => a.id));

      if (errDel) {
        console.error("[sync-alumnos-nexus] Error desactivando alumnos:", errDel);
      } else {
        desactivados = paraDesactivar.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        insertados,
        actualizados,
        reactivados,
        desactivados,
        sincronizados: insertados + actualizados + reactivados,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
    );
  } catch (err) {
    console.error("[sync-alumnos-nexus] Error inesperado:", err);
    return errorResponse(req, 500, "Error interno del servidor");
  }
});
