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

type DriverPayload = {
  action?: 'create' | 'update' | 'toggle' | 'reset-password' | 'delete'
  driverId?: string
  name?: string
  email?: string
  phone?: string
  password?: string
  active?: boolean
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function onlyDigits(value: unknown) {
  return String(value || '').replace(/\D/g, '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'Variáveis de ambiente do Supabase não encontradas.' }, 500)
    }

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

    const body = (await req.json().catch(() => null)) as DriverPayload | null
    const action = body?.action || 'create'

    let adminStoreId = ''
    let adminStoreName = 'Minha loja'

    if ((user as { storeId?: string | null }).storeId) {
      const { data: storeById } = await adminClient
        .from('stores')
        .select('id, store_name, name')
        .eq('id', (user as { storeId?: string | null }).storeId)
        .maybeSingle()

      if (storeById?.id) {
        adminStoreId = String(storeById.id)
        adminStoreName = String((storeById as { store_name?: string; name?: string }).store_name || (storeById as { store_name?: string; name?: string }).name || 'Minha loja')
      }
    }

    if (!adminStoreId) {
      const { data: storeByOwner } = await adminClient
        .from('stores')
        .select('id, store_name, name')
        .eq('owner_user_id', user.id)
        .maybeSingle()

      if (storeByOwner?.id) {
        adminStoreId = String(storeByOwner.id)
        adminStoreName = String((storeByOwner as { store_name?: string; name?: string }).store_name || (storeByOwner as { store_name?: string; name?: string }).name || 'Minha loja')
      }
    }

    if (!adminStoreId && user.email) {
      const { data: storeByEmail } = await adminClient
        .from('stores')
        .select('id, store_name, name, admin_email')
        .eq('admin_email', user.email)
        .maybeSingle()

      if (storeByEmail?.id) {
        adminStoreId = String(storeByEmail.id)
        adminStoreName = String((storeByEmail as { store_name?: string; name?: string }).store_name || (storeByEmail as { store_name?: string; name?: string }).name || 'Minha loja')
      }
    }

    if (!adminStoreId) {
      return json({ error: 'Loja do admin não encontrada.' }, 404)
    }

    // deno-lint-ignore no-inner-declarations
    async function getDriverScoped(driverId: string) {
      const { data, error } = await adminClient
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .eq('store_id', adminStoreId)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      return data as {
        id: string
        user_id?: string | null
        store_id?: string | null
        name?: string | null
        email?: string | null
        phone?: string | null
        active?: boolean | null
        status?: string | null
      } | null
    }

    if (action === 'create') {
      const name = String(body?.name || '').trim()
      const email = normalizeEmail(body?.email)
      const phone = onlyDigits(body?.phone)
      const password = String(body?.password || '').trim()
      const active = body?.active !== false

      if (!name || !email || !phone || !password) {
        return json({ error: 'Preencha nome, email, telefone e senha.' }, 400)
      }

      if (password.length < 6) {
        return json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, 400)
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
            store_name: adminStoreName,
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
          store_id: adminStoreId,
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
    }

    if (action === 'update') {
      const driverId = String(body?.driverId || '').trim()
      const name = String(body?.name || '').trim()
      const email = normalizeEmail(body?.email)
      const phone = onlyDigits(body?.phone)
      const active = body?.active !== false

      if (!driverId || !name || !email || !phone) {
        return json({ error: 'Dados inválidos para atualização.' }, 400)
      }

      const driver = await getDriverScoped(driverId)

      if (!driver?.id) {
        return json({ error: 'Entregador não encontrado.' }, 404)
      }

      const { data: existingEmail } = await adminClient
        .from('drivers')
        .select('id')
        .eq('email', email)
        .neq('id', driverId)
        .maybeSingle()

      if (existingEmail?.id) {
        return json({ error: 'Já existe outro entregador com esse email.' }, 409)
      }

      if (driver.user_id) {
        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
          driver.user_id,
          {
            email,
            user_metadata: {
              role: 'delivery-driver',
              name,
              store_name: adminStoreName,
            },
          }
        )

        if (authUpdateError) {
          return json({ error: authUpdateError.message }, 400)
        }
      }

      const { data: updatedDriver, error: updateDriverError } = await adminClient
        .from('drivers')
        .update({
          name,
          email,
          phone,
          active,
          status: active ? 'active' : 'inactive',
        })
        .eq('id', driverId)
        .eq('store_id', adminStoreId)
        .select('*')
        .single()

      if (updateDriverError) {
        return json({ error: updateDriverError.message }, 400)
      }

      return json({
        success: true,
        message: 'Entregador atualizado com sucesso.',
        driver: updatedDriver,
      })
    }

    if (action === 'toggle') {
      const driverId = String(body?.driverId || '').trim()
      const active = body?.active !== false

      if (!driverId) {
        return json({ error: 'Entregador não informado.' }, 400)
      }

      const driver = await getDriverScoped(driverId)

      if (!driver?.id) {
        return json({ error: 'Entregador não encontrado.' }, 404)
      }

      const { data: updatedDriver, error: toggleError } = await adminClient
        .from('drivers')
        .update({
          active,
          status: active ? 'active' : 'inactive',
        })
        .eq('id', driverId)
        .eq('store_id', adminStoreId)
        .select('*')
        .single()

      if (toggleError) {
        return json({ error: toggleError.message }, 400)
      }

      return json({
        success: true,
        message: active ? 'Entregador ativado.' : 'Entregador desativado.',
        driver: updatedDriver,
      })
    }

    if (action === 'reset-password') {
      const driverId = String(body?.driverId || '').trim()
      const password = String(body?.password || '').trim()

      if (!driverId || !password) {
        return json({ error: 'Dados inválidos para redefinir senha.' }, 400)
      }

      if (password.length < 6) {
        return json({ error: 'A nova senha precisa ter pelo menos 6 caracteres.' }, 400)
      }

      const driver = await getDriverScoped(driverId)

      if (!driver?.id || !driver.user_id) {
        return json({ error: 'Entregador não encontrado ou sem usuário vinculado.' }, 404)
      }

      const { error: passwordError } = await adminClient.auth.admin.updateUserById(
        driver.user_id,
        { password }
      )

      if (passwordError) {
        return json({ error: passwordError.message }, 400)
      }

      return json({
        success: true,
        message: 'Senha redefinida com sucesso.',
      })
    }

    if (action === 'delete') {
      const driverId = String(body?.driverId || '').trim()

      if (!driverId) {
        return json({ error: 'Entregador não informado.' }, 400)
      }

      const driver = await getDriverScoped(driverId)

      if (!driver?.id) {
        return json({ error: 'Entregador não encontrado.' }, 404)
      }

      const authUserId = driver.user_id ? String(driver.user_id) : ''

      const { error: deleteDriverError } = await adminClient
        .from('drivers')
        .delete()
        .eq('id', driverId)
        .eq('store_id', adminStoreId)

      if (deleteDriverError) {
        return json({ error: deleteDriverError.message }, 400)
      }

      if (authUserId) {
        await adminClient.auth.admin.deleteUser(authUserId)
      }

      return json({
        success: true,
        message: 'Entregador excluído com sucesso.',
      })
    }

    return json({ error: 'Ação inválida.' }, 400)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno.'
    return json({ error: message }, 500)
  }
})