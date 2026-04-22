import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PillProps = {
  children: ReactNode;
  className?: string;
};

export function Pill({ children, className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs font-medium tracking-wide text-zinc-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
