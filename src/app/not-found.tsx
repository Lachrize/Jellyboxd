import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-grain" />
      <div className="relative">
        <Link href="/" className="mb-8 inline-flex">
          <Logo />
        </Link>
        <p className="font-serif text-7xl text-accent">404</p>
        <h1 className="mt-4 font-serif text-2xl text-foreground">Page introuvable</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          Cette page a peut-être été déplacée, ou n&apos;a jamais existé.
        </p>
        <Button className="mt-7" asChild>
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </div>
  );
}
