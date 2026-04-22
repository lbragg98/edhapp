import { cn } from "@/lib/utils";

type ArtBackgroundLayerProps = {
  imageUri: string | null;
  className?: string;
};

export function ArtBackgroundLayer({ imageUri, className }: ArtBackgroundLayerProps) {
  if (!imageUri) {
    return null;
  }

  return (
    <>
      <div
        className={cn("pointer-events-none absolute inset-0 z-0 bg-cover bg-top opacity-58", className)}
        style={{ backgroundImage: `url("${imageUri}")` }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18)_0%,rgba(0,0,0,0.52)_72%,rgba(0,0,0,0.68)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 backdrop-blur-[0.4px]" />
    </>
  );
}