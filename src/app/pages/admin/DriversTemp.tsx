import { useEffect, useMemo, useState } from 'react';
import {
  Bike,
  Mail,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { AdminShell } from '../../components/admin/AdminShell';

type DriverRow = {
  id: string;
  user_id?: string | null;
  store_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  active?: boolean | null;
  status?: string | null;
  created_at?: string | null;
};

type DriverFormState = {
  name: string;
  email: string;
  phone: string;
  active: boolean;
};

const initialForm: DriverFormState = {
  name: '',
  email: '',
  phone: '',
  active: true,
};

function onlyDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase();
}

function fieldClassName(withIcon = false) {
  return `h-12 rounded-2xl border border-white/10 bg-white/[0.03] text-white placeholder:text-white/35 ${
    withIcon ? 'pl-10' : ''
  }`;
}

const sectionCardClass =
  'rounded-[28px] border border-[#3a0d12] bg-[linear-gradient(180deg,rgba(12,12,14,0.98)_0%,rgba(18,10,12,0.98)_100%)] p-6 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.8)]';

export function AdminDrivers() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();

  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [togglingIds, setTogglingIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('Minha loja');
  const [form, setForm] = useState<DriverFormState>(initialForm);

  async function resolveStoreId() {
    if (!user) return '';

    if (user.storeId) {
      const { data: storeById } = await supabase
        .from('stores')
        .select('id, store_name, name')
        .eq('id', user.storeId)
        .maybeSingle();

      if (storeById?.id) {
        setStoreName(String((storeById as any).store_name || (storeById as any).name || 'Minha loja'));
        return String(storeById.id);
      }
    }

    const { data: storeByOwner } = await supabase
      .from('stores')
      .select('id, store_name, name')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (storeByOwner?.id) {
      setStoreName(
        String((storeByOwner as any).store_name || (storeByOwner as any).name || 'Minha loja')
      );
      return String(storeByOwner.id);
    }

    if (user.email) {
      const { data: storeByEmail } = await supabase
        .from('stores')
        .select('id, store_name, name, admin_email')
        .eq('admin_email', user.email)
        .maybeSingle();

      if (storeByEmail?.id) {
        setStoreName(
          String((storeByEmail as any).store_name || (storeByEmail as any).name || 'Minha loja')
        );
        return String(storeByEmail.id);
      }
    }

    return '';
  }

  async function loadDrivers() {
    try {
      setLoading(true);

      const resolvedStoreId = storeId || (await resolveStoreId());

      if (!resolvedStoreId) {
        setDrivers([]);
        setStoreId('');
        return;
      }

      if (!storeId) {
        setStoreId(resolvedStoreId);
      }

      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('store_id', resolvedStoreId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDrivers((data || []) as DriverRow[]);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erro ao carregar entregadores.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      loadDrivers();
    }
  }, [authLoading, user]);

  const activeCount = useMemo(
    () => drivers.filter((driver) => driver.active !== false).length,
    [drivers]
  );

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function handleEdit(driver: DriverRow) {
    setEditingId(driver.id);
    setForm({
      name: String(driver.name || ''),
      email: String(driver.email || ''),
      phone: String(driver.phone || ''),
      active: driver.active !== false,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const name = String(form.name || '').trim();
    const email = normalizeEmail(form.email);
    const phone = onlyDigits(form.phone);

    if (!storeId) {
      toast.error('Loja do admin não encontrada.');
      return;
    }

    if (!name || !email || !phone) {
      toast.error('Preencha nome, email e telefone.');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const { error } = await supabase
          .from('drivers')
          .update({
            name,
            email,
            phone,
            active: form.active,
            status: form.active ? 'active' : 'inactive',
          })
          .eq('id', editingId);

        if (error) throw error;

        toast.success('Entregador atualizado com sucesso.');
      } else {
        const { error } = await supabase.from('drivers').insert({
          store_id: storeId,
          name,
          email,
          phone,
          active: form.active,
          status: form.active ? 'active' : 'inactive',
        });

        if (error) throw error;

        toast.success('Entregador salvo com sucesso.');
      }

      resetForm();
      await loadDrivers();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erro ao salvar entregador.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeletingIds((prev) => [...prev, id]);

      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;

      if (editingId === id) {
        resetForm();
      }

      toast.success('Entregador excluído com sucesso.');
      await loadDrivers();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erro ao excluir entregador.');
    } finally {
      setDeletingIds((prev) => prev.filter((item) => item !== id));
    }
  }

  async function handleToggle(driver: DriverRow) {
    try {
      setTogglingIds((prev) => [...prev, driver.id]);

      const nextActive = !(driver.active !== false);

      const { error } = await supabase
        .from('drivers')
        .update({
          active: nextActive,
          status: nextActive ? 'active' : 'inactive',
        })
        .eq('id', driver.id);

      if (error) throw error;

      toast.success(nextActive ? 'Entregador ativado.' : 'Entregador desativado.');
      await loadDrivers();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erro ao alterar status.');
    } finally {
      setTogglingIds((prev) => prev.filter((item) => item !== driver.id));
    }
  }

  if (authLoading) {
    return <div className="p-6 text-white">Carregando...</div>;
  }

  if (!user || user.role !== 'admin') {
    navigate('/login');
    return null;
  }

  return (
    <AdminShell
      title="Entregadores"
      subtitle="Cadastre e organize os entregadores da sua loja em uma página separada"
      storeName={storeName}
      onBack={() => navigate('/admin')}
      stats={[
        {
          label: 'Total',
          value: drivers.length,
          helper: 'Entregadores cadastrados',
        },
        {
          label: 'Ativos',
          value: activeCount,
          helper: 'Prontos para trabalhar',
        },
        {
          label: 'Inativos',
          value: Math.max(drivers.length - activeCount, 0),
          helper: 'Desativados no momento',
        },
        {
          label: 'Loja',
          value: storeName,
          helper: storeId ? 'Vinculada corretamente' : 'Sem vínculo',
        },
      ]}
    >
      <div className="space-y-6">
        <Card className={sectionCardClass}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#ff7b85]">Cadastro</p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                {editingId ? 'Editar entregador' : 'Novo entregador'}
              </h2>
              <p className="mt-2 text-sm text-white/65">
                Essa tela salva os dados do entregador na tabela <strong>drivers</strong>.
              </p>
              <p className="mt-2 text-xs text-amber-300">
                Login do entregador no Auth ainda precisa de Edge Function ou criação manual no Supabase.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                >
                  Cancelar edição
                </Button>
              ) : null}

              <Button
                type="button"
                variant="outline"
                onClick={loadDrivers}
                className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="driver-name" className="text-white/85">
                Nome
              </Label>
              <div className="relative mt-2">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  id="driver-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do entregador"
                  className={fieldClassName(true)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="driver-email" className="text-white/85">
                Email
              </Label>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  id="driver-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="entregador@email.com"
                  className={fieldClassName(true)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="driver-phone" className="text-white/85">
                Telefone
              </Label>
              <div className="relative mt-2">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  id="driver-phone"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className={fieldClassName(true)}
                />
              </div>
            </div>

            <div>
              <Label className="text-white/85">Status</Label>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white">
                  <input
                    type="radio"
                    checked={form.active === true}
                    onChange={() => setForm((prev) => ({ ...prev, active: true }))}
                    className="accent-[#EA1D2C]"
                  />
                  <span className="text-sm">Ativo</span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white">
                  <input
                    type="radio"
                    checked={form.active === false}
                    onChange={() => setForm((prev) => ({ ...prev, active: false }))}
                    className="accent-[#EA1D2C]"
                  />
                  <span className="text-sm">Inativo</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#EA1D2C] text-white hover:bg-[#d31625]"
              >
                {saving ? (
                  <Save className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {saving
                  ? editingId
                    ? 'Atualizando...'
                    : 'Salvando...'
                  : editingId
                    ? 'Atualizar entregador'
                    : 'Salvar entregador'}
              </Button>

              {storeId ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">
                  Loja vinculada
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
                  Loja não encontrada
                </span>
              )}
            </div>
          </form>
        </Card>

        <Card className={sectionCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#ff7b85]">Lista</p>
              <h2 className="mt-3 text-2xl font-bold text-white">Entregadores cadastrados</h2>
              <p className="mt-2 text-sm text-white/65">
                Gerencie os entregadores da sua loja em um lugar separado das configurações.
              </p>
            </div>

            <Bike className="h-5 w-5 text-[#ff7b85]" />
          </div>

          <div className="mt-6 grid gap-4">
            {loading ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center text-white/65">
                Carregando entregadores...
              </div>
            ) : drivers.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EA1D2C]/10 text-[#EA1D2C]">
                  <Bike className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">Nenhum entregador cadastrado</h3>
                <p className="mt-2 text-sm text-white/55">
                  Cadastre o primeiro entregador usando o formulário acima.
                </p>
              </div>
            ) : (
              drivers.map((driver) => {
                const isDeleting = deletingIds.includes(driver.id);
                const isToggling = togglingIds.includes(driver.id);

                return (
                  <div
                    key={driver.id}
                    className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EA1D2C]/10 text-[#EA1D2C]">
                            <UserRound className="h-5 w-5" />
                          </div>

                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {driver.name || 'Sem nome'}
                            </h3>

                            <div className="mt-1 flex flex-wrap gap-2">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs ${
                                  driver.active !== false
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                }`}
                              >
                                {driver.active !== false ? 'Ativo' : 'Inativo'}
                              </span>

                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
                                {driver.email || 'Sem email'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-white/65 md:grid-cols-2">
                          <div>
                            <span className="font-medium text-white/85">Telefone:</span>{' '}
                            {driver.phone || '—'}
                          </div>
                          <div>
                            <span className="font-medium text-white/85">Status:</span>{' '}
                            {driver.status || (driver.active !== false ? 'active' : 'inactive')}
                          </div>
                          <div className="md:col-span-2 break-all">
                            <span className="font-medium text-white/85">User ID:</span>{' '}
                            {driver.user_id || 'Ainda não vinculado ao Auth'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleEdit(driver)}
                          className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                        >
                          Editar
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={isToggling}
                          onClick={() => handleToggle(driver)}
                          className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {isToggling
                            ? 'Alterando...'
                            : driver.active !== false
                              ? 'Desativar'
                              : 'Ativar'}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={isDeleting}
                          onClick={() => handleDelete(driver.id)}
                          className="rounded-full border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}