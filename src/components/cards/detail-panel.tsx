import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DetailPanelProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function DetailPanel({ title, subtitle, children, className }: DetailPanelProps) {
  return (
    <section className={cn("surface-panel p-5 sm:p-6", className)}>
      <header className="mb-4 space-y-1">
        <h2 className="type-title">{title}</h2>
        {subtitle ? <p className="text-xs text-[color:var(--text-subtle)]">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
