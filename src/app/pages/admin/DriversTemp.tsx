import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Bike,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Wand2,
  Pencil,
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
  password: string;
  confirmPassword: string;
  active: boolean;
};

const initialForm: DriverFormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  active: true,
};

function onlyDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase();
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fieldClassName(withIcon = false, withRightPadding = false) {
  return `h-12 rounded-2xl border border-white/10 bg-white/[0.03] text-white placeholder:text-white/35 ${
    withIcon ? 'pl-10' : ''
  } ${withRightPadding ? 'pr-24' : ''}`;
}

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#';
  let result = '';

  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
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
  const [resettingIds, setResettingIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('Minha loja');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<DriverFormState>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      setStoreName(String((storeByOwner as any).store_name || (storeByOwner as any).name || 'Minha loja'));
      return String(storeByOwner.id);
    }

    if (user.email) {
      const { data: storeByEmail } = await supabase
        .from('stores')
        .select('id, store_name, name, admin_email')
        .eq('admin_email', user.email)
        .maybeSingle();

      if (storeByEmail?.id) {
        setStoreName(String((storeByEmail as any).store_name || (storeByEmail as any).name || 'Minha loja'));
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
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao carregar entregadores.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!authLoading && user?.role !== 'admin') {
      navigate('/login', { replace: true });
      return;
    }

    if (!authLoading && user?.role === 'admin') {
      loadDrivers();
    }
  }, [authLoading, user]);

  const activeCount = useMemo(
    () => drivers.filter((driver) => driver.active !== false).length,
    [drivers]
  );

  const filteredDrivers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return drivers;

    return drivers.filter((driver) => {
      const name = String(driver.name || '').toLowerCase();
      const email = String(driver.email || '').toLowerCase();
      const phone = String(driver.phone || '').toLowerCase();
      return name.includes(term) || email.includes(term) || phone.includes(term);
    });
  }, [drivers, search]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  function handleGeneratePassword() {
    const password = generatePassword(8);
    setForm((prev) => ({
      ...prev,
      password,
      confirmPassword: password,
    }));
    toast.success('Senha gerada com sucesso.');
  }

  async function handleCopyCredentials(email: string, password?: string) {
    try {
      const text = password ? `Login: ${email}\nSenha: ${password}` : `Login: ${email}`;
      await navigator.clipboard.writeText(text);
      toast.success('Dados copiados.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }

  function handleEdit(driver: DriverRow) {
    setEditingId(driver.id);
    setForm({
      name: String(driver.name || ''),
      email: String(driver.email || ''),
      phone: formatPhone(String(driver.phone || '')),
      password: '',
      confirmPassword: '',
      active: driver.active !== false,
    });

    setShowPassword(false);
    setShowConfirmPassword(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const name = String(form.name || '').trim();
    const email = normalizeEmail(form.email);
    const phone = onlyDigits(form.phone);
    const password = String(form.password || '').trim();
    const confirmPassword = String(form.confirmPassword || '').trim();

    if (!name || !email || !phone) {
      toast.error('Preencha nome, email e telefone.');
      return;
    }

    if (!editingId) {
      if (!password || !confirmPassword) {
        toast.error('Preencha a senha e a confirmação.');
        return;
      }

      if (password.length < 6) {
        toast.error('A senha precisa ter pelo menos 6 caracteres.');
        return;
      }

      if (password !== confirmPassword) {
        toast.error('As senhas não conferem.');
        return;
      }
    }

    try {
      setSaving(true);

      if (editingId) {
        const { data, error } = await supabase.functions.invoke('create-driver', {
          body: {
            action: 'update',
            driverId: editingId,
            name,
            email,
            phone,
            active: form.active,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success('Entregador atualizado com sucesso.');
      } else {
        const { data, error } = await supabase.functions.invoke('create-driver', {
          body: {
            action: 'create',
            name,
            email,
            phone,
            password,
            active: form.active,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success('Entregador criado com login com sucesso.');
      }

      resetForm();
      await loadDrivers();
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao salvar entregador.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(driver: DriverRow) {
    try {
      setDeletingIds((prev) => [...prev, driver.id]);

      const { data, error } = await supabase.functions.invoke('create-driver', {
        body: {
          action: 'delete',
          driverId: driver.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (editingId === driver.id) {
        resetForm();
      }

      toast.success('Entregador excluído com sucesso.');
      await loadDrivers();
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao excluir entregador.';
      toast.error(message);
    } finally {
      setDeletingIds((prev) => prev.filter((item) => item !== driver.id));
    }
  }

  async function handleToggle(driver: DriverRow) {
    try {
      setTogglingIds((prev) => [...prev, driver.id]);

      const nextActive = !(driver.active !== false);

      const { data, error } = await supabase.functions.invoke('create-driver', {
        body: {
          action: 'toggle',
          driverId: driver.id,
          active: nextActive,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(nextActive ? 'Entregador ativado.' : 'Entregador desativado.');
      await loadDrivers();
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao alterar status.';
      toast.error(message);
    } finally {
      setTogglingIds((prev) => prev.filter((item) => item !== driver.id));
    }
  }

  async function handleResetPassword(driver: DriverRow) {
    const newPassword = window.prompt(
      `Digite a nova senha para ${driver.name || driver.email || 'este entregador'}:`,
      ''
    );

    if (!newPassword) return;

    if (newPassword.trim().length < 6) {
      toast.error('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    try {
      setResettingIds((prev) => [...prev, driver.id]);

      const { data, error } = await supabase.functions.invoke('create-driver', {
        body: {
          action: 'reset-password',
          driverId: driver.id,
          password: newPassword.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Senha redefinida com sucesso.');
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao redefinir senha.';
      toast.error(message);
    } finally {
      setResettingIds((prev) => prev.filter((item) => item !== driver.id));
    }
  }

  if (authLoading) {
    return <div className="p-6 text-white">Carregando...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <AdminShell
      title="Entregadores"
      subtitle="Gerencie toda a equipe de entrega da sua loja em uma área própria"
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
              <p className="text-sm uppercase tracking-[0.25em] text-[#ff7b85]">Cadastro completo</p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                {editingId ? 'Editar entregador' : 'Novo entregador'}
              </h2>
              <p className="mt-2 text-sm text-white/65">
                Cadastre entregadores com login, senha, status e dados de contato.
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
                Nome do entregador
              </Label>
              <div className="relative mt-2">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  id="driver-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome completo"
                  className={fieldClassName(true)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="driver-email" className="text-white/85">
                Email de acesso
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
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      phone: formatPhone(e.target.value),
                    }))
                  }
                  placeholder="(00) 00000-0000"
                  className={fieldClassName(true)}
                />
              </div>
            </div>

            <div>
              <Label className="text-white/85">Status inicial</Label>
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

            {!editingId ? (
              <>
                <div>
                  <Label htmlFor="driver-password" className="text-white/85">
                    Senha de acesso
                  </Label>
                  <div className="relative mt-2">
                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      id="driver-password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Crie uma senha"
                      className={fieldClassName(true, true)}
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="driver-confirm-password" className="text-white/85">
                    Confirmar senha
                  </Label>
                  <div className="relative mt-2">
                    <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      id="driver-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Repita a senha"
                      className={fieldClassName(true, true)}
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGeneratePassword}
                    className="rounded-full border-[#EA1D2C]/25 bg-[#EA1D2C]/10 text-[#ff808a] hover:bg-[#EA1D2C]/15"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Gerar senha
                  </Button>

                  {(form.email || form.password) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCopyCredentials(form.email, form.password)}
                      className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar acesso
                    </Button>
                  )}
                </div>
              </>
            ) : null}

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#EA1D2C] text-white hover:bg-[#d31625]"
              >
                {saving ? (
                  <Save className="mr-2 h-4 w-4" />
                ) : editingId ? (
                  <Pencil className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {saving
                  ? editingId
                    ? 'Atualizando...'
                    : 'Criando...'
                  : editingId
                    ? 'Atualizar entregador'
                    : 'Criar entregador com login'}
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#ff7b85]">Equipe</p>
              <h2 className="mt-3 text-2xl font-bold text-white">Entregadores cadastrados</h2>
              <p className="mt-2 text-sm text-white/65">
                Visualize, pesquise e gerencie todos os entregadores da loja.
              </p>
            </div>

            <div className="relative w-full lg:w-[320px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, email ou telefone"
                className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] pl-10 text-white placeholder:text-white/35"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {loading ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center text-white/65">
                Carregando entregadores...
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EA1D2C]/10 text-[#EA1D2C]">
                  <Bike className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">
                  {drivers.length === 0 ? 'Nenhum entregador cadastrado' : 'Nenhum resultado encontrado'}
                </h3>
                <p className="mt-2 text-sm text-white/55">
                  {drivers.length === 0
                    ? 'Cadastre o primeiro entregador usando o formulário acima.'
                    : 'Tente outro termo na busca.'}
                </p>
              </div>
            ) : (
              filteredDrivers.map((driver) => {
                const isDeleting = deletingIds.includes(driver.id);
                const isToggling = togglingIds.includes(driver.id);
                const isResetting = resettingIds.includes(driver.id);

                return (
                  <div
                    key={driver.id}
                    className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EA1D2C]/10 text-[#EA1D2C]">
                            <UserRound className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-white">
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
                          <div>
                            <span className="font-medium text-white/85">Criado em:</span>{' '}
                            {formatDate(driver.created_at)}
                          </div>
                          <div className="break-all">
                            <span className="font-medium text-white/85">User ID:</span>{' '}
                            {driver.user_id || 'Não vinculado'}
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
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleCopyCredentials(String(driver.email || ''))}
                          className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar login
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={isResetting}
                          onClick={() => handleResetPassword(driver)}
                          className="rounded-full border-[#EA1D2C]/25 bg-[#EA1D2C]/10 text-[#ff808a] hover:bg-[#EA1D2C]/15"
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          {isResetting ? 'Redefinindo...' : 'Redefinir senha'}
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
                          onClick={() => handleDelete(driver)}
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

export default AdminDrivers;