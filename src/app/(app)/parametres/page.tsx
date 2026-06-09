import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { logoutAction } from "@/server/actions/auth";
import { hasSyncToken } from "@/lib/jellyfin/sync-token";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/settings/profile-form";
import { CredentialsForm } from "@/components/settings/credentials-form";
import { JellyfinConnect } from "@/components/settings/jellyfin-connect";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const user = await requireUser();
  const tokenExists = await hasSyncToken(user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Paramètres</h1>
        <p className="mt-1 text-muted-foreground">Gérez votre profil et votre compte.</p>
      </header>

      <section>
        <h2 className="mb-3 font-serif text-lg text-foreground">Profil</h2>
        <Card>
          <CardBody>
            <ProfileForm
              defaults={{ name: user.name ?? "", bio: user.bio ?? "", avatarUrl: user.avatarUrl ?? "" }}
            />
          </CardBody>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg text-foreground">Jellyfin</h2>
        <JellyfinConnect hasToken={tokenExists} appUrl={appUrl} />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg text-foreground">Compte</h2>
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Adresse e-mail</span>
              <span className="text-sm text-foreground">{user.email}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted">Nom d'utilisateur</span>
              <span className="text-sm text-foreground">@{user.username}</span>
            </div>
          </CardBody>
        </Card>
        <Card className="mt-4">
          <CardBody>
            <CredentialsForm username={user.username} email={user.email} />
          </CardBody>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg text-foreground">Session</h2>
        <Card>
          <CardBody className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Se déconnecter de cet appareil.</p>
            <form action={logoutAction}>
              <Button variant="danger" size="sm" type="submit">
                <LogOut className="h-4 w-4" /> Déconnexion
              </Button>
            </form>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
