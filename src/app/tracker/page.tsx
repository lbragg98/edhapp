import { AppShell, SectionHeading } from "@/components/layout";
import { LifeTrackerWorkspace } from "@/components/tracker";

export const dynamic = "force-dynamic";

export default function TrackerPage() {
  return (
    <AppShell>
      <SectionHeading
        eyebrow="Gameplay Companion"
        title="Multiplayer Commander life tracker built for long sessions."
        description="Fast reducer-driven state, touch-friendly controls, commander damage by opponent, and persistent local session continuity."
      />

      <div className="mt-8">
        <LifeTrackerWorkspace />
      </div>
    </AppShell>
  );
}

