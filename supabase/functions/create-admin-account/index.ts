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

    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPassword = String(password);
    const normalizedStoreName = String(store_name).trim();
    const normalizedWhatsapp = String(whatsapp ?? "").trim();
    const normalizedPlan = String(plan ?? "iniciante").trim().toLowerCase();

    const normalizedRole =
      String(role ?? "admin").trim().toLowerCase() === "super_admin"
        ? "super_admin"
        : "admin";

    const { data: createdUser, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: normalizedPassword,
        email_confirm: true,
        user_metadata: {
          name: normalizedName,
          role: normalizedRole,
          store_name: normalizedStoreName,
          plan: normalizedPlan,
        },
      });

    if (createUserError || !createdUser?.user?.id) {
      console.error("createUserError", createUserError);

      return new Response(
        JSON.stringify({
          error: createUserError?.message ?? "Erro ao criar usuário no Auth.",
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
        p_name: normalizedName,
        p_email: normalizedEmail,
        p_store_name: normalizedStoreName,
        p_whatsapp: normalizedWhatsapp,
        p_plan: normalizedPlan,
        p_role: normalizedRole,
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
          password: normalizedPassword,
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