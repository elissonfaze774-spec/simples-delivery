import { useMemo } from 'react';
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
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import { useOrders } from '../../contexts/OrderContext';
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
          <div>
            {eyebrow ? (
              <div className="mb-2 inline-flex rounded-full border border-[#f3162d]/25 bg-[#f3162d]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff2c42]">
                {eyebrow}
              </div>
            ) : null}

            {title ? (
              <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
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
    <div className="rounded-[24px] border border-white/8 bg-[#090909] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <p className="text-sm text-zinc-400">{label}</p>
      <div
        className={`mt-2 text-[2rem] font-black tracking-tight ${
          money ? 'text-emerald-400' : 'text-white'
        }`}
      >
        {value}
      </div>
      <p className="mt-2 text-sm text-zinc-500">{helper}</p>
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
        <div>
          <p className="text-sm font-medium text-zinc-400">{label}</p>
          <div
            className={`mt-3 text-2xl font-black tracking-tight ${
              money ? 'text-emerald-400' : 'text-white'
            }`}
          >
            {value}
          </div>
          <p className="mt-2 text-sm text-zinc-500">{helper}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-[#121218] text-zinc-200">
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
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#f3162d]/20 bg-[#22090d] text-[#ff2541]">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <div className="text-2xl font-black tracking-tight text-white sm:text-xl">
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
        <h3 className="mt-2 text-2xl font-black tracking-tight text-white">
          Faturamento dos últimos 7 dias
        </h3>
        <div className="mt-4 inline-flex rounded-full border border-[#f3162d]/25 bg-[#1b090d] px-3 py-1 text-sm text-[#ff2c42]">
          Vendas da semana
        </div>
      </div>

      <div className="flex min-h-[250px] items-end justify-between gap-2 sm:gap-3">
        {data.map((item) => {
          const height = Math.max((item.total / maxValue) * 165, 8);

          return (
            <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center justify-end">
              <div className="mb-3 text-center text-sm font-bold text-emerald-400">
                {item.total > 0 ? formatMoney(item.total) : 'R$ 0,00'}
              </div>

              <div className="flex h-[170px] w-full items-end justify-center">
                <div
                  className="w-full rounded-t-[16px] bg-gradient-to-b from-emerald-300 to-emerald-700 shadow-[0_0_18px_rgba(16,185,129,0.25)]"
                  style={{ height: `${height}px` }}
                />
              </div>

              <div className="mt-4 text-lg font-black text-white">{item.label}</div>
              <div className="mt-1 text-sm text-zinc-500">
                {item.orders} {item.orders === 1 ? 'pedido' : 'pedidos'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 h-[2px] w-full rounded-full bg-[#651019]" />
    </div>
  );
}

function WelcomeCard({
  todayTotal,
  monthTotal,
  ticketAverage,
}: {
  todayTotal: number;
  monthTotal: number;
  ticketAverage: number;
}) {
  return (
    <DashboardSection eyebrow="Painel completo da loja">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-400">
            Loja ativa
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-black tracking-tight text-white">
            BEM-VINDO AO PAINEL DE VENDAS
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-300">
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
          <div className="mt-3 break-all text-base font-semibold text-white">
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
    <div className="grid gap-4 xl:grid-cols-3">
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
        <div className="rounded-[24px] border border-white/8 bg-[#070707] p-5">
          <p className="text-sm text-zinc-400">Faturamento mensal</p>
          <div className="mt-3 text-[2rem] font-black tracking-tight text-emerald-400">
            {formatMoney(monthTotal)}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-[#070707] p-5">
          <p className="text-sm text-zinc-400">Pedidos do mês</p>
          <div className="mt-3 text-[2rem] font-black tracking-tight text-white">
            {monthCount}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-[#070707] p-5">
          <p className="text-sm text-zinc-400">Ticket médio</p>
          <div className="mt-3 text-[2rem] font-black tracking-tight text-emerald-400">
            {formatMoney(ticketAverage)}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-[#070707] p-5">
          <p className="text-sm text-zinc-400">Plano atual</p>
          <div className="mt-3 text-[2rem] font-black tracking-tight text-white">
            {plan || 'Premium'}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-[#070707] p-5">
          <p className="text-sm text-zinc-400">WhatsApp da loja</p>
          <div className="mt-3 break-all text-[2rem] font-black tracking-tight text-white">
            {whatsapp || 'Não informado'}
          </div>
        </div>
      </div>
    </DashboardSection>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { stores, getStoreByAdminEmail, getStoreProducts, getStoreCategories, getStoreCoupons } =
    useStore();
  const { orders = [] } = useOrders();

  const adminBase = useMemo(() => resolveAdminBase(location.pathname), [location.pathname]);

  const store = useMemo(() => {
    if (user?.email && typeof getStoreByAdminEmail === 'function') {
      return getStoreByAdminEmail(user.email);
    }

    return stores?.[0];
  }, [getStoreByAdminEmail, stores, user?.email]);

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
        label: 'Categorias',
        description: 'Gerenciar categorias da loja',
        icon: ShoppingBag,
        onClick: goToProducts,
      },
      {
        label: 'Cupons',
        description: 'Criar descontos e campanhas',
        icon: Tag,
        onClick: () => goTo('coupons'),
      },
    ],
    [adminBase],
  );

  const visibleProducts = useMemo(() => {
    return storeProducts.filter((product: any) => product?.isActive !== false);
  }, [storeProducts]);

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
      stats={[
        {
          label: 'Produtos',
          value: visibleProducts.length,
          helper: 'Catálogo cadastrado',
        },
        {
          label: 'Categorias',
          value: storeCategories.length,
          helper: 'Organização do cardápio',
        },
        {
          label: 'Pedidos',
          value: monthMetrics.count,
          helper: 'Movimento total',
        },
        {
          label: 'Receita',
          value: formatMoney(totalRevenue),
          helper: 'Total acumulado',
        },
      ]}
    >
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-8">
          <WelcomeCard
            todayTotal={todayMetrics.total}
            monthTotal={monthMetrics.total}
            ticketAverage={monthMetrics.ticketAverage}
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
        />

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

        <MonthlySummarySection
          monthTotal={monthMetrics.total}
          monthCount={monthMetrics.count}
          ticketAverage={monthMetrics.ticketAverage}
          plan={store.plan}
          whatsapp={store.whatsapp}
          onOpenSettings={goToSettings}
        />
      </div>
    </AdminShell>
  );
}

export default AdminDashboardPage;