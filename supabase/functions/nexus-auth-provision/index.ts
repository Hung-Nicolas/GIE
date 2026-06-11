import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nexus-auth",
};

function mapearRolNexusAGIE(rol?: string): string {
  const map: Record<string, string> = {
    regente: "regente",
    subregente: "regente",
    rector: "regente",
    vicerector: "regente",
    jefe_de_taller: "regente",
    docente: "docente",
    preceptor: "preceptor",
    doe: "doe",
    pat: "pat",
  };
  return map[rol || ""] || "docente";
}

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

    if (authError || !user || !user.email) {
      return new Response(
        JSON.stringify({ error: "Token de Nexus inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Leer datos enviados desde el frontend (rol mapeado desde personal de Nexus)
    const body = await req.json().catch(() => ({}));
    const nombre = body.nombre || user.user_metadata?.nombre || "Sin";
    const apellido = body.apellido || user.user_metadata?.apellido || "Nombre";
    const rol = mapearRolNexusAGIE(body.rol || user.user_metadata?.rol);

    // 3. Cliente admin de GIE
    const gieAdmin = createClient(gieUrl, gieServiceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 4. Buscar usuario existente en GIE por email
    let gieUserId: string | null = null;
    const { data: listData, error: listError } = await gieAdmin.auth.admin.listUsers({
      filter: `email.eq.${user.email}`,
    });

    if (listError) {
      return new Response(
        JSON.stringify({ error: "Error buscando usuario en GIE" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const existingUser = listData?.users?.[0];

    // Contraseña temporal de un solo uso para iniciar sesión en GIE
    const tempPassword = crypto.randomUUID();

    if (!existingUser) {
      // Crear usuario en GIE auth (UUID será distinto al de Nexus; se vincula por email)
      const { data: createData, error: createError } = await gieAdmin.auth.admin.createUser({
        email: user.email,
        email_confirm: true,
        password: tempPassword,
        user_metadata: { nombre, apellido },
      });

      if (createError || !createData?.user) {
        return new Response(
          JSON.stringify({ error: createError?.message || "Error creando usuario en GIE" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      gieUserId = createData.user.id;
    } else {
      gieUserId = existingUser.id;
      // Actualizar datos y establecer contraseña temporal para este login
      const { error: updError } = await gieAdmin.auth.admin.updateUserById(gieUserId, {
        email: user.email,
        user_metadata: { nombre, apellido },
        password: tempPassword,
      });

      if (updError) {
        return new Response(
          JSON.stringify({ error: updError.message || "Error actualizando usuario en GIE" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // 5. Asegurar perfil en GIE (trigger crea uno básico, pero forzamos datos correctos)
    const { error: perfilError } = await gieAdmin
      .from("perfiles")
      .upsert(
        {
          id: gieUserId,
          email: user.email,
          nombre,
          apellido,
          rol,
          activo: true,
        },
        { onConflict: "id" }
      );

    if (perfilError) {
      return new Response(
        JSON.stringify({ error: perfilError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: gieUserId,
        email: user.email,
        password: tempPassword,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Error interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
