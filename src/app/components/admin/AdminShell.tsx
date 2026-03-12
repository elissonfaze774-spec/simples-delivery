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
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin')}
              className="h-11 w-11 shrink-0 rounded-full border-zinc-800 bg-[#111111] text-white hover:border-red-500/40 hover:bg-[#171717]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-400">
                <StoreIcon className="h-3.5 w-3.5" />
                Painel Admin
              </div>

              <h1 className="truncate text-xl font-black tracking-tight text-white md:text-3xl">
                {storeName || title}
              </h1>

              <p className="truncate text-sm text-zinc-400">{subtitle}</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
              <BellRing className="h-4 w-4" />
              Operação online
            </div>

            {actions}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 md:grid-cols-[290px_minmax(0,1fr)] md:px-6 xl:px-8">
        <aside className="space-y-4">
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
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
              {stats.map((stat) => (
                <Card
                  key={stat.label}
                  className="rounded-[26px] border border-red-950/40 bg-[#0b0b0b] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                >
                  <p className="text-sm text-zinc-400">{stat.label}</p>
                  <div className="mt-2 text-3xl font-black tracking-tight text-white">
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

        <main className="space-y-6">
          <div className="md:hidden space-y-3">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 w-fit">
              <BellRing className="h-4 w-4" />
              Operação online
            </div>

            {actions}
          </div>

          <div className="rounded-[34px] border border-red-950/30 bg-[#080808] p-3 md:p-4 xl:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}