import { AppShell, SectionHeading } from "@/components/layout";
import { ScannerWorkspace } from "@/components/scanner";
import { requirePageAppUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  await requirePageAppUser("/scanner");

  return (
    <AppShell>
      <SectionHeading
        eyebrow="Scanner Foundation"
        title="Capture cards, rank candidates by confidence, and confirm in one persistent workspace."
        description="Pipeline stages are explicit: capture, region detection, OCR adapter, candidate matching, and confirmation. This is the foundation layer, not a complete production scanner."
      />

      <div className="mt-8">
        <ScannerWorkspace />
      </div>
    </AppShell>
  );
}
