import { getCurrentUser } from "@/lib/auth/current-user";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main className="container w-full flex-1 pb-28 pt-8 md:pb-16">{children}</main>
      <SiteFooter />
      {user && <MobileNav username={user.username} />}
    </div>
  );
}
