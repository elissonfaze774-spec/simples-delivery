import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bike,
  CheckCircle2,
  Clock3,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

type DriverProfile = {
  id: string;
  user_id?: string;
  store_id?: string;
  name?: string;
  phone?: string;
  active?: boolean;
  status?: string;
};

type DriverOrder = {
  id: string;
  code?: string | number;
  status?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  address?: string;
  total?: number;
  created_at?: string;
  delivered_at?: string | null;
  driver_id?: string | null;
  driver_user_id?: string | null;
  store_id?: string | null;
  notes?: string | null;
};

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeStatus(status?: string | null) {
  const value = String(status || '').trim().toLowerCase();

  if (
    [
      'pending',
      'novo',
      'aguardando',
      'waiting',
      'received',
      'placed',
      'criado',
    ].includes(value)
  ) {
    return 'pending';
  }

  if (
    [
      'confirmed',
      'confirmado',
      'preparing',
      'preparo',
      'ready',
      'pronto',
      'accepted',
    ].includes(value)
  ) {
    return 'ready';
  }

  if (
    [
      'out_for_delivery',
      'out-for-delivery',
      'em_rota',
      'em rota',
      'saiu para entrega',
      'delivery',
      'delivering',
    ].includes(value)
  ) {
    return 'out_for_delivery';
  }

  if (
    [
      'delivered',
      'entregue',
      'finished',
      'completed',
      'concluido',
      'concluído',
    ].includes(value)
  ) {
    return 'delivered';
  }

  if (['cancelled', 'canceled', 'cancelado'].includes(value)) {
    return 'cancelled';
  }

  return value || 'pending';
}

function getStatusLabel(status?: string | null) {
  const value = normalizeStatus(status);

  switch (value) {
    case 'pending':
      return 'Pendente';
    case 'ready':
      return 'Pronto';
    case 'out_for_delivery':
      return 'Em entrega';
    case 'delivered':
      return 'Entregue';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status || 'Pendente';
  }
}

function getStatusClasses(status?: string | null) {
  const value = normalizeStatus(status);

  switch (value) {
    case 'pending':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'ready':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'out_for_delivery':
      return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    case 'delivered':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'cancelled':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    default:
      return 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30';
  }
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'ready' | 'out_for_delivery' | 'delivered'>('all');

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          navigate('/driver/login', { replace: true });
          return;
        }

        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (driverError) throw driverError;

        if (!driverData) {
          toast.error('Entregador não encontrado.');
          navigate('/driver/login', { replace: true });
          return;
        }

        setDriver(driverData);

        let ordersQuery = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (driverData.store_id) {
          ordersQuery = ordersQuery.eq('store_id', driverData.store_id);
        }

        if (driverData.id) {
          ordersQuery = ordersQuery.or(
            `driver_id.eq.${driverData.id},driver_user_id.eq.${user.id},status.eq.confirmed,status.eq.ready,status.eq.out_for_delivery,status.eq.em_rota,status.eq.pronto`
          );
        }

        const { data: ordersData, error: ordersError } = await ordersQuery;

        if (ordersError) throw ordersError;

        setOrders((ordersData || []) as DriverOrder[]);
      } catch (error: any) {
        console.error(error);
        toast.error(error?.message || 'Erro ao carregar painel do entregador.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('driver-dashboard-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const status = normalizeStatus(order.status);

      if (filter !== 'all' && status !== filter) {
        return false;
      }

      if (!term) return true;

      const code = String(order.code || order.id || '').toLowerCase();
      const customer = String(order.customer_name || '').toLowerCase();
      const phone = String(order.customer_phone || '').toLowerCase();
      const address = String(order.customer_address || order.address || '').toLowerCase();

      return (
        code.includes(term) ||
        customer.includes(term) ||
        phone.includes(term) ||
        address.includes(term)
      );
    });
  }, [orders, search, filter]);

  const stats = useMemo(() => {
    const ready = orders.filter((order) => normalizeStatus(order.status) === 'ready').length;
    const route = orders.filter((order) => normalizeStatus(order.status) === 'out_for_delivery').length;
    const delivered = orders.filter((order) => normalizeStatus(order.status) === 'delivered').length;
    const totalToday = orders
      .filter((order) => {
        if (!order.created_at) return false;
        const date = new Date(order.created_at);
        const now = new Date();

        return (
          date.getDate() === now.getDate() &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .length;

    return { ready, route, delivered, totalToday };
  }, [orders]);

  async function handleTakeOrder(order: DriverOrder) {
    if (!driver?.id) {
      toast.error('Entregador não identificado.');
      return;
    }

    try {
      setActionOrderId(order.id);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload: Record<string, any> = {
        driver_id: driver.id,
        status: 'out_for_delivery',
      };

      if (user?.id) {
        payload.driver_user_id = user.id;
      }

      const { error } = await supabase.from('orders').update(payload).eq('id', order.id);

      if (error) throw error;

      toast.success('Pedido assumido com sucesso.');
      await loadData(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erro ao assumir pedido.');
    } finally {
      setActionOrderId(null);
    }
  }

  async function handleMarkDelivered(order: DriverOrder) {
    try {
      setActionOrderId(order.id);

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Pedido marcado como entregue.');
      await loadData(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erro ao marcar pedido como entregue.');
    } finally {
      setActionOrderId(null);
    }
  }

  async function handleLogout() {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      navigate('/driver/login', { replace: true });
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erro ao sair.');
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b10] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-zinc-300 backdrop-blur">
            <Loader2 className="h-5 w-5 animate-spin text-red-400" />
            Carregando painel do entregador...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b10] text-white">
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
        <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-[#1a0f12] via-[#120b0d] to-[#0b0b10] p-5 shadow-2xl shadow-black/20 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-300">
              <Bike className="h-5 w-5" />
              <span className="text-sm font-medium">Painel do Entregador</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Olá, {driver?.name || 'Entregador'}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                {driver?.active === false ? 'Inativo' : 'Ativo'}
              </span>

              {driver?.store_id ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <Store className="h-4 w-4" />
                  Loja vinculada
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Atualizar
            </Button>

            <Button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              {signingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Sair
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-white backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Pedidos hoje</p>
                <h3 className="mt-2 text-3xl font-bold">{stats.totalToday}</h3>
              </div>
              <div className="rounded-2xl bg-red-500/10 p-3 text-red-300">
                <Package className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-white backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Prontos</p>
                <h3 className="mt-2 text-3xl font-bold">{stats.ready}</h3>
              </div>
              <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300">
                <Clock3 className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-white backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Em entrega</p>
                <h3 className="mt-2 text-3xl font-bold">{stats.route}</h3>
              </div>
              <div className="rounded-2xl bg-orange-500/10 p-3 text-orange-300">
                <Bike className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-white backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Entregues</p>
                <h3 className="mt-2 text-3xl font-bold">{stats.delivered}</h3>
              </div>
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-4 text-white backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, cliente, telefone ou endereço"
                className="h-11 rounded-2xl border-white/10 bg-[#111118] pl-10 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className={
                  filter === 'all'
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                }
              >
                Todos
              </Button>

              <Button
                type="button"
                variant={filter === 'ready' ? 'default' : 'outline'}
                onClick={() => setFilter('ready')}
                className={
                  filter === 'ready'
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                }
              >
                Prontos
              </Button>

              <Button
                type="button"
                variant={filter === 'out_for_delivery' ? 'default' : 'outline'}
                onClick={() => setFilter('out_for_delivery')}
                className={
                  filter === 'out_for_delivery'
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                }
              >
                Em entrega
              </Button>

              <Button
                type="button"
                variant={filter === 'delivered' ? 'default' : 'outline'}
                onClick={() => setFilter('delivered')}
                className={
                  filter === 'delivered'
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                }
              >
                Entregues
              </Button>
            </div>
          </div>
        </Card>

        {filteredOrders.length === 0 ? (
          <Card className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-10 text-center text-white backdrop-blur">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-300">
              <Package className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-bold">Nenhum pedido encontrado</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Tente mudar o filtro ou aguarde novos pedidos.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => {
              const status = normalizeStatus(order.status);
              const isTaking = actionOrderId === order.id;
              const address = order.customer_address || order.address || 'Endereço não informado';
              const phone = order.customer_phone || '';
              const canTake = status === 'ready';
              const canDeliver = status === 'out_for_delivery';

              return (
                <Card
                  key={order.id}
                  className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#15151b] to-[#101014] p-5 text-white shadow-xl shadow-black/10"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold">
                          Pedido #{order.code || order.id.slice(0, 8)}
                        </h3>

                        <Badge className={`border ${getStatusClasses(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="mb-2 flex items-center gap-2 text-zinc-400">
                            <User className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wide">Cliente</span>
                          </div>
                          <p className="text-sm font-medium text-white">
                            {order.customer_name || 'Não informado'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="mb-2 flex items-center gap-2 text-zinc-400">
                            <Phone className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wide">Telefone</span>
                          </div>
                          <p className="text-sm font-medium text-white">
                            {phone || 'Não informado'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="mb-2 flex items-center gap-2 text-zinc-400">
                            <MapPin className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wide">Endereço</span>
                          </div>
                          <p className="text-sm font-medium text-white">{address}</p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="mb-2 flex items-center gap-2 text-zinc-400">
                            <Store className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wide">Total</span>
                          </div>
                          <p className="text-sm font-semibold text-white">
                            {formatMoney(Number(order.total || 0))}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                        <span>Criado em: {formatDate(order.created_at)}</span>
                        {order.delivered_at ? <span>Entregue em: {formatDate(order.delivered_at)}</span> : null}
                      </div>

                      {order.notes ? (
                        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/10 p-3 text-sm text-amber-100">
                          <strong className="mr-1">Observação:</strong>
                          {order.notes}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex w-full flex-col gap-2 xl:w-[220px]">
                      {phone ? (
                        <a
                          href={`https://wa.me/55${String(phone).replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
                        >
                          Chamar no WhatsApp
                        </a>
                      ) : null}

                      {canTake ? (
                        <Button
                          type="button"
                          onClick={() => handleTakeOrder(order)}
                          disabled={isTaking}
                          className="h-11 rounded-2xl bg-orange-600 text-white hover:bg-orange-500"
                        >
                          {isTaking ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Bike className="mr-2 h-4 w-4" />
                          )}
                          Assumir entrega
                        </Button>
                      ) : null}

                      {canDeliver ? (
                        <Button
                          type="button"
                          onClick={() => handleMarkDelivered(order)}
                          disabled={isTaking}
                          className="h-11 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                          {isTaking ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Marcar como entregue
                        </Button>
                      ) : null}

                      {!canTake && !canDeliver ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-zinc-400">
                          Sem ação disponível
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}