import { Package, Search, Trash2, ShoppingBag, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders, OrderStatus } from '../../contexts/OrderContext';
import { useStore } from '../../contexts/StoreContext';
import { useOrderNotifications } from '../../hooks/useOrderNotifications';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';
import { toast } from 'sonner';

const statusMap: Record<OrderStatus, { label: string; badgeClass: string; selectClass: string }> = {
  pending: {
    label: 'Recebido',
    badgeClass: 'border-blue-500/30 bg-blue-500/15 text-blue-300',
    selectClass: 'border-blue-500/25 bg-blue-500/10 text-blue-300',
  },
  confirmed: {
    label: 'Confirmado',
    badgeClass: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300',
    selectClass: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  },
  preparing: {
    label: 'Em preparo',
    badgeClass: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
    selectClass: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  },
  delivering: {
    label: 'Saiu para entrega',
    badgeClass: 'border-violet-500/30 bg-violet-500/15 text-violet-300',
    selectClass: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
  },
  completed: {
    label: 'Concluído',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
    selectClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  },
  cancelled: {
    label: 'Cancelado',
    badgeClass: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
    selectClass: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  },
};

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function isToday(dateValue: string) {
  const date = new Date(dateValue);
  const now = new Date();

  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

type OrderViewMode = 'all' | 'today';

export function AdminOrders() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const { getStoreOrders, updateOrderStatus, refreshOrders } = useOrders();
  const { getStore, getStoreByAdminEmail, isLoaded, stores } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<OrderViewMode>('all');

  useEffect(() => {
    if (authLoading) return;

    setAuthChecked(true);

    if (!user || user.role !== 'admin') {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const resolvedStore = useMemo(() => {
    if (!user || user.role !== 'admin') return undefined;

    const directStore = user.storeId ? getStore(user.storeId) : undefined;
    if (directStore) return directStore;

    const byEmail = user.email ? getStoreByAdminEmail(user.email) : undefined;
    if (byEmail) return byEmail;

    if (isLoaded && stores.length === 1) return stores[0];

    return undefined;
  }, [user, getStore, getStoreByAdminEmail, isLoaded, stores]);

  useOrderNotifications(resolvedStore?.id);

  const storeOrders = useMemo(
    () => (resolvedStore ? getStoreOrders(resolvedStore.id) : []),
    [getStoreOrders, resolvedStore]
  );

  const visibleOrders = useMemo(() => {
    if (viewMode === 'today') {
      return storeOrders.filter((order) => isToday(order.createdAt));
    }

    return storeOrders;
  }, [storeOrders, viewMode]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return visibleOrders;

    return visibleOrders.filter((order) =>
      String(order.code || '').toLowerCase().includes(query)
    );
  }, [searchTerm, visibleOrders]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filteredOrders.some((order) => order.id === id)));
  }, [filteredOrders]);

  if (authLoading || !authChecked || !isLoaded) {
    return <div className="p-6 text-white">Carregando pedidos...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!resolvedStore) {
    return <div className="p-6 text-white">Loja não encontrada.</div>;
  }

  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((order) => selectedIds.includes(order.id));

  const totalTodayOrders = storeOrders.filter((order) => isToday(order.createdAt)).length;

  const toggleSelectOrder = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !filteredOrders.some((order) => order.id === id))
      );
      return;
    }

    setSelectedIds((prev) => {
      const merged = new Set([...prev, ...filteredOrders.map((order) => order.id)]);
      return Array.from(merged);
    });
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este pedido?')) return;

    try {
      setDeletingIds([id]);

      const { error } = await supabase.from('orders').delete().eq('id', id);

      if (error) {
        throw error;
      }

      setSelectedIds((prev) => prev.filter((item) => item !== id));
      await refreshOrders();
      toast.success('Pedido excluído com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast.error('Não foi possível excluir o pedido.');
    } finally {
      setDeletingIds([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) {
      toast.error('Selecione ao menos um pedido.');
      return;
    }

    if (!window.confirm(`Deseja realmente excluir ${selectedIds.length} pedido(s)?`)) return;

    try {
      setDeletingIds(selectedIds);

      const { error } = await supabase.from('orders').delete().in('id', selectedIds);

      if (error) {
        throw error;
      }

      const removedCount = selectedIds.length;
      setSelectedIds([]);
      await refreshOrders();
      toast.success(`${removedCount} pedido(s) excluído(s) com sucesso.`);
    } catch (error) {
      console.error('Erro ao excluir pedidos:', error);
      toast.error('Não foi possível excluir os pedidos selecionados.');
    } finally {
      setDeletingIds([]);
    }
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success('Status do pedido atualizado.');
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      toast.error('Não foi possível atualizar o pedido.');
    }
  };

  return (
    <AdminShell
      title="Pedidos"
      subtitle="Acompanhe e atualize os pedidos da sua loja"
      storeName={resolvedStore.name}
      stats={[
        { label: 'Total', value: storeOrders.length, helper: 'Pedidos cadastrados' },
        {
          label: 'Pedidos recentes',
          value: totalTodayOrders,
          helper: 'Pedidos do dia',
        },
        {
          label: 'Em preparo',
          value: storeOrders.filter((o) => o.status === 'preparing').length,
        },
        {
          label: 'Concluídos',
          value: storeOrders.filter((o) => o.status === 'completed').length,
        },
        {
          label: 'Cancelados',
          value: storeOrders.filter((o) => o.status === 'cancelled').length,
        },
      ]}
    >
      <div className="space-y-6">
        <Card className="rounded-3xl border border-red-950/40 bg-[#0a0a0a] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.30)]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-zinc-400">Categoria de pedidos</p>
                <h2 className="text-2xl font-bold text-white">Gerencie seus pedidos</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Veja todos os pedidos ou apenas os pedidos recentes do dia.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    viewMode === 'all'
                      ? 'border-[#EA1D2C] bg-[#EA1D2C] text-white'
                      : 'border-white/10 bg-[#111111] text-zinc-200 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    <span className="font-semibold">Todos os pedidos</span>
                  </div>
                  <div className="mt-1 text-sm opacity-90">{storeOrders.length} pedidos</div>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('today')}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    viewMode === 'today'
                      ? 'border-[#EA1D2C] bg-[#EA1D2C] text-white'
                      : 'border-white/10 bg-[#111111] text-zinc-200 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-semibold">Pedidos recentes</span>
                  </div>
                  <div className="mt-1 text-sm opacity-90">{totalTodayOrders} pedidos do dia</div>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm text-zinc-400">Filtro rápido</p>
                <h3 className="text-xl font-bold text-white">Busque por código do pedido</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Encontre pedidos com mais rapidez no dia a dia.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 md:flex-row xl:max-w-3xl xl:justify-end">
                <div className="relative w-full md:max-w-md">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="text"
                    placeholder="Ex.: #1024"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 rounded-full border-white/10 bg-[#111111] pl-10 text-white placeholder:text-zinc-500"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleSelectAllFiltered}
                  disabled={!filteredOrders.length}
                  className="h-12 rounded-full border-white/10 bg-[#111111] text-white hover:bg-[#181818]"
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>

                <Button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={!selectedIds.length || deletingIds.length > 0}
                  className="h-12 rounded-full bg-[#EA1D2C] text-white hover:bg-[#d01929]"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir selecionados
                </Button>
              </div>
            </div>

            {selectedIds.length > 0 ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {selectedIds.length} pedido(s) selecionado(s).
              </div>
            ) : null}
          </div>
        </Card>

        {filteredOrders.length === 0 ? (
          <AdminEmptyState
            icon={Package}
            title="Nenhum pedido encontrado"
            description={
              searchTerm
                ? 'Tente outro código ou limpe a busca.'
                : viewMode === 'today'
                ? 'Ainda não existem pedidos de hoje.'
                : 'Quando os pedidos entrarem, eles aparecerão aqui para você gerenciar.'
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusInfo = statusMap[order.status] || statusMap.pending;
              const isSelected = selectedIds.includes(order.id);
              const isDeleting = deletingIds.includes(order.id);

              return (
                <Card
                  key={order.id}
                  className={`rounded-3xl border bg-[#0a0a0a] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition ${
                    isSelected
                      ? 'border-[#EA1D2C] ring-2 ring-[#EA1D2C]/15'
                      : 'border-red-950/40'
                  }`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="mt-1 h-5 w-5 rounded border-white/20 bg-[#111111] accent-[#EA1D2C]"
                      />

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-bold text-white">{order.code}</h3>
                          <Badge className={`border ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <p className="mt-2 text-sm text-zinc-500">
                          {new Date(order.createdAt).toLocaleString('pt-BR')}
                        </p>

                        <div className="mt-2 text-sm text-zinc-400">
                          <div>
                            <span className="font-medium text-zinc-300">Cliente:</span>{' '}
                            {order.customerName || 'Cliente'}
                          </div>
                          <div>
                            <span className="font-medium text-zinc-300">Telefone:</span>{' '}
                            {order.customerPhone || 'Não informado'}
                          </div>
                          {order.customerAddress ? (
                            <div>
                              <span className="font-medium text-zinc-300">Endereço:</span>{' '}
                              {order.customerAddress}
                            </div>
                          ) : null}
                          {order.paymentMethod ? (
                            <div>
                              <span className="font-medium text-zinc-300">Pagamento:</span>{' '}
                              {order.paymentMethod}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          handleStatusChange(order.id, value as OrderStatus)
                        }
                      >
                        <SelectTrigger
                          className={`h-11 w-full min-w-[220px] rounded-full border xl:w-[240px] ${statusInfo.selectClass}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#111111] text-white">
                          <SelectItem value="pending">Recebido</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="preparing">Em preparo</SelectItem>
                          <SelectItem value="delivering">Saiu para entrega</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-full border-white/10 bg-[#111111] hover:bg-[#181818]"
                        onClick={() => handleDeleteOrder(order.id)}
                        disabled={isDeleting || deletingIds.length > 0}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_240px]">
                    <div className="space-y-3 rounded-3xl border border-white/8 bg-[#111111] p-4">
                      {(order.items || []).length === 0 ? (
                        <div className="text-sm text-zinc-500">
                          Nenhum item encontrado neste pedido.
                        </div>
                      ) : (
                        order.items.map((item, index) => (
                          <div
                            key={`${order.id}-${index}`}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="text-zinc-300">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-semibold text-white">
                              {formatMoney(Number(item.price || 0) * Number(item.quantity || 0))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="rounded-3xl border border-white/8 bg-[#111111] p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                        Resumo
                      </p>

                      <p className="mt-3 text-3xl font-bold text-white">
                        {formatMoney(Number(order.total || 0))}
                      </p>

                      <p className="mt-2 text-sm text-zinc-500">
                        {(order.items || []).reduce(
                          (sum, item) => sum + Number(item.quantity || 0),
                          0
                        )}{' '}
                        itens no pedido
                      </p>

                      <div className="mt-4 space-y-2 border-t border-white/8 pt-4 text-sm">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Subtotal</span>
                          <span>{formatMoney(Number(order.subtotal || 0))}</span>
                        </div>

                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Desconto</span>
                          <span>- {formatMoney(Number(order.discount || 0))}</span>
                        </div>

                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Entrega</span>
                          <span>{formatMoney(Number(order.deliveryFee || 0))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}