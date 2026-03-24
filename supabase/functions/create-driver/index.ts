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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const body = await req.json()
    const {
      adminUserId,
      storeId,
      name,
      email,
      phone,
      active = true,
      password,
    } = body ?? {}

    const cleanName = String(name || '').trim()
    const cleanEmail = String(email || '').trim().toLowerCase()
    const cleanPhone = String(phone || '').replace(/\D/g, '')
    const cleanStoreId = String(storeId || '').trim()
    const cleanAdminUserId = String(adminUserId || '').trim()
    const cleanPassword = String(password || '').trim()

    if (!cleanAdminUserId) {
      return json({ error: 'Admin não identificado.' }, 400)
    }

    if (!cleanStoreId) {
      return json({ error: 'Loja não identificada.' }, 400)
    }

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanPassword) {
      return json({ error: 'Preencha nome, email, telefone e senha.' }, 400)
    }

    if (cleanPassword.length < 6) {
      return json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, 400)
    }

    const { data: store, error: storeError } = await admin
      .from('stores')
      .select('id, owner_user_id')
      .eq('id', cleanStoreId)
      .maybeSingle()

    if (storeError) {
      return json({ error: storeError.message }, 400)
    }

    if (!store) {
      return json({ error: 'Loja não encontrada.' }, 404)
    }

    if (String(store.owner_user_id || '') !== cleanAdminUserId) {
      return json({ error: 'Você não tem permissão para criar entregador nessa loja.' }, 403)
    }

    const { data: existingDriver, error: existingDriverError } = await admin
      .from('drivers')
      .select('id')
      .eq('store_id', cleanStoreId)
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (existingDriverError) {
      return json({ error: existingDriverError.message }, 400)
    }

    if (existingDriver?.id) {
      return json({ error: 'Já existe um entregador com esse email nessa loja.' }, 409)
    }

    const { data: authCreated, error: authError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: true,
      user_metadata: {
        role: 'delivery-driver',
        name: cleanName,
        phone: cleanPhone,
        store_id: cleanStoreId,
      },
      app_metadata: {
        role: 'delivery-driver',
      },
    })

    if (authError) {
      return json({ error: authError.message }, 400)
    }

    const authUserId = authCreated.user?.id

    if (!authUserId) {
      return json({ error: 'Usuário do entregador não foi criado.' }, 400)
    }

    const { error: driverInsertError } = await admin
      .from('drivers')
      .insert({
        user_id: authUserId,
        store_id: cleanStoreId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        active,
        status: active ? 'active' : 'inactive',
        password_temp: cleanPassword,
      })

     if (driverInsertError) {
      await admin.auth.admin.deleteUser(authUserId)
      return json({ error: driverInsertError.message }, 400)
    }

    try {
      await admin.from('profiles').upsert(
        {
          id: authUserId,
          name: cleanName,
          email: cleanEmail,
          role: 'delivery-driver',
        },
        { onConflict: 'id' }
      )
    } catch (_) {
      // ignora erro de profile
    }

    try {
      await admin.from('user_roles').insert({
        user_id: authUserId,
        role: 'delivery-driver',
      })
    } catch (_) {
      // ignora erro de user_roles
    }

    return json({
      success: true,
      user_id: authUserId,
      message: 'Entregador criado com sucesso.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno.'
    return json({ error: message }, 500)
  }
})