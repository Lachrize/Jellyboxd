import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grain" />
      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
        <Link href="/" className="mb-8 inline-flex">
          <Logo />
        </Link>
        {children}
      </div>
    </div>
  );
}
