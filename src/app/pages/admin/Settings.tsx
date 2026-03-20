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

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
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

function normalizeDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

export function AdminSettings() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const { isLoaded, stores, getStore, getStoreByAdminEmail, updateStore } = useStore();

  const [copiedLink, setCopiedLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedThemeColor, setSelectedThemeColor] = useState('#EA1D2C');
  const [cepLoading, setCepLoading] = useState(false);

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

  const currentPlan =
    (resolvedStore as any).plan || (resolvedStore as any).plan_id || 'iniciante';

  const currentDeliveryFee = Number((resolvedStore as any).deliveryFee || 0);

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

    const rawDeliveryFee = String(formData.get('deliveryFee') || '0')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const name = String(formData.get('name') || '').trim();
    const logo = String(formData.get('logo') || '').trim();
    const logoUrl = String(formData.get('logoUrl') || '').trim();
    const banner = String(formData.get('banner') || '').trim();
    const whatsapp = normalizeDigits(String(formData.get('whatsapp') || ''));
    const deliveryFee = Math.max(Number(rawDeliveryFee || 0), 0);
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

    if (!Number.isFinite(deliveryFee)) {
      toast.error('Informe uma taxa de entrega válida.');
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
      subtitle="Ajuste sua loja e compartilhe com facilidade"
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
          value: formatMoney(currentDeliveryFee),
          helper: 'Taxa padrão da loja',
        },
      ]}
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card className="rounded-[28px] border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-[0.25em] text-white/60">Link público</p>
                <h2 className="mt-3 text-2xl font-bold">Compartilhe sua loja</h2>
                <p className="mt-2 text-sm text-white/75">
                  Use o link ou QR Code para divulgar seu cardápio e receber pedidos.
                </p>
              </div>

              <Globe className="h-5 w-5 shrink-0 text-white/70" />
            </div>

            <div className="mt-5 break-all rounded-3xl bg-white/10 p-4 text-sm text-white/90">
              {storeLink}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleCopyLink}
                className="rounded-full bg-white text-slate-950 hover:bg-white/90"
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
                className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"
                onClick={() => window.open(storeLink, '_blank', 'noopener,noreferrer')}
              >
                Abrir loja
              </Button>
            </div>
          </Card>

          <Card className="rounded-[28px] border-0 bg-white p-6 text-center shadow-[0_24px_70px_-45px_rgba(15,23,42,0.65)]">
            <div className="mb-4 flex items-center justify-center gap-2 text-sm text-slate-500">
              <QrCodeIcon className="h-4 w-4 text-[#EA1D2C]" />
              QR Code da loja
            </div>

            <div className="inline-flex max-w-full rounded-[28px] bg-slate-50 p-5">
              <QRCodeSVG value={storeLink} size={220} includeMargin />
            </div>
          </Card>
        </div>

        <Card className="rounded-[28px] border-0 bg-white p-6 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.65)]">
          <div className="mb-6">
            <p className="text-sm text-slate-500">Aparência, contato, entrega e tema</p>
            <h2 className="text-2xl font-bold text-slate-950">Informações da loja</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="name">Nome da loja</Label>
                <div className="relative mt-2">
                  <StoreIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="name"
                    name="name"
                    defaultValue={resolvedStore.name || ''}
                    required
                    className="h-12 rounded-2xl pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="logo">Logo fallback (emoji)</Label>
                <Input
                  id="logo"
                  name="logo"
                  defaultValue={currentLogoFallback || '🍔'}
                  className="mt-2 h-12 rounded-2xl"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <div className="relative mt-2">
                  <MessageCircle className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    placeholder="5511999999999"
                    defaultValue={(resolvedStore as any).whatsapp || ''}
                    required
                    className="h-12 rounded-2xl pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="deliveryFee">Taxa de entrega</Label>
                <div className="relative mt-2">
                  <Wallet className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="deliveryFee"
                    name="deliveryFee"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={currentDeliveryFee}
                    className="h-12 rounded-2xl pl-10"
                  />
                </div>
              </div>

              <div className="flex items-end rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Valor atual da entrega:
                <span className="ml-2 font-semibold">{formatMoney(currentDeliveryFee)}</span>
              </div>

              <div className="md:col-span-2 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#EA1D2C]" />
                  <p className="text-sm font-semibold text-slate-900">Endereço da loja</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="storeCep">CEP</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        id="storeCep"
                        name="storeCep"
                        placeholder="00000000"
                        defaultValue={currentStoreCep}
                        className="h-12 rounded-2xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSearchCep}
                        disabled={cepLoading}
                        className="h-12 rounded-2xl"
                      >
                        {cepLoading ? 'Buscando...' : 'Buscar CEP'}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="storeNumber">Número</Label>
                    <Input
                      id="storeNumber"
                      name="storeNumber"
                      placeholder="123"
                      defaultValue={currentStoreNumber}
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="storeStreet">Rua</Label>
                    <Input
                      id="storeStreet"
                      name="storeStreet"
                      placeholder="Rua da loja"
                      defaultValue={currentStoreStreet}
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="storeComplement">Complemento</Label>
                    <Input
                      id="storeComplement"
                      name="storeComplement"
                      placeholder="Sala, bloco, apto..."
                      defaultValue={currentStoreComplement}
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="storeNeighborhood">Bairro</Label>
                    <Input
                      id="storeNeighborhood"
                      name="storeNeighborhood"
                      placeholder="Bairro"
                      defaultValue={currentStoreNeighborhood}
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="storeCity">Cidade</Label>
                    <Input
                      id="storeCity"
                      name="storeCity"
                      placeholder="Cidade"
                      defaultValue={currentStoreCity}
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="storeState">Estado</Label>
                    <Input
                      id="storeState"
                      name="storeState"
                      placeholder="UF"
                      defaultValue={currentStoreState}
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="storeReference">Ponto de referência</Label>
                    <Input
                      id="storeReference"
                      name="storeReference"
                      placeholder="Próximo a..."
                      defaultValue={currentStoreReference}
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="storeLatitude">Latitude</Label>
                    <Input
                      id="storeLatitude"
                      name="storeLatitude"
                      placeholder="-9.000000"
                      defaultValue={currentStoreLatitude}
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="storeLongitude">Longitude</Label>
                    <Input
                      id="storeLongitude"
                      name="storeLongitude"
                      placeholder="-36.000000"
                      defaultValue={currentStoreLongitude}
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Power className="h-4 w-4 text-[#EA1D2C]" />
                  <p className="text-sm font-semibold text-slate-900">Status da loja</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <input
                      type="radio"
                      name="active"
                      value="true"
                      defaultChecked={isStoreActive}
                    />
                    <span className="text-sm font-medium text-slate-800">Loja aberta</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <input
                      type="radio"
                      name="active"
                      value="false"
                      defaultChecked={!isStoreActive}
                    />
                    <span className="text-sm font-medium text-slate-800">Loja fechada</span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="openingTime">Abre às</Label>
                <div className="relative mt-2">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="openingTime"
                    name="openingTime"
                    type="time"
                    defaultValue={currentOpeningTime}
                    className="h-12 rounded-2xl pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="closingTime">Fecha às</Label>
                <div className="relative mt-2">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="closingTime"
                    name="closingTime"
                    type="time"
                    defaultValue={currentClosingTime}
                    className="h-12 rounded-2xl pl-10"
                  />
                </div>
              </div>

              <div className="md:col-span-2 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#EA1D2C]" />
                  <p className="text-sm font-semibold text-slate-900">Cor do tema da loja</p>
                </div>

                <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                  <div>
                    <Label htmlFor="themeColorPicker">Escolher cor</Label>
                    <Input
                      id="themeColorPicker"
                      type="color"
                      value={selectedThemeColor}
                      onChange={(e) => setSelectedThemeColor(e.target.value)}
                      className="mt-2 h-12 w-full cursor-pointer rounded-2xl p-2"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm text-slate-500">Cores rápidas</p>
                    <div className="flex flex-wrap gap-2">
                      {themePresets.map((color) => (
                        <button
                          key={color}
                          type="button"
                          title={color}
                          onClick={() => setSelectedThemeColor(color)}
                          className={`h-10 w-10 rounded-full border-2 shadow ring-1 ring-slate-200 transition ${
                            selectedThemeColor.toLowerCase() === color.toLowerCase()
                              ? 'scale-110 border-slate-900 ring-2 ring-slate-900'
                              : 'border-white'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <input type="hidden" name="themeColor" value={selectedThemeColor} />

                <p className="mt-3 text-xs text-slate-500">
                  Essa cor será usada na vitrine da loja para botões, topo e destaques.
                </p>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="logoUrl">URL da logo</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  type="url"
                  placeholder="https://exemplo.com/logo.png"
                  defaultValue={currentLogoUrl}
                  className="mt-2 h-12 rounded-2xl"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="banner">URL do banner</Label>
                <Input
                  id="banner"
                  name="banner"
                  type="url"
                  placeholder="https://exemplo.com/banner.png"
                  defaultValue={currentBanner}
                  className="mt-2 h-12 rounded-2xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="h-12 w-full rounded-2xl bg-[#EA1D2C] hover:bg-[#d31625]"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}