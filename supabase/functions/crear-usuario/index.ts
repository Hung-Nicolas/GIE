import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  return typeof password === "string" && password.length >= 1;
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
    const { email, password, nombre, apellido, rol } = await req.json();

    if (!email || !isValidEmail(email)) {
      return errorResponse(req, 400, "Email inválido");
    }

    if (!password || !isValidPassword(password)) {
      return errorResponse(req, 400, "La contraseña es requerida");
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return errorResponse(req, 401, "No autenticado");
    }

    const { data: perfil, error: perfilError } = await supabaseClient
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (perfilError || perfil?.rol !== "regente") {
      return errorResponse(req, 403, "Solo el regente puede crear usuarios");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
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
      return errorResponse(req, 400, "Error creando usuario");
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
