import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store as StoreIcon } from 'lucide-react';

type AdminShellStat = {
  label: string;
  value: string | number;
  helper?: string;
};

type AdminShellProps = {
  title: string;
  subtitle?: string;
  storeName?: string;
  onBack?: () => void;
  stats?: AdminShellStat[];
  actions?: ReactNode;
  children: ReactNode;
  showBackButton?: boolean;
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
}: AdminShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const headerText = subtitle?.trim() || storeName?.trim() || '';

  const resolvedShowBackButton = useMemo(() => {
    if (typeof showBackButton === 'boolean') return showBackButton;
    if (onBack) return true;
    return shouldShowBackButton(location.pathname);
  }, [showBackButton, onBack, location.pathname]);

  return (
    <div className="admin-shell min-h-screen bg-[#050505] text-white">
      <style>{`
        .admin-shell {
          background:
            radial-gradient(circle at top left, rgba(243, 22, 45, 0.08), transparent 25%),
            #050505;
          color: #ffffff;
        }

        .admin-shell * {
          scrollbar-color: rgba(243, 22, 45, 0.35) #0b0b0b;
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

        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-white"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-zinc-50"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-zinc-100"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-neutral-50"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-neutral-100"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-slate-50"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-slate-100"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-gray-50"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-gray-100"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-stone-50"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-stone-100"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-blue-"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-sky-"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="bg-indigo-"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="from-blue-"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="to-blue-"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="from-sky-"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="to-sky-"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="from-indigo-"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="to-indigo-"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="from-cyan-"],
        .admin-shell :is(div, section, article, aside, form, main)[class*="to-cyan-"] {
          background: linear-gradient(180deg, rgba(14, 14, 14, 0.98), rgba(8, 8, 8, 0.98)) !important;
          background-color: #0b0b0b !important;
          background-image: none !important;
          color: #ffffff !important;
          border-color: rgba(127, 29, 29, 0.45) !important;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.30) !important;
        }

        .admin-shell [class*="text-black"],
        .admin-shell [class*="text-zinc-900"],
        .admin-shell [class*="text-zinc-950"],
        .admin-shell [class*="text-neutral-900"],
        .admin-shell [class*="text-neutral-950"],
        .admin-shell [class*="text-slate-900"],
        .admin-shell [class*="text-slate-950"],
        .admin-shell [class*="text-gray-900"],
        .admin-shell [class*="text-gray-950"] {
          color: #ffffff !important;
        }

        .admin-shell [class*="text-zinc-500"],
        .admin-shell [class*="text-zinc-600"],
        .admin-shell [class*="text-zinc-700"],
        .admin-shell [class*="text-neutral-500"],
        .admin-shell [class*="text-neutral-600"],
        .admin-shell [class*="text-neutral-700"],
        .admin-shell [class*="text-slate-500"],
        .admin-shell [class*="text-slate-600"],
        .admin-shell [class*="text-slate-700"],
        .admin-shell [class*="text-gray-500"],
        .admin-shell [class*="text-gray-600"],
        .admin-shell [class*="text-gray-700"] {
          color: #b3b3b3 !important;
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

        .admin-shell button[class*="border-zinc"],
        .admin-shell a[class*="border-zinc"] {
          border-color: rgba(255, 255, 255, 0.10) !important;
        }

        .admin-shell [role="tablist"] {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 999px !important;
          padding: 4px !important;
        }

        .admin-shell [role="tab"] {
          color: rgba(255, 255, 255, 0.70) !important;
          border-radius: 999px !important;
        }

        .admin-shell [role="tab"][data-state="active"] {
          background: rgba(255, 255, 255, 0.10) !important;
          color: #ffffff !important;
          box-shadow: none !important;
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
                  <StoreIcon className="h-3.5 w-3.5" />
                  PAINEL ADMIN
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

            {actions ? <div className="w-full lg:w-auto">{actions}</div> : null}
          </div>

          {stats.length > 0 ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => {
                const labelLower = stat.label.toLowerCase();

                const isMoney =
                  (typeof stat.value === 'string' && stat.value.includes('R$')) ||
                  labelLower.includes('receita') ||
                  labelLower.includes('faturamento') ||
                  labelLower.includes('ticket');

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