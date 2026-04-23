import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth";
import { AppShell } from "@/components/layout";
import { resolveAppUserSession } from "@/server/auth";

export const dynamic = "force-dynamic";

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseNext(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/decks";
  }

  return value;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const nextPath = parseNext(params.next);
  const session = await resolveAppUserSession({ scope: "page", path: "/auth" });

  if (session.status === "authenticated") {
    redirect(nextPath);
  }

  const errorParam = typeof params.error === "string" ? params.error : null;
  if (session.status === "provisioning_unavailable" && errorParam !== "account_unavailable") {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}&error=account_unavailable`);
  }

  return (
    <AppShell>
      <div className="py-8 sm:py-12">
        <AuthPanel />
      </div>
    </AppShell>
  );
}
