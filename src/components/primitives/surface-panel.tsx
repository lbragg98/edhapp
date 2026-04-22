import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SurfacePanelProps = {
  children: ReactNode;
  className?: string;
};

export function SurfacePanel({ children, className }: SurfacePanelProps) {
  return <section className={cn("surface-panel", className)}>{children}</section>;
}
