import Link from "next/link";
import { AppShell, SectionHeading } from "@/components/layout";
import { SurfacePanel } from "@/components/primitives";

export default function DeckNotFound() {
  return (
    <AppShell>
      <SectionHeading
        eyebrow="Deckbuilder"
        title="Deck not found."
        description="The requested deck could not be loaded."
      />

      <SurfacePanel className="mt-8 p-6">
        <Link href="/decks" className="nav-link nav-link-active">
          Return to Decks
        </Link>
      </SurfacePanel>
    </AppShell>
  );
}
