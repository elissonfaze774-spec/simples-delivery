import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Não autorizado.' }, 401)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return json({ error: 'Admin não autenticado.' }, 401)
    }

    const body = await req.json().catch(() => null)
    const name = String(body?.name || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const phone = String(body?.phone || '').replace(/\D/g, '')
    const password = String(body?.password || '').trim()
    const active = body?.active !== false

    if (!name || !email || !phone || !password) {
      return json({ error: 'Preencha nome, email, telefone e senha.' }, 400)
    }

    const { data: adminStore, error: storeError } = await adminClient
      .from('stores')
      .select('id, store_name, name, owner_user_id, admin_email')
      .or(`owner_user_id.eq.${user.id},admin_email.eq.${user.email}`)
      .maybeSingle()

    if (storeError) {
      return json({ error: storeError.message }, 400)
    }

    if (!adminStore?.id) {
      return json({ error: 'Loja do admin não encontrada.' }, 404)
    }

    const { data: existingDriver } = await adminClient
      .from('drivers')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingDriver?.id) {
      return json({ error: 'Já existe um entregador com esse email.' }, 409)
    }

    const { data: createdUser, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'delivery-driver',
          name,
        },
      })

    if (createUserError || !createdUser.user?.id) {
      return json({ error: createUserError?.message || 'Erro ao criar login.' }, 400)
    }

    const authUserId = createdUser.user.id

    const { data: insertedDriver, error: insertDriverError } = await adminClient
      .from('drivers')
      .insert({
        user_id: authUserId,
        store_id: adminStore.id,
        name,
        email,
        phone,
        active,
        status: active ? 'active' : 'inactive',
      })
      .select('*')
      .single()

    if (insertDriverError) {
      await adminClient.auth.admin.deleteUser(authUserId)
      return json({ error: insertDriverError.message }, 400)
    }

    return json({
      success: true,
      message: 'Entregador criado com login.',
      driver: insertedDriver,
    })
  } catch (error: any) {
    return json({ error: error?.message || 'Erro interno.' }, 500)
  }
})