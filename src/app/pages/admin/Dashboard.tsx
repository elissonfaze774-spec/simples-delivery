import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  ExternalLink,
  Package,
  Settings,
  ShoppingBag,
  Tag,
  TrendingUp,
  Wallet,
  AlertCircle,
  Moon,
  Bike,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import { useOrders } from '../../contexts/OrderContext';
import { useOrderNotifications } from '../../hooks/useOrderNotifications';
import { Button } from '../../components/ui/button';
import { AdminShell } from '../../components/admin/AdminShell';
import { getStoreUrl } from '../../lib/urls';

type DailyChartItem = {
  label: string;
  total: number;
  orders: number;
};

type ShortcutItem = {
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
};

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getDayLabel(date: Date) {
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return labels[date.getDay()];
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function resolveAdminBase(pathname: string) {
  if (pathname.includes('/painel')) return '/painel';
  if (pathname.includes('/super-admin')) return '/super-admin';
  if (pathname.includes('/superadmin')) return '/superadmin';
  return '/admin';
}

function getOrderType(order: any): 'delivery' | 'pickup' {
  if (order?.deliveryMethod === 'pickup') return 'pickup';
  if (order?.deliveryMethod === 'delivery') return 'delivery';
  return order?.customerAddress ? 'delivery' : 'pickup';
}

function DashboardSection({
  eyebrow,
  title,
  action,
  className = '',
  children,
}: {
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-[28px] border border-red-950/40 bg-[#0a0a0a] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.30)] sm:p-6 ${className}`}
    >
      {(eyebrow || title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="mb-2 inline-flex rounded-full border border-[#f3162d]/25 bg-[#f3162d]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff2c42]">
                {eyebrow}
              </div>
            ) : null}

            {title ? (
              <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">{title}</h2>
            ) : null}
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}

      {children}
    </section>
  );
}

function MetricBox({
  label,
  value,
  helper,
  money = false,
}: {
  label: string;
  value: string;
  helper: string;
  money?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[24px] border border-white/8 bg-[#090909] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <p className="text-sm text-zinc-400">{label}</p>
      <div
        className={`mt-2 min-w-0 break-words text-xl font-black leading-tight tracking-tight sm:text-[2rem] ${
          money ? 'text-emerald-400' : 'text-white'
        }`}
      >
        {value}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{helper}</p>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  money = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  money?: boolean;
}) {
  return (
    <div className="rounded-[26px] border border-red-950/40 bg-[#0b0b0b] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-400">{label}</p>
          <div
            className={`mt-3 min-w-0 break-words text-xl font-black leading-tight tracking-tight sm:text-2xl ${
              money ? 'text-emerald-400' : 'text-white'
            }`}
          >
            {value}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{helper}</p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-[#121218] text-zinc-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ShortcutCard({ item }: { item: ShortcutItem }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={item.onClick}
      className="flex w-full items-center justify-between gap-4 rounded-[26px] border border-red-950/40 bg-[#0a0a0a] p-5 text-left shadow-[0_16px_40px_rgba(0,0,0,0.25)] transition hover:border-[#f3162d]/35 hover:bg-[#101010]"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#f3162d]/20 bg-[#22090d] text-[#ff2541]">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="text-lg font-black tracking-tight text-white sm:text-xl">
            {item.label}
          </div>
          <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
        </div>
      </div>

      <ArrowUpRight className="h-5 w-5 shrink-0 text-zinc-400" />
    </button>
  );
}

function RevenueChart({ data }: { data: DailyChartItem[] }) {
  const maxValue = Math.max(...data.map((item) => item.total), 1);

  return (
    <div className="rounded-[24px] border border-red-950/40 bg-[#0a0a0a] p-4 sm:p-5">
      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff2c42]">
          Desempenho diário
        </div>
        <h3 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
          Faturamento dos últimos 7 dias
        </h3>
        <div className="mt-4 inline-flex rounded-full border border-[#f3162d]/25 bg-[#1b090d] px-3 py-1 text-sm text-[#ff2c42]">
          Vendas da semana
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex min-h-[250px] min-w-[560px] items-end justify-between gap-3 sm:min-w-0 sm:gap-3">
          {data.map((item) => {
            const height = Math.max((item.total / maxValue) * 165, 8);

            return (
              <div
                key={item.label}
                className="flex min-w-[64px] flex-1 flex-col items-center justify-end"
              >
                <div className="mb-3 max-w-[72px] text-center text-[11px] font-bold leading-tight text-emerald-400 sm:max-w-none sm:text-sm">
                  {item.total > 0 ? formatMoney(item.total) : 'R$ 0,00'}
                </div>

                <div className="flex h-[170px] w-full items-end justify-center">
                  <div
                    className="w-full rounded-t-[16px] bg-gradient-to-b from-emerald-300 to-emerald-700 shadow-[0_0_18px_rgba(16,185,129,0.25)]"
                    style={{ height: `${height}px` }}
                  />
                </div>

                <div className="mt-4 text-sm font-black text-white sm:text-lg">{item.label}</div>
                <div className="mt-1 max-w-[72px] text-center text-[11px] leading-tight text-zinc-500 sm:max-w-none sm:text-sm">
                  {item.orders} {item.orders === 1 ? 'pedido' : 'pedidos'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 h-[2px] w-full rounded-full bg-[#651019]" />
    </div>
  );
}

function SuspensionNoticeCard({ isSuspended, isClosed }: { isSuspended: boolean; isClosed: boolean }) {
  if (!isSuspended && !isClosed) return null;

  return (
    <div
      className={`rounded-[28px] border p-5 ${
        isSuspended
          ? 'border-amber-500/20 bg-amber-500/10'
          : 'border-blue-500/20 bg-blue-500/10'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            isSuspended ? 'bg-amber-500/15 text-amber-300' : 'bg-blue-500/15 text-blue-300'
          }`}
        >
          {isSuspended ? <AlertCircle className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white">
            {isSuspended ? 'Loja temporariamente indisponível' : 'Loja fechada no momento'}
          </h3>

          <p className="mt-2 text-sm text-zinc-300">
            {isSuspended
              ? 'No momento sua loja está com recebimento de pedidos temporariamente indisponível. Regularizando a conta, tudo volta ao normal.'
              : 'Sua loja está fechada no momento. Os clientes continuam vendo a vitrine, mas não conseguem concluir pedidos até a reabertura.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function WelcomeCard({
  todayTotal,
  monthTotal,
  ticketAverage,
  isSuspended,
  isClosed,
}: {
  todayTotal: number;
  monthTotal: number;
  ticketAverage: number;
  isSuspended: boolean;
  isClosed: boolean;
}) {
  return (
    <DashboardSection eyebrow="Painel completo da loja">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              isSuspended
                ? 'border border-amber-500/25 bg-amber-500/10 text-amber-400'
                : isClosed
                  ? 'border border-blue-500/25 bg-blue-500/10 text-blue-400'
                  : 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {isSuspended ? 'Loja temporariamente indisponível' : isClosed ? 'Loja fechada' : 'Loja ativa'}
          </div>
        </div>

        <div className="min-w-0">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
            BEM-VINDO AO PAINEL DE VENDAS
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7">
            Acompanhe faturamento, pedidos, crescimento e desempenho em um painel mais limpo,
            profissional e fácil de usar.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricBox
            label="Hoje"
            value={formatMoney(todayTotal)}
            helper="Vendas do dia atual"
            money
          />
          <MetricBox
            label="Este mês"
            value={formatMoney(monthTotal)}
            helper="Faturamento mensal"
            money
          />
          <MetricBox
            label="Ticket médio"
            value={formatMoney(ticketAverage)}
            helper="Valor médio por pedido"
            money
          />
        </div>
      </div>
    </DashboardSection>
  );
}

function StoreLinkCard({
  storeUrl,
  onOpenStore,
  onEditStore,
}: {
  storeUrl: string;
  onOpenStore: () => void;
  onEditStore: () => void;
}) {
  return (
    <DashboardSection title="LINK DA LOJA">
      <div className="flex h-full flex-col gap-5">
        <div className="rounded-[24px] border border-white/8 bg-[#070707] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            URL pública
          </div>
          <div className="mt-3 break-all text-sm font-semibold text-white sm:text-base">
            {storeUrl || 'Link indisponível'}
          </div>
        </div>

        <Button
          type="button"
          onClick={onOpenStore}
          className="h-12 rounded-full bg-[#ff1833] text-base font-bold text-white shadow-[0_0_24px_rgba(255,24,51,0.35)] hover:bg-[#ff2942]"
        >
          Ver loja
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onEditStore}
          className="h-12 rounded-full border-white/10 bg-[#050505] text-base font-bold text-white hover:bg-[#111111]"
        >
          <Settings className="mr-2 h-4 w-4" />
          Editar loja
        </Button>
      </div>
    </DashboardSection>
  );
}

function ShortcutsSection({ shortcuts }: { shortcuts: ShortcutItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {shortcuts.map((item) => (
        <ShortcutCard key={item.label} item={item} />
      ))}
    </div>
  );
}

function SummaryCardsSection({
  totalRevenue,
  monthCount,
  visibleProducts,
  storeCoupons,
}: {
  totalRevenue: number;
  monthCount: number;
  visibleProducts: number;
  storeCoupons: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      <SummaryCard
        icon={Wallet}
        label="Faturamento total"
        value={formatMoney(totalRevenue)}
        helper="Tudo que sua loja já vendeu"
        money
      />
      <SummaryCard
        icon={TrendingUp}
        label="Pedidos no mês"
        value={String(monthCount)}
        helper="Quantidade de pedidos neste mês"
      />
      <SummaryCard
        icon={Package}
        label="Produtos ativos"
        value={String(visibleProducts)}
        helper="Itens disponíveis no catálogo"
      />
      <SummaryCard
        icon={Tag}
        label="Cupons criados"
        value={String(storeCoupons)}
        helper="Campanhas e descontos ativos"
      />
    </div>
  );
}

function MonthlySummarySection({
  monthTotal,
  monthCount,
  ticketAverage,
  plan,
  whatsapp,
  onOpenSettings,
}: {
  monthTotal: number;
  monthCount: number;
  ticketAverage: number;
  plan?: string;
  whatsapp?: string;
  onOpenSettings: () => void;
}) {
  return (
    <DashboardSection
      eyebrow="Resumo mensal"
      title="Sua loja este mês"
      action={
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f3162d]/20 bg-[#22090d] text-[#ff2541] transition hover:bg-[#2c0c11]"
        >
          <ArrowUpRight className="h-5 w-5" />
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="min-w-0 rounded-[24px] border border-white/8 bg-[#070707] p-5">
          <p className="text-sm text-zinc-400">Faturamento mensal</p>
          <div className="mt-3 break-words text-xl font-black leading-tight tracking-tight text-emerald-400 sm:text-[2rem]">
            {formatMoney(monthTotal)}
          </div>
        </div>

        <div className="min-w-0 rounded-[24px] border border-white/8 bg-[#070707] p-5">
          <p className="text-sm text-zinc-400">Pedidos do mês</p>
          <div className="mt-3 break-words text-xl font-black leading-tight tracking-tight text-white sm:text-[2rem]">
            {monthCount}
          </div>
        </div>

        <div className="min-w-0 rounded-[24px] border border-white/8 bg-[#070707] p-5">
          <p className="text-sm text-zinc-400">Ticket médio</p>
          <div className="mt-3 break-words text-xl font-black leading-tight tracking-tight text-emerald-400 sm:text-[2rem]">
            {formatMoney(ticketAverage)}
          </div>
        </div>

        <div className="min-w-0 rounded-[24px] border border-white/8 bg-[#070707] p-5">
          <p className="text-sm text-zinc-400">Plano atual</p>
          <div className="mt-3 break-words text-xl font-black leading-tight tracking-tight text-white sm:text-[2rem]">
            {plan || 'Premium'}
          </div>
        </div>

        <div className="min-w-0 rounded-[24px] border border-white/8 bg-[#070707] p-5">
          <p className="text-sm text-zinc-400">WhatsApp da loja</p>
          <div className="mt-3 break-all text-lg font-black leading-tight tracking-tight text-white sm:text-[2rem]">
            {whatsapp || 'Não informado'}
          </div>
        </div>
      </div>
    </DashboardSection>
  );
}

function DeliveryOperationsSection({
  driversCount,
  totalDeliveryOrders,
  assignedOrders,
  outForDelivery,
  deliveredOrders,
  unassignedOrders,
  onOpenSettings,
}: {
  driversCount: number;
  totalDeliveryOrders: number;
  assignedOrders: number;
  outForDelivery: number;
  deliveredOrders: number;
  unassignedOrders: number;
  onOpenSettings: () => void;
}) {
  return (
    <DashboardSection
      eyebrow="Operação de entregas"
      title="Visão rápida dos entregadores"
      action={
        <Button
          type="button"
          variant="outline"
          onClick={onOpenSettings}
          className="h-11 rounded-full border-white/10 bg-[#050505] px-4 text-white hover:bg-[#111111]"
        >
          <Bike className="mr-2 h-4 w-4" />
          Gerenciar
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          icon={Bike}
          label="Entregadores"
          value={String(driversCount)}
          helper="Cadastrados na sua loja"
        />
        <SummaryCard
          icon={ShoppingBag}
          label="Pedidos com entrega"
          value={String(totalDeliveryOrders)}
          helper="Pedidos do tipo delivery"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Pedidos atribuídos"
          value={String(assignedOrders)}
          helper="Já vinculados a um entregador"
        />
        <SummaryCard
          icon={Bike}
          label="Em rota"
          value={String(outForDelivery)}
          helper="Saiu para entrega"
        />
        <SummaryCard
          icon={Wallet}
          label="Entregues"
          value={String(deliveredOrders)}
          helper="Entregas concluídas"
        />
        <SummaryCard
          icon={AlertCircle}
          label="Sem entregador"
          value={String(unassignedOrders)}
          helper="Pedidos aguardando vínculo"
        />
      </div>
    </DashboardSection>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    stores,
    getStoreByAdminEmail,
    getStoreProducts,
    getStoreCategories,
    getStoreCoupons,
    getStoreDeliveryDrivers,
  } = useStore();
  const { orders = [] } = useOrders();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkScreen();
    window.addEventListener('resize', checkScreen);

    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const adminBase = useMemo(() => resolveAdminBase(location.pathname), [location.pathname]);

  const store = useMemo(() => {
    if (user?.email && typeof getStoreByAdminEmail === 'function') {
      return getStoreByAdminEmail(user.email);
    }

    return stores?.[0];
  }, [getStoreByAdminEmail, stores, user?.email]);

  useOrderNotifications(store?.id);

  const isStoreSuspended = !!store?.suspended;
  const isStoreClosed = !!store && !store.suspended && !store.active;

  const storeProducts = useMemo(() => {
    if (!store?.id || typeof getStoreProducts !== 'function') return [];
    return getStoreProducts(store.id) ?? [];
  }, [getStoreProducts, store?.id]);

  const storeCategories = useMemo(() => {
    if (!store?.id || typeof getStoreCategories !== 'function') return [];
    return getStoreCategories(store.id) ?? [];
  }, [getStoreCategories, store?.id]);

  const storeCoupons = useMemo(() => {
    if (!store?.id || typeof getStoreCoupons !== 'function') return [];
    return getStoreCoupons(store.id) ?? [];
  }, [getStoreCoupons, store?.id]);

  const storeDrivers = useMemo(() => {
    if (!store?.id || typeof getStoreDeliveryDrivers !== 'function') return [];
    return getStoreDeliveryDrivers(store.id) ?? [];
  }, [getStoreDeliveryDrivers, store?.id]);

  const storeOrders = useMemo(() => {
    if (!store?.id) return [];
    return (orders ?? []).filter((order: any) => order.storeId === store.id);
  }, [orders, store?.id]);

  const activeOrders = useMemo(() => {
    return storeOrders.filter((order: any) => order.status !== 'cancelled');
  }, [storeOrders]);

  const totalRevenue = useMemo(() => {
    return activeOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
  }, [activeOrders]);

  const todayMetrics = useMemo(() => {
    const now = new Date();

    const todayOrders = activeOrders.filter((order: any) => {
      const createdAt = new Date(order.createdAt);
      return isSameDay(createdAt, now);
    });

    const total = todayOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);

    return {
      count: todayOrders.length,
      total,
    };
  }, [activeOrders]);

  const monthMetrics = useMemo(() => {
    const now = new Date();

    const monthOrders = activeOrders.filter((order: any) => {
      const createdAt = new Date(order.createdAt);
      return isSameMonth(createdAt, now);
    });

    const total = monthOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);

    return {
      count: monthOrders.length,
      total,
      ticketAverage: monthOrders.length > 0 ? total / monthOrders.length : 0,
    };
  }, [activeOrders]);

  const deliveryMetrics = useMemo(() => {
    const deliveryOrders = activeOrders.filter((order: any) => getOrderType(order) === 'delivery');

    const assignedOrders = deliveryOrders.filter((order: any) => !!order.deliveryDriverId).length;
    const outForDelivery = deliveryOrders.filter(
      (order: any) =>
        order.deliveryStatus === 'out_for_delivery' || order.status === 'delivering'
    ).length;
    const deliveredOrders = deliveryOrders.filter(
      (order: any) =>
        order.deliveryStatus === 'delivered' || order.status === 'completed'
    ).length;
    const unassignedOrders = deliveryOrders.filter(
      (order: any) => !order.deliveryDriverId || order.deliveryStatus === 'unassigned'
    ).length;

    return {
      totalDeliveryOrders: deliveryOrders.length,
      assignedOrders,
      outForDelivery,
      deliveredOrders,
      unassignedOrders,
    };
  }, [activeOrders]);

  const dailyChartData = useMemo<DailyChartItem[]>(() => {
    const today = new Date();

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));

      const dayOrders = activeOrders.filter((order: any) => {
        const createdAt = new Date(order.createdAt);
        return isSameDay(createdAt, date);
      });

      return {
        label: getDayLabel(date),
        total: dayOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0),
        orders: dayOrders.length,
      };
    });
  }, [activeOrders]);

  const storeUrl = useMemo(() => {
    if (!store?.slug) return '';
    try {
      return getStoreUrl(store.slug);
    } catch {
      return '';
    }
  }, [store]);

  const handleOpenStore = () => {
    if (!storeUrl) return;
    window.open(storeUrl, '_blank', 'noopener,noreferrer');
  };

  const goTo = (segment: string) => {
    navigate(`${adminBase}/${segment}`);
  };

  const goToProducts = () => {
    navigate(`${adminBase}/products`);
  };

  const goToSettings = () => {
    navigate(`${adminBase}/settings`);
  };

  const shortcuts = useMemo<ShortcutItem[]>(
    () => [
      {
        label: 'Produtos',
        description: 'Criar, editar e organizar itens',
        icon: Package,
        onClick: goToProducts,
      },
      {
        label: 'Pedidos',
        description: 'Acompanhar pedidos da loja',
        icon: TrendingUp,
        onClick: () => goTo('orders'),
      },
      {
        label: 'Cupons',
        description: 'Criar descontos e campanhas',
        icon: Tag,
        onClick: () => goTo('coupons'),
      },
      {
        label: 'Entregadores',
        description: 'Gerenciar equipe de entrega',
        icon: Bike,
        onClick: goToSettings,
      },
    ],
    [adminBase]
  );

  const visibleProducts = useMemo(() => {
    return storeProducts.filter(
      (product: any) =>
        product?.available !== false &&
        product?.isAvailable !== false &&
        product?.is_available !== false &&
        product?.isActive !== false
    );
  }, [storeProducts]);

  const topStats = [
    {
      label: 'Produtos',
      value: visibleProducts.length,
      helper: 'Catálogo cadastrado',
    },
    {
      label: 'Pedidos',
      value: monthMetrics.count,
      helper: 'Movimento do mês',
    },
    {
      label: 'Entregadores',
      value: storeDrivers.length,
      helper: 'Equipe cadastrada',
    },
    {
      label: 'Receita',
      value: formatMoney(totalRevenue),
      helper: 'Total acumulado',
    },
  ];

  if (!store) {
    return (
      <AdminShell title="Dashboard" subtitle="Sua loja ainda não foi encontrada.">
        <div className="rounded-[28px] border border-red-950/40 bg-[#0a0a0a] p-6 text-zinc-300">
          Nenhuma loja vinculada ao seu usuário.
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Dashboard"
      subtitle={store.name}
      actions={
        <Button
          type="button"
          onClick={handleOpenStore}
          className="h-12 w-full rounded-full bg-[#ff1833] px-6 text-base font-bold text-white shadow-[0_0_24px_rgba(255,24,51,0.35)] hover:bg-[#ff2942] lg:w-auto"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Ver loja
        </Button>
      }
      stats={isMobile ? [] : topStats}
    >
      <div className="space-y-6">
        <SuspensionNoticeCard isSuspended={isStoreSuspended} isClosed={isStoreClosed} />

        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-8">
            <WelcomeCard
              todayTotal={todayMetrics.total}
              monthTotal={monthMetrics.total}
              ticketAverage={monthMetrics.ticketAverage}
              isSuspended={isStoreSuspended}
              isClosed={isStoreClosed}
            />
          </div>

          <div className="lg:col-span-4">
            <StoreLinkCard
              storeUrl={storeUrl}
              onOpenStore={handleOpenStore}
              onEditStore={goToSettings}
            />
          </div>

          <div className="lg:col-span-12">
            <ShortcutsSection shortcuts={shortcuts} />
          </div>

          <div className="lg:col-span-7">
            <RevenueChart data={dailyChartData} />
          </div>

          <div className="lg:col-span-5">
            <SummaryCardsSection
              totalRevenue={totalRevenue}
              monthCount={monthMetrics.count}
              visibleProducts={visibleProducts.length}
              storeCoupons={storeCoupons.length}
            />
          </div>

          <div className="lg:col-span-12">
            <DeliveryOperationsSection
              driversCount={storeDrivers.length}
              totalDeliveryOrders={deliveryMetrics.totalDeliveryOrders}
              assignedOrders={deliveryMetrics.assignedOrders}
              outForDelivery={deliveryMetrics.outForDelivery}
              deliveredOrders={deliveryMetrics.deliveredOrders}
              unassignedOrders={deliveryMetrics.unassignedOrders}
              onOpenSettings={goToSettings}
            />
          </div>

          <div className="lg:col-span-12">
            <MonthlySummarySection
              monthTotal={monthMetrics.total}
              monthCount={monthMetrics.count}
              ticketAverage={monthMetrics.ticketAverage}
              plan={store.plan}
              whatsapp={store.whatsapp}
              onOpenSettings={goToSettings}
            />
          </div>
        </div>

        <div className="space-y-6 lg:hidden">
          <WelcomeCard
            todayTotal={todayMetrics.total}
            monthTotal={monthMetrics.total}
            ticketAverage={monthMetrics.ticketAverage}
            isSuspended={isStoreSuspended}
            isClosed={isStoreClosed}
          />

          <div className="grid gap-4">
            <SummaryCard
              icon={Package}
              label="Produtos"
              value={String(visibleProducts.length)}
              helper="Catálogo cadastrado"
            />
            <SummaryCard
              icon={ShoppingBag}
              label="Categorias"
              value={String(storeCategories.length)}
              helper="Organização do cardápio"
            />
            <SummaryCard
              icon={TrendingUp}
              label="Pedidos"
              value={String(monthMetrics.count)}
              helper="Movimento total"
            />
            <SummaryCard
              icon={Wallet}
              label="Receita"
              value={formatMoney(totalRevenue)}
              helper="Total acumulado"
              money
            />
          </div>

          <StoreLinkCard
            storeUrl={storeUrl}
            onOpenStore={handleOpenStore}
            onEditStore={goToSettings}
          />

          <ShortcutsSection shortcuts={shortcuts} />

          <RevenueChart data={dailyChartData} />

          <SummaryCardsSection
            totalRevenue={totalRevenue}
            monthCount={monthMetrics.count}
            visibleProducts={visibleProducts.length}
            storeCoupons={storeCoupons.length}
          />

          <DeliveryOperationsSection
            driversCount={storeDrivers.length}
            totalDeliveryOrders={deliveryMetrics.totalDeliveryOrders}
            assignedOrders={deliveryMetrics.assignedOrders}
            outForDelivery={deliveryMetrics.outForDelivery}
            deliveredOrders={deliveryMetrics.deliveredOrders}
            unassignedOrders={deliveryMetrics.unassignedOrders}
            onOpenSettings={goToSettings}
          />

          <MonthlySummarySection
            monthTotal={monthMetrics.total}
            monthCount={monthMetrics.count}
            ticketAverage={monthMetrics.ticketAverage}
            plan={store.plan}
            whatsapp={store.whatsapp}
            onOpenSettings={goToSettings}
          />
        </div>
      </div>
    </AdminShell>
  );
}

export default AdminDashboardPage;