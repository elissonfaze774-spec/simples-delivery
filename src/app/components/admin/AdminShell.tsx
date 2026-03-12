import { ReactNode } from 'react';
import {
  ArrowLeft,
  BellRing,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Store as StoreIcon,
  Tag,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

type AdminShellProps = {
  title: string;
  subtitle: string;
  storeName?: string;
  stats?: Array<{ label: string; value: string | number; helper?: string }>;
  actions?: ReactNode;
  children: ReactNode;
};

const navItems = [
  { label: 'Visão geral', path: '/admin', icon: LayoutDashboard },
  { label: 'Produtos', path: '/admin/products', icon: ShoppingBag },
  { label: 'Pedidos', path: '/admin/orders', icon: Package },
  { label: 'Cupons', path: '/admin/coupons', icon: Tag },
  { label: 'Configurações', path: '/admin/settings', icon: Settings },
];

export function AdminShell({
  title,
  subtitle,
  storeName,
  stats,
  actions,
  children,
}: AdminShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActivePath = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-30 border-b border-red-950/40 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 md:px-6 xl:px-8">
          <div className="flex items-start gap-3 sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navigate('/admin')}
                className="h-11 w-11 shrink-0 rounded-full border-zinc-800 bg-[#111111] text-white hover:border-red-500/40 hover:bg-[#171717]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-400">
                  <StoreIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Painel Admin</span>
                </div>

                <h1 className="mt-1 break-words text-lg font-black tracking-tight text-white sm:text-xl md:text-3xl">
                  {storeName || title}
                </h1>

                <p className="mt-1 break-words text-sm text-zinc-400">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex md:shrink-0">
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
                <BellRing className="h-4 w-4" />
                Operação online
              </div>

              {actions}
            </div>
          </div>

          <div className="md:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 sm:w-auto">
                <BellRing className="h-4 w-4" />
                Operação online
              </div>

              {actions ? <div className="w-full">{actions}</div> : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6 xl:px-8">
        <div className="mb-4 md:hidden">
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const active = isActivePath(item.path);
              const Icon = item.icon;

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? 'border border-red-500/20 bg-red-500/10 text-red-300'
                      : 'border border-zinc-800 bg-[#0f0f0f] text-zinc-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-red-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {stats?.length ? (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
            {stats.map((stat) => (
              <Card
                key={stat.label}
                className="rounded-[22px] border border-red-950/40 bg-[#0b0b0b] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
              >
                <p className="text-sm text-zinc-400">{stat.label}</p>
                <div className="mt-2 break-words text-2xl font-black tracking-tight text-white">
                  {stat.value}
                </div>
                {stat.helper ? (
                  <p className="mt-2 text-xs text-zinc-500">{stat.helper}</p>
                ) : null}
              </Card>
            ))}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden space-y-4 md:block">
            <Card className="overflow-hidden rounded-[30px] border border-red-950/40 bg-[#0b0b0b] shadow-[0_10px_35px_rgba(0,0,0,0.45)]">
              <div className="border-b border-zinc-900 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Gestão
                </p>

                <h2 className="mt-2 text-xl font-black text-white">
                  Painel da loja
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Acesse rapidamente pedidos, produtos, cupons e configurações.
                </p>
              </div>

              <nav className="space-y-2 p-3">
                {navItems.map((item) => {
                  const active = isActivePath(item.path);
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                        active
                          ? 'border border-red-500/20 bg-red-500/10 text-red-300'
                          : 'border border-transparent bg-[#0f0f0f] text-zinc-300 hover:border-zinc-800 hover:bg-[#151515]'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          active ? 'text-red-400' : 'text-zinc-500'
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </Card>

            {stats?.length ? (
              <div className="grid gap-3">
                {stats.map((stat) => (
                  <Card
                    key={stat.label}
                    className="rounded-[26px] border border-red-950/40 bg-[#0b0b0b] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                  >
                    <p className="text-sm text-zinc-400">{stat.label}</p>
                    <div className="mt-2 break-words text-3xl font-black tracking-tight text-white">
                      {stat.value}
                    </div>
                    {stat.helper ? (
                      <p className="mt-2 text-xs text-zinc-500">{stat.helper}</p>
                    ) : null}
                  </Card>
                ))}
              </div>
            ) : null}
          </aside>

          <main className="min-w-0">
            <div className="rounded-[24px] border border-red-950/30 bg-[#080808] p-3 sm:rounded-[28px] sm:p-4 xl:rounded-[34px] xl:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}