import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="animate-rise-in">
      <h1 className="font-serif text-3xl text-foreground">Content de vous revoir.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reprenez votre carnet là où vous l&apos;aviez laissé.
      </p>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-medium text-accent link-underline">
          Créer un compte
        </Link>
      </p>
      <p className="mt-8 rounded-xl border border-border bg-surface/50 px-3.5 py-3 text-xs text-muted">
        Démo : <span className="text-muted-foreground">alex@jellyboxd.app</span> · mot de passe{" "}
        <span className="text-muted-foreground">password123</span>
      </p>
    </div>
  );
}
