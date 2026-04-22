"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Smartphone } from "lucide-react";

type TrackerOrientationGuardProps = {
  className?: string;
};

function isLandscapePreferredViewport(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia("(max-width: 900px)").matches && window.matchMedia("(orientation: portrait)").matches;
}

export function TrackerOrientationGuard({ className }: TrackerOrientationGuardProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const update = () => {
      const shouldPrompt = isLandscapePreferredViewport();
      setShowPrompt(shouldPrompt && !dismissed);
      if (!shouldPrompt) {
        setDismissed(false);
      }
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [dismissed]);

  if (!showPrompt) {
    return null;
  }

  return (
    <div className={className ?? "absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-4"}>
      <div className="surface-panel max-w-sm space-y-3 rounded-2xl p-4 text-center">
        <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/[0.04]">
          <Smartphone size={18} className="text-zinc-200" />
        </div>
        <p className="text-sm font-medium text-zinc-100">Landscape is recommended</p>
        <p className="text-xs leading-relaxed text-zinc-400">
          The Life Tracker is optimized for landscape on phones so all players and counters stay fast and readable.
        </p>
        <div className="flex justify-center gap-2">
          <button type="button" className="nav-link nav-link-active" onClick={() => setDismissed(true)}>
            Continue Anyway
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => {
              setDismissed(false);
              window.dispatchEvent(new Event("resize"));
            }}
          >
            <RotateCcw size={13} className="mr-1" />
            Recheck
          </button>
        </div>
      </div>
    </div>
  );
}