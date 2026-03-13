import {
  ArrowLeft,
  Trash2,
  Minus,
  Plus,
  Tag,
  MapPin,
  Phone,
  User,
  Crown,
  Sparkles,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrderContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function normalizeString(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function onlyDigits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function getHumanPlanName(plan?: string | null) {
  const normalized = String(plan || '').trim().toLowerCase();

  if (normalized === 'premium') return 'Premium';
  if (normalized === 'pro') return 'Pro';
  return 'Simples';
}

function getSuggestedPlans(plan?: string | null) {
  const normalized = String(plan || '').trim().toLowerCase();

  if (normalized === 'pro') return ['Premium'];
  if (normalized === 'premium') return [];
  return ['Pro', 'Premium'];
}

function buildWhatsAppMessage(order: any, storeName: string, couponCode?: string) {
  const itemsText = (order.items || [])
    .map(
      (item: any) =>
        `${Number(item.quantity || 0)}x ${String(item.name || 'Produto')} - ${formatMoney(
          Number(item.price || 0) * Number(item.quantity || 0)
        )}`
    )
    .join('\n');

  const lines = [
    `Olá, ${storeName}`,
    `Pedido ${order.code}`,
    ``,
    `Cliente: ${String(order.customerName || 'Não informado')}`,
    `WhatsApp: ${String(order.customerPhone || 'Não informado')}`,
    `Endereço: ${String(order.customerAddress || 'Não informado')}`,
  ];

  if (String(order.customerReference || '').trim()) {
    lines.push(`Referência: ${String(order.customerReference)}`);
  }

  if (String(order.customerNotes || '').trim()) {
    lines.push(`Observações: ${String(order.customerNotes)}`);
  }

  lines.push(
    ``,
    `Itens do pedido:`,
    itemsText || 'Sem itens',
    ``,
    `Valores:`,
    `Subtotal: ${formatMoney(Number(order.subtotal || 0))}`
  );

  if (Number(order.discount || 0) > 0 && couponCode) {
    lines.push(`${couponCode}: -${formatMoney(Number(order.discount || 0))}`);
  }

  lines.push(`Entrega: ${formatMoney(Number(order.deliveryFee || 0))}`);
  lines.push(`Total: ${formatMoney(Number(order.total || 0))}`);

  return lines.join('\n');
}

function getProfessionalCustomerLimitMessage() {
  return 'No momento, não foi possível concluir seu pedido. Tente novamente em alguns instantes ou entre em contato com a loja para mais informações.';
}

const SALES_WHATSAPP = '5582987227433';

function openUpgradeWhatsApp(params: {
  storeName?: string;
  currentPlan?: string;
  reason?: string;
}) {
  const storeName = String(params.storeName || 'Minha loja').trim();
  const currentPlan = String(params.currentPlan || 'Simples').trim();
  const reason = String(params.reason || 'Atingi o limite do meu plano.').trim();

  const message = [
    'Olá! Tudo bem?',
    '',
    'Sou administrador de uma loja na plataforma e gostaria de solicitar um upgrade de plano.',
    '',
    `Loja: ${storeName}`,
    `Plano atual: ${currentPlan}`,
    `Motivo: ${reason}`,
    '',
    'Poderia me enviar as opções disponíveis para upgrade?',
    '',
    'Obrigado!',
  ].join('\n');

  window.open(
    `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

type UpgradeModalState = {
  open: boolean;
  title: string;
  description: string;
  currentPlan: string;
  suggestedPlans: string[];
};

export function Cart() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user } = useAuth();
  const { items, removeFromCart, updateQuantity, clearCart, total } = useCart();
  const { createOrder } = useOrders();
  const { stores, getStore, getCouponByCode, isLoaded } = useStore();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>({
    open: false,
    title: '',
    description: '',
    currentPlan: '',
    suggestedPlans: [],
  });

  useEffect(() => {
    try {
      setFirstName(localStorage.getItem('checkout:firstName') || '');
      setLastName(localStorage.getItem('checkout:lastName') || '');
      setCustomerPhone(localStorage.getItem('checkout:phone') || '');
      setCustomerAddress(localStorage.getItem('checkout:address') || '');
      setCustomerReference(localStorage.getItem('checkout:reference') || '');
      setCustomerNotes(localStorage.getItem('checkout:notes') || '');
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('checkout:firstName', firstName);
      localStorage.setItem('checkout:lastName', lastName);
      localStorage.setItem('checkout:phone', customerPhone);
      localStorage.setItem('checkout:address', customerAddress);
      localStorage.setItem('checkout:reference', customerReference);
      localStorage.setItem('checkout:notes', customerNotes);
    } catch {
      //
    }
  }, [firstName, lastName, customerPhone, customerAddress, customerReference, customerNotes]);

  const storeIdFromQuery = searchParams.get('store');
  const slugFromQuery = searchParams.get('slug');

  const store = useMemo(() => {
    if (!stores?.length) return undefined;

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

    if (items.length > 0) {
      const firstItem: any = items[0];

      const possibleStoreId =
        firstItem?.storeId ||
        firstItem?.store_id ||
        firstItem?.product?.storeId ||
        firstItem?.product?.store_id ||
        firstItem?.product?.store?.id;

      if (possibleStoreId) {
        const byItemStoreId =
          getStore(String(possibleStoreId)) ||
          stores.find((s: any) => String(s.id) === String(possibleStoreId));

        if (byItemStoreId) return byItemStoreId;
      }
    }

    return stores.find((s: any) => s.active && !s.suspended) || stores[0];
  }, [storeIdFromQuery, slugFromQuery, stores, items, getStore]);

  const storeId = store?.id;

  const isStoreAdminViewingOwnStore =
    user?.role === 'admin' &&
    (String(user?.storeId || '') === String(storeId || '') ||
      String(user?.email || '').trim().toLowerCase() ===
        String((store as any)?.adminEmail || '')
          .trim()
          .toLowerCase());

  const openUpgradeModalFromError = (message: string) => {
    const planName = getHumanPlanName((store as any)?.plan);
    const suggestedPlans = getSuggestedPlans((store as any)?.plan);

    setUpgradeModal({
      open: true,
      title: 'Loja no limite do plano',
      description: message,
      currentPlan: planName,
      suggestedPlans,
    });
  };

  const handleApplyCoupon = () => {
    if (!store || !storeId) {
      toast.error('Loja não encontrada');
      return;
    }

    if (!couponCode.trim()) {
      toast.error('Digite um cupom');
      return;
    }

    const normalizedCoupon = couponCode.trim().toUpperCase();
    const coupon = getCouponByCode(storeId, normalizedCoupon);

    if (!coupon) {
      toast.error('Cupom inválido');
      return;
    }

    if (!coupon.active) {
      toast.error('Cupom expirado');
      return;
    }

    setAppliedCoupon({ code: coupon.code, discount: coupon.discount });
    toast.success(`Cupom aplicado! ${coupon.discount}% de desconto`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.info('Cupom removido');
  };

  const subtotal = Number(total || 0);
  const discount = appliedCoupon ? (subtotal * appliedCoupon.discount) / 100 : 0;
  const deliveryFee = Math.max(Number((store as any)?.deliveryFee || 0), 0);
  const finalTotal = Math.max(subtotal - discount + deliveryFee, 0);

  const handleConfirmOrder = async () => {
    if (submitting) return;

    if (!items.length) {
      toast.error('Carrinho vazio');
      return;
    }

    if (!store || !storeId) {
      toast.error('Loja não encontrada');
      return;
    }

    const trimmedFirstName = String(firstName || '').trim();
    const trimmedLastName = String(lastName || '').trim();
    const trimmedPhone = onlyDigits(customerPhone);
    const trimmedAddress = String(customerAddress || '').trim();
    const trimmedReference = String(customerReference || '').trim();
    const trimmedNotes = String(customerNotes || '').trim();

    if (!trimmedFirstName) {
      toast.error('Informe o nome');
      return;
    }

    if (!trimmedLastName) {
      toast.error('Informe o sobrenome');
      return;
    }

    if (trimmedPhone.length < 10) {
      toast.error('Informe um WhatsApp válido');
      return;
    }

    if (!trimmedAddress) {
      toast.error('Informe o endereço');
      return;
    }

    const customerFullName = `${trimmedFirstName} ${trimmedLastName}`.trim();

    const rawWhatsapp =
      (store as any)?.whatsapp ||
      (store as any)?.phone ||
      (store as any)?.contactPhone ||
      (store as any)?.telefone ||
      '';

    const whatsapp = onlyDigits(rawWhatsapp);

    if (!whatsapp) {
      toast.error('WhatsApp da loja não configurado');
      return;
    }

    setSubmitting(true);

    try {
      const createdOrder = await createOrder({
        storeId: String(storeId),
        customerName: customerFullName,
        customerPhone: trimmedPhone,
        customerAddress: trimmedAddress,
        customerReference: trimmedReference,
        customerNotes: trimmedNotes
          ? trimmedNotes
          : appliedCoupon
            ? `Cupom aplicado: ${appliedCoupon.code}`
            : '',
        paymentMethod: 'whatsapp',
        items: items.map((item: any) => ({
          id: String(item?.product?.id || item?.id || ''),
          productId: String(item?.product?.id || item?.productId || item?.id || ''),
          name: String(item?.product?.name || item?.name || 'Produto'),
          price: Number(item?.product?.price || item?.price || 0),
          quantity: Number(item?.quantity || 1),
          image: String(item?.product?.image || item?.image || ''),
          notes: String(item?.notes || ''),
          storeId: String(item?.product?.storeId || item?.storeId || storeId || ''),
          categoryId: item?.product?.categoryId
            ? String(item.product.categoryId)
            : undefined,
        })),
        subtotal,
        discount,
        deliveryFee,
        total: finalTotal,
      });

      const couponLabel = appliedCoupon ? `Cupom ${appliedCoupon.code}` : undefined;
      const message = buildWhatsAppMessage(
        createdOrder,
        String((store as any)?.name || 'sua loja'),
        couponLabel
      );

      const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;

      clearCart();
      setAppliedCoupon(null);
      setCouponCode('');

      toast.success(`Pedido ${createdOrder.code} confirmado!`);

      const orderPageUrl = store.slug
        ? `/orders?slug=${encodeURIComponent(store.slug)}`
        : `/orders?store=${encodeURIComponent(store.id)}`;

      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      navigate(orderPageUrl);
    } catch (error: any) {
      console.error('Erro ao confirmar pedido:', error);

      const message = String(error?.message || 'Erro ao confirmar pedido');
      const normalizedMessage = message.toLowerCase();

      if (normalizedMessage.includes('limite') && normalizedMessage.includes('pedido')) {
        if (isStoreAdminViewingOwnStore) {
          toast.error('Loja no limite do plano', {
            description: message,
          });

          openUpgradeModalFromError(message);
          return;
        }

        toast.error('Não foi possível concluir', {
          description: getProfessionalCustomerLimitMessage(),
        });
        return;
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const backUrl = store
    ? store.slug
      ? `/loja/${encodeURIComponent(store.slug)}`
      : `/loja?store=${encodeURIComponent(store.id)}`
    : '/loja';

  if (!isLoaded && items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-[#EA1D2C] shadow-sm">
          <div className="mx-auto flex max-w-screen-lg items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/loja')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <h1 className="text-lg font-semibold text-white">Carrinho</h1>
          </div>
        </div>

        <div className="mx-auto max-w-screen-lg px-4 py-6">
          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <p className="text-gray-500">Carregando carrinho...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-[#EA1D2C] shadow-sm">
          <div className="mx-auto flex max-w-screen-lg items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backUrl)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <h1 className="text-lg font-semibold text-white">Carrinho</h1>
          </div>
        </div>

        <div className="mx-auto max-w-screen-lg px-4 py-6">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="mb-4 text-gray-500">Seu carrinho está vazio</p>
              <Button
                onClick={() => navigate(backUrl)}
                className="bg-[#EA1D2C] hover:bg-[#D01929]"
              >
                Ver Cardápio
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 space-y-3">
                {items.map((item: any, index: number) => {
                  const itemId = String(item?.product?.id || item?.id || `item-${index}`);
                  const itemName = String(item?.product?.name || item?.name || 'Produto');
                  const itemImage =
                    item?.product?.image || item?.image || 'https://placehold.co/80x80?text=Produto';
                  const itemPrice = Number(item?.product?.price || item?.price || 0);
                  const itemQuantity = Number(item?.quantity || 1);

                  return (
                    <div key={itemId} className="rounded-lg bg-white p-4 shadow-sm">
                      <div className="flex gap-3">
                        <img
                          src={itemImage}
                          alt={itemName}
                          className="h-20 w-20 rounded object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://placehold.co/80x80?text=Produto';
                          }}
                        />

                        <div className="flex-1">
                          <h3 className="font-medium">{itemName}</h3>

                          <p className="mt-1 font-semibold text-[#EA1D2C]">
                            {formatMoney(itemPrice)}
                          </p>

                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-lg bg-gray-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(itemId, itemQuantity - 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>

                              <span className="w-8 text-center font-medium">{itemQuantity}</span>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(itemId, itemQuantity + 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(itemId)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-[#EA1D2C]">
                            {formatMoney(itemPrice * itemQuantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Dados do cliente</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Preencha seus dados antes de confirmar o pedido.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                      <User className="h-4 w-4 text-[#EA1D2C]" />
                      Nome
                    </label>
                    <Input
                      placeholder="Seu nome"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                      <User className="h-4 w-4 text-[#EA1D2C]" />
                      Sobrenome
                    </label>
                    <Input
                      placeholder="Seu sobrenome"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Phone className="h-4 w-4 text-[#EA1D2C]" />
                      WhatsApp
                    </label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                      <MapPin className="h-4 w-4 text-[#EA1D2C]" />
                      Endereço
                    </label>
                    <Input
                      placeholder="Rua, número, bairro..."
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Referência
                    </label>
                    <Input
                      placeholder="Perto de..."
                      value={customerReference}
                      onChange={(e) => setCustomerReference(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Observações
                    </label>
                    <Input
                      placeholder="Ex.: sem cebola"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-[#EA1D2C]" />
                  <h3 className="font-medium">Cupom de Desconto</h3>
                </div>

                {!appliedCoupon ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o cupom"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1"
                    />

                    <Button
                      onClick={handleApplyCoupon}
                      variant="outline"
                      className="border-[#EA1D2C] text-[#EA1D2C] hover:bg-[#EA1D2C] hover:text-white"
                    >
                      Aplicar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg bg-green-50 p-3">
                    <div>
                      <p className="font-medium text-green-700">{appliedCoupon.code}</p>
                      <p className="text-sm text-green-600">
                        {appliedCoupon.discount}% de desconto
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCoupon}
                      className="text-red-500"
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </div>

              <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatMoney(subtotal)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-green-600">
                      <span>Desconto ({appliedCoupon.code})</span>
                      <span className="font-medium">- {formatMoney(discount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Taxa de entrega</span>
                    <span className="font-medium">{formatMoney(deliveryFee)}</span>
                  </div>

                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-lg font-medium">Total</span>
                    <span className="text-2xl font-bold text-[#EA1D2C]">
                      {formatMoney(finalTotal)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleConfirmOrder}
                  disabled={submitting}
                  className="w-full bg-[#EA1D2C] hover:bg-[#D01929]"
                  size="lg"
                >
                  {submitting ? 'Confirmando...' : 'Confirmar Pedido via WhatsApp'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog
        open={upgradeModal.open}
        onOpenChange={(open) =>
          setUpgradeModal((prev) => ({
            ...prev,
            open,
          }))
        }
      >
        <DialogContent className="border-red-100 bg-white sm:max-w-[560px]">
          <DialogHeader>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <Crown className="h-7 w-7 text-red-500" />
            </div>

            <DialogTitle className="text-2xl font-bold text-gray-900">
              {upgradeModal.title}
            </DialogTitle>

            <DialogDescription className="mt-2 text-sm leading-6 text-gray-600">
              {upgradeModal.description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-500">Plano atual da loja</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{upgradeModal.currentPlan}</p>
            </div>

            {upgradeModal.suggestedPlans.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {upgradeModal.suggestedPlans.map((plan) => (
                  <div
                    key={plan}
                    className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-500">
                        Upgrade recomendado
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900">{plan}</h3>

                    <p className="mt-2 text-sm text-gray-600">
                      Libere mais pedidos e continue vendendo sem bloqueios.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() =>
                openUpgradeWhatsApp({
                  storeName: String((store as any)?.name || 'Minha loja'),
                  currentPlan: upgradeModal.currentPlan,
                  reason:
                    upgradeModal.description ||
                    'Atingi o limite do meu plano e preciso ampliar minha capacidade.',
                })
              }
              className="h-11 flex-1 rounded-xl bg-red-500 text-white hover:bg-red-600"
            >
              Fazer upgrade agora
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                setUpgradeModal((prev) => ({
                  ...prev,
                  open: false,
                }))
              }
              className="h-11 flex-1 rounded-xl border-gray-200"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}