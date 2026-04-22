import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth";
import { AppShell } from "@/components/layout";
import { getAppUserIdentity } from "@/server/auth";

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
  const appUser = await getAppUserIdentity();

  if (appUser) {
    redirect(nextPath);
  }

  return (
    <AppShell>
      <div className="py-8 sm:py-12">
        <AuthPanel />
      </div>
    </AppShell>
  );
}
