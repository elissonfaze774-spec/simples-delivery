import {
  Check,
  Copy,
  Globe,
  MessageCircle,
  QrCode as QrCodeIcon,
  Store as StoreIcon,
  Wallet,
  Clock3,
  Power,
  Palette,
  MapPin,
  Search,
  Info,
  Bike,
  Store,
  Plus,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card } from '../../components/ui/card';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { AdminShell } from '../../components/admin/AdminShell';
import { getStoreUrl } from '../../lib/urls';
import type { DeliveryDriver } from '../../types';

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function normalizeDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

const themePresets = [
  '#EA1D2C',
  '#7C3AED',
  '#9333EA',
  '#2563EB',
  '#0EA5E9',
  '#10B981',
  '#22C55E',
  '#84CC16',
  '#EAB308',
  '#F59E0B',
  '#F97316',
  '#EC4899',
  '#14B8A6',
  '#64748B',
  '#111827',
  '#000000',
];

function fieldClassName(withIcon = false) {
  return `h-12 rounded-2xl border border-white/10 bg-white/[0.03] text-white placeholder:text-white/35 ${
    withIcon ? 'pl-10' : ''
  }`;
}

const sectionCardClass =
  'rounded-[28px] border border-[#3a0d12] bg-[linear-gradient(180deg,rgba(12,12,14,0.98)_0%,rgba(18,10,12,0.98)_100%)] p-6 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.8)]';

type DriverVehicleType = '' | 'bike' | 'motorcycle' | 'car' | 'other';

type DriverFormState = {
  name: string;
  email: string;
  phone: string;
  vehicleType: DriverVehicleType;
  vehicleLabel: string;
  notes: string;
  active: boolean;
};

const initialDriverForm: DriverFormState = {
  name: '',
  email: '',
  phone: '',
  vehicleType: '',
  vehicleLabel: '',
  notes: '',
  active: true,
};

function normalizeDriverEmail(value: string) {
  return String(value || '').trim().toLowerCase();
}

function vehicleTypeLabel(value?: string) {
  switch (value) {
    case 'bike':
      return 'Bicicleta';
    case 'motorcycle':
      return 'Moto';
    case 'car':
      return 'Carro';
    case 'other':
      return 'Outro';
    default:
      return 'Não informado';
  }
}

export function AdminSettings() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const {
    isLoaded,
    stores,
    plans,
    getStore,
    getStoreByAdminEmail,
    getStoreDeliveryDrivers,
    updateStore,
    addDeliveryDriver,
    updateDeliveryDriver,
    deleteDeliveryDriver,
    toggleDeliveryDriverActive,
  } = useStore();

  const [copiedLink, setCopiedLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedThemeColor, setSelectedThemeColor] = useState('#EA1D2C');
  const [cepLoading, setCepLoading] = useState(false);

  const [driverForm, setDriverForm] = useState<DriverFormState>(initialDriverForm);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [driverSaving, setDriverSaving] = useState(false);
  const [driverDeletingIds, setDriverDeletingIds] = useState<string[]>([]);
  const [driverTogglingIds, setDriverTogglingIds] = useState<string[]>([]);

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

    const byEmail = getStoreByAdminEmail(user.email);
    if (byEmail) return byEmail;

    if (isLoaded && stores.length === 1) {
      return stores[0];
    }

    return undefined;
  }, [user, isLoaded, stores, getStore, getStoreByAdminEmail]);

  const currentThemeColor =
    String(
      (resolvedStore as any)?.themeColor ||
        (resolvedStore as any)?.theme_color ||
        '#EA1D2C'
    ).trim() || '#EA1D2C';

  useEffect(() => {
    setSelectedThemeColor(currentThemeColor);
  }, [currentThemeColor]);

  const storeDrivers = useMemo(
    () => (resolvedStore ? getStoreDeliveryDrivers(resolvedStore.id) : []),
    [resolvedStore, getStoreDeliveryDrivers]
  );

  const currentPlan =
    String((resolvedStore as any)?.plan || (resolvedStore as any)?.plan_id || 'iniciante')
      .trim()
      .toLowerCase() || 'iniciante';

  const currentPlanConfig = useMemo(
    () => plans.find((plan) => String(plan.id) === currentPlan),
    [plans, currentPlan]
  );

  const maxDeliveryDrivers = Number(currentPlanConfig?.maxDeliveryDrivers ?? 0);
  const driversLocked = maxDeliveryDrivers === 0;
  const driversUnlimited = maxDeliveryDrivers < 0;
  const driversLimitReached = !driversUnlimited && storeDrivers.length >= maxDeliveryDrivers;

  const resetDriverForm = () => {
    setDriverForm(initialDriverForm);
    setEditingDriverId(null);
  };

  const handleEditDriver = (driver: DeliveryDriver) => {
    setEditingDriverId(driver.id);
    setDriverForm({
      name: String(driver.name || ''),
      email: String(driver.email || ''),
      phone: String(driver.phone || ''),
      vehicleType: (driver.vehicleType as DriverVehicleType) || '',
      vehicleLabel: String(driver.vehicleLabel || ''),
      notes: String(driver.notes || ''),
      active: Boolean(driver.active),
    });

    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleDriverSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resolvedStore || driverSaving) return;

    const name = String(driverForm.name || '').trim();
    const email = normalizeDriverEmail(driverForm.email);
    const phone = normalizeDigits(driverForm.phone);

    if (driversLocked && !editingDriverId) {
      toast.error('Seu plano atual não libera entregadores. Faça upgrade para Pro ou Premium.');
      return;
    }

    if (!editingDriverId && driversLimitReached) {
      toast.error(
        `Seu plano permite até ${maxDeliveryDrivers} entregador(es). Faça upgrade para liberar mais.`
      );
      return;
    }

    if (!name) {
      toast.error('Informe o nome do entregador.');
      return;
    }

    if (!email) {
      toast.error('Informe o email do entregador.');
      return;
    }

    if (!phone) {
      toast.error('Informe o telefone do entregador.');
      return;
    }

    try {
      setDriverSaving(true);

      if (editingDriverId) {
        await updateDeliveryDriver(editingDriverId, {
          name,
          email,
          phone,
          active: driverForm.active,
          vehicleType: driverForm.vehicleType || undefined,
          vehicleLabel: String(driverForm.vehicleLabel || '').trim() || undefined,
          notes: String(driverForm.notes || '').trim() || undefined,
        });

        toast.success('Entregador atualizado com sucesso.');
      } else {
        await addDeliveryDriver({
          storeId: resolvedStore.id,
          name,
          email,
          phone,
          active: driverForm.active,
          online: false,
          avatar: '',
          vehicleType: driverForm.vehicleType || undefined,
          vehicleLabel: String(driverForm.vehicleLabel || '').trim() || undefined,
          notes: String(driverForm.notes || '').trim() || undefined,
          lastActiveAt: undefined,
        });

        toast.success('Entregador criado com sucesso.');
      }

      resetDriverForm();
    } catch (error: any) {
      console.error('Erro ao salvar entregador:', error);
      toast.error(error?.message || 'Não foi possível salvar o entregador.');
    } finally {
      setDriverSaving(false);
    }
  };

  const handleDeleteDriver = async (driver: DeliveryDriver) => {
    if (!window.confirm(`Deseja realmente excluir ${driver.name}?`)) return;

    try {
      setDriverDeletingIds((prev) => [...prev, driver.id]);
      await deleteDeliveryDriver(driver.id);
      toast.success('Entregador excluído com sucesso.');

      if (editingDriverId === driver.id) {
        resetDriverForm();
      }
    } catch (error: any) {
      console.error('Erro ao excluir entregador:', error);
      toast.error(error?.message || 'Não foi possível excluir o entregador.');
    } finally {
      setDriverDeletingIds((prev) => prev.filter((id) => id !== driver.id));
    }
  };

  const handleToggleDriver = async (driver: DeliveryDriver) => {
    try {
      setDriverTogglingIds((prev) => [...prev, driver.id]);
      await toggleDeliveryDriverActive(driver.id);
      toast.success(driver.active ? 'Entregador desativado.' : 'Entregador ativado.');
    } catch (error: any) {
      console.error('Erro ao alterar status do entregador:', error);
      toast.error(error?.message || 'Não foi possível alterar o status do entregador.');
    } finally {
      setDriverTogglingIds((prev) => prev.filter((id) => id !== driver.id));
    }
  };

  if (authLoading || !authChecked || (!isLoaded && stores.length === 0)) {
    return <div className="p-6 text-white">Carregando configurações...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!resolvedStore) {
    return <div className="p-6 text-white">Loja não encontrada.</div>;
  }

  const storeSlug = resolvedStore.slug || resolvedStore.id;
  const storeLink = getStoreUrl(storeSlug);

  const isStoreActive = Boolean(
    (resolvedStore as any).is_active ??
      (resolvedStore as any).active ??
      (resolvedStore as any).isActive
  );

  const currentDeliveryFee = Number(
    (resolvedStore as any).deliveryFee ?? (resolvedStore as any).delivery_fee ?? 0
  );

  const currentDeliveryMode =
    String(
      (resolvedStore as any).deliveryMode ||
        (resolvedStore as any).delivery_mode ||
        'fixed'
    ).trim().toLowerCase() === 'distance'
      ? 'distance'
      : 'fixed';

  const currentDeliveryFeePerKm = Number(
    (resolvedStore as any).deliveryFeePerKm ??
      (resolvedStore as any).delivery_fee_per_km ??
      0
  );

  const currentDeliveryRadiusKm = Number(
    (resolvedStore as any).deliveryRadiusKm ??
      (resolvedStore as any).delivery_radius_km ??
      0
  );

  const currentAllowPickup = Boolean(
    (resolvedStore as any).allowPickup ??
      (resolvedStore as any).allow_pickup ??
      true
  );

  const currentLogoFallback = String((resolvedStore as any).logo || '').trim();
  const currentLogoUrl = String(
    (resolvedStore as any).logoUrl || (resolvedStore as any).logo_url || ''
  ).trim();
  const currentBanner = String(
    (resolvedStore as any).banner || (resolvedStore as any).banner_url || ''
  ).trim();

  const currentOpeningTime = String((resolvedStore as any).openingTime || '').trim();
  const currentClosingTime = String((resolvedStore as any).closingTime || '').trim();

  const currentStoreCep = String(
    (resolvedStore as any).storeCep || (resolvedStore as any).store_cep || ''
  ).trim();
  const currentStoreStreet = String(
    (resolvedStore as any).storeStreet || (resolvedStore as any).store_street || ''
  ).trim();
  const currentStoreNumber = String(
    (resolvedStore as any).storeNumber || (resolvedStore as any).store_number || ''
  ).trim();
  const currentStoreComplement = String(
    (resolvedStore as any).storeComplement || (resolvedStore as any).store_complement || ''
  ).trim();
  const currentStoreNeighborhood = String(
    (resolvedStore as any).storeNeighborhood || (resolvedStore as any).store_neighborhood || ''
  ).trim();
  const currentStoreCity = String(
    (resolvedStore as any).storeCity || (resolvedStore as any).store_city || ''
  ).trim();
  const currentStoreState = String(
    (resolvedStore as any).storeState || (resolvedStore as any).store_state || ''
  ).trim();
  const currentStoreReference = String(
    (resolvedStore as any).storeReference || (resolvedStore as any).store_reference || ''
  ).trim();
  const currentStoreLatitude = String(
    (resolvedStore as any).storeLatitude || (resolvedStore as any).store_latitude || ''
  ).trim();
  const currentStoreLongitude = String(
    (resolvedStore as any).storeLongitude || (resolvedStore as any).store_longitude || ''
  ).trim();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeLink);
      setCopiedLink(true);
      toast.success('Link copiado com sucesso!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast.error('Não foi possível copiar o link.');
    }
  };

  const handleSearchCep = async () => {
    const cepInput = document.getElementById('storeCep') as HTMLInputElement | null;
    const streetInput = document.getElementById('storeStreet') as HTMLInputElement | null;
    const neighborhoodInput = document.getElementById('storeNeighborhood') as HTMLInputElement | null;
    const cityInput = document.getElementById('storeCity') as HTMLInputElement | null;
    const stateInput = document.getElementById('storeState') as HTMLInputElement | null;

    const cep = normalizeDigits(cepInput?.value || '');

    if (!cep) return;

    if (cep.length !== 8) {
      toast.error('Informe um CEP válido com 8 números.');
      return;
    }

    try {
      setCepLoading(true);

      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!response.ok || data?.erro) {
        throw new Error('CEP não encontrado.');
      }

      if (streetInput && !streetInput.value.trim()) {
        streetInput.value = data.logradouro || '';
      }

      if (neighborhoodInput && !neighborhoodInput.value.trim()) {
        neighborhoodInput.value = data.bairro || '';
      }

      if (cityInput && !cityInput.value.trim()) {
        cityInput.value = data.localidade || '';
      }

      if (stateInput && !stateInput.value.trim()) {
        stateInput.value = data.uf || '';
      }

      toast.success('Endereço preenchido pelo CEP.');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Não foi possível buscar o CEP.');
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;

    if (!isLoaded || !resolvedStore) {
      toast.error('Dados da loja ainda estão sendo carregados.');
      return;
    }

    const formData = new FormData(e.currentTarget);

    const name = String(formData.get('name') || '').trim();
    const logo = String(formData.get('logo') || '').trim();
    const logoUrl = String(formData.get('logoUrl') || '').trim();
    const banner = String(formData.get('banner') || '').trim();
    const whatsapp = normalizeDigits(String(formData.get('whatsapp') || ''));
    const deliveryFee = Math.max(toNumber(formData.get('deliveryFee')), 0);
    const deliveryMode =
      String(formData.get('deliveryMode') || 'fixed').trim().toLowerCase() === 'distance'
        ? 'distance'
        : 'fixed';
    const deliveryFeePerKm = Math.max(toNumber(formData.get('deliveryFeePerKm')), 0);
    const deliveryRadiusKm = Math.max(toNumber(formData.get('deliveryRadiusKm')), 0);
    const allowPickup = String(formData.get('allowPickup') || 'true') === 'true';
    const openingTime = String(formData.get('openingTime') || '').trim();
    const closingTime = String(formData.get('closingTime') || '').trim();
    const active = String(formData.get('active') || 'true') === 'true';

    const storeCep = normalizeDigits(String(formData.get('storeCep') || ''));
    const storeStreet = String(formData.get('storeStreet') || '').trim();
    const storeNumber = String(formData.get('storeNumber') || '').trim();
    const storeComplement = String(formData.get('storeComplement') || '').trim();
    const storeNeighborhood = String(formData.get('storeNeighborhood') || '').trim();
    const storeCity = String(formData.get('storeCity') || '').trim();
    const storeState = String(formData.get('storeState') || '').trim();
    const storeReference = String(formData.get('storeReference') || '').trim();
    const storeLatitude = String(formData.get('storeLatitude') || '').trim();
    const storeLongitude = String(formData.get('storeLongitude') || '').trim();

    if (!name) {
      toast.error('Informe o nome da loja.');
      return;
    }

    if (!whatsapp) {
      toast.error('Informe o WhatsApp.');
      return;
    }

    if (deliveryMode === 'fixed' && !Number.isFinite(deliveryFee)) {
      toast.error('Informe uma taxa fixa válida.');
      return;
    }

    if (deliveryMode === 'distance' && deliveryFeePerKm <= 0) {
      toast.error('Informe um valor por km maior que zero.');
      return;
    }

    if (!storeCep) {
      toast.error('Informe o CEP da loja.');
      return;
    }

    if (!storeStreet) {
      toast.error('Informe a rua da loja.');
      return;
    }

    if (!storeNumber) {
      toast.error('Informe o número da loja.');
      return;
    }

    if (!storeNeighborhood) {
      toast.error('Informe o bairro da loja.');
      return;
    }

    if (!storeCity) {
      toast.error('Informe a cidade da loja.');
      return;
    }

    if (!storeState) {
      toast.error('Informe o estado da loja.');
      return;
    }

    const payload: any = {
      name,
      whatsapp,
      deliveryFee,
      deliveryMode,
      deliveryFeePerKm,
      deliveryRadiusKm,
      allowPickup,
      active,
      openingTime,
      closingTime,
      themeColor: selectedThemeColor,
      logo: logo || currentLogoFallback || '🍔',
      logoUrl: logoUrl || currentLogoUrl || '',
      banner: banner || currentBanner || '',
      storeCep,
      storeStreet,
      storeNumber,
      storeComplement,
      storeNeighborhood,
      storeCity,
      storeState,
      storeReference,
      storeLatitude,
      storeLongitude,

      store_cep: storeCep,
      store_street: storeStreet,
      store_number: storeNumber,
      store_complement: storeComplement,
      store_neighborhood: storeNeighborhood,
      store_city: storeCity,
      store_state: storeState,
      store_reference: storeReference,
      store_latitude: storeLatitude,
      store_longitude: storeLongitude,

      theme_color: selectedThemeColor,
      logo_url: logoUrl || currentLogoUrl || '',
      banner_url: banner || currentBanner || '',
      is_active: active,
      delivery_mode: deliveryMode,
      delivery_fee_per_km: deliveryFeePerKm,
      delivery_radius_km: deliveryRadiusKm,
      allow_pickup: allowPickup,
    };

    setSaving(true);

    try {
      await updateStore(resolvedStore.id, payload);
      toast.success('Configurações atualizadas com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      toast.error(error?.message || 'Não foi possível atualizar a loja.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Configurações"
      subtitle="Ajuste sua loja, endereço, horários, retirada, entrega e entregadores"
      storeName={resolvedStore.name}
      onBack={() => navigate('/admin')}
      stats={[
        {
          label: 'Loja ativa',
          value: isStoreActive ? 'Sim' : 'Não',
          helper: 'Status atual da sua loja',
        },
        {
          label: 'Plano',
          value: currentPlan,
          helper: 'Plano atual contratado',
        },
        {
          label: 'Entrega',
          value:
            currentDeliveryMode === 'distance'
              ? `${formatMoney(currentDeliveryFeePerKm)}/km`
              : formatMoney(currentDeliveryFee),
          helper:
            currentDeliveryMode === 'distance'
              ? 'Taxa automática por distância'
              : 'Taxa fixa da loja',
        },
        {
          label: 'Entregadores',
          value: storeDrivers.length,
          helper: driversUnlimited ? 'Sem limite' : `Limite do plano: ${maxDeliveryDrivers}`,
        },
      ]}
    >
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-[0.25em] text-[#ff7b85]">Link público</p>
                  <h2 className="mt-3 text-2xl font-bold text-white">Compartilhe sua loja</h2>
                  <p className="mt-2 text-sm text-white/65">
                    Use o link ou QR Code para divulgar seu cardápio e receber pedidos.
                  </p>
                </div>

                <Globe className="h-5 w-5 shrink-0 text-[#ff7b85]" />
              </div>

              <div className="mt-5 break-all rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/85">
                {storeLink}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-full bg-[#EA1D2C] text-white hover:bg-[#d31625]"
                >
                  {copiedLink ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copiedLink ? 'Copiado' : 'Copiar link'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10"
                  onClick={() => window.open(storeLink, '_blank', 'noopener,noreferrer')}
                >
                  Abrir loja
                </Button>
              </div>
            </Card>

            <Card className={sectionCardClass}>
              <div className="mb-4 flex items-center justify-center gap-2 text-sm text-white/70">
                <QrCodeIcon className="h-4 w-4 text-[#EA1D2C]" />
                QR Code da loja
              </div>

              <div className="inline-flex max-w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <QRCodeSVG value={storeLink} size={220} includeMargin />
              </div>

              <p className="mt-4 text-center text-xs text-white/45">
                Seus clientes podem escanear este QR Code para acessar a loja.
              </p>
            </Card>
          </div>

          <Card className={sectionCardClass}>
            <div className="mb-6">
              <p className="text-sm text-white/55">Aparência, contato, entrega e endereço</p>
              <h2 className="text-2xl font-bold text-white">Informações da loja</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="name" className="text-white/85">
                    Nome da loja
                  </Label>
                  <div className="relative mt-2">
                    <StoreIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      id="name"
                      name="name"
                      defaultValue={resolvedStore.name || ''}
                      required
                      className={fieldClassName(true)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="logo" className="text-white/85">
                    Logo fallback (emoji)
                  </Label>
                  <Input
                    id="logo"
                    name="logo"
                    defaultValue={currentLogoFallback || '🍔'}
                    className={`mt-2 ${fieldClassName()}`}
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp" className="text-white/85">
                    WhatsApp
                  </Label>
                  <div className="relative mt-2">
                    <MessageCircle className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      id="whatsapp"
                      name="whatsapp"
                      placeholder="5511999999999"
                      defaultValue={(resolvedStore as any).whatsapp || ''}
                      required
                      className={fieldClassName(true)}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 rounded-[24px] border border-[#3a0d12] bg-[#12090b] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Bike className="h-4 w-4 text-[#EA1D2C]" />
                    <p className="text-sm font-semibold text-white">Configuração da entrega</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white transition hover:bg-white/[0.07]">
                      <input
                        type="radio"
                        name="deliveryMode"
                        value="fixed"
                        defaultChecked={currentDeliveryMode === 'fixed'}
                        className="mt-1 accent-[#EA1D2C]"
                      />
                      <div>
                        <p className="text-sm font-medium">Taxa fixa</p>
                        <p className="text-xs text-white/50">
                          A loja cobra sempre o mesmo valor de entrega.
                        </p>
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white transition hover:bg-white/[0.07]">
                      <input
                        type="radio"
                        name="deliveryMode"
                        value="distance"
                        defaultChecked={currentDeliveryMode === 'distance'}
                        className="mt-1 accent-[#EA1D2C]"
                      />
                      <div>
                        <p className="text-sm font-medium">Taxa por distância</p>
                        <p className="text-xs text-white/50">
                          O valor da entrega será calculado conforme a distância.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="deliveryFee" className="text-white/80">
                        Taxa fixa de entrega
                      </Label>
                      <div className="relative mt-2">
                        <Wallet className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                        <Input
                          id="deliveryFee"
                          name="deliveryFee"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={currentDeliveryFee}
                          className={fieldClassName(true)}
                        />
                      </div>
                      <p className="mt-2 text-xs text-white/45">
                        Use este campo quando a loja trabalhar com valor fixo.
                      </p>
                    </div>

                    <div className="flex items-end rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
                      Valor atual:
                      <span className="ml-2 font-semibold text-white">
                        {currentDeliveryMode === 'distance'
                          ? `${formatMoney(currentDeliveryFeePerKm)}/km`
                          : formatMoney(currentDeliveryFee)}
                      </span>
                    </div>

                    <div>
                      <Label htmlFor="deliveryFeePerKm" className="text-white/80">
                        Valor por km
                      </Label>
                      <div className="relative mt-2">
                        <Wallet className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                        <Input
                          id="deliveryFeePerKm"
                          name="deliveryFeePerKm"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={currentDeliveryFeePerKm}
                          className={fieldClassName(true)}
                        />
                      </div>
                      <p className="mt-2 text-xs text-white/45">Exemplo: 2,50 por km.</p>
                    </div>

                    <div>
                      <Label htmlFor="deliveryRadiusKm" className="text-white/80">
                        Raio máximo de entrega (km)
                      </Label>
                      <div className="relative mt-2">
                        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                        <Input
                          id="deliveryRadiusKm"
                          name="deliveryRadiusKm"
                          type="number"
                          min="0"
                          step="0.1"
                          defaultValue={currentDeliveryRadiusKm}
                          className={fieldClassName(true)}
                        />
                      </div>
                      <p className="mt-2 text-xs text-white/45">
                        Se deixar 0, não haverá limite de raio.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 rounded-[24px] border border-[#3a0d12] bg-[#12090b] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Store className="h-4 w-4 text-[#EA1D2C]" />
                    <p className="text-sm font-semibold text-white">Retirada no local</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white transition hover:bg-white/[0.07]">
                      <input
                        type="radio"
                        name="allowPickup"
                        value="true"
                        defaultChecked={currentAllowPickup}
                        className="mt-1 accent-[#EA1D2C]"
                      />
                      <div>
                        <p className="text-sm font-medium">Permitir retirada no local</p>
                        <p className="text-xs text-white/50">
                          O cliente poderá escolher retirar o pedido na loja.
                        </p>
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white transition hover:bg-white/[0.07]">
                      <input
                        type="radio"
                        name="allowPickup"
                        value="false"
                        defaultChecked={!currentAllowPickup}
                        className="mt-1 accent-[#EA1D2C]"
                      />
                      <div>
                        <p className="text-sm font-medium">Não permitir retirada</p>
                        <p className="text-xs text-white/50">
                          O cliente poderá apenas escolher entrega.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2 rounded-[24px] border border-[#3a0d12] bg-[#12090b] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#EA1D2C]" />
                    <p className="text-sm font-semibold text-white">Endereço da loja</p>
                  </div>

                  <p className="mb-4 text-sm text-white/55">
                    Preencha o endereço da loja. Para facilitar, informe o CEP e clique em{' '}
                    <span className="font-semibold text-white">Buscar CEP</span>.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="storeCep" className="text-white/80">
                        CEP
                      </Label>
                      <div className="mt-2 flex gap-2">
                        <Input
                          id="storeCep"
                          name="storeCep"
                          placeholder="Ex: 49092280"
                          defaultValue={currentStoreCep}
                          className={fieldClassName()}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSearchCep}
                          disabled={cepLoading}
                          className="h-12 rounded-2xl border-white/10 bg-white/[0.05] text-white hover:bg-white/10"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          {cepLoading ? 'Buscando...' : 'Buscar CEP'}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="storeNumber" className="text-white/80">
                        Número
                      </Label>
                      <Input
                        id="storeNumber"
                        name="storeNumber"
                        placeholder="Ex: 24"
                        defaultValue={currentStoreNumber}
                        className={`mt-2 ${fieldClassName()}`}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="storeStreet" className="text-white/80">
                        Rua / Avenida
                      </Label>
                      <Input
                        id="storeStreet"
                        name="storeStreet"
                        placeholder="Ex: Rua da loja"
                        defaultValue={currentStoreStreet}
                        className={`mt-2 ${fieldClassName()}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor="storeComplement" className="text-white/80">
                        Complemento
                      </Label>
                      <Input
                        id="storeComplement"
                        name="storeComplement"
                        placeholder="Ex: Loja, sala, box..."
                        defaultValue={currentStoreComplement}
                        className={`mt-2 ${fieldClassName()}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor="storeNeighborhood" className="text-white/80">
                        Bairro
                      </Label>
                      <Input
                        id="storeNeighborhood"
                        name="storeNeighborhood"
                        placeholder="Ex: Centro"
                        defaultValue={currentStoreNeighborhood}
                        className={`mt-2 ${fieldClassName()}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor="storeCity" className="text-white/80">
                        Cidade
                      </Label>
                      <Input
                        id="storeCity"
                        name="storeCity"
                        placeholder="Ex: Aracaju"
                        defaultValue={currentStoreCity}
                        className={`mt-2 ${fieldClassName()}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor="storeState" className="text-white/80">
                        Estado
                      </Label>
                      <Input
                        id="storeState"
                        name="storeState"
                        placeholder="Ex: SE"
                        defaultValue={currentStoreState}
                        className={`mt-2 ${fieldClassName()}`}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="storeReference" className="text-white/80">
                        Ponto de referência
                      </Label>
                      <Input
                        id="storeReference"
                        name="storeReference"
                        placeholder="Ex: Próximo à praça, ao lado da farmácia..."
                        defaultValue={currentStoreReference}
                        className={`mt-2 ${fieldClassName()}`}
                      />
                    </div>

                    <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 flex items-center gap-2 text-white">
                        <Info className="h-4 w-4 text-[#EA1D2C]" />
                        <p className="text-sm font-semibold">Localização no mapa</p>
                      </div>

                      <p className="mb-4 text-xs text-white/55">
                        Esses campos são importantes quando a loja usar{' '}
                        <span className="font-semibold text-white">taxa por distância</span>.
                        Se quiser cálculo automático funcionando bem, preencha latitude e longitude.
                      </p>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="storeLatitude" className="text-white/80">
                            Latitude da loja
                          </Label>
                          <Input
                            id="storeLatitude"
                            name="storeLatitude"
                            placeholder="Ex: -10.9472"
                            defaultValue={currentStoreLatitude}
                            className={`mt-2 ${fieldClassName()}`}
                          />
                        </div>

                        <div>
                          <Label htmlFor="storeLongitude" className="text-white/80">
                            Longitude da loja
                          </Label>
                          <Input
                            id="storeLongitude"
                            name="storeLongitude"
                            placeholder="Ex: -37.0731"
                            defaultValue={currentStoreLongitude}
                            className={`mt-2 ${fieldClassName()}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 rounded-[24px] border border-[#3a0d12] bg-[#12090b] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Power className="h-4 w-4 text-[#EA1D2C]" />
                    <p className="text-sm font-semibold text-white">Status da loja</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white transition hover:bg-white/[0.07]">
                      <input
                        type="radio"
                        name="active"
                        value="true"
                        defaultChecked={isStoreActive}
                        className="accent-[#EA1D2C]"
                      />
                      <span className="text-sm font-medium">Loja aberta</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white transition hover:bg-white/[0.07]">
                      <input
                        type="radio"
                        name="active"
                        value="false"
                        defaultChecked={!isStoreActive}
                        className="accent-[#EA1D2C]"
                      />
                      <span className="text-sm font-medium">Loja fechada</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="openingTime" className="text-white/85">
                    Abre às
                  </Label>
                  <div className="relative mt-2">
                    <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      id="openingTime"
                      name="openingTime"
                      type="time"
                      defaultValue={currentOpeningTime}
                      className={fieldClassName(true)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="closingTime" className="text-white/85">
                    Fecha às
                  </Label>
                  <div className="relative mt-2">
                    <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      id="closingTime"
                      name="closingTime"
                      type="time"
                      defaultValue={currentClosingTime}
                      className={fieldClassName(true)}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 rounded-[24px] border border-[#3a0d12] bg-[#12090b] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-[#EA1D2C]" />
                    <p className="text-sm font-semibold text-white">Cor do tema da loja</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                    <div>
                      <Label htmlFor="themeColorPicker" className="text-white/80">
                        Escolher cor
                      </Label>
                      <Input
                        id="themeColorPicker"
                        type="color"
                        value={selectedThemeColor}
                        onChange={(e) => setSelectedThemeColor(e.target.value)}
                        className="mt-2 h-12 w-full cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] p-2"
                      />
                    </div>

                    <div>
                      <p className="mb-2 text-sm text-white/55">Cores rápidas</p>
                      <div className="flex flex-wrap gap-2">
                        {themePresets.map((color) => (
                          <button
                            key={color}
                            type="button"
                            title={color}
                            onClick={() => setSelectedThemeColor(color)}
                            className={`h-10 w-10 rounded-full border-2 shadow transition ${
                              selectedThemeColor.toLowerCase() === color.toLowerCase()
                                ? 'scale-110 border-white ring-2 ring-white/50'
                                : 'border-white/20'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <input type="hidden" name="themeColor" value={selectedThemeColor} />

                  <p className="mt-3 text-xs text-white/45">
                    Essa cor será usada na vitrine da loja para botões, topo e destaques.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="logoUrl" className="text-white/85">
                    URL da logo
                  </Label>
                  <Input
                    id="logoUrl"
                    name="logoUrl"
                    type="url"
                    placeholder="https://exemplo.com/logo.png"
                    defaultValue={currentLogoUrl}
                    className={`mt-2 ${fieldClassName()}`}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="banner" className="text-white/85">
                    URL do banner
                  </Label>
                  <Input
                    id="banner"
                    name="banner"
                    type="url"
                    placeholder="https://exemplo.com/banner.png"
                    defaultValue={currentBanner}
                    className={`mt-2 ${fieldClassName()}`}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="h-12 w-full rounded-2xl bg-[#EA1D2C] text-white hover:bg-[#d31625]"
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </form>
          </Card>
        </div>

        <Card className={sectionCardClass}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#ff7b85]">Entregadores</p>
              <h2 className="mt-3 text-2xl font-bold text-white">Gestão de entregadores</h2>
              <p className="mt-2 text-sm text-white/65">
                Cadastre, edite, ative ou desative entregadores da sua loja. Tudo salvo no Supabase.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
              {driversUnlimited
                ? 'Plano com entregadores ilimitados'
                : `Plano atual: até ${maxDeliveryDrivers} entregador(es)`}
            </div>
          </div>

          {driversLocked ? (
            <div className="mt-6 rounded-[24px] border border-[#EA1D2C]/20 bg-[#EA1D2C]/10 p-5">
              <div className="flex items-center gap-3">
                <Bike className="h-5 w-5 text-[#ff7b85]" />
                <div>
                  <p className="font-semibold text-white">Entregadores bloqueados no seu plano</p>
                  <p className="mt-1 text-sm text-white/70">
                    Faça upgrade para <span className="font-semibold text-white">Pro</span> ou{' '}
                    <span className="font-semibold text-white">Premium</span> para liberar esse módulo.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              {storeDrivers.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EA1D2C]/10 text-[#EA1D2C]">
                    <Bike className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white">Nenhum entregador cadastrado</h3>
                  <p className="mt-2 text-sm text-white/55">
                    Cadastre seu primeiro entregador para começar a vincular pedidos.
                  </p>
                </div>
              ) : (
                storeDrivers.map((driver) => {
                  const isDeleting = driverDeletingIds.includes(driver.id);
                  const isToggling = driverTogglingIds.includes(driver.id);

                  return (
                    <div
                      key={driver.id}
                      className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EA1D2C]/10 text-[#EA1D2C]">
                              <UserRound className="h-5 w-5" />
                            </div>

                            <div>
                              <h3 className="text-lg font-bold text-white">{driver.name}</h3>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs ${
                                    driver.active
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                  }`}
                                >
                                  {driver.active ? 'Ativo' : 'Inativo'}
                                </span>

                                <span
                                  className={`rounded-full border px-3 py-1 text-xs ${
                                    driver.online
                                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                                      : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300'
                                  }`}
                                >
                                  {driver.online ? 'Online' : 'Offline'}
                                </span>

                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
                                  {vehicleTypeLabel(driver.vehicleType)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 text-sm text-white/65 md:grid-cols-2">
                            <div>
                              <span className="font-medium text-white/85">Email:</span> {driver.email || '—'}
                            </div>
                            <div>
                              <span className="font-medium text-white/85">Telefone:</span>{' '}
                              {driver.phone || '—'}
                            </div>
                            <div>
                              <span className="font-medium text-white/85">Veículo:</span>{' '}
                              {driver.vehicleLabel || '—'}
                            </div>
                            <div>
                              <span className="font-medium text-white/85">Última atividade:</span>{' '}
                              {driver.lastActiveAt
                                ? new Date(driver.lastActiveAt).toLocaleString('pt-BR')
                                : '—'}
                            </div>
                          </div>

                          {driver.notes ? (
                            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/65">
                              <span className="font-medium text-white/85">Observações:</span> {driver.notes}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleEditDriver(driver)}
                            className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={isToggling}
                            onClick={() => handleToggleDriver(driver)}
                            className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                          >
                            <Power className="mr-2 h-4 w-4" />
                            {isToggling
                              ? 'Alterando...'
                              : driver.active
                                ? 'Desativar'
                                : 'Ativar'}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={isDeleting}
                            onClick={() => handleDeleteDriver(driver)}
                            className="rounded-full border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white/55">
                    {editingDriverId ? 'Editar entregador' : 'Novo entregador'}
                  </p>
                  <h3 className="text-xl font-bold text-white">
                    {editingDriverId ? 'Atualizar cadastro' : 'Cadastrar entregador'}
                  </h3>
                </div>

                {editingDriverId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetDriverForm}
                    className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>

              <form onSubmit={handleDriverSubmit} className="mt-5 space-y-4">
                <div>
                  <Label htmlFor="driverName" className="text-white/85">
                    Nome
                  </Label>
                  <Input
                    id="driverName"
                    value={driverForm.name}
                    onChange={(e) =>
                      setDriverForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nome do entregador"
                    className={`mt-2 ${fieldClassName()}`}
                    disabled={driverSaving || driversLocked}
                  />
                </div>

                <div>
                  <Label htmlFor="driverEmail" className="text-white/85">
                    Email
                  </Label>
                  <Input
                    id="driverEmail"
                    type="email"
                    value={driverForm.email}
                    onChange={(e) =>
                      setDriverForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="entregador@email.com"
                    className={`mt-2 ${fieldClassName()}`}
                    disabled={driverSaving || driversLocked}
                  />
                </div>

                <div>
                  <Label htmlFor="driverPhone" className="text-white/85">
                    Telefone
                  </Label>
                  <Input
                    id="driverPhone"
                    value={driverForm.phone}
                    onChange={(e) =>
                      setDriverForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="(00) 00000-0000"
                    className={`mt-2 ${fieldClassName()}`}
                    disabled={driverSaving || driversLocked}
                  />
                </div>

                <div>
                  <Label htmlFor="driverVehicleType" className="text-white/85">
                    Tipo de veículo
                  </Label>
                  <select
                    id="driverVehicleType"
                    value={driverForm.vehicleType}
                    onChange={(e) =>
                      setDriverForm((prev) => ({
                        ...prev,
                        vehicleType: e.target.value as DriverVehicleType,
                      }))
                    }
                    className={`mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-white ${fieldClassName()}`}
                    disabled={driverSaving || driversLocked}
                  >
                    <option value="" className="bg-[#111111]">
                      Selecione
                    </option>
                    <option value="bike" className="bg-[#111111]">
                      Bicicleta
                    </option>
                    <option value="motorcycle" className="bg-[#111111]">
                      Moto
                    </option>
                    <option value="car" className="bg-[#111111]">
                      Carro
                    </option>
                    <option value="other" className="bg-[#111111]">
                      Outro
                    </option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="driverVehicleLabel" className="text-white/85">
                    Descrição do veículo
                  </Label>
                  <Input
                    id="driverVehicleLabel"
                    value={driverForm.vehicleLabel}
                    onChange={(e) =>
                      setDriverForm((prev) => ({ ...prev, vehicleLabel: e.target.value }))
                    }
                    placeholder="Ex.: Honda Fan preta"
                    className={`mt-2 ${fieldClassName()}`}
                    disabled={driverSaving || driversLocked}
                  />
                </div>

                <div>
                  <Label htmlFor="driverNotes" className="text-white/85">
                    Observações
                  </Label>
                  <textarea
                    id="driverNotes"
                    value={driverForm.notes}
                    onChange={(e) =>
                      setDriverForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Informações internas do entregador"
                    rows={4}
                    disabled={driverSaving || driversLocked}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-3 text-sm font-medium text-white">Status do entregador</p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white">
                      <input
                        type="radio"
                        checked={driverForm.active === true}
                        onChange={() =>
                          setDriverForm((prev) => ({ ...prev, active: true }))
                        }
                        className="accent-[#EA1D2C]"
                        disabled={driverSaving || driversLocked}
                      />
                      <span className="text-sm">Ativo</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white">
                      <input
                        type="radio"
                        checked={driverForm.active === false}
                        onChange={() =>
                          setDriverForm((prev) => ({ ...prev, active: false }))
                        }
                        className="accent-[#EA1D2C]"
                        disabled={driverSaving || driversLocked}
                      />
                      <span className="text-sm">Inativo</span>
                    </label>
                  </div>
                </div>

                {!driversUnlimited ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/65">
                    {storeDrivers.length} de {maxDeliveryDrivers} entregador(es) em uso no plano.
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={
                    driverSaving ||
                    driversLocked ||
                    (!editingDriverId && driversLimitReached)
                  }
                  className="h-12 w-full rounded-2xl bg-[#EA1D2C] text-white hover:bg-[#d31625]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {driverSaving
                    ? editingDriverId
                      ? 'Atualizando...'
                      : 'Cadastrando...'
                    : editingDriverId
                      ? 'Atualizar entregador'
                      : 'Cadastrar entregador'}
                </Button>

                <p className="text-xs text-white/45">
                  Esse cadastro já fica salvo no Supabase e pronto para ser vinculado aos pedidos.
                </p>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}