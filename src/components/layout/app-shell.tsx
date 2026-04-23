import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { TopNav } from "@/components/layout/top-nav";
import { getAuthIdentity } from "@/server/auth";

type AppShellProps = {
  children: ReactNode;
  authContext?: {
    isAuthenticated: boolean;
    viewerLabel: string | null;
  };
};

export async function AppShell({ children, authContext }: AppShellProps) {
  const identity = authContext
    ? null
    : await getAuthIdentity();

  const isAuthenticated = authContext ? authContext.isAuthenticated : Boolean(identity);
  const viewerLabel = authContext
    ? authContext.viewerLabel
    : (identity?.email ?? identity?.displayName ?? null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[image:var(--app-bg)] text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(124,146,255,0.14)_0%,_rgba(0,0,0,0)_70%)]" />
        <div className="absolute bottom-[-18rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgba(28,198,255,0.1)_0%,_rgba(0,0,0,0)_72%)]" />
      </div>

      <PageContainer className="relative pb-16 pt-6 sm:pt-8">
        <TopNav
          isAuthenticated={isAuthenticated}
          viewerLabel={viewerLabel}
        />
        <main>{children}</main>
      </PageContainer>
    </div>
  );
}
