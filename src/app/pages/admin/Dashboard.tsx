import {
  ArrowUpRight,
  Clock3,
  ExternalLink,
  Eye,
  Package,
  Settings,
  ShoppingBag,
  Store as StoreIcon,
  Tag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import { useOrders } from '../../contexts/OrderContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
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
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getDate() === dateB.getDate() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getFullYear() === dateB.getFullYear()
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function SimpleBarChart({ data }: { data: DailyChartItem[] }) {
  const maxValue = Math.max(...data.map((item) => item.total), 1);

  return (
    <div className="rounded-[24px] border border-red-950/40 bg-[#101010] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:rounded-[28px] sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-red-300/80 sm:text-xs">
            Desempenho diário
          </p>
          <h3 className="mt-2 text-lg font-bold text-white sm:text-xl">
            Faturamento dos últimos 7 dias
          </h3>
        </div>

        <div className="w-fit rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-300 sm:text-xs">
          Vendas da semana
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[560px] items-end gap-3 pb-2">
          {data.map((item) => {
            const height = Math.max((item.total / maxValue) * 100, item.total > 0 ? 10 : 4);

            return (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-2 sm:gap-3">
                <div className="text-center">
                  <div className="text-[10px] font-semibold text-red-300 sm:text-[11px]">
                    {item.total > 0 ? formatMoney(item.total) : 'R$ 0,00'}
                  </div>
                </div>

                <div className="flex h-44 w-full items-end sm:h-52">
                  <div
                    className="w-full rounded-t-2xl bg-gradient-to-t from-[#a30011] via-[#d91124] to-[#ff4458] transition-all"
                    style={{ height: `${height}%` }}
                    title={`${item.orders} pedido(s) • ${formatMoney(item.total)}`}
                  />
                </div>

                <div className="text-center">
                  <div className="text-sm font-semibold capitalize text-white">{item.label}</div>
                  <div className="text-[10px] text-zinc-400 sm:text-[11px]">
                    {item.orders} pedidos
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuickStatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: 'default' | 'money';
}) {
  const isMoney = tone === 'money';

  return (
    <Card className="rounded-[24px] border border-red-950/40 bg-[#101010] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:rounded-[28px] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-400">{label}</p>
          <h3
            className={`mt-3 break-words text-2xl font-black tracking-tight sm:text-3xl ${
              isMoney ? 'text-red-400' : 'text-white'
            }`}
          >
            {value}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">{helper}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border sm:h-12 sm:w-12 ${
            isMoney
              ? 'border-red-500/20 bg-red-500/10 text-red-300'
              : 'border-zinc-800 bg-zinc-900 text-zinc-300'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const {
    getStore,
    getStoreByAdminEmail,
    getStoreProducts,
    getStoreCategories,
    getStoreCoupons,
  } = useStore();
  const { getStoreOrders } = useOrders();

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

    if (user.storeId) {
      const storeById = getStore(user.storeId);
      if (storeById) return storeById;
    }

    if (user.email) {
      const storeByEmail = getStoreByAdminEmail(user.email);
      if (storeByEmail) return storeByEmail;
    }

    return undefined;
  }, [user, getStore, getStoreByAdminEmail]);

  const products = useMemo(
    () => (resolvedStore ? getStoreProducts(resolvedStore.id) : []),
    [resolvedStore, getStoreProducts]
  );

  const categories = useMemo(
    () => (resolvedStore ? getStoreCategories(resolvedStore.id) : []),
    [resolvedStore, getStoreCategories]
  );

  const coupons = useMemo(
    () => (resolvedStore ? getStoreCoupons(resolvedStore.id) : []),
    [resolvedStore, getStoreCoupons]
  );

  const orders = useMemo(
    () => (resolvedStore ? getStoreOrders(resolvedStore.id) : []),
    [resolvedStore, getStoreOrders]
  );

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders]
  );

  const latestOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [orders]);

  const averageTicket = useMemo(() => {
    return orders.length ? totalRevenue / orders.length : 0;
  }, [orders.length, totalRevenue]);

  const todayRevenue = useMemo(() => {
    const today = new Date();

    return orders.reduce((sum, order) => {
      const orderDate = new Date(order.createdAt);
      return isSameDay(orderDate, today) ? sum + Number(order.total || 0) : sum;
    }, 0);
  }, [orders]);

  const monthRevenue = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);

    return orders.reduce((sum, order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= monthStart ? sum + Number(order.total || 0) : sum;
    }, 0);
  }, [orders]);

  const monthOrders = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);

    return orders.filter((order) => new Date(order.createdAt) >= monthStart).length;
  }, [orders]);

  const last7DaysData = useMemo(() => {
    const today = new Date();

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));

      const dayOrders = orders.filter((order) => isSameDay(new Date(order.createdAt), date));
      const total = dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

      return {
        label: formatDateLabel(date),
        total,
        orders: dayOrders.length,
      };
    });
  }, [orders]);

  if (authLoading || !authChecked) {
    return <div className="p-6 text-white">Carregando painel...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!resolvedStore) {
    return (
      <div className="min-h-screen bg-[#070707] p-6 text-white">
        Loja não encontrada para este administrador.
      </div>
    );
  }

  const isStoreSuspended = Boolean(resolvedStore.suspended);
  const isStoreActive = Boolean(resolvedStore.active) && !isStoreSuspended;

  const currentPlan = String(
    (resolvedStore as { plan?: string; plan_id?: string }).plan ||
      (resolvedStore as { plan?: string; plan_id?: string }).plan_id ||
      'iniciante'
  );

  const whatsapp = String((resolvedStore as { whatsapp?: string }).whatsapp || 'Pendente');

  if (isStoreSuspended || !isStoreActive) {
    return (
      <div className="min-h-screen bg-[#070707] px-4 py-8 text-white sm:px-6 sm:py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-[28px] border border-red-950/40 bg-[#101010] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:rounded-[32px] sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
              <StoreIcon className="h-8 w-8" />
            </div>

            <h1 className="mt-6 text-2xl font-black text-white sm:text-3xl">Loja suspensa</h1>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              O acesso ao painel foi bloqueado porque sua loja está suspensa no momento.
              Regularize sua assinatura ou entre em contato com o suporte para voltar a usar o
              painel administrativo.
            </p>

            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              Enquanto a loja estiver suspensa, produtos, pedidos, cupons e configurações ficam
              indisponíveis neste painel.
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="w-full rounded-full border-0 bg-[#f3162d] px-6 text-white shadow-[0_8px_24px_rgba(243,22,45,0.35)] transition hover:bg-[#d90f24] sm:w-auto"
              >
                Voltar ao login
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full rounded-full border-zinc-700 bg-black px-6 text-white hover:border-red-500/40 hover:bg-zinc-900 sm:w-auto"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const storeSlug = String(resolvedStore.slug || resolvedStore.id || '').trim();
  const absoluteStoreUrl = getStoreUrl(storeSlug);

  const shortcuts: ShortcutItem[] = [
    {
      label: 'Produtos',
      description: 'Cadastre, edite e organize seu catálogo.',
      icon: ShoppingBag,
      onClick: () => navigate('/admin/products'),
    },
    {
      label: 'Pedidos',
      description: 'Veja pedidos novos e acompanhe o andamento.',
      icon: Package,
      onClick: () => navigate('/admin/orders'),
    },
    {
      label: 'Cupons',
      description: 'Crie ofertas para vender mais todos os dias.',
      icon: Tag,
      onClick: () => navigate('/admin/coupons'),
    },
    {
      label: 'Configurações',
      description: 'Ajuste loja, WhatsApp, banner e aparência.',
      icon: Settings,
      onClick: () => navigate('/admin/settings'),
    },
  ];

  return (
    <AdminShell
      title="Dashboard"
      subtitle={user.email}
      storeName={resolvedStore.name}
      stats={[
        { label: 'Produtos', value: products.length, helper: 'Catálogo cadastrado' },
        { label: 'Categorias', value: categories.length, helper: 'Organização do cardápio' },
        { label: 'Pedidos', value: orders.length, helper: 'Movimento total' },
        { label: 'Receita', value: formatMoney(totalRevenue), helper: 'Total acumulado' },
      ]}
      actions={
        <Button
          type="button"
          onClick={() => window.open(absoluteStoreUrl, '_blank', 'noopener,noreferrer')}
          className="w-full rounded-full border-0 bg-[#f3162d] px-5 text-white shadow-[0_8px_24px_rgba(243,22,45,0.35)] transition hover:bg-[#d90f24] sm:w-auto"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Ver loja
        </Button>
      }
    >
      <div className="space-y-4 text-white sm:space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden rounded-[24px] border border-red-950/40 bg-gradient-to-br from-[#160507] via-[#0b0b0b] to-[#111111] p-0 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:rounded-[32px]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-300 sm:text-xs">
                  <StoreIcon className="h-3.5 w-3.5" />
                  Painel premium da loja
                </div>

                <div
                  className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold sm:text-xs ${
                    isStoreActive ? 'bg-red-500/15 text-red-300' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {isStoreActive ? 'Loja ativa' : 'Loja suspensa'}
                </div>
              </div>

              <h2 className="mt-5 max-w-2xl text-2xl font-black leading-tight text-white sm:text-3xl">
                Bem-vindo ao centro de vendas da sua loja.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                Acompanhe faturamento, pedidos, crescimento e desempenho em um painel mais limpo,
                profissional e fácil de usar.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Hoje</p>
                  <p className="mt-3 break-words text-2xl font-black text-red-400 sm:text-3xl">
                    {formatMoney(todayRevenue)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">Vendas do dia atual</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Este mês</p>
                  <p className="mt-3 break-words text-2xl font-black text-red-400 sm:text-3xl">
                    {formatMoney(monthRevenue)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">Faturamento mensal</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Ticket médio</p>
                  <p className="mt-3 break-words text-2xl font-black text-white sm:text-3xl">
                    {formatMoney(averageTicket)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">Valor médio por pedido</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] border border-red-950/40 bg-[#101010] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:rounded-[32px] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-zinc-400">Sua loja online</p>
                <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">
                  Link da vitrine
                </h3>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 sm:h-12 sm:w-12">
                <Eye className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-zinc-800 bg-[#0b0b0b] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                URL pública
              </p>
              <p className="mt-2 break-all text-sm font-medium text-zinc-200">
                {absoluteStoreUrl}
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              <Button
                type="button"
                className="w-full rounded-full border-0 bg-[#f3162d] text-white shadow-[0_8px_24px_rgba(243,22,45,0.35)] transition hover:bg-[#d90f24]"
                onClick={() => window.location.assign(absoluteStoreUrl)}
              >
                Abrir nesta aba
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-zinc-700 bg-black text-white hover:border-red-500/40 hover:bg-zinc-900"
                onClick={() => navigate('/admin/settings')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Editar loja
              </Button>
            </div>

            <div className="mt-5 rounded-3xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm font-semibold text-red-300">Dica para vender mais</p>
              <p className="mt-1 text-sm text-zinc-200">
                Compartilhe o link da loja no WhatsApp e status todos os dias.
              </p>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <QuickStatCard
            label="Faturamento total"
            value={formatMoney(totalRevenue)}
            helper="Tudo que sua loja já vendeu"
            icon={Wallet}
            tone="money"
          />
          <QuickStatCard
            label="Pedidos no mês"
            value={String(monthOrders)}
            helper="Quantidade de pedidos neste mês"
            icon={TrendingUp}
          />
          <QuickStatCard
            label="Produtos ativos"
            value={String(products.length)}
            helper="Itens disponíveis no catálogo"
            icon={ShoppingBag}
          />
          <QuickStatCard
            label="Cupons criados"
            value={String(coupons.length)}
            helper="Campanhas e descontos ativos"
            icon={Tag}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <SimpleBarChart data={last7DaysData} />

          <Card className="rounded-[24px] border border-red-950/40 bg-[#101010] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:rounded-[28px] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-red-300/80 sm:text-xs">
                  Resumo mensal
                </p>
                <h3 className="mt-2 text-lg font-bold text-white sm:text-xl">
                  Sua loja este mês
                </h3>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-zinc-800 bg-[#0b0b0b] p-4">
                <p className="text-sm text-zinc-400">Faturamento mensal</p>
                <p className="mt-2 break-words text-2xl font-black text-red-400 sm:text-3xl">
                  {formatMoney(monthRevenue)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-zinc-800 bg-[#0b0b0b] p-4">
                  <p className="text-sm text-zinc-400">Pedidos do mês</p>
                  <p className="mt-2 text-2xl font-black text-white">{monthOrders}</p>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-[#0b0b0b] p-4">
                  <p className="text-sm text-zinc-400">Ticket médio</p>
                  <p className="mt-2 break-words text-2xl font-black text-white">
                    {formatMoney(averageTicket)}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-[#0b0b0b] p-4">
                <p className="text-sm text-zinc-400">Plano atual</p>
                <p className="mt-2 text-lg font-bold capitalize text-white">{currentPlan}</p>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-[#0b0b0b] p-4">
                <p className="text-sm text-zinc-400">WhatsApp da loja</p>
                <p className="mt-2 break-words text-lg font-bold text-white">{whatsapp}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[24px] border border-red-950/40 bg-[#101010] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:rounded-[28px] sm:p-5">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-red-300/80 sm:text-xs">
                Ações rápidas
              </p>
              <h3 className="mt-2 text-lg font-bold text-white sm:text-xl">
                Gerencie sua loja mais rápido
              </h3>
            </div>

            <div className="grid gap-3">
              {shortcuts.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="flex items-center gap-3 rounded-3xl border border-zinc-800 bg-[#0b0b0b] p-4 text-left transition hover:border-red-500/30 hover:bg-[#151515] sm:gap-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 sm:h-12 sm:w-12">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white">{item.label}</div>
                      <div className="text-sm text-zinc-400">{item.description}</div>
                    </div>

                    <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-500" />
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-[24px] border border-red-950/40 bg-[#101010] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:rounded-[28px] sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-red-300/80 sm:text-xs">
                  Pedidos recentes
                </p>
                <h3 className="mt-2 text-lg font-bold text-white sm:text-xl">
                  Últimos movimentos da loja
                </h3>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
                <Clock3 className="h-5 w-5" />
              </div>
            </div>

            {latestOrders.length === 0 ? (
              <div className="rounded-3xl border border-zinc-800 bg-[#0b0b0b] p-8 text-center text-sm text-zinc-400 sm:p-10">
                Ainda não há pedidos registrados.
              </div>
            ) : (
              <div className="space-y-3">
                {latestOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-3xl border border-zinc-800 bg-[#0b0b0b] p-4 transition hover:bg-[#151515]"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-black text-white">{order.code}</div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {new Date(order.createdAt).toLocaleString('pt-BR')}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-zinc-400">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} itens
                        </div>

                        <div className="text-xl font-black text-red-400">
                          {formatMoney(Number(order.total || 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </AdminShell>
  );
}