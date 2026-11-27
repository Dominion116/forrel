import Link from "next/link";

import { QoreXConnect } from "@/components/qorex-connect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getChainClient } from "@/lib/chain";

export default async function AppHomePage() {
  const client = getChainClient();
  const [stats, projects, recent] = await Promise.all([
    client.getStats(),
    client.listProjects({ offset: 0, limit: 10 }),
    client.listRecentReleases({ offset: 0, limit: 5 }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Forrel
            </Link>
            <Badge variant="secondary">/app</Badge>
          </div>
          <QoreXConnect />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10" id="wallet">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Registry Shell</h1>
            <p className="text-sm text-muted-foreground">
              Phase 0 foundation running on <code>NEXT_PUBLIC_CHAIN_MODE={client.mode}</code>.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Back to landing</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Projects</CardDescription>
              <CardTitle className="text-2xl">{stats.projectCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Releases</CardDescription>
              <CardTitle className="text-2xl">{stats.releaseCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Revocations</CardDescription>
              <CardTitle className="text-2xl">{stats.revokedCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fixture Projects ({projects.length})</CardTitle>
            <CardDescription>Sample deterministic projects from MockChainClient.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {projects.map((p) => (
              <div key={p.projectId} className="flex items-center justify-between py-2.5 text-sm">
                <div className="font-mono font-medium">{p.slug}</div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{p.releaseCount} releases</span>
                  <span>v{p.latestVersion}</span>
                  <Badge variant="outline">epoch {p.keyEpoch}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Releases ({recent.length})</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {recent.map((r) => (
              <div
                key={r.releaseId.toString()}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
              >
                <div>
                  <span className="font-mono font-medium">{r.slug}</span>{" "}
                  <span className="text-muted-foreground">v{r.version}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-muted-foreground">
                    {r.artifactHash.slice(0, 14)}…
                  </code>
                  <Badge variant={r.revoked ? "destructive" : "verified"}>
                    {r.revoked ? "Revoked" : "Active"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
