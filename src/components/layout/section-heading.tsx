import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  aside,
  className,
}: SectionHeadingProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-6 border-b border-[color:var(--surface-border)] pb-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow ? <p className="type-eyebrow">{eyebrow}</p> : null}
        <h1 className="type-display mt-4 max-w-3xl">{title}</h1>
        {description ? <p className="type-body-muted mt-4 max-w-2xl">{description}</p> : null}
      </div>
      {aside ? <div className="type-label">{aside}</div> : null}
    </header>
  );
}
