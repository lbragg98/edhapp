import Link from "next/link";
import { AppShell, SectionHeading } from "@/components/layout";
import { Pill, Stack, SurfacePanel } from "@/components/primitives";

export default function Home() {
  return (
    <AppShell>
      <SectionHeading
        eyebrow="Commander Suite"
        title="A premium EDH workspace for deckbuilding and gameplay tools."
        description="The first production slice is now live: polished Scryfall-backed search and card detail browsing."
      />

      <Stack className="mt-10" size="md">
        <SurfacePanel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <Pill className="border-white/20 text-zinc-200">Live: Card Browser</Pill>
            <Pill>Normalized Card Records</Pill>
            <Pill>Pool-Aware Search Contracts</Pill>
            <Pill>Reusable Selection UI</Pill>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/cards" className="nav-link nav-link-active">
              Browse Cards
            </Link>
          </div>
        </SurfacePanel>
      </Stack>
    </AppShell>
  );
}
