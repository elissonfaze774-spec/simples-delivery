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
    <div className="rounded-[28px] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-card)]/70 px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-primary)/10] text-[color:var(--color-primary)]">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="mt-6 rounded-full bg-[color:var(--color-primary)] px-6 hover:bg-[color:var(--destructive)]">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
