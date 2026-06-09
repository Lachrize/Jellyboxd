import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { requireAdmin } from "@/lib/auth/current-user";
import {
  getAdminDashboard,
  MEDIA_TYPES,
  PERIODS,
  type MediaTypeFilter,
  type Period,
} from "@/lib/services/admin";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AdminFilters } from "@/components/admin/admin-filters";
import { BarChart, type BarPoint, Kpi, RankList, type RankItem } from "@/components/admin/charts";
import { UserRowActions } from "@/components/admin/user-row-actions";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

const fmtDate = (dt: Date | string) =>
  new Date(dt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

const labelEvery = (data: BarPoint[]) => Math.max(1, Math.round(data.length / 8));

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="font-serif text-lg text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function TopCard({ title, items, empty }: { title: string; items: RankItem[]; empty?: string }) {
  return (
    <div className="surface-card p-5">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">{title}</h3>
      <RankList items={items} emptyLabel={empty ?? "Pas encore de données"} />
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; type?: string }>;
}) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const period: Period = (PERIODS as readonly string[]).includes(sp.period ?? "") ? (sp.period as Period) : "30d";
  const mediaType: MediaTypeFilter = (MEDIA_TYPES as readonly string[]).includes(sp.type ?? "")
    ? (sp.type as MediaTypeFilter)
    : "all";

  const d = await getAdminDashboard({ period, mediaType });
  const k = d.kpis;
  const onPeriod = `sur ${d.filters.periodLabel.toLowerCase() === "tout" ? "toute la période" : `les ${d.filters.periodLabel.toLowerCase()}`}`;

  return (
    <div className="mx-auto max-w-6xl space-y-9">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/12 text-accent">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-serif text-3xl text-foreground">Administration</h1>
            <p className="text-muted-foreground">Croissance, engagement et tendances de la communauté.</p>
          </div>
        </div>
        <AdminFilters period={period} mediaType={mediaType} />
      </header>

      {/* ---- KPIs (period-scoped) ---- */}
      <div>
        <p className="mb-2 text-xs text-muted">Indicateurs {onPeriod} · {d.filters.mediaLabel.toLowerCase()}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Kpi label="Nouveaux utilisateurs" value={k.newUsers} />
          <Kpi label="Utilisateurs actifs" value={k.active} />
          <Kpi label="Notes ajoutées" value={k.ratings} />
          <Kpi label="Critiques" value={k.reviews} />
          <Kpi label="Listes créées" value={k.lists} />
          <Kpi label="Favoris ajoutés" value={k.favorites} />
          <Kpi label="Note moyenne" value={`${k.avgStars}★`} />
          <Kpi label="Total utilisateurs" value={k.totalUsers} />
        </div>
      </div>

      {/* ---- Growth charts ---- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Nouveaux utilisateurs" subtitle={onPeriod.replace("sur ", "")}>
          <div className="surface-card p-5">
            <BarChart data={d.charts.signups} unit="inscriptions" labelEvery={labelEvery(d.charts.signups)} />
          </div>
        </Section>
        <Section title="Activité" subtitle={`Notes, critiques et logs · ${onPeriod.replace("sur ", "")}`}>
          <div className="surface-card p-5">
            <BarChart data={d.charts.activity} unit="actions" labelEvery={labelEvery(d.charts.activity)} />
          </div>
        </Section>
      </div>

      {/* ---- Rating distribution ---- */}
      <Section title="Distribution des notes" subtitle={`${k.ratedMedia} œuvres notées · moyenne ${k.avgStars}★ · ${d.filters.mediaLabel.toLowerCase()} · ${onPeriod.replace("sur ", "")}`}>
        <div className="surface-card p-5">
          <BarChart data={d.charts.ratingDistribution} unit="notes" labelEvery={1} />
        </div>
      </Section>

      {/* ---- Tops ---- */}
      <Section title="Palmarès" subtitle={`Classements ${onPeriod} · les œuvres suivent le filtre « ${d.filters.mediaLabel} »`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <TopCard title="Les plus notés" items={d.tops.mostRated} />
          <TopCard title="Les mieux notés" items={d.tops.bestRated} empty="Pas encore assez de notes" />
          <TopCard title="Les plus critiqués" items={d.tops.mostReviewed} />
          <TopCard title="Les plus mis en favori" items={d.tops.mostFavorited} />
          <TopCard title="Utilisateurs les plus actifs" items={d.tops.topUsers} />
          <TopCard title="Utilisateurs les plus suivis" items={d.tops.mostFollowed} />
          <TopCard title="Genres populaires" items={d.tops.topGenres} />
        </div>
      </Section>

      {/* ---- Users management ---- */}
      <Section title={`Utilisateurs (${d.users.length})`}>
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="px-4 py-3 font-medium">Inscrit</th>
                <th className="px-4 py-3 font-medium">Vu·le</th>
                <th className="px-4 py-3 text-right font-medium">Notes</th>
                <th className="px-4 py-3 text-right font-medium">Crit.</th>
                <th className="px-4 py-3 text-right font-medium">Listes</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {d.users.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name ?? u.username} src={u.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-foreground">{u.name ?? u.username}</span>
                          {u.isAdmin && <Badge variant="accent">admin</Badge>}
                          {u.jellyfinUserId && <Badge variant="success">JF</Badge>}
                          {u.id === me.id && <Badge variant="muted">vous</Badge>}
                        </div>
                        <span className="text-xs text-muted">@{u.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.lastSeen ? fmtDate(u.lastSeen) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{u._count.ratings}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{u._count.reviews}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{u._count.lists}</td>
                  <td className="px-4 py-3">
                    <UserRowActions userId={u.id} isAdmin={u.isAdmin} isSelf={u.id === me.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
