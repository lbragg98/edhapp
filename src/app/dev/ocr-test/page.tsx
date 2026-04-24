import { OcrTestClient } from "@/app/dev/ocr-test/ocr-test-client";

export default function OcrTestPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="surface-panel p-5 sm:p-6">
        <p className="type-label">OCR Diagnostics</p>
        <h1 className="mt-2 text-xl font-semibold text-zinc-100">/dev/ocr-test</h1>
        <p className="mt-2 text-sm text-[color:var(--text-subtle)]">
          Standalone OCR system diagnostics and upload test. This page does not use scanner camera flow.
        </p>
      </div>
      <OcrTestClient />
    </main>
  );
}

