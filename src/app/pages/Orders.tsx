import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useOrders } from '../contexts/OrderContext';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Recebido',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  delivering: 'Saiu para entrega',
  completed: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-blue-500',
  confirmed: 'bg-emerald-500',
  preparing: 'bg-[#EA1D2C]',
  delivering: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-zinc-500',
};

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function normalizeString(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export function Orders() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { orders, isLoaded } = useOrders();
  const { stores, getStore } = useStore();
  const { replaceCartFromOrder } = useCart();

  const storeIdFromQuery = searchParams.get('store');
  const slugFromQuery = searchParams.get('slug');

  const store = useMemo(() => {
    if (storeIdFromQuery) {
      const byId =
        getStore(storeIdFromQuery) ||
        stores.find((s: any) => String(s.id) === String(storeIdFromQuery));

      if (byId) return byId;
    }

    if (slugFromQuery) {
      const bySlug = stores.find(
        (s: any) => normalizeString(s.slug) === normalizeString(slugFromQuery)
      );

      if (bySlug) return bySlug;
    }

    const firstOrderStoreId = orders[0]?.storeId;
    if (firstOrderStoreId) {
      const byOrderStore =
        getStore(firstOrderStoreId) ||
        stores.find((s: any) => String(s.id) === String(firstOrderStoreId));

      if (byOrderStore) return byOrderStore;
    }

    return stores.find((s: any) => s.active && !s.suspended) || stores[0];
  }, [storeIdFromQuery, slugFromQuery, stores, orders, getStore]);

  const visibleOrders = useMemo(() => {
    let filtered = orders;

    if (store?.id) {
      filtered = filtered.filter((o: any) => String(o.storeId) === String(store.id));
    }

    return [...filtered].sort((a: any, b: any) => {
      const aTime = new Date(a?.createdAt || 0).getTime();
      const bTime = new Date(b?.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [orders, store]);

  const handleReorder = (orderId: string) => {
    const order = visibleOrders.find((o: any) => String(o.id) === String(orderId));

    if (!order) {
      toast.error('Pedido não encontrado.');
      return;
    }

    if (!Array.isArray(order.items) || order.items.length === 0) {
      toast.error('Esse pedido não possui itens.');
      return;
    }

    try {
      const cartItems = order.items
        .filter((item: any) => item && (item.product || item.productId || item.id))
        .map((item: any) => {
          const productId = String(item?.product?.id || item?.productId || item?.id || '');
          const storeId = String(
            item?.product?.storeId || item?.storeId || order?.storeId || ''
          );

          return {
            product: {
              id: productId,
              storeId,
              name: String(item?.product?.name || item?.name || 'Produto'),
              price: Number(item?.product?.price || item?.price || 0),
              image: String(item?.product?.image || item?.image || ''),
              categoryId: item?.product?.categoryId
                ? String(item.product.categoryId)
                : item?.categoryId
                ? String(item.categoryId)
                : undefined,
              available:
                typeof item?.product?.available === 'boolean'
                  ? item.product.available
                  : true,
            },
            quantity: Math.max(1, Number(item?.quantity || 1)),
          };
        })
        .filter((item: any) => item.product?.id && item.product?.storeId);

      if (cartItems.length === 0) {
        toast.error('Não foi possível montar o carrinho desse pedido.');
        return;
      }

      replaceCartFromOrder(cartItems);

      const cartUrl = store?.slug
        ? `/cart?slug=${encodeURIComponent(store.slug)}`
        : order?.storeId
        ? `/cart?store=${encodeURIComponent(order.storeId)}`
        : store?.id
        ? `/cart?store=${encodeURIComponent(store.id)}`
        : '/cart';

      toast.success('Pedido adicionado ao carrinho!');
      navigate(cartUrl);
    } catch (error) {
      console.error('Erro ao repetir pedido:', error);
      toast.error('Não foi possível repetir o pedido.');
    }
  };

  const backUrl = store
    ? store.slug
      ? `/loja/${encodeURIComponent(store.slug)}`
      : `/loja?store=${encodeURIComponent(store.id)}`
    : '/loja';

  const handleBack = () => {
    navigate(backUrl);
  };

  if (!isLoaded && visibleOrders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-[#EA1D2C] shadow-sm">
          <div className="mx-auto flex max-w-screen-lg items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <h1 className="text-lg font-semibold text-white">Meus Pedidos</h1>
          </div>
        </div>

        <div className="mx-auto max-w-screen-lg px-4 py-6">
          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <p className="text-gray-500">Carregando pedidos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-[#EA1D2C] shadow-sm">
        <div className="mx-auto flex max-w-screen-lg items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-lg font-semibold text-white">Meus Pedidos</h1>
        </div>
      </div>

      <div className="mx-auto max-w-screen-lg px-4 py-6">
        {visibleOrders.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-gray-500">Você ainda não fez pedidos</p>

            <Button
              onClick={handleBack}
              className="bg-[#EA1D2C] hover:bg-[#D01929]"
            >
              Ver Cardápio
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleOrders.map((order: any) => (
              <div
                key={order.id}
                className="rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">{order.code}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <Badge className={`${STATUS_COLORS[order.status] || 'bg-zinc-500'} text-white`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </Badge>
                </div>

                <div className="mb-3 space-y-2">
                  {order.items?.map((item: any, index: number) => (
                    <div
                      key={`${order.id}-${item.id || item.productId || index}-${index}`}
                      className="text-sm"
                    >
                      <span className="font-medium">
                        {Number(item.quantity || 0)}x {String(item.name || 'Produto')}
                      </span>
                      <span className="ml-2 text-gray-500">
                        {formatMoney(Number(item.price || 0) * Number(item.quantity || 0))}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mb-3 space-y-1 border-t pt-3 text-sm">
                  {Number(order.subtotal || 0) > 0 && (
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatMoney(Number(order.subtotal || 0))}</span>
                    </div>
                  )}

                  {Number(order.discount || 0) > 0 && (
                    <div className="flex items-center justify-between text-green-600">
                      <span>Desconto</span>
                      <span>- {formatMoney(Number(order.discount || 0))}</span>
                    </div>
                  )}

                  {Number(order.deliveryFee || 0) > 0 && (
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Entrega</span>
                      <span>{formatMoney(Number(order.deliveryFee || 0))}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-lg font-bold text-[#EA1D2C]">
                    Total: {formatMoney(Number(order.total || 0))}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReorder(order.id)}
                    className="hover:bg-[#EA1D2C] hover:text-white"
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Repetir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}