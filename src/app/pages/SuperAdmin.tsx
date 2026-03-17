import { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Settings,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Edit,
  Trash2,
  Power,
  Key,
  Receipt,
  Copy,
  Check,
  Crown,
  Trophy,
  Package,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useOrders } from '../contexts/OrderContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import type { Store as StoreType, OrderItem } from '../types';

type EditablePlanId = 'iniciante' | 'pro' | 'premium';

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function SuperAdmin() {
  const navigate = useNavigate();
  const { user, authLoading, logout, users, resetPassword } = useAuth();
  const { stores, plans, updateStore, deleteStore, updatePlan } = useStore();
  const { orders } = useOrders();

  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewOrdersStore, setViewOrdersStore] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<EditablePlanId | null>(null);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    setAuthChecked(true);

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user.role !== 'super-admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const uniquePlans = useMemo(() => {
    const map = new Map<string, (typeof plans)[number]>();

    for (const plan of plans) {
      if (!plan?.id) continue;
      map.set(String(plan.id), plan);
    }

    return Array.from(map.values());
  }, [plans]);

  const saasStats = useMemo(() => {
    const totalStores = stores.length;
    const activeStores = stores.filter((store) => store.active && !store.suspended).length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    const saasRevenue = stores.reduce((sum, store) => {
      const plan = uniquePlans.find((p) => p.id === (store.plan || 'iniciante'));
      return sum + Number(plan?.price || 0);
    }, 0);

    return {
      totalStores,
      activeStores,
      totalOrders,
      totalRevenue,
      saasRevenue,
    };
  }, [stores, orders, uniquePlans]);

  const topStores = useMemo(() => {
    const storeOrderCounts = stores.map((store) => {
      const storeOrders = orders.filter((order) => String(order.storeId) === String(store.id));
      const orderCount = storeOrders.length;
      const revenue = storeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

      return { store, orderCount, revenue };
    });

    return storeOrderCounts.sort((a, b) => b.orderCount - a.orderCount).slice(0, 5);
  }, [stores, orders]);

  const storeOrders = useMemo(() => {
    if (!viewOrdersStore) return [];
    return orders.filter((order) => String(order.storeId) === String(viewOrdersStore));
  }, [orders, viewOrdersStore]);

  const handleEditStore = (store: StoreType) => {
    setEditingStore(store);
    setEditDialogOpen(true);
  };

  const handleSaveStore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStore) return;

    setIsSavingStore(true);

    try {
      const formData = new FormData(e.currentTarget);

      await updateStore(editingStore.id, {
        name: String(formData.get('name') || '').trim(),
        whatsapp: String(formData.get('whatsapp') || '').replace(/\D/g, ''),
        storeUrl: String(formData.get('storeUrl') || '').trim(),
        logoUrl: String(formData.get('logoUrl') || '').trim(),
        plan: (formData.get('plan') as EditablePlanId) || 'iniciante',
      });

      toast.success('Loja atualizada!');
      setEditDialogOpen(false);
      setEditingStore(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar loja');
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleSuspendStore = async (storeId: string) => {
    if (!confirm('Deseja suspender esta loja?')) return;

    try {
      await updateStore(storeId, { active: false, suspended: true });
      toast.success('Loja suspensa!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao suspender loja');
    }
  };

  const handleActivateStore = async (storeId: string) => {
    if (!confirm('Deseja ativar esta loja?')) return;

    try {
      await updateStore(storeId, { active: true, suspended: false });
      toast.success('Loja ativada!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao ativar loja');
    }
  };

  const handleDeleteStore = async (storeId: string, storeName: string) => {
    if (
      !confirm(
        `Deseja EXCLUIR permanentemente a loja "${storeName}"? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      await deleteStore(storeId);
      toast.success('Loja excluída!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir loja');
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const ok = await resetPassword(email, '');
      if (ok) {
        toast.success('Email de redefinição enviado!');
      } else {
        toast.error('Não foi possível enviar o reset.');
      }
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      toast.error('Erro ao resetar senha');
    }
  };

  const handleCopyLink = async (link: string, storeId: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(storeId);
      toast.success('Link copiado!');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      const formData = new FormData(e.currentTarget);
      const features = String(formData.get('features') || '')
        .split(',')
        .map((feature) => feature.trim())
        .filter(Boolean);

      await updatePlan(editingPlan, {
        price: parseFloat(String(formData.get('price') || '0')),
        features,
        maxProducts: parseInt(String(formData.get('maxProducts') || '0'), 10),
        maxOrders: parseInt(String(formData.get('maxOrders') || '0'), 10),
      });

      toast.success('Plano atualizado!');
      setEditingPlan(null);
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      toast.error('Não foi possível atualizar o plano.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Erro ao sair:', error);
      toast.error('Erro ao sair da conta.');
    }
  };

  if (authLoading || !authChecked) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,40,40,0.16),_transparent_35%),linear-gradient(180deg,#090909_0%,#050505_100%)] p-6 text-white">
        Carregando sessão...
      </div>
    );
  }

  if (!user || user.role !== 'super-admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,40,40,0.16),_transparent_35%),linear-gradient(180deg,#090909_0%,#050505_100%)] text-white">
      <div className="border-b border-red-950/50 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-900/60 bg-red-950/30">
                <Crown className="h-7 w-7 text-[#ffcc4d]" />
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                  Super Admin Dashboard
                </h1>
                <p className="text-sm text-zinc-400">Gerenciamento completo do SaaS</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-red-900/60 bg-black text-white hover:bg-red-950/40 hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-[22px] border border-red-950/60 bg-[#101010] p-1 md:grid-cols-4">
            <TabsTrigger
              value="dashboard"
              className="rounded-[18px] text-zinc-400 data-[state=active]:bg-[#EA1D2C] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="stores"
              className="rounded-[18px] text-zinc-400 data-[state=active]:bg-[#EA1D2C] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Lojas
            </TabsTrigger>
            <TabsTrigger
              value="plans"
              className="rounded-[18px] text-zinc-400 data-[state=active]:bg-[#EA1D2C] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Planos
            </TabsTrigger>
            <TabsTrigger
              value="ranking"
              className="rounded-[18px] text-zinc-400 data-[state=active]:bg-[#EA1D2C] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Card className="rounded-[24px] border border-red-950/60 bg-[#090909] p-5 shadow-none">
                <div className="mb-2 flex items-center gap-2 text-zinc-400">
                  <Store className="h-4 w-4 text-[#EA1D2C]" />
                  <p className="text-sm">Total de Lojas</p>
                </div>
                <p className="text-3xl font-black text-white">{saasStats.totalStores}</p>
              </Card>

              <Card className="rounded-[24px] border border-red-950/60 bg-[#090909] p-5 shadow-none">
                <div className="mb-2 flex items-center gap-2 text-zinc-400">
                  <Power className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm">Lojas Ativas</p>
                </div>
                <p className="text-3xl font-black text-emerald-400">{saasStats.activeStores}</p>
              </Card>

              <Card className="rounded-[24px] border border-red-950/60 bg-[#090909] p-5 shadow-none">
                <div className="mb-2 flex items-center gap-2 text-zinc-400">
                  <ShoppingBag className="h-4 w-4 text-white" />
                  <p className="text-sm">Total de Pedidos</p>
                </div>
                <p className="text-3xl font-black text-white">{saasStats.totalOrders}</p>
              </Card>

              <Card className="rounded-[24px] border border-red-950/60 bg-[#090909] p-5 shadow-none">
                <div className="mb-2 flex items-center gap-2 text-zinc-400">
                  <TrendingUp className="h-4 w-4 text-[#EA1D2C]" />
                  <p className="text-sm">Volume Total</p>
                </div>
                <p className="text-2xl font-black text-[#EA1D2C]">
                  {formatMoney(saasStats.totalRevenue)}
                </p>
              </Card>

              <Card className="rounded-[24px] border border-red-950/60 bg-[#090909] p-5 shadow-none">
                <div className="mb-2 flex items-center gap-2 text-zinc-400">
                  <DollarSign className="h-4 w-4 text-[#ffcc4d]" />
                  <p className="text-sm">Receita SaaS</p>
                </div>
                <p className="text-2xl font-black text-[#ffcc4d]">
                  {formatMoney(saasStats.saasRevenue)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">Mensal</p>
              </Card>
            </div>

            <div className="rounded-[28px] border border-red-950/60 bg-black/70 p-6">
              <h2 className="mb-4 text-2xl font-black tracking-tight text-white">
                Distribuição de Planos
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {uniquePlans.map((plan) => {
                  const storesInPlan = stores.filter(
                    (store) => (store.plan || 'iniciante') === plan.id
                  ).length;

                  return (
                    <Card
                      key={plan.id}
                      className="rounded-[24px] border border-red-950/60 bg-[#090909] p-6 shadow-none"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-xl font-black text-white">{plan.name}</h3>
                        <Badge
                          className={`border-0 ${
                            plan.id === 'premium'
                              ? 'bg-[#EA1D2C] text-white'
                              : 'bg-zinc-800 text-zinc-200'
                          }`}
                        >
                          {storesInPlan} lojas
                        </Badge>
                      </div>

                      <p className="mb-4 text-4xl font-black text-[#EA1D2C]">
                        {formatMoney(plan.price)}
                      </p>

                      <ul className="space-y-2 text-sm text-zinc-400">
                        {plan.features.map((feature, index) => (
                          <li key={`${plan.id}-${index}`}>• {feature}</li>
                        ))}
                      </ul>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stores" className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-black tracking-tight text-white">Gerenciar Lojas</h2>
              <p className="text-sm text-zinc-400">{stores.length} lojas cadastradas</p>
            </div>

            <div className="space-y-4">
              {stores.map((store) => {
                const plan = uniquePlans.find((p) => p.id === (store.plan || 'iniciante'));
                const storeOrders = orders.filter(
                  (order) => String(order.storeId) === String(store.id)
                );
                const storeOrderCount = storeOrders.length;
                const storeRevenue = storeOrders.reduce(
                  (sum, order) => sum + Number(order.total || 0),
                  0
                );

                const storePublicUrl =
                  store.storeUrl && store.storeUrl.trim()
                    ? store.storeUrl
                    : `${window.location.origin}/loja/${encodeURIComponent(store.slug || store.id)}`;

                return (
                  <Card
                    key={store.id}
                    className="rounded-[24px] border border-red-950/60 bg-[#090909] p-5 shadow-none"
                  >
                    <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                      <div className="flex-1">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-black text-white">{store.name}</h3>

                          <Badge
                            className={`border-0 ${
                              store.suspended
                                ? 'bg-red-600 text-white'
                                : store.active
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-700 text-white'
                            }`}
                          >
                            {store.suspended ? 'Suspensa' : store.active ? 'Ativa' : 'Inativa'}
                          </Badge>

                          <Badge className="border border-red-900/60 bg-red-950/30 text-zinc-200">
                            {plan?.name || 'Sem plano'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-red-950/50 bg-black/50 p-3">
                            <p className="text-zinc-500">Email</p>
                            <p className="mt-1 font-medium text-white">{store.adminEmail || '-'}</p>
                          </div>

                          <div className="rounded-2xl border border-red-950/50 bg-black/50 p-3">
                            <p className="text-zinc-500">WhatsApp</p>
                            <p className="mt-1 font-medium text-white">{store.whatsapp || '-'}</p>
                          </div>

                          <div className="rounded-2xl border border-red-950/50 bg-black/50 p-3">
                            <p className="text-zinc-500">Pedidos</p>
                            <p className="mt-1 font-medium text-white">{storeOrderCount}</p>
                          </div>

                          <div className="rounded-2xl border border-red-950/50 bg-black/50 p-3">
                            <p className="text-zinc-500">Faturamento</p>
                            <p className="mt-1 font-bold text-emerald-400">
                              {formatMoney(storeRevenue)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(storePublicUrl, store.id)}
                            className="border-red-900/60 bg-black text-white hover:bg-red-950/40 hover:text-white"
                          >
                            {copiedLink === store.id ? (
                              <Check className="mr-1 h-4 w-4 text-emerald-400" />
                            ) : (
                              <Copy className="mr-1 h-4 w-4" />
                            )}
                            {copiedLink === store.id ? 'Copiado!' : 'Copiar Link'}
                          </Button>

                          <div className="max-w-full overflow-hidden rounded-xl border border-red-950/60 bg-black/50 px-3 py-2 text-xs text-zinc-400">
                            <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                              {storePublicUrl}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:w-[220px] xl:flex-col">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditStore(store)}
                          className="border-red-900/60 bg-black text-white hover:bg-red-950/40 hover:text-white"
                        >
                          <Edit className="mr-1 h-4 w-4" />
                          Editar
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-900/60 bg-black text-white hover:bg-red-950/40 hover:text-white"
                          onClick={() => {
                            const admin = users.find(
                              (currentUser) =>
                                String(currentUser.storeId) === String(store.id) &&
                                currentUser.role === 'admin'
                            );

                            if (admin?.email) {
                              void handleResetPassword(admin.email);
                            } else {
                              toast.error('Administrador da loja não encontrado.');
                            }
                          }}
                        >
                          <Key className="mr-1 h-4 w-4" />
                          Resetar Senha
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-900/60 bg-black text-white hover:bg-red-950/40 hover:text-white"
                          onClick={() => setViewOrdersStore(store.id)}
                        >
                          <Receipt className="mr-1 h-4 w-4" />
                          Ver Pedidos
                        </Button>

                        {store.suspended || !store.active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-emerald-700 bg-black text-emerald-400 hover:bg-emerald-950/20 hover:text-emerald-300"
                            onClick={() => void handleActivateStore(store.id)}
                          >
                            <Power className="mr-1 h-4 w-4" />
                            Ativar
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-orange-700 bg-black text-orange-400 hover:bg-orange-950/20 hover:text-orange-300"
                            onClick={() => void handleSuspendStore(store.id)}
                          >
                            <Power className="mr-1 h-4 w-4" />
                            Suspender
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-700 bg-black text-red-400 hover:bg-red-950/20 hover:text-red-300"
                          onClick={() => void handleDeleteStore(store.id, store.name)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight text-white">Gerenciar Planos</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {uniquePlans.map((plan) => (
                <Card
                  key={plan.id}
                  className="rounded-[24px] border border-red-950/60 bg-[#090909] p-6 shadow-none"
                >
                  <h3 className="mb-2 text-2xl font-black text-white">{plan.name}</h3>
                  <p className="mb-4 text-3xl font-black text-[#EA1D2C]">
                    {formatMoney(plan.price)}/mês
                  </p>

                  <div className="mb-4 space-y-2">
                    <p className="text-sm text-zinc-400">
                      <strong className="text-white">Max Produtos:</strong>{' '}
                      {plan.maxProducts === -1 ? 'Ilimitado' : plan.maxProducts}
                    </p>
                    <p className="text-sm text-zinc-400">
                      <strong className="text-white">Max Pedidos:</strong>{' '}
                      {plan.maxOrders === -1 ? 'Ilimitado' : plan.maxOrders}
                    </p>
                  </div>

                  <ul className="mb-5 space-y-2 text-sm text-zinc-400">
                    {plan.features.map((feature, index) => (
                      <li key={`${plan.id}-feature-${index}`}>• {feature}</li>
                    ))}
                  </ul>

                  <Button
                    variant="outline"
                    className="w-full border-red-900/60 bg-black text-white hover:bg-red-950/40 hover:text-white"
                    onClick={() => setEditingPlan(plan.id as EditablePlanId)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Editar Plano
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ranking" className="space-y-4">
            <div className="mb-4 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-[#ffcc4d]" />
              <h2 className="text-2xl font-black tracking-tight text-white">
                Top 5 Lojas com Mais Pedidos
              </h2>
            </div>

            <div className="space-y-3">
              {topStores.map((item, index) => (
                <Card
                  key={item.store.id}
                  className="rounded-[24px] border border-red-950/60 bg-[#090909] p-5 shadow-none"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex-shrink-0">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-black ${
                          index === 0
                            ? 'bg-[#ffcc4d] text-black'
                            : index === 1
                            ? 'bg-zinc-300 text-black'
                            : index === 2
                            ? 'bg-orange-500 text-white'
                            : 'bg-zinc-800 text-zinc-200'
                        }`}
                      >
                        {index + 1}
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-black text-white">{item.store.name}</h3>
                      <p className="text-sm text-zinc-500">{item.store.adminEmail || '-'}</p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-2xl font-black text-[#EA1D2C]">{item.orderCount}</p>
                      <p className="text-sm text-zinc-500">pedidos</p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xl font-black text-emerald-400">
                        {formatMoney(item.revenue)}
                      </p>
                      <p className="text-sm text-zinc-500">faturamento</p>
                    </div>
                  </div>
                </Card>
              ))}

              {topStores.length === 0 && (
                <Card className="rounded-[24px] border border-red-950/60 bg-[#090909] p-8 text-center shadow-none">
                  <Package className="mx-auto mb-3 h-12 w-12 text-zinc-700" />
                  <p className="text-zinc-500">Nenhum pedido registrado ainda</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingStore(null);
        }}
      >
        <DialogContent className="border border-red-950/60 bg-[#090909] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Loja</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Atualize as informações da loja
            </DialogDescription>
          </DialogHeader>

          {editingStore && (
            <form onSubmit={handleSaveStore} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-zinc-200">
                  Nome da Loja
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingStore.name}
                  required
                  className="border-red-950/60 bg-black text-white placeholder:text-zinc-500"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp" className="text-zinc-200">
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  defaultValue={editingStore.whatsapp || ''}
                  className="border-red-950/60 bg-black text-white placeholder:text-zinc-500"
                />
              </div>

              <div>
                <Label htmlFor="storeUrl" className="text-zinc-200">
                  Link da Loja
                </Label>
                <Input
                  id="storeUrl"
                  name="storeUrl"
                  defaultValue={editingStore.storeUrl || ''}
                  placeholder="https://seudominio.com/loja"
                  className="border-red-950/60 bg-black text-white placeholder:text-zinc-500"
                />
              </div>

              <div>
                <Label htmlFor="logoUrl" className="text-zinc-200">
                  URL do Logo
                </Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  defaultValue={editingStore.logoUrl || ''}
                  className="border-red-950/60 bg-black text-white placeholder:text-zinc-500"
                />
              </div>

              <div>
                <Label htmlFor="plan" className="text-zinc-200">
                  Plano
                </Label>
                <select
                  id="plan"
                  name="plan"
                  defaultValue={editingStore.plan || 'iniciante'}
                  className="w-full rounded-md border border-red-950/60 bg-black p-2 text-white outline-none"
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={isSavingStore}
                className="w-full bg-[#EA1D2C] text-white hover:bg-[#c81824]"
              >
                {isSavingStore ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewOrdersStore} onOpenChange={() => setViewOrdersStore(null)}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto border border-red-950/60 bg-[#090909] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Pedidos da Loja</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {storeOrders.length === 0 ? (
              <p className="py-8 text-center text-zinc-500">Nenhum pedido encontrado</p>
            ) : (
              storeOrders.map((order) => (
                <Card
                  key={order.id}
                  className="rounded-[20px] border border-red-950/60 bg-black p-4 shadow-none"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">{order.code}</p>
                      <p className="text-sm text-zinc-500">
                        {new Date(order.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Badge className="border border-red-900/60 bg-red-950/30 text-zinc-100">
                      {order.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    {order.items.map((item: OrderItem, index: number) => (
                      <p key={`${order.id}-${index}`} className="text-zinc-400">
                        {item.quantity}x {item.name || item.product?.name || 'Produto'}
                      </p>
                    ))}
                  </div>

                  <p className="mt-3 text-lg font-black text-[#EA1D2C]">
                    {formatMoney(order.total)}
                  </p>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="border border-red-950/60 bg-[#090909] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Editar Plano {editingPlan && uniquePlans.find((plan) => plan.id === editingPlan)?.name}
            </DialogTitle>
          </DialogHeader>

          {editingPlan && (
            <form onSubmit={handleUpdatePlan} className="space-y-4">
              {(() => {
                const plan = uniquePlans.find((currentPlan) => currentPlan.id === editingPlan);
                if (!plan) return null;

                return (
                  <>
                    <div>
                      <Label htmlFor="price" className="text-zinc-200">
                        Preço Mensal (R$)
                      </Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        defaultValue={plan.price}
                        required
                        className="border-red-950/60 bg-black text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxProducts" className="text-zinc-200">
                        Max Produtos (-1 = ilimitado)
                      </Label>
                      <Input
                        id="maxProducts"
                        name="maxProducts"
                        type="number"
                        defaultValue={plan.maxProducts}
                        required
                        className="border-red-950/60 bg-black text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxOrders" className="text-zinc-200">
                        Max Pedidos (-1 = ilimitado)
                      </Label>
                      <Input
                        id="maxOrders"
                        name="maxOrders"
                        type="number"
                        defaultValue={plan.maxOrders}
                        required
                        className="border-red-950/60 bg-black text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="features" className="text-zinc-200">
                        Features (separadas por vírgula)
                      </Label>
                      <Input
                        id="features"
                        name="features"
                        defaultValue={plan.features.join(', ')}
                        required
                        className="border-red-950/60 bg-black text-white"
                      />
                    </div>

                    <Button type="submit" className="w-full bg-[#EA1D2C] text-white hover:bg-[#c81824]">
                      Salvar Plano
                    </Button>
                  </>
                );
              })()}
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}