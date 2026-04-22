import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StackProps = {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const stackSizes = {
  sm: "space-y-3",
  md: "space-y-6",
  lg: "space-y-10",
} as const;

export function Stack({ children, className, size = "md" }: StackProps) {
  return <div className={cn(stackSizes[size], className)}>{children}</div>;
}
