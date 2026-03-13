import type { ReactNode } from 'react';
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
};

export function AdminShell({
  title,
  subtitle,
  storeName,
  onBack,
  stats = [],
  actions,
  children,
}: AdminShellProps) {
  const headerText = subtitle?.trim() || storeName?.trim() || '';

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[28px] border border-red-950/40 bg-[#0a0a0a] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
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
                const isMoney =
                  typeof stat.value === 'string' &&
                  (stat.value.includes('R$') || stat.label.toLowerCase().includes('receita'));

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

        {children}
      </div>
    </div>
  );
}