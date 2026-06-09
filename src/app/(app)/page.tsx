import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, LogIn } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPrimaryJellyfinServer } from "@/lib/jellyfin/config";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { JellyfinConnect } from "@/components/settings/jellyfin-connect";
import { SetupSteps } from "@/components/settings/setup-steps";
import { SetupBackdrop, getBackdrops } from "@/components/settings/setup-backdrop";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");
  const jellyfinServer = await getPrimaryJellyfinServer();
  const backdrops = await getBackdrops();

  if (jellyfinServer) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#111827]">
        <SetupBackdrop backdrops={backdrops} />
        <section className="relative flex min-h-full items-center justify-center px-5 py-16">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-gray-900/30 px-10 py-12 text-center shadow-2xl shadow-black/50 backdrop-blur-[2px]">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-500/15 ring-1 ring-indigo-400/30">
              <LogoMark className="h-14 w-14" />
            </div>
            <h1 className="font-sans text-6xl font-bold tracking-tight text-white drop-shadow-lg">
              Jellyboxd
            </h1>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.25em] text-indigo-300 drop-shadow">
              Serveur Jellyfin connecté
            </p>
            <h2 className="mt-4 font-sans text-3xl font-semibold text-white drop-shadow-lg">
              Connectez-vous avec votre compte Jellyfin.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base text-gray-100 text-pretty drop-shadow">
              Jellyboxd est relié à <span className="font-semibold text-white">{jellyfinServer.name}</span>.
              Chaque utilisateur se connecte avec ses identifiants Jellyfin et retrouve son propre espace.
            </p>
            <Button size="lg" className="mt-9 h-14 w-full bg-indigo-600 text-lg text-white hover:bg-indigo-500" asChild>
              <Link href="/login">
                <LogIn className="h-5 w-5" /> Se connecter
              </Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#111827]">
      <SetupBackdrop backdrops={backdrops} />
      <section className="relative flex min-h-full items-center justify-center px-5 py-12">
        <div className="w-full max-w-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/15 ring-1 ring-indigo-400/30">
              <LogoMark className="h-12 w-12" />
            </div>
            <h1 className="font-sans text-5xl font-bold tracking-tight text-white">
              Jellyboxd
            </h1>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-4 py-3 text-sm text-amber-100/90 shadow-lg shadow-black/20 backdrop-blur">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              Configurez le serveur Jellyfin une seule fois. Les utilisateurs et admins
              Jellyfin seront importés automatiquement.
            </span>
          </div>

          <SetupSteps current={1} />

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-gray-950/40 shadow-2xl shadow-black/50 ring-1 ring-white/[0.04] backdrop-blur-md">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-8 py-6 text-center">
              <h2 className="font-sans text-2xl font-bold text-white">Connexion</h2>
              <p className="mt-1.5 text-sm text-gray-400">
                Entrez les détails de votre serveur Jellyfin
              </p>
            </div>
            <div className="px-8 py-7">
              <JellyfinConnect connection={null} redirectOnConnect setupVariant />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

