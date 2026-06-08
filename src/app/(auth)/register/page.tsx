import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <div className="animate-rise-in">
      <h1 className="font-serif text-3xl text-foreground">Commencez votre carnet.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Notez, critiquez et suivez vos films et séries. Gratuit, pour toujours.
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
