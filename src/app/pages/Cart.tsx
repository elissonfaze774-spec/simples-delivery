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
  Search,
  Store as StoreIcon,
  Bike,
  Info,
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

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function deg2rad(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number
) {
  const earthRadiusKm = 6371;
  const dLat = deg2rad(destinationLat - originLat);
  const dLng = deg2rad(destinationLng - originLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(originLat)) *
      Math.cos(deg2rad(destinationLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

async function getCoordinatesFromAddress(params: {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep?: string;
}) {
  const query = [
    params.street,
    params.number,
    params.neighborhood,
    params.city,
    params.state,
    params.cep,
    'Brasil',
  ]
    .filter(Boolean)
    .join(', ');

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query
  )}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Não foi possível localizar o endereço no mapa.');
  }

  const data = await response.json();

  if (!Array.isArray(data) || !data.length) {
    throw new Error('Não encontramos esse endereço no mapa.');
  }

  const first = data[0];

  return {
    lat: Number(first.lat),
    lng: Number(first.lon),
  };
}

function buildWhatsAppMessage(
  order: any,
  storeName: string,
  couponCode?: string,
  deliveryMethod?: 'delivery' | 'pickup'
) {
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
    `Tipo: ${deliveryMethod === 'pickup' ? 'Retirar no local' : 'Entrega'}`,
  ];

  if (deliveryMethod === 'pickup') {
    lines.push(`Retirada: No local`);
  } else {
    lines.push(`Endereço: ${String(order.customerAddress || 'Não informado')}`);
  }

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

  if (deliveryMethod === 'pickup') {
    lines.push(`Entrega: ${formatMoney(0)}`);
  } else {
    lines.push(`Entrega: ${formatMoney(Number(order.deliveryFee || 0))}`);
  }

  if (Number(order.deliveryDistanceKm || 0) > 0) {
    lines.push(`Distância: ${Number(order.deliveryDistanceKm).toFixed(2)} km`);
  }

  lines.push(`Total: ${formatMoney(Number(order.total || 0))}`);

  return lines.join('\n');
}

function getProfessionalCustomerLimitMessage() {
  return 'No momento, não foi possível concluir seu pedido. Tente novamente em alguns instantes ou entre em contato com a loja para mais informações.';
}

function buildFullAddress(params: {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
  cep?: string;
}) {
  const parts: string[] = [];

  const streetLine = [params.street, params.number].filter(Boolean).join(', ');
  if (streetLine) parts.push(streetLine);

  if (params.neighborhood) parts.push(params.neighborhood);

  const cityState = [params.city, params.state].filter(Boolean).join(' - ');
  if (cityState) parts.push(cityState);

  if (params.complement) parts.push(`Complemento: ${params.complement}`);
  if (params.cep) parts.push(`CEP: ${params.cep}`);

  return parts.join(', ');
}

const SALES_WHATSAPP = '5582987227433';

function openUpgradeWhatsApp(params: {
  storeName?: string;
  currentPlan?: string;
}) {
  const storeName = String(params.storeName || 'Minha loja').trim();
  const currentPlan = String(params.currentPlan || 'Simples').trim();

  const message = [
    'Olá! Tenho interesse em fazer upgrade do meu plano.',
    '',
    `Loja: ${storeName}`,
    `Plano atual: ${currentPlan}`,
    '',
    'Pode me enviar as opções disponíveis?',
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

type DeliveryMethod = 'delivery' | 'pickup';
type DeliveryMode = 'fixed' | 'distance';

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
  const [cepLoading, setCepLoading] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCep, setCustomerCep] = useState('');
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [customerNeighborhood, setCustomerNeighborhood] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerComplement, setCustomerComplement] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [calculatedDistanceKm, setCalculatedDistanceKm] = useState(0);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number | null>(null);

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
      setCustomerCep(localStorage.getItem('checkout:cep') || '');
      setCustomerStreet(localStorage.getItem('checkout:street') || '');
      setCustomerNumber(localStorage.getItem('checkout:number') || '');
      setCustomerNeighborhood(localStorage.getItem('checkout:neighborhood') || '');
      setCustomerCity(localStorage.getItem('checkout:city') || '');
      setCustomerState(localStorage.getItem('checkout:state') || '');
      setCustomerComplement(localStorage.getItem('checkout:complement') || '');
      setCustomerReference(localStorage.getItem('checkout:reference') || '');
      setCustomerNotes(localStorage.getItem('checkout:notes') || '');
      const savedMethod = localStorage.getItem('checkout:deliveryMethod');
      if (savedMethod === 'pickup' || savedMethod === 'delivery') {
        setDeliveryMethod(savedMethod);
      }
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('checkout:firstName', firstName);
      localStorage.setItem('checkout:lastName', lastName);
      localStorage.setItem('checkout:phone', customerPhone);
      localStorage.setItem('checkout:cep', customerCep);
      localStorage.setItem('checkout:street', customerStreet);
      localStorage.setItem('checkout:number', customerNumber);
      localStorage.setItem('checkout:neighborhood', customerNeighborhood);
      localStorage.setItem('checkout:city', customerCity);
      localStorage.setItem('checkout:state', customerState);
      localStorage.setItem('checkout:complement', customerComplement);
      localStorage.setItem('checkout:reference', customerReference);
      localStorage.setItem('checkout:notes', customerNotes);
      localStorage.setItem('checkout:deliveryMethod', deliveryMethod);
    } catch {
      //
    }
  }, [
    firstName,
    lastName,
    customerPhone,
    customerCep,
    customerStreet,
    customerNumber,
    customerNeighborhood,
    customerCity,
    customerState,
    customerComplement,
    customerReference,
    customerNotes,
    deliveryMethod,
  ]);

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

  const allowPickup = Boolean(
    (store as any)?.allowPickup ??
      (store as any)?.allow_pickup ??
      true
  );

  const deliveryMode: DeliveryMode =
    String(
      (store as any)?.deliveryMode ||
        (store as any)?.delivery_mode ||
        'fixed'
    ).trim().toLowerCase() === 'distance'
      ? 'distance'
      : 'fixed';

  const fixedDeliveryFee = Math.max(
    toNumber((store as any)?.deliveryFee ?? (store as any)?.delivery_fee ?? 0),
    0
  );

  const deliveryFeePerKm = Math.max(
    toNumber((store as any)?.deliveryFeePerKm ?? (store as any)?.delivery_fee_per_km ?? 0),
    0
  );

  const deliveryRadiusKm = Math.max(
    toNumber((store as any)?.deliveryRadiusKm ?? (store as any)?.delivery_radius_km ?? 0),
    0
  );

  const storeLatitude = toNumber(
    (store as any)?.storeLatitude ??
      (store as any)?.store_latitude ??
      (store as any)?.latitude
  );

  const storeLongitude = toNumber(
    (store as any)?.storeLongitude ??
      (store as any)?.store_longitude ??
      (store as any)?.longitude
  );

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

  const handleSearchCep = async () => {
    const cep = onlyDigits(customerCep);

    if (!cep) {
      toast.error('Informe o CEP');
      return;
    }

    if (cep.length !== 8) {
      toast.error('Informe um CEP válido com 8 números');
      return;
    }

    try {
      setCepLoading(true);

      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!response.ok || data?.erro) {
        throw new Error('CEP não encontrado');
      }

      setCustomerStreet(data.logradouro || '');
      setCustomerNeighborhood(data.bairro || '');
      setCustomerCity(data.localidade || '');
      setCustomerState(data.uf || '');

      toast.success('Endereço preenchido pelo CEP');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Não foi possível buscar o CEP');
    } finally {
      setCepLoading(false);
    }
  };

  const handleCalculateAutomaticDelivery = async () => {
    if (!storeLatitude || !storeLongitude) {
      toast.error('A loja ainda não possui localização configurada.');
      return;
    }

    const trimmedCep = onlyDigits(customerCep);
    const trimmedStreet = String(customerStreet || '').trim();
    const trimmedNumber = String(customerNumber || '').trim();
    const trimmedNeighborhood = String(customerNeighborhood || '').trim();
    const trimmedCity = String(customerCity || '').trim();
    const trimmedState = String(customerState || '').trim();

    if (!trimmedStreet || !trimmedNumber || !trimmedNeighborhood || !trimmedCity || !trimmedState) {
      toast.error('Preencha o endereço completo para calcular a entrega.');
      return;
    }

    try {
      setDeliveryLoading(true);

      const customerCoordinates = await getCoordinatesFromAddress({
        street: trimmedStreet,
        number: trimmedNumber,
        neighborhood: trimmedNeighborhood,
        city: trimmedCity,
        state: trimmedState,
        cep: trimmedCep,
      });

      const distanceKm = calculateDistanceKm(
        storeLatitude,
        storeLongitude,
        customerCoordinates.lat,
        customerCoordinates.lng
      );

      if (deliveryRadiusKm > 0 && distanceKm > deliveryRadiusKm) {
        setCalculatedDistanceKm(distanceKm);
        setCalculatedDeliveryFee(null);
        toast.error(
          `Endereço fora da área de entrega. Distância: ${distanceKm.toFixed(2)} km.`
        );
        return;
      }

      const fee = Math.max(distanceKm * deliveryFeePerKm, 0);

      setCalculatedDistanceKm(distanceKm);
      setCalculatedDeliveryFee(fee);

      toast.success(`Entrega calculada: ${distanceKm.toFixed(2)} km`);
    } catch (error: any) {
      console.error('Erro ao calcular entrega:', error);
      toast.error(error?.message || 'Não foi possível calcular a entrega.');
    } finally {
      setDeliveryLoading(false);
    }
  };

  useEffect(() => {
    if (deliveryMethod === 'pickup') {
      setCalculatedDistanceKm(0);
      setCalculatedDeliveryFee(0);
      return;
    }

    if (deliveryMode === 'fixed') {
      setCalculatedDistanceKm(0);
      setCalculatedDeliveryFee(fixedDeliveryFee);
    }
  }, [deliveryMethod, deliveryMode, fixedDeliveryFee]);

  const subtotal = Number(total || 0);
  const discount = appliedCoupon ? (subtotal * appliedCoupon.discount) / 100 : 0;

  const effectiveDeliveryFee =
    deliveryMethod === 'pickup'
      ? 0
      : deliveryMode === 'distance'
      ? Math.max(Number(calculatedDeliveryFee || 0), 0)
      : fixedDeliveryFee;

  const finalTotal = Math.max(subtotal - discount + effectiveDeliveryFee, 0);

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
    const trimmedCep = onlyDigits(customerCep);
    const trimmedStreet = String(customerStreet || '').trim();
    const trimmedNumber = String(customerNumber || '').trim();
    const trimmedNeighborhood = String(customerNeighborhood || '').trim();
    const trimmedCity = String(customerCity || '').trim();
    const trimmedState = String(customerState || '').trim();
    const trimmedComplement = String(customerComplement || '').trim();
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

    if (deliveryMethod === 'delivery') {
      if (trimmedCep.length !== 8) {
        toast.error('Informe um CEP válido');
        return;
      }

      if (!trimmedStreet) {
        toast.error('Informe a rua');
        return;
      }

      if (!trimmedNumber) {
        toast.error('Informe o número');
        return;
      }

      if (!trimmedNeighborhood) {
        toast.error('Informe o bairro');
        return;
      }

      if (!trimmedCity) {
        toast.error('Informe a cidade');
        return;
      }

      if (!trimmedState) {
        toast.error('Informe o estado');
        return;
      }

      if (deliveryMode === 'distance' && !calculatedDeliveryFee && calculatedDeliveryFee !== 0) {
        toast.error('Calcule a taxa de entrega antes de confirmar.');
        return;
      }

      if (deliveryRadiusKm > 0 && calculatedDistanceKm > deliveryRadiusKm) {
        toast.error('Esse endereço está fora da área de entrega da loja.');
        return;
      }
    }

    const customerFullName = `${trimmedFirstName} ${trimmedLastName}`.trim();

    const fullAddress =
      deliveryMethod === 'pickup'
        ? 'Retirar no local'
        : buildFullAddress({
            street: trimmedStreet,
            number: trimmedNumber,
            neighborhood: trimmedNeighborhood,
            city: trimmedCity,
            state: trimmedState,
            complement: trimmedComplement,
            cep: trimmedCep,
          });

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

    const extraNotesParts = [
      trimmedNotes,
      deliveryMethod === 'pickup' ? 'Cliente vai retirar no local' : '',
      deliveryMethod === 'delivery' && trimmedCep ? `CEP: ${trimmedCep}` : '',
      deliveryMethod === 'delivery' && trimmedComplement ? `Complemento: ${trimmedComplement}` : '',
      appliedCoupon ? `Cupom aplicado: ${appliedCoupon.code}` : '',
    ].filter(Boolean);

    setSubmitting(true);

    try {
      const createdOrder = await createOrder({
        storeId: String(storeId),
        customerName: customerFullName,
        customerPhone: trimmedPhone,
        customerAddress: fullAddress,
        customerReference: deliveryMethod === 'pickup' ? '' : trimmedReference,
        customerNotes: extraNotesParts.join(' | '),
        paymentMethod: 'whatsapp',
        deliveryMethod,
        deliveryDistanceKm: deliveryMethod === 'pickup' ? 0 : calculatedDistanceKm,
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
        deliveryFee: effectiveDeliveryFee,
        total: finalTotal,
      });

      const couponLabel = appliedCoupon ? `Cupom ${appliedCoupon.code}` : undefined;
      const message = buildWhatsAppMessage(
        createdOrder,
        String((store as any)?.name || 'sua loja'),
        couponLabel,
        deliveryMethod
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
      <div className="min-h-screen bg-[#0b0b0f]">
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
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-center text-white shadow-sm">
            <p className="text-white/70">Carregando carrinho...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#0b0b0f]">
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
              <p className="mb-4 text-white/60">Seu carrinho está vazio</p>
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
                    item?.product?.image ||
                    item?.image ||
                    'https://placehold.co/80x80?text=Produto';
                  const itemPrice = Number(item?.product?.price || item?.price || 0);
                  const itemQuantity = Number(item?.quantity || 1);

                  return (
                    <div
                      key={itemId}
                      className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-white shadow-sm"
                    >
                      <div className="flex gap-3">
                        <img
                          src={itemImage}
                          alt={itemName}
                          className="h-20 w-20 rounded-xl object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://placehold.co/80x80?text=Produto';
                          }}
                        />

                        <div className="flex-1">
                          <h3 className="font-medium text-white">{itemName}</h3>

                          <p className="mt-1 font-semibold text-[#ff6b75]">
                            {formatMoney(itemPrice)}
                          </p>

                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-xl bg-white/10">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(itemId, itemQuantity - 1)}
                                className="h-8 w-8 p-0 text-white hover:bg-white/10"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>

                              <span className="w-8 text-center font-medium">{itemQuantity}</span>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(itemId, itemQuantity + 1)}
                                className="h-8 w-8 p-0 text-white hover:bg-white/10"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(itemId)}
                              className="text-red-400 hover:bg-white/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-[#ff6b75]">
                            {formatMoney(itemPrice * itemQuantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-white shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">Como deseja receber?</h3>
                  <p className="mt-1 text-sm text-white/55">
                    Escolha se quer receber em casa ou retirar no local.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`rounded-[20px] border p-4 text-left transition ${
                      deliveryMethod === 'delivery'
                        ? 'border-[#EA1D2C] bg-[#EA1D2C]/10'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Bike className="h-5 w-5 text-[#EA1D2C]" />
                      <div>
                        <p className="font-semibold text-white">Entrega</p>
                        <p className="text-sm text-white/55">Receba no endereço informado</p>
                      </div>
                    </div>
                  </button>

                  {allowPickup && (
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      className={`rounded-[20px] border p-4 text-left transition ${
                        deliveryMethod === 'pickup'
                          ? 'border-[#EA1D2C] bg-[#EA1D2C]/10'
                          : 'border-white/10 bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <StoreIcon className="h-5 w-5 text-[#EA1D2C]" />
                        <div>
                          <p className="font-semibold text-white">Retirar no local</p>
                          <p className="text-sm text-white/55">Você busca o pedido na loja</p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-white shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">Dados do cliente</h3>
                  <p className="mt-1 text-sm text-white/55">
                    Preencha seus dados antes de confirmar o pedido.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                      <User className="h-4 w-4 text-[#EA1D2C]" />
                      Nome
                    </label>
                    <Input
                      placeholder="Seu nome"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                      <User className="h-4 w-4 text-[#EA1D2C]" />
                      Sobrenome
                    </label>
                    <Input
                      placeholder="Seu sobrenome"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                      <Phone className="h-4 w-4 text-[#EA1D2C]" />
                      WhatsApp
                    </label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                    />
                  </div>

                  {deliveryMethod === 'delivery' && (
                    <>
                      <div className="md:col-span-2 rounded-[20px] border border-[#3a0d12] bg-[#12090b] p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#EA1D2C]" />
                          <p className="text-sm font-semibold text-white">Endereço de entrega</p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                              <MapPin className="h-4 w-4 text-[#EA1D2C]" />
                              CEP
                            </label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="00000000"
                                value={customerCep}
                                onChange={(e) => setCustomerCep(e.target.value)}
                                className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleSearchCep}
                                disabled={cepLoading}
                                className="shrink-0 border-white/10 bg-white/[0.05] text-white hover:bg-white/10"
                              >
                                <Search className="mr-2 h-4 w-4" />
                                {cepLoading ? 'Buscando...' : 'Buscar'}
                              </Button>
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-white/80">
                              Número
                            </label>
                            <Input
                              placeholder="Número"
                              value={customerNumber}
                              onChange={(e) => setCustomerNumber(e.target.value)}
                              className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                              <MapPin className="h-4 w-4 text-[#EA1D2C]" />
                              Rua
                            </label>
                            <Input
                              placeholder="Rua"
                              value={customerStreet}
                              onChange={(e) => setCustomerStreet(e.target.value)}
                              className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-white/80">
                              Bairro
                            </label>
                            <Input
                              placeholder="Bairro"
                              value={customerNeighborhood}
                              onChange={(e) => setCustomerNeighborhood(e.target.value)}
                              className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-white/80">
                              Cidade
                            </label>
                            <Input
                              placeholder="Cidade"
                              value={customerCity}
                              onChange={(e) => setCustomerCity(e.target.value)}
                              className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-white/80">
                              Estado
                            </label>
                            <Input
                              placeholder="UF"
                              value={customerState}
                              onChange={(e) => setCustomerState(e.target.value)}
                              className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-white/80">
                              Complemento
                            </label>
                            <Input
                              placeholder="Casa, apto, bloco..."
                              value={customerComplement}
                              onChange={(e) => setCustomerComplement(e.target.value)}
                              className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-white/80">
                              Referência
                            </label>
                            <Input
                              placeholder="Perto de..."
                              value={customerReference}
                              onChange={(e) => setCustomerReference(e.target.value)}
                              className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                            />
                          </div>

                          {deliveryMode === 'distance' && (
                            <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Info className="h-4 w-4 text-[#EA1D2C]" />
                                    <p className="text-sm font-semibold text-white">
                                      Entrega automática por distância
                                    </p>
                                  </div>

                                  <p className="mt-2 text-sm text-white/55">
                                    Clique no botão abaixo para calcular a distância e a taxa de
                                    entrega automaticamente.
                                  </p>

                                  {deliveryRadiusKm > 0 && (
                                    <p className="mt-1 text-xs text-white/45">
                                      Raio máximo da loja: {deliveryRadiusKm.toFixed(2)} km
                                    </p>
                                  )}

                                  {deliveryFeePerKm > 0 && (
                                    <p className="mt-1 text-xs text-white/45">
                                      Valor por km: {formatMoney(deliveryFeePerKm)}
                                    </p>
                                  )}
                                </div>

                                <Button
                                  type="button"
                                  onClick={handleCalculateAutomaticDelivery}
                                  disabled={deliveryLoading}
                                  className="bg-[#EA1D2C] hover:bg-[#D01929]"
                                >
                                  {deliveryLoading ? 'Calculando...' : 'Calcular entrega'}
                                </Button>
                              </div>

                              {calculatedDistanceKm > 0 && (
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-xs text-white/45">Distância</p>
                                    <p className="mt-1 font-semibold text-white">
                                      {calculatedDistanceKm.toFixed(2)} km
                                    </p>
                                  </div>

                                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-xs text-white/45">Taxa calculada</p>
                                    <p className="mt-1 font-semibold text-[#ff6b75]">
                                      {formatMoney(effectiveDeliveryFee)}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {deliveryMethod === 'pickup' && (
                    <div className="md:col-span-2 rounded-[20px] border border-[#3a0d12] bg-[#12090b] p-4">
                      <div className="flex items-center gap-2">
                        <StoreIcon className="h-4 w-4 text-[#EA1D2C]" />
                        <p className="text-sm font-semibold text-white">Retirada no local</p>
                      </div>
                      <p className="mt-2 text-sm text-white/55">
                        Você escolheu retirar o pedido na loja. Nesse caso, a taxa de entrega será{' '}
                        <span className="font-semibold text-white">R$ 0,00</span>.
                      </p>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Observações
                    </label>
                    <Input
                      placeholder="Ex.: sem cebola"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-white shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-[#EA1D2C]" />
                  <h3 className="font-medium text-white">Cupom de Desconto</h3>
                </div>

                {!appliedCoupon ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o cupom"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                    />

                    <Button
                      onClick={handleApplyCoupon}
                      variant="outline"
                      className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
                    >
                      Aplicar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <div>
                      <p className="font-medium text-emerald-300">{appliedCoupon.code}</p>
                      <p className="text-sm text-emerald-200/80">
                        {appliedCoupon.discount}% de desconto
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCoupon}
                      className="text-red-300 hover:bg-white/10"
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </div>

              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-white shadow-sm">
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Subtotal</span>
                    <span className="font-medium text-white">{formatMoney(subtotal)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-emerald-300">
                      <span>Desconto ({appliedCoupon.code})</span>
                      <span className="font-medium">- {formatMoney(discount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-white/60">
                      {deliveryMethod === 'pickup' ? 'Retirada' : 'Taxa de entrega'}
                    </span>
                    <span className="font-medium text-white">
                      {deliveryMethod === 'pickup'
                        ? formatMoney(0)
                        : formatMoney(effectiveDeliveryFee)}
                    </span>
                  </div>

                  {deliveryMethod === 'delivery' && calculatedDistanceKm > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Distância</span>
                      <span className="font-medium text-white">
                        {calculatedDistanceKm.toFixed(2)} km
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="text-lg font-medium text-white">Total</span>
                    <span className="text-2xl font-bold text-[#ff6b75]">
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
              <p className="mt-1 text-lg font-bold text-gray-900">
                {upgradeModal.currentPlan}
              </p>
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