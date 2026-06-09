import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-forms";
import { LogoMark } from "@/components/ui/logo";
import { SetupSteps } from "@/components/settings/setup-steps";
import { SetupBackdrop, getBackdrops } from "@/components/settings/setup-backdrop";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const backdrops = await getBackdrops();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#111827]">
      <SetupBackdrop backdrops={backdrops} />
      <section className="relative flex min-h-full items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/15 ring-1 ring-indigo-400/30">
              <LogoMark className="h-12 w-12" />
            </div>
            <h1 className="font-sans text-5xl font-bold tracking-tight text-white drop-shadow-lg">
              Jellyboxd
            </h1>
          </div>

          <SetupSteps current={2} />

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-gray-950/40 shadow-2xl shadow-black/50 ring-1 ring-white/[0.04] backdrop-blur-md">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-8 py-6 text-center">
              <h2 className="font-sans text-2xl font-bold text-white">Content de vous revoir</h2>
              <p className="mt-1.5 text-sm text-gray-400">
                Connectez-vous avec votre compte Jellyfin
              </p>
            </div>
            <div className="px-8 py-7">
              <LoginForm next={next} dark />
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-400">
            Serveur pas encore configuré ?{" "}
            <Link href="/" className="font-medium text-indigo-300 hover:text-indigo-200">
              Connecter Jellyfin
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
