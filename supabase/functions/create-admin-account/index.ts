import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método não permitido" }),
        { status: 405, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    const {
      name,
      email,
      password,
      store_name,
      whatsapp = "",
      plan = "iniciante",
      role = "admin",
    } = body ?? {};

    if (!name || !email || !password || !store_name) {
      return new Response(
        JSON.stringify({
          error: "name, email, password e store_name são obrigatórios",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (String(password).length < 6) {
      return new Response(
        JSON.stringify({
          error: "A senha precisa ter pelo menos 6 caracteres.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: createdUser, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: String(password),
        email_confirm: true,
        user_metadata: {
          name: String(name),
          role: String(role),
          store_name: String(store_name),
          plan: String(plan),
        },
      });

    if (createUserError) {
      console.error("createUserError", createUserError);

      return new Response(
        JSON.stringify({
          error: createUserError.message,
          step: "auth.admin.createUser",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const userId = createdUser.user.id;

    const { data: setupData, error: setupError } = await supabase.rpc(
      "setup_new_admin_account",
      {
        p_user_id: userId,
        p_name: String(name),
        p_email: normalizedEmail,
        p_store_name: String(store_name),
        p_whatsapp: String(whatsapp),
        p_plan: String(plan),
        p_role: String(role),
      }
    );

    if (setupError) {
      console.error("setupError", setupError);

      await supabase.auth.admin.deleteUser(userId);

      return new Response(
        JSON.stringify({
          error: setupError.message,
          details: setupError.details ?? null,
          hint: setupError.hint ?? null,
          code: setupError.code ?? null,
          step: "setup_new_admin_account",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        setup: setupData,
        login: {
          email: normalizedEmail,
          password: String(password),
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("edge-catch-error", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});