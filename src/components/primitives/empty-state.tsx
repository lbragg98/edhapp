import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="surface-panel flex flex-col items-center justify-center px-6 py-12 text-center sm:px-10 sm:py-16">
      {icon ? (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--surface-border)] bg-white/[0.03]">
          <div className="text-[color:var(--text-subtle)]">{icon}</div>
        </div>
      ) : null}
      <h3 className="type-title">{title}</h3>
      <p className="type-body-muted mt-2 max-w-md">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
