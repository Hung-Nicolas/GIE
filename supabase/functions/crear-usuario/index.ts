import { createClient } from "jsr:@supabase/supabase-js@2";

// Orígenes permitidos para CORS
const ALLOWED_ORIGINS = [
  "https://hung-nicolas.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

// Rate limiting en memoria (por IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
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
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function errorResponse(req: Request, status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidPassword(password: string): boolean {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function getEnvVars(req: Request):
  | { ok: true; supabaseUrl: string; supabaseAnonKey: string; serviceRoleKey: string }
  | { ok: false; response: Response } {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    const faltantes = [
      !supabaseUrl && "SUPABASE_URL",
      !supabaseAnonKey && "SUPABASE_ANON_KEY",
      !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    console.error("[crear-usuario] Faltan variables de entorno:", faltantes.join(", "));
    return {
      ok: false,
      response: errorResponse(req, 500, `Configuración incompleta: faltan ${faltantes.join(", ")}`),
    };
  }

  return { ok: true, supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

async function obtenerUsuarioAutenticado(req: Request, supabaseUrl: string, supabaseAnonKey: string):
  | { ok: true; user: { id: string } }
  | { ok: false; response: Response } {
  const authHeader = req.headers.get("Authorization") || "";
  const xGieAuth = req.headers.get("x-gie-auth") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim() || xGieAuth.trim();

  if (!token) {
    return { ok: false, response: errorResponse(req, 401, "No autenticado") };
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
  if (userError || !user?.id) {
    console.error("[crear-usuario] Error validando token:", userError);
    return { ok: false, response: errorResponse(req, 401, "Token inválido") };
  }

  return { ok: true, user: { id: user.id } };
}

async function verificarRolRegente(
  supabaseUrl: string,
  supabaseAnonKey: string,
  userId: string,
  token: string
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: perfil, error: perfilError } = await supabaseClient
    .from("perfiles")
    .select("rol")
    .eq("id", userId)
    .single();

  if (perfilError || perfil?.rol !== "regente") {
    console.error("[crear-usuario] Error verificando rol:", perfilError);
    return { ok: false, response: errorResponse(req, 403, "Solo el regente puede crear usuarios") };
  }

  return { ok: true };
}

Deno.serve(async (req) => {
  // Responder inmediatamente al preflight CORS para evitar bloqueos del navegador.
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
    const env = getEnvVars(req);
    if (!env.ok) return env.response;

    const auth = await obtenerUsuarioAutenticado(req, env.supabaseUrl, env.supabaseAnonKey);
    if (!auth.ok) return auth.response;

    const authHeader = req.headers.get("Authorization") || "";
    const xGieAuth = req.headers.get("x-gie-auth") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim() || xGieAuth.trim();
    const rolCheck = await verificarRolRegente(env.supabaseUrl, env.supabaseAnonKey, auth.user.id, token);
    if (!rolCheck.ok) return rolCheck.response;

    const { email, password, nombre, apellido, rol } = await req.json();

    if (!email || !isValidEmail(email)) {
      return errorResponse(req, 400, "Email inválido");
    }

    if (!password || !isValidPassword(password)) {
      return errorResponse(req, 400, "La contraseña debe tener al menos 8 caracteres, incluyendo mayúscula, minúscula y número");
    }

    if (!nombre || !apellido || typeof nombre !== "string" || typeof apellido !== "string") {
      return errorResponse(req, 400, "Nombre y apellido son requeridos");
    }

    if (nombre.length > 100 || apellido.length > 100) {
      return errorResponse(req, 400, "Nombre o apellido demasiado largos");
    }

    if (!rol) {
      return errorResponse(req, 400, "El rol es requerido");
    }

    const rolesValidos = ["regente", "docente", "preceptor", "doe", "pat"];
    if (!rolesValidos.includes(rol)) {
      return errorResponse(req, 400, "Rol inválido");
    }

    const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        rol,
      },
    });

    if (createError || !createData?.user) {
      console.error("[crear-usuario] Error creando usuario:", createError);
      return errorResponse(req, 400, createError?.message || "Error creando usuario");
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: createData.user.id, email: createData.user.email },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
    );
  } catch (err) {
    console.error("[crear-usuario] Error inesperado:", err);
    return errorResponse(req, 500, "Error interno del servidor");
  }
});
