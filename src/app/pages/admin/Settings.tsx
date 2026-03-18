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

export function AdminSettings() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const { isLoaded, stores, getStore, getStoreByAdminEmail, updateStore } = useStore();

  const [copiedLink, setCopiedLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

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
  const currentThemeColor = String(
    (resolvedStore as any).themeColor ||
      (resolvedStore as any).theme_color ||
      '#EA1D2C'
  ).trim() || '#EA1D2C';

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
    const whatsapp = String(formData.get('whatsapp') || '').replace(/\D/g, '');
    const deliveryFee = Math.max(Number(rawDeliveryFee || 0), 0);
    const openingTime = String(formData.get('openingTime') || '').trim();
    const closingTime = String(formData.get('closingTime') || '').trim();
    const active = String(formData.get('active') || 'true') === 'true';
    const themeColor = String(formData.get('themeColor') || '#EA1D2C').trim() || '#EA1D2C';

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

    const payload: any = {
      name,
      whatsapp,
      deliveryFee,
      active,
      openingTime,
      closingTime,
      themeColor,
      logo: logo || currentLogoFallback || '🍔',
      logoUrl: logoUrl || currentLogoUrl || '',
      banner: banner || currentBanner || '',
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
                    <Label htmlFor="themeColor">Escolher cor</Label>
                    <Input
                      id="themeColor"
                      name="themeColor"
                      type="color"
                      defaultValue={currentThemeColor}
                      className="mt-2 h-12 w-full cursor-pointer rounded-2xl p-2"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm text-slate-500">Cores rápidas</p>
                    <div className="flex flex-wrap gap-2">
                      {themePresets.map((color) => (
                        <label
                          key={color}
                          className="relative cursor-pointer"
                          title={color}
                        >
                          <input
                            type="radio"
                            name="themeColor"
                            value={color}
                            defaultChecked={currentThemeColor.toLowerCase() === color.toLowerCase()}
                            className="peer sr-only"
                          />
                          <span
                            className="block h-10 w-10 rounded-full border-2 border-white shadow ring-1 ring-slate-200 peer-checked:scale-110 peer-checked:ring-2 peer-checked:ring-slate-900"
                            style={{ backgroundColor: color }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

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