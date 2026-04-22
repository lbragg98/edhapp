export const TRACKER_PLAYER_THEMES = [
  { key: "graphite", label: "Graphite", tileClass: "bg-slate-800/95", swatchClass: "bg-slate-500" },
  { key: "ocean", label: "Ocean", tileClass: "bg-blue-950/95", swatchClass: "bg-blue-600" },
  { key: "forest", label: "Forest", tileClass: "bg-emerald-950/95", swatchClass: "bg-emerald-600" },
  { key: "crimson", label: "Crimson", tileClass: "bg-rose-950/95", swatchClass: "bg-rose-600" },
  { key: "violet", label: "Violet", tileClass: "bg-violet-950/95", swatchClass: "bg-violet-600" },
  { key: "gold", label: "Gold", tileClass: "bg-amber-900/95", swatchClass: "bg-amber-500" },
] as const;

export type TrackerThemeOption = (typeof TRACKER_PLAYER_THEMES)[number];

export function resolveTrackerTheme(themeKey: string, fallbackIndex: number): TrackerThemeOption {
  return (
    TRACKER_PLAYER_THEMES.find((theme) => theme.key === themeKey) ??
    TRACKER_PLAYER_THEMES[fallbackIndex % TRACKER_PLAYER_THEMES.length] ??
    TRACKER_PLAYER_THEMES[0]
  );
}