import { Package, Search, Trash2 } from 'lucide-react';
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

const statusMap: Record<OrderStatus, { label: string; className: string }> = {
  pending: {
    label: 'Recebido',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  confirmed: {
    label: 'Confirmado',
    className: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
  preparing: {
    label: 'Em preparo',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  delivering: {
    label: 'Saiu para entrega',
    className: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  completed: {
    label: 'Concluído',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-rose-100 text-rose-700 border-rose-200',
  },
};

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function AdminOrders() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const { getStoreOrders, updateOrderStatus, refreshOrders } = useOrders();
  const { getStore, getStoreByAdminEmail, isLoaded, stores } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return storeOrders;

    return storeOrders.filter((order) =>
      String(order.code || '').toLowerCase().includes(query)
    );
  }, [searchTerm, storeOrders]);

  if (authLoading || !authChecked || !isLoaded) {
    return <div className="p-6 text-white">Carregando pedidos...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!resolvedStore) {
    return <div className="p-6 text-white">Loja não encontrada.</div>;
  }

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este pedido?')) return;

    try {
      setDeletingId(id);

      const { error } = await supabase.from('orders').delete().eq('id', id);

      if (error) {
        throw error;
      }

      await refreshOrders();
      toast.success('Pedido excluído com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast.error('Não foi possível excluir o pedido.');
    } finally {
      setDeletingId(null);
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
          label: 'Recebidos',
          value: storeOrders.filter((o) => o.status === 'pending').length,
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
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Filtro rápido</p>
              <h2 className="text-2xl font-bold text-slate-900">
                Busque por código do pedido
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Encontre pedidos com mais rapidez no dia a dia.
              </p>
            </div>

            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Ex.: #1024"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 rounded-full border-slate-200 pl-10"
              />
            </div>
          </div>
        </Card>

        {filteredOrders.length === 0 ? (
          <AdminEmptyState
            icon={Package}
            title="Nenhum pedido encontrado"
            description={
              searchTerm
                ? 'Tente outro código ou limpe a busca.'
                : 'Quando os pedidos entrarem, eles aparecerão aqui para você gerenciar.'
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusInfo = statusMap[order.status] || statusMap.pending;

              return (
                <Card
                  key={order.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-slate-900">{order.code}</h3>
                        <Badge className={`border ${statusInfo.className}`}>
                          {statusInfo.label}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {new Date(order.createdAt).toLocaleString('pt-BR')}
                      </p>

                      <div className="mt-2 text-sm text-slate-600">
                        <div>
                          <span className="font-medium">Cliente:</span>{' '}
                          {order.customerName || 'Cliente'}
                        </div>
                        <div>
                          <span className="font-medium">Telefone:</span>{' '}
                          {order.customerPhone || 'Não informado'}
                        </div>
                        {order.paymentMethod ? (
                          <div>
                            <span className="font-medium">Pagamento:</span>{' '}
                            {order.paymentMethod}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          handleStatusChange(order.id, value as OrderStatus)
                        }
                      >
                        <SelectTrigger className="h-11 w-full min-w-[210px] rounded-full border-slate-200 bg-slate-50 xl:w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                        className="h-11 w-11 rounded-full"
                        onClick={() => handleDeleteOrder(order.id)}
                        disabled={deletingId === order.id}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_240px]">
                    <div className="space-y-3 rounded-3xl bg-slate-50 p-4">
                      {(order.items || []).length === 0 ? (
                        <div className="text-sm text-slate-500">
                          Nenhum item encontrado neste pedido.
                        </div>
                      ) : (
                        order.items.map((item, index) => (
                          <div
                            key={`${order.id}-${index}`}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="text-slate-700">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {formatMoney(Number(item.price || 0) * Number(item.quantity || 0))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        Resumo
                      </p>

                      <p className="mt-3 text-3xl font-bold text-slate-900">
                        {formatMoney(Number(order.total || 0))}
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        {(order.items || []).reduce(
                          (sum, item) => sum + Number(item.quantity || 0),
                          0
                        )}{' '}
                        itens no pedido
                      </p>

                      <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Subtotal</span>
                          <span>{formatMoney(Number(order.subtotal || 0))}</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span>Desconto</span>
                          <span>- {formatMoney(Number(order.discount || 0))}</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
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