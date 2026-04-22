import { AppShell } from "@/components/layout";
import { requireProtectedPageSession } from "@/server/auth";

export const dynamic = "force-dynamic";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  await requireProtectedPageSession();

  return <AppShell>{children}</AppShell>;
}