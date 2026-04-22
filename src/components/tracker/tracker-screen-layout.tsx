"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrackerOrientationGuard } from "@/components/tracker/tracker-orientation-guard";

type TrackerScreenLayoutProps = {
  playerCount: number;
  children: React.ReactNode;
  onOpenSettings: () => void;
};

function gridColumnsClass(playerCount: number): string {
  if (playerCount <= 2) {
    return "grid-cols-1 landscape:grid-cols-2 md:grid-cols-2";
  }

  if (playerCount <= 4) {
    return "grid-cols-2";
  }

  return "grid-cols-2 landscape:grid-cols-3 md:grid-cols-3";
}

export function TrackerScreenLayout({ playerCount, children, onOpenSettings }: TrackerScreenLayoutProps) {
  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-24 left-1/2 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(76,94,173,0.24)_0%,_rgba(0,0,0,0)_70%)]" />
      </div>

      <TrackerOrientationGuard />

      <div
        className="relative h-full px-2 pb-18 pt-2 sm:px-3 md:px-4 md:pb-20 md:pt-4"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 0.5rem)",
          paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
          paddingLeft: "max(env(safe-area-inset-left), 0.5rem)",
          paddingRight: "max(env(safe-area-inset-right), 0.5rem)",
        }}
      >
        <header className="mb-3 hidden items-center justify-between md:flex">
          <div>
            <p className="type-label">Gameplay Companion</p>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Life Tracker</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/cards" className="nav-link">
              Cards
            </Link>
            <Link href="/decks" className="nav-link">
              Decks
            </Link>
          </div>
        </header>

        <section className={cn("grid h-full gap-2.5 md:gap-3", gridColumnsClass(playerCount))}>{children}</section>
      </div>

      <button
        type="button"
        className="fixed bottom-4 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/75 px-4 py-3 text-sm text-zinc-100 shadow-xl backdrop-blur-sm transition hover:bg-black/85"
        onClick={onOpenSettings}
        style={{ bottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <Settings size={16} /> Settings
      </button>
    </div>
  );
}