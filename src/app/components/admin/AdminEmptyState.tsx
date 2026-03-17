import { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function AdminEmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="rounded-[32px] border border-red-950/80 bg-gradient-to-br from-[#140404] via-black to-[#0a0a0a] px-6 py-12 text-center text-white shadow-[0_0_0_1px_rgba(127,29,29,0.18),0_20px_80px_rgba(0,0,0,0.45)]">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/10 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.12)]">
        <Icon className="h-9 w-9" />
      </div>

      <h3 className="mt-6 text-3xl font-black tracking-tight text-white">
        {title}
      </h3>

      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
        {description}
      </p>

      {actionLabel && onAction ? (
        <Button
          onClick={onAction}
          className="mt-8 rounded-full bg-red-500 px-8 text-white hover:bg-red-600"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}