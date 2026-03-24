import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store as StoreIcon, LogOut, Bike } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';

type AdminShellStat = {
  label: string;
  value: string | number;
  helper?: string;
};

type AdminShellVariant = 'admin' | 'delivery';

type AdminShellProps = {
  title: string;
  subtitle?: string;
  storeName?: string;
  onBack?: () => void;
  stats?: AdminShellStat[];
  actions?: ReactNode;
  children: ReactNode;
  showBackButton?: boolean;
  hideStatsOnMobile?: boolean;
  variant?: AdminShellVariant;
  panelLabel?: string;
};

function shouldShowBackButton(pathname: string) {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  const mainRoutes = [
    '/admin',
    '/admin/dashboard',
    '/painel',
    '/painel/dashboard',
    '/dashboard',
    '/super-admin',
    '/superadmin',
    '/driver',
    '/driver/dashboard',
  ];

  return !mainRoutes.includes(cleanPath);
}

export function AdminShell({
  title,
  subtitle,
  storeName,
  onBack,
  stats = [],
  actions,
  children,
  showBackButton,
  hideStatsOnMobile = false,
  variant = 'admin',
  panelLabel,
}: AdminShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const headerText = subtitle?.trim() || storeName?.trim() || '';

  const resolvedShowBackButton = useMemo(() => {
    if (typeof showBackButton === 'boolean') return showBackButton;
    if (onBack) return true;
    return shouldShowBackButton(location.pathname);
  }, [showBackButton, onBack, location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao sair:', error);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const isDeliveryVariant = variant === 'delivery';
  const badgeLabel = panelLabel || (isDeliveryVariant ? 'PAINEL ENTREGADOR' : 'PAINEL ADMIN');

  return (
    <div className="admin-shell min-h-screen bg-[#050505] text-white">
      <style>{`
        .admin-shell {
          background:
            radial-gradient(circle at top left, rgba(243, 22, 45, 0.08), transparent 25%),
            #050505;
          color: #ffffff;
        }

        .admin-shell h1,
        .admin-shell h2,
        .admin-shell h3,
        .admin-shell h4,
        .admin-shell h5,
        .admin-shell h6 {
          color: #ffffff;
        }

        .admin-shell [data-slot="card"] {
          background: linear-gradient(180deg, rgba(14, 14, 14, 0.98), rgba(8, 8, 8, 0.98)) !important;
          border: 1px solid rgba(127, 29, 29, 0.45) !important;
          color: #ffffff !important;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.30) !important;
        }

        .admin-shell input:not([type="checkbox"]):not([type="radio"]),
        .admin-shell textarea,
        .admin-shell select {
          background: #121212 !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: none !important;
        }

        .admin-shell input::placeholder,
        .admin-shell textarea::placeholder {
          color: rgba(255, 255, 255, 0.35) !important;
        }

        .admin-shell input:focus,
        .admin-shell textarea:focus,
        .admin-shell select:focus {
          outline: none !important;
          border-color: rgba(243, 22, 45, 0.45) !important;
          box-shadow: 0 0 0 3px rgba(243, 22, 45, 0.12) !important;
        }

        .admin-shell svg {
          flex-shrink: 0;
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[28px] border border-red-950/40 bg-[#0a0a0a] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              {resolvedShowBackButton ? (
                <button
                  type="button"
                  onClick={onBack ?? (() => navigate(-1))}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-[#0d0d0d] text-white transition hover:border-[#f3162d]/40 hover:bg-[#151515]"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : null}

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#f3162d]/35 bg-[#f3162d]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f3162d] sm:text-xs">
                  {isDeliveryVariant ? (
                    <Bike className="h-3.5 w-3.5" />
                  ) : (
                    <StoreIcon className="h-3.5 w-3.5" />
                  )}
                  {badgeLabel}
                </div>

                <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {title}
                </h1>

                {headerText ? (
                  <p className="mt-2 text-base font-medium text-zinc-300 sm:text-lg">
                    {headerText}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex w-full items-start justify-between gap-3 lg:w-auto lg:justify-end">
              <div className="hidden sm:block lg:hidden" />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleLogout}
                className="flex h-11 w-11 shrink-0 rounded-full border-zinc-700 bg-[#111111] text-white hover:border-[#f3162d]/40 hover:bg-[#191919] lg:hidden"
              >
                <LogOut className="h-4 w-4" />
              </Button>

              <div className="hidden lg:flex lg:items-center lg:gap-2">
                {actions}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogout}
                  className="rounded-full border-zinc-700 bg-[#111111] px-5 text-white hover:border-[#f3162d]/40 hover:bg-[#191919]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          </div>

          {actions ? <div className="mt-4 lg:hidden">{actions}</div> : null}

          {stats.length > 0 ? (
            <div
              className={`mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4 ${
                hideStatsOnMobile ? 'hidden lg:grid' : ''
              }`}
            >
              {stats.map((stat) => {
                const labelLower = stat.label.toLowerCase();

                const isMoney =
                  (typeof stat.value === 'string' && stat.value.includes('R$')) ||
                  labelLower.includes('receita') ||
                  labelLower.includes('faturamento') ||
                  labelLower.includes('ticket') ||
                  labelLower.includes('ganho');

                return (
                  <div
                    key={stat.label}
                    className="rounded-[22px] border border-red-950/40 bg-[#101010] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                  >
                    <p className="text-sm font-medium text-zinc-400">{stat.label}</p>

                    <div
                      className={`mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl ${
                        isMoney ? 'text-emerald-400' : 'text-white'
                      }`}
                    >
                      {stat.value}
                    </div>

                    {stat.helper ? (
                      <p className="mt-2 text-sm text-zinc-500">{stat.helper}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}

export default AdminShell;