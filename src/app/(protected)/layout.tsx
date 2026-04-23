import { AppShell } from "@/components/layout";
import { requireProtectedPageSession } from "@/server/auth";

export const dynamic = "force-dynamic";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const appUser = await requireProtectedPageSession();
  console.info("[Auth][protected-layout] Session validated.", { appUserId: appUser.appUserId });

  return (
    <AppShell
      authContext={{
        isAuthenticated: true,
        viewerLabel: appUser.email ?? appUser.displayName ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
