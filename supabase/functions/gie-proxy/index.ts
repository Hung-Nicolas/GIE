import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nexus-auth",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const nexusJwt = req.headers.get("x-nexus-auth") || "";
    if (!nexusJwt) {
      return new Response(
        JSON.stringify({ error: "Falta header x-nexus-auth" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const nexusUrl = Deno.env.get("NEXUS_URL")!;
    const nexusAnonKey = Deno.env.get("NEXUS_ANON_KEY")!;
    const gieUrl = Deno.env.get("SUPABASE_URL")!;
    const gieServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Validar JWT contra Nexus
    const nexusClient = createClient(nexusUrl, nexusAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await nexusClient.auth.getUser(nexusJwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token de Nexus inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Leer body de la petición
    const { operacion, tabla, datos, where } = await req.json();
    if (!operacion || !tabla) {
      return new Response(
        JSON.stringify({ error: "operacion y tabla son requeridos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Ejecutar query en BD de GIE con service_role
    const gieAdmin = createClient(gieUrl, gieServiceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let result;
    const tablasPermitidas = ["plantillas", "historial_informes", "observaciones_alumno", "tipos_observacion_alumno", "preferencias"];
    if (!tablasPermitidas.includes(tabla)) {
      return new Response(
        JSON.stringify({ error: "Tabla no permitida" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    switch (operacion) {
      case "select": {
        const { data, error } = await gieAdmin
          .from(tabla)
          .select(datos?.columns || "*")
          .match(where || {});
        result = { data, error };
        break;
      }
      case "insert": {
        const { data, error } = await gieAdmin
          .from(tabla)
          .insert(datos)
          .select();
        result = { data, error };
        break;
      }
      case "update": {
        if (!where) {
          return new Response(
            JSON.stringify({ error: "where requerido para update" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        const { data, error } = await gieAdmin
          .from(tabla)
          .update(datos)
          .match(where)
          .select();
        result = { data, error };
        break;
      }
      case "delete": {
        if (!where) {
          return new Response(
            JSON.stringify({ error: "where requerido para delete" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        const { data, error } = await gieAdmin
          .from(tabla)
          .delete()
          .match(where)
          .select();
        result = { data, error };
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: "operacion no soportada" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: result.data, user_id: user.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Error interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
