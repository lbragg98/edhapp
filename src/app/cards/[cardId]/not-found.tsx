import Link from "next/link";
import { AppShell, SectionHeading } from "@/components/layout";
import { SurfacePanel } from "@/components/primitives";

export default function CardNotFound() {
  return (
    <AppShell>
      <SectionHeading
        eyebrow="Card Browser"
        title="Card not found."
        description="This record could not be loaded from the selected card pool."
      />
      <SurfacePanel className="mt-8 p-6">
        <Link href="/cards" className="nav-link nav-link-active">
          Return to Search
        </Link>
      </SurfacePanel>
    </AppShell>
  );
}
