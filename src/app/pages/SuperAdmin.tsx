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
    return <div className="p-4">Carregando sessão...</div>;
  }

  if (!user || user.role !== 'super-admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-yellow-300" />
              <div>
                <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
                <p className="text-sm text-purple-100">Gerenciamento Completo do SaaS</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="stores">Lojas</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card className="border-l-4 border-l-purple-600 p-4">
                <div className="mb-1 flex items-center gap-2 text-gray-500">
                  <Store className="h-4 w-4" />
                  <p className="text-sm">Total de Lojas</p>
                </div>
                <p className="text-3xl font-bold text-purple-600">{saasStats.totalStores}</p>
              </Card>

              <Card className="border-l-4 border-l-green-600 p-4">
                <div className="mb-1 flex items-center gap-2 text-gray-500">
                  <Power className="h-4 w-4" />
                  <p className="text-sm">Lojas Ativas</p>
                </div>
                <p className="text-3xl font-bold text-green-600">{saasStats.activeStores}</p>
              </Card>

              <Card className="border-l-4 border-l-blue-600 p-4">
                <div className="mb-1 flex items-center gap-2 text-gray-500">
                  <ShoppingBag className="h-4 w-4" />
                  <p className="text-sm">Total de Pedidos</p>
                </div>
                <p className="text-3xl font-bold text-blue-600">{saasStats.totalOrders}</p>
              </Card>

              <Card className="border-l-4 border-l-orange-600 p-4">
                <div className="mb-1 flex items-center gap-2 text-gray-500">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-sm">Volume Total</p>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {formatMoney(saasStats.totalRevenue)}
                </p>
              </Card>

              <Card className="border-l-4 border-l-yellow-600 p-4">
                <div className="mb-1 flex items-center gap-2 text-gray-500">
                  <DollarSign className="h-4 w-4" />
                  <p className="text-sm">Receita SaaS</p>
                </div>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatMoney(saasStats.saasRevenue)}
                </p>
                <p className="mt-1 text-xs text-gray-500">Mensal</p>
              </Card>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold">Distribuição de Planos</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {uniquePlans.map((plan) => {
                  const storesInPlan = stores.filter(
                    (store) => (store.plan || 'iniciante') === plan.id
                  ).length;

                  return (
                    <Card key={plan.id} className="p-6 transition-shadow hover:shadow-lg">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{plan.name}</h3>
                        <Badge variant={plan.id === 'premium' ? 'default' : 'secondary'}>
                          {storesInPlan} lojas
                        </Badge>
                      </div>

                      <p className="mb-3 text-3xl font-bold text-[#EA1D2C]">
                        {formatMoney(plan.price)}
                      </p>

                      <ul className="space-y-1 text-sm text-gray-600">
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Gerenciar Lojas</h2>
              <p className="text-sm text-gray-500">{stores.length} lojas cadastradas</p>
            </div>

            <div className="space-y-3">
              {stores.map((store) => {
                const plan = uniquePlans.find((p) => p.id === (store.plan || 'iniciante'));
                const storeOrders = orders.filter((order) => String(order.storeId) === String(store.id));
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
                  <Card key={store.id} className="p-4 transition-shadow hover:shadow-md">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{store.name}</h3>
                          <Badge
                            variant={
                              store.suspended
                                ? 'destructive'
                                : store.active
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {store.suspended ? 'Suspensa' : store.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                          <Badge variant="outline">{plan?.name || 'Sem plano'}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                          <div>
                            <p className="text-gray-500">Email</p>
                            <p className="font-medium">{store.adminEmail || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">WhatsApp</p>
                            <p className="font-medium">{store.whatsapp || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Pedidos</p>
                            <p className="font-medium">{storeOrderCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Faturamento</p>
                            <p className="font-medium text-green-600">
                              {formatMoney(storeRevenue)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(storePublicUrl, store.id)}
                          >
                            {copiedLink === store.id ? (
                              <Check className="mr-1 h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="mr-1 h-4 w-4" />
                            )}
                            {copiedLink === store.id ? 'Copiado!' : 'Copiar Link'}
                          </Button>

                          <Badge
                            variant="secondary"
                            className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs"
                          >
                            {storePublicUrl}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:flex-col">
                        <Button variant="outline" size="sm" onClick={() => handleEditStore(store)}>
                          <Edit className="mr-1 h-4 w-4" />
                          Editar
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
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
                          onClick={() => setViewOrdersStore(store.id)}
                        >
                          <Receipt className="mr-1 h-4 w-4" />
                          Ver Pedidos
                        </Button>

                        {store.suspended || !store.active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-600 text-green-600"
                            onClick={() => void handleActivateStore(store.id)}
                          >
                            <Power className="mr-1 h-4 w-4" />
                            Ativar
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-orange-600 text-orange-600"
                            onClick={() => void handleSuspendStore(store.id)}
                          >
                            <Power className="mr-1 h-4 w-4" />
                            Suspender
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-600"
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
            <h2 className="text-xl font-semibold">Gerenciar Planos</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {uniquePlans.map((plan) => (
                <Card key={plan.id} className="p-6">
                  <h3 className="mb-2 text-xl font-semibold">{plan.name}</h3>
                  <p className="mb-4 text-3xl font-bold text-[#EA1D2C]">
                    {formatMoney(plan.price)}/mês
                  </p>

                  <div className="mb-4 space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Max Produtos:</strong>{' '}
                      {plan.maxProducts === -1 ? 'Ilimitado' : plan.maxProducts}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Max Pedidos:</strong>{' '}
                      {plan.maxOrders === -1 ? 'Ilimitado' : plan.maxOrders}
                    </p>
                  </div>

                  <ul className="mb-4 space-y-1 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={`${plan.id}-feature-${index}`} className="text-gray-600">
                        • {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="outline"
                    className="w-full"
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
              <Trophy className="h-8 w-8 text-yellow-500" />
              <h2 className="text-xl font-semibold">Top 5 Lojas com Mais Pedidos</h2>
            </div>

            <div className="space-y-3">
              {topStores.map((item, index) => (
                <Card key={item.store.id} className="p-4 transition-shadow hover:shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
                          index === 0
                            ? 'bg-yellow-500 text-white'
                            : index === 1
                            ? 'bg-gray-400 text-white'
                            : index === 2
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{item.store.name}</h3>
                      <p className="text-sm text-gray-500">{item.store.adminEmail || '-'}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#EA1D2C]">{item.orderCount}</p>
                      <p className="text-sm text-gray-500">pedidos</p>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        {formatMoney(item.revenue)}
                      </p>
                      <p className="text-sm text-gray-500">faturamento</p>
                    </div>
                  </div>
                </Card>
              ))}

              {topStores.length === 0 && (
                <Card className="p-8 text-center">
                  <Package className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">Nenhum pedido registrado ainda</p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Loja</DialogTitle>
            <DialogDescription>Atualize as informações da loja</DialogDescription>
          </DialogHeader>

          {editingStore && (
            <form onSubmit={handleSaveStore} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Loja</Label>
                <Input id="name" name="name" defaultValue={editingStore.name} required />
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  defaultValue={editingStore.whatsapp || ''}
                />
              </div>

              <div>
                <Label htmlFor="storeUrl">Link da Loja</Label>
                <Input
                  id="storeUrl"
                  name="storeUrl"
                  defaultValue={editingStore.storeUrl || ''}
                  placeholder="https://seudominio.com/loja"
                />
              </div>

              <div>
                <Label htmlFor="logoUrl">URL do Logo</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  defaultValue={editingStore.logoUrl || ''}
                />
              </div>

              <div>
                <Label htmlFor="plan">Plano</Label>
                <select
                  id="plan"
                  name="plan"
                  defaultValue={editingStore.plan || 'iniciante'}
                  className="w-full rounded border p-2"
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={isSavingStore}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isSavingStore ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewOrdersStore} onOpenChange={() => setViewOrdersStore(null)}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedidos da Loja</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {storeOrders.length === 0 ? (
              <p className="py-8 text-center text-gray-500">Nenhum pedido encontrado</p>
            ) : (
              storeOrders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{order.code}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Badge>{order.status}</Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    {order.items.map((item: OrderItem, index: number) => (
                      <p key={`${order.id}-${index}`} className="text-gray-600">
                        {item.quantity}x {item.name || item.product?.name || 'Produto'}
                      </p>
                    ))}
                  </div>

                  <p className="mt-2 text-lg font-bold text-[#EA1D2C]">
                    {formatMoney(order.total)}
                  </p>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
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
                      <Label htmlFor="price">Preço Mensal (R$)</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        defaultValue={plan.price}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxProducts">Max Produtos (-1 = ilimitado)</Label>
                      <Input
                        id="maxProducts"
                        name="maxProducts"
                        type="number"
                        defaultValue={plan.maxProducts}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxOrders">Max Pedidos (-1 = ilimitado)</Label>
                      <Input
                        id="maxOrders"
                        name="maxOrders"
                        type="number"
                        defaultValue={plan.maxOrders}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="features">Features (separadas por vírgula)</Label>
                      <Input
                        id="features"
                        name="features"
                        defaultValue={plan.features.join(', ')}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
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