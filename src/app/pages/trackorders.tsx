import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useOrders } from '../contexts/OrderContext';

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Aguardando confirmação';
    case 'confirmed':
      return 'Confirmado';
    case 'preparing':
      return 'Em preparo';
    case 'delivering':
      return 'Saiu para entrega';
    case 'completed':
      return 'Concluído';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Em andamento';
  }
}

function getStatusDescription(status: string) {
  switch (status) {
    case 'pending':
      return 'Seu pedido foi recebido e está aguardando confirmação da loja.';
    case 'confirmed':
      return 'A loja confirmou seu pedido e já vai iniciar o preparo.';
    case 'preparing':
      return 'Seu pedido está sendo preparado.';
    case 'delivering':
      return 'Seu pedido saiu para entrega.';
    case 'completed':
      return 'Pedido finalizado com sucesso.';
    case 'cancelled':
      return 'Esse pedido foi cancelado.';
    default:
      return 'Estamos processando seu pedido.';
  }
}

export function TrackOrder() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { orders, getOrderById, getOrderByCode, isLoaded } = useOrders();

  const orderId =
    params.id ||
    searchParams.get('id') ||
    (typeof window !== 'undefined' ? localStorage.getItem('last_order_id') : '') ||
    '';

  const orderCode =
    searchParams.get('code') ||
    (typeof window !== 'undefined' ? localStorage.getItem('last_order_code') : '') ||
    '';

  const order = useMemo(() => {
    if (!isLoaded) return undefined;

    if (orderId) {
      const foundById = getOrderById(orderId);
      if (foundById) return foundById;
    }

    if (orderCode) {
      const foundByCode = getOrderByCode(orderCode);
      if (foundByCode) return foundByCode;
    }

    return undefined;
  }, [isLoaded, orderId, orderCode, getOrderById, getOrderByCode, orders]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#050505] p-6 text-white">
        <div className="mx-auto max-w-3xl">
          <Card className="rounded-[28px] border border-red-950/40 bg-[#0b0b0b] p-6">
            <p className="text-sm text-zinc-400">Carregando pedido...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#050505] p-6 text-white">
        <div className="mx-auto max-w-2xl">
          <Card className="rounded-[28px] border border-red-950/40 bg-[#0b0b0b] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-red-400">
              Acompanhar pedido
            </p>

            <h1 className="mt-2 text-2xl font-black text-white">
              Pedido não encontrado
            </h1>

            <p className="mt-3 text-zinc-400">
              Não foi possível localizar seu pedido para acompanhamento.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className="rounded-full bg-[#f3162d] text-white hover:bg-[#d90f24]"
                onClick={() => navigate('/')}
              >
                Voltar para a loja
              </Button>

              <Button
                variant="outline"
                className="rounded-full border-zinc-700 bg-transparent text-white hover:bg-zinc-900"
                onClick={() => window.location.reload()}
              >
                Tentar novamente
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-4 text-white md:p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="rounded-[30px] border border-red-950/40 bg-[#0b0b0b] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-red-400">
            Acompanhar pedido
          </p>

          <h1 className="mt-2 text-3xl font-black text-white">
            {order.code || 'Pedido'}
          </h1>

          <p className="mt-3 text-zinc-400">
            Status atual:{' '}
            <span className="font-semibold text-red-300">
              {getStatusLabel(order.status)}
            </span>
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            {getStatusDescription(order.status)}
          </p>

          <p className="mt-3 text-sm text-zinc-500">
            Criado em{' '}
            {order.createdAt
              ? new Date(order.createdAt).toLocaleString('pt-BR')
              : 'Data não disponível'}
          </p>
        </Card>

        <Card className="rounded-[30px] border border-red-950/40 bg-[#0b0b0b] p-6">
          <h2 className="text-xl font-black text-white">Resumo do pedido</h2>

          <div className="mt-5 space-y-3">
            {order.items?.length ? (
              order.items.map((item, index) => {
                const price = Number(item.price || 0);
                const quantity = Number(item.quantity || 0);
                const totalItem = price * quantity;

                return (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#101010] p-4"
                  >
                    <div>
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-sm text-zinc-400">
                        {quantity}x • {formatMoney(price)}
                      </div>
                    </div>

                    <div className="text-lg font-black text-red-400">
                      {formatMoney(totalItem)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-[#101010] p-4 text-zinc-400">
                Nenhum item encontrado neste pedido.
              </div>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-800 bg-[#101010] p-4">
            <div className="flex items-center justify-between text-zinc-300">
              <span>Subtotal</span>
              <span>{formatMoney(Number(order.subtotal || 0))}</span>
            </div>

            <div className="mt-2 flex items-center justify-between text-zinc-300">
              <span>Entrega</span>
              <span>{formatMoney(Number(order.deliveryFee || 0))}</span>
            </div>

            <div className="mt-2 flex items-center justify-between text-zinc-300">
              <span>Desconto</span>
              <span>- {formatMoney(Number(order.discount || 0))}</span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4 text-xl font-black text-white">
              <span>Total</span>
              <span className="text-red-400">
                {formatMoney(Number(order.total || 0))}
              </span>
            </div>
          </div>
        </Card>

        <Card className="rounded-[30px] border border-red-950/40 bg-[#0b0b0b] p-6">
          <h2 className="text-xl font-black text-white">Dados do cliente</h2>

          <div className="mt-4 space-y-2 text-zinc-300">
            <p>
              <strong className="text-white">Nome:</strong>{' '}
              {order.customerName || 'Não informado'}
            </p>

            <p>
              <strong className="text-white">Telefone:</strong>{' '}
              {order.customerPhone || 'Não informado'}
            </p>

            <p>
              <strong className="text-white">Endereço:</strong>{' '}
              {order.customerAddress || 'Não informado'}
            </p>

            <p>
              <strong className="text-white">Referência:</strong>{' '}
              {order.customerReference || 'Não informada'}
            </p>

            <p>
              <strong className="text-white">Pagamento:</strong>{' '}
              {order.paymentMethod || 'Não informado'}
            </p>

            <p>
              <strong className="text-white">Observações:</strong>{' '}
              {order.customerNotes || 'Nenhuma'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}