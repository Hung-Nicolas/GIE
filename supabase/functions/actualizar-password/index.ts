import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const ALLOWED_ORIGINS = [
  "https://hung-nicolas.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

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
    const { user_id, new_password } = await req.json();

    if (!user_id || !isValidUuid(user_id)) {
      return errorResponse(req, 400, "ID de usuario inválido");
    }

    if (!new_password || !isValidPassword(new_password)) {
      return errorResponse(req, 400, "La contraseña es requerida");
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
      return errorResponse(req, 403, "Solo el regente puede cambiar contraseñas");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (updateError) {
      console.error("[actualizar-password] Error actualizando contraseña:", updateError);
      return errorResponse(req, 400, "Error al actualizar la contraseña");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Contraseña actualizada" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
    );
  } catch (err) {
    console.error("[actualizar-password] Error inesperado:", err);
    return errorResponse(req, 500, "Error interno del servidor");
  }
});
