import {
  Package,
  Search,
  Trash2,
  ShoppingBag,
  CheckSquare,
  Printer,
  Bike,
  UserRound,
} from 'lucide-react';
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

const deliveryStatusMap: Record<
  string,
  { label: string; badgeClass: string }
> = {
  unassigned: {
    label: 'Sem entregador',
    badgeClass: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300',
  },
  assigned: {
    label: 'Atribuído',
    badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  },
  accepted: {
    label: 'Aceito',
    badgeClass: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  },
  picked_up: {
    label: 'Retirado',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
  out_for_delivery: {
    label: 'Em rota',
    badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  },
  delivered: {
    label: 'Entregue',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
  failed: {
    label: 'Falhou',
    badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  },
  returned: {
    label: 'Retornou',
    badgeClass: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  },
  cancelled: {
    label: 'Cancelado',
    badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  },
};

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
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

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getOrderType(order: any): 'delivery' | 'pickup' {
  if (order?.deliveryMethod === 'pickup') return 'pickup';
  if (order?.deliveryMethod === 'delivery') return 'delivery';
  return order?.customerAddress ? 'delivery' : 'pickup';
}

type OrderViewMode = 'all' | 'today';

export function AdminOrders() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const {
    getStoreOrders,
    updateOrderStatus,
    refreshOrders,
    assignDriverToOrder,
    unassignDriverFromOrder,
  } = useOrders();
  const {
    getStore,
    getStoreByAdminEmail,
    getStoreDeliveryDrivers,
    isLoaded,
    stores,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<OrderViewMode>('all');
  const [assigningOrderIds, setAssigningOrderIds] = useState<string[]>([]);

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

  const storeDrivers = useMemo(
    () => (resolvedStore ? getStoreDeliveryDrivers(resolvedStore.id) : []),
    [getStoreDeliveryDrivers, resolvedStore]
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
      [
        String(order.code || ''),
        String(order.customerName || ''),
        String(order.customerPhone || ''),
        String(order.deliveryDriverName || ''),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [searchTerm, visibleOrders]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filteredOrders.some((order) => order.id === id)));
  }, [filteredOrders]);

  const handlePrintOrder = (order: any) => {
    try {
      const printWindow = window.open('', '_blank', 'width=420,height=800');

      if (!printWindow) {
        toast.error('Não foi possível abrir a janela de impressão.');
        return;
      }

      const orderStatus = (order.status as OrderStatus) || 'pending';
      const printStatus = statusMap[orderStatus] || statusMap.pending;

      const itemLines = (order.items || [])
        .map((item: any) => {
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.price || 0);
          const totalPrice = unitPrice * quantity;

          const extras =
            Array.isArray(item.extras) && item.extras.length > 0
              ? `
                <div class="extras">
                  ${item.extras
                    .map(
                      (extra: any) => `
                        <div class="extra-line">
                          <span>+ ${escapeHtml(extra.name || 'Adicional')}</span>
                          <span>${formatMoney(Number(extra.price || 0) * quantity)}</span>
                        </div>
                      `
                    )
                    .join('')}
                </div>
              `
              : '';

          const notes =
            item.notes || item.observation || item.observacao
              ? `<div class="item-note">Obs.: ${escapeHtml(
                  item.notes || item.observation || item.observacao
                )}</div>`
              : '';

          return `
            <div class="item">
              <div class="item-top">
                <span>${quantity}x ${escapeHtml(item.name || 'Item')}</span>
                <span>${formatMoney(totalPrice)}</span>
              </div>
              ${extras}
              ${notes}
            </div>
          `;
        })
        .join('');

      const orderNote =
        order.notes || order.observation || order.observacao || order.customerObservation;

      const deliveryType =
        order.deliveryType ||
        order.type ||
        (order.customerAddress ? 'Entrega' : 'Retirada');

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
            <title>Imprimir pedido ${escapeHtml(order.code || '')}</title>
            <style>
              * { box-sizing: border-box; }
              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
                color: #000000;
                font-family: Arial, Helvetica, sans-serif;
              }
              body {
                padding: 16px;
                width: 80mm;
                max-width: 80mm;
                margin: 0 auto;
              }
              .center { text-align: center; }
              .store-name {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 4px;
              }
              .muted { font-size: 12px; color: #333333; }
              .divider {
                border-top: 1px dashed #000;
                margin: 12px 0;
              }
              .section-title {
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                margin-bottom: 6px;
              }
              .line {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 8px;
                font-size: 13px;
                margin-bottom: 4px;
              }
              .line span:last-child {
                text-align: right;
                white-space: nowrap;
              }
              .item {
                padding: 8px 0;
                border-bottom: 1px dashed #d4d4d4;
              }
              .item:last-child { border-bottom: none; }
              .item-top,
              .extra-line {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 8px;
                font-size: 13px;
              }
              .item-top { font-weight: 700; }
              .extras {
                margin-top: 4px;
                padding-left: 8px;
              }
              .extra-line {
                font-size: 12px;
                margin-top: 2px;
              }
              .item-note,
              .note-box {
                margin-top: 6px;
                font-size: 12px;
                white-space: pre-wrap;
                word-break: break-word;
              }
              .total-box { margin-top: 10px; }
              .total {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 18px;
                font-weight: 700;
                margin-top: 6px;
              }
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 4mm;
                }
                body {
                  width: auto;
                  max-width: none;
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="center">
              <div class="store-name">${escapeHtml(resolvedStore?.name || 'Simples Delivery')}</div>
              <div class="muted">Comprovante interno do pedido</div>
            </div>

            <div class="divider"></div>

            <div class="line">
              <span><strong>Pedido:</strong></span>
              <span><strong>${escapeHtml(order.code || '-')}</strong></span>
            </div>
            <div class="line">
              <span><strong>Data:</strong></span>
              <span>${escapeHtml(new Date(order.createdAt).toLocaleString('pt-BR'))}</span>
            </div>
            <div class="line">
              <span><strong>Status:</strong></span>
              <span>${escapeHtml(printStatus.label)}</span>
            </div>
            <div class="line">
              <span><strong>Tipo:</strong></span>
              <span>${escapeHtml(deliveryType)}</span>
            </div>

            <div class="divider"></div>

            <div class="section-title">Cliente</div>
            <div class="line">
              <span>Nome:</span>
              <span>${escapeHtml(order.customerName || 'Cliente')}</span>
            </div>
            <div class="line">
              <span>Telefone:</span>
              <span>${escapeHtml(order.customerPhone || 'Não informado')}</span>
            </div>
            ${
              order.customerAddress
                ? `
                  <div class="line">
                    <span>Endereço:</span>
                    <span>${escapeHtml(order.customerAddress)}</span>
                  </div>
                `
                : ''
            }

            <div class="divider"></div>

            <div class="section-title">Itens</div>
            ${itemLines || '<div class="muted">Nenhum item encontrado.</div>'}

            ${
              orderNote
                ? `
                  <div class="divider"></div>
                  <div class="section-title">Observações</div>
                  <div class="note-box">${escapeHtml(orderNote)}</div>
                `
                : ''
            }

            <div class="divider"></div>

            <div class="section-title">Pagamento e resumo</div>
            <div class="line">
              <span>Pagamento:</span>
              <span>${escapeHtml(order.paymentMethod || 'Não informado')}</span>
            </div>
            <div class="line">
              <span>Subtotal:</span>
              <span>${formatMoney(Number(order.subtotal || 0))}</span>
            </div>
            <div class="line">
              <span>Desconto:</span>
              <span>- ${formatMoney(Number(order.discount || 0))}</span>
            </div>
            <div class="line">
              <span>Entrega:</span>
              <span>${formatMoney(Number(order.deliveryFee || 0))}</span>
            </div>

            <div class="total-box">
              <div class="total">
                <span>Total</span>
                <span>${formatMoney(Number(order.total || 0))}</span>
              </div>
            </div>

            <div class="divider"></div>

            <div class="center muted">
              Impresso em ${escapeHtml(new Date().toLocaleString('pt-BR'))}
            </div>

            <script>
              window.onload = function () {
                setTimeout(function () {
                  window.print();
                }, 250);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Erro ao imprimir pedido:', error);
      toast.error('Não foi possível imprimir o pedido.');
    }
  };

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
  const totalDeliveryOrders = storeOrders.filter((order) => getOrderType(order) === 'delivery').length;
  const totalAssignedOrders = storeOrders.filter((order) => !!order.deliveryDriverId).length;

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

  const handleDriverChange = async (order: any, nextDriverId: string) => {
    try {
      setAssigningOrderIds((prev) => [...prev, order.id]);

      if (nextDriverId === 'unassigned') {
        await unassignDriverFromOrder(order.id);
        toast.success('Entregador removido do pedido.');
        return;
      }

      const driver = storeDrivers.find((item) => item.id === nextDriverId);

      if (!driver) {
        toast.error('Entregador não encontrado.');
        return;
      }

      await assignDriverToOrder({
        orderId: order.id,
        deliveryDriverId: driver.id,
        deliveryDriverName: driver.name,
      });

      toast.success(`Pedido vinculado a ${driver.name}.`);
    } catch (error) {
      console.error('Erro ao vincular entregador:', error);
      toast.error('Não foi possível vincular o entregador.');
    } finally {
      setAssigningOrderIds((prev) => prev.filter((id) => id !== order.id));
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
          label: 'Em entrega',
          value: totalDeliveryOrders,
          helper: 'Pedidos com entrega',
        },
        {
          label: 'Com entregador',
          value: totalAssignedOrders,
          helper: 'Pedidos atribuídos',
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
                <h3 className="text-xl font-bold text-white">Busque pedido ou entregador</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Procure por código, cliente, telefone ou nome do entregador.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 md:flex-row xl:max-w-3xl xl:justify-end">
                <div className="relative w-full md:max-w-md">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="text"
                    placeholder="Ex.: #1024 ou João"
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

            <div className="rounded-2xl border border-white/8 bg-[#111111] p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border border-white/10 bg-white/5 text-white">
                  <Bike className="mr-2 h-3.5 w-3.5" />
                  {storeDrivers.length} entregador(es)
                </Badge>
                <Badge className="border border-zinc-500/30 bg-zinc-500/10 text-zinc-300">
                  {storeOrders.filter((o) => getOrderType(o) === 'delivery' && !o.deliveryDriverId).length} sem entregador
                </Badge>
                <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  {storeOrders.filter((o) => o.deliveryStatus === 'delivered').length} entregues
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {filteredOrders.length === 0 ? (
          <AdminEmptyState
            icon={Package}
            title="Nenhum pedido encontrado"
            description={
              searchTerm
                ? 'Tente outro termo ou limpe a busca.'
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
              const isDelivery = getOrderType(order) === 'delivery';
              const deliveryInfo = deliveryStatusMap[order.deliveryStatus || 'unassigned'] || deliveryStatusMap.unassigned;
              const isAssigning = assigningOrderIds.includes(order.id);

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

                          <Badge
                            className={`border ${
                              isDelivery
                                ? 'border-[#EA1D2C]/30 bg-[#EA1D2C]/10 text-red-300'
                                : 'border-white/10 bg-white/5 text-zinc-300'
                            }`}
                          >
                            {isDelivery ? 'Entrega' : 'Retirada'}
                          </Badge>

                          {isDelivery ? (
                            <Badge className={`border ${deliveryInfo.badgeClass}`}>
                              {deliveryInfo.label}
                            </Badge>
                          ) : null}
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
                          {isDelivery ? (
                            <div>
                              <span className="font-medium text-zinc-300">Entregador:</span>{' '}
                              {order.deliveryDriverName || 'Não atribuído'}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handlePrintOrder(order)}
                        className="h-11 rounded-full border-white/10 bg-[#111111] px-4 text-white hover:bg-[#181818]"
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                      </Button>

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

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_260px]">
                    <div className="space-y-4">
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

                      {isDelivery ? (
                        <div className="rounded-3xl border border-[#EA1D2C]/15 bg-[#111111] p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-[#EA1D2C]" />
                            <p className="text-sm font-semibold text-white">Gestão do entregador</p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="mb-2 text-xs uppercase tracking-[0.20em] text-zinc-500">
                                Vincular entregador
                              </p>

                              <Select
                                value={order.deliveryDriverId || 'unassigned'}
                                onValueChange={(value) => handleDriverChange(order, value)}
                                disabled={isAssigning}
                              >
                                <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-[#0d0d0d] text-white">
                                  <SelectValue placeholder="Selecione um entregador" />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#111111] text-white">
                                  <SelectItem value="unassigned">Sem entregador</SelectItem>
                                  {storeDrivers.map((driver) => (
                                    <SelectItem key={driver.id} value={driver.id}>
                                      {driver.name} {driver.active ? '' : '(inativo)'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="rounded-2xl border border-white/8 bg-[#0d0d0d] p-3 text-sm">
                              <div className="text-zinc-400">Status da entrega</div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge className={`border ${deliveryInfo.badgeClass}`}>
                                  {deliveryInfo.label}
                                </Badge>
                                {order.deliveryDriverName ? (
                                  <Badge className="border border-white/10 bg-white/5 text-zinc-200">
                                    <Bike className="mr-2 h-3.5 w-3.5" />
                                    {order.deliveryDriverName}
                                  </Badge>
                                ) : null}
                              </div>

                              {order.deliveryAssignedAt ? (
                                <div className="mt-3 text-xs text-zinc-500">
                                  Atribuído em{' '}
                                  {new Date(order.deliveryAssignedAt).toLocaleString('pt-BR')}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}
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