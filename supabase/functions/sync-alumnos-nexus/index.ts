import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gie-auth",
};

interface NexusAlumno {
  dni?: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  especialidad?: string;
  division?: string;
  turno?: string;
  email_padre?: string;
  telefono?: string;
  cursos?: {
    anio?: number;
    division?: string;
    turno?: string;
    especialidad?: string;
  } | null;
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
    // 1. Obtener JWT de GIE
    const authHeader = req.headers.get("authorization") || "";
    const xGieAuth = req.headers.get("x-gie-auth") || "";
    const gieJwt = xGieAuth || authHeader.replace(/^Bearer\s+/i, "");

    if (!gieJwt) {
      return new Response(
        JSON.stringify({ error: "Falta token de autenticación de GIE" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const gieUrl = Deno.env.get("SUPABASE_URL")!;
    const gieAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const gieServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 2. Validar JWT contra GIE
    const gieClient = createClient(gieUrl, gieAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await gieClient.auth.getUser(gieJwt);

    if (authError || !user?.id) {
      return new Response(
        JSON.stringify({ error: "Token de GIE inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Verificar que el usuario sea regente
    const gieAdmin = createClient(gieUrl, gieServiceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: perfil, error: perfilError } = await gieAdmin
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil) {
      return new Response(
        JSON.stringify({ error: "No se pudo verificar el perfil" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!["regente", "subregente", "rector", "vicerector", "jefe_de_taller"].includes(perfil.rol)) {
      return new Response(
        JSON.stringify({ error: "Solo regentes pueden sincronizar alumnos" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Leer alumnos de Nexus
    const nexusUrl = Deno.env.get("NEXUS_URL")!;
    const nexusKey = Deno.env.get("NEXUS_SERVICE_ROLE_KEY") || Deno.env.get("NEXUS_ANON_KEY")!;

    const nexusClient = createClient(nexusUrl, nexusKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: nexusAlumnos, error: nexusError } = await nexusClient
      .from("alumnos")
      .select("dni, nombre, apellido, email, especialidad, division, turno, email_padre, telefono, cursos(anio, division, turno, especialidad)")
      .order("apellido");

    if (nexusError) {
      return new Response(
        JSON.stringify({ error: `Error leyendo alumnos de Nexus: ${nexusError.message}` }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!nexusAlumnos || nexusAlumnos.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sincronizados: 0, insertados: 0, actualizados: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Leer alumnos actuales de GIE para match
    const { data: gieAlumnos, error: gieError } = await gieAdmin
      .from("alumnos")
      .select("id, dni, nombre, apellido, curso, division, turno, origen");

    if (gieError) {
      return new Response(
        JSON.stringify({ error: `Error leyendo alumnos de GIE: ${gieError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const giePorDni = new Map((gieAlumnos || []).filter(a => a.dni).map(a => [String(a.dni), a]));
    const giePorNombre = new Map((gieAlumnos || []).map(a => [`${a.nombre}|${a.apellido}`, a]));

    let insertados = 0;
    let actualizados = 0;
    const batchSize = 100;

    for (let i = 0; i < nexusAlumnos.length; i += batchSize) {
      const batch = (nexusAlumnos as NexusAlumno[]).slice(i, i + batchSize);
      const upserts: any[] = [];

      for (const na of batch) {
        if (!na.dni) continue;

        const cursoNexus = na.cursos?.anio
          ? `${na.cursos.anio}°`
          : na.division || "";
        const divisionNexus = na.cursos?.division || na.division || "";
        const turnoNexus = na.cursos?.turno || na.turno || "Mañana";

        const claveDni = String(na.dni);
        const claveNombre = `${na.nombre}|${na.apellido}`;
        const existente = giePorDni.get(claveDni) || giePorNombre.get(claveNombre);

        if (existente) {
          upserts.push({
            id: existente.id,
            nombre: na.nombre,
            apellido: na.apellido,
            curso: cursoNexus,
            division: divisionNexus,
            turno: turnoNexus,
            dni: na.dni,
            origen: "nexus",
          });
        } else {
          upserts.push({
            nombre: na.nombre,
            apellido: na.apellido,
            curso: cursoNexus,
            division: divisionNexus,
            turno: turnoNexus,
            dni: na.dni,
            origen: "nexus",
          });
        }
      }

      if (upserts.length > 0) {
        const nuevos = upserts.filter(u => !u.id).length;
        const existentes = upserts.filter(u => !!u.id).length;
        const { error: errUpsert } = await gieAdmin
          .from("alumnos")
          .upsert(upserts, { onConflict: "id", ignoreDuplicates: false });

        if (errUpsert) {
          console.error("[sync-alumnos-nexus] Error en batch upsert:", errUpsert);
        } else {
          insertados += nuevos;
          actualizados += existentes;
        }
      }
    }

    // 6. Eliminar alumnos de origen nexus que ya no están en Nexus
    const nexusDnis = new Set((nexusAlumnos as NexusAlumno[]).map(a => a.dni).filter(Boolean));
    const paraEliminar = (gieAlumnos || []).filter(
      a => a.origen === "nexus" && a.dni && !nexusDnis.has(a.dni)
    );

    if (paraEliminar.length > 0) {
      const { error: errDel } = await gieAdmin
        .from("alumnos")
        .delete()
        .in("id", paraEliminar.map(a => a.id));

      if (errDel) {
        console.error("[sync-alumnos-nexus] Error eliminando alumnos:", errDel);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        insertados,
        actualizados,
        eliminados: paraEliminar.length,
        sincronizados: insertados + actualizados,
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
