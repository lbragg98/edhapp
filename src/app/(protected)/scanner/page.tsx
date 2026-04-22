import { SectionHeading } from "@/components/layout";
import { ScannerWorkspace } from "@/components/scanner";

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  return (
    <>
      <SectionHeading
        eyebrow="Scanner Foundation"
        title="Capture cards, rank candidates by confidence, and confirm in one persistent workspace."
        description="Pipeline stages are explicit: capture, region detection, OCR adapter, candidate matching, and confirmation. This is the foundation layer, not a complete production scanner."
      />

      <div className="mt-8">
        <ScannerWorkspace />
      </div>
    </>
  );
}
