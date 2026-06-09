import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <div className="animate-rise-in">
      <h1 className="font-serif text-3xl text-foreground">Connectez Jellyboxd à Jellyfin.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Créez votre compte, puis vous arriverez directement sur la connexion Jellyfin :
        URL du serveur, clé API et utilisateur à synchroniser.
      </p>
      <div className="mt-8">
        <RegisterForm />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-accent link-underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
