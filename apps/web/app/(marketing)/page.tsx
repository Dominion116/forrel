import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getChainClient } from "@/lib/chain";

export default async function LandingPage() {
  const client = getChainClient();
  const stats = await client.getStats();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Phase 0 · {client.mode} adapter</Badge>
          <Badge variant="outline">QoreChain Diana (9800)</Badge>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Releases that still verify after Q-Day.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          Forrel records every release&apos;s SHA3-256 fingerprint with an ML-DSA-87 signature,
          checked on-chain by QoreChain&apos;s <code>pqcVerify</code> precompile.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild size="lg">
            <Link href="/app">Open Forrel App</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/app#wallet">Check QoreX Connection</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registry Snapshot (Mock Fixtures)</CardTitle>
          <CardDescription>
            Deterministic Phase 0 dataset served through the ChainClient interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Projects</p>
            <p className="text-2xl font-semibold">{stats.projectCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Releases</p>
            <p className="text-2xl font-semibold">{stats.releaseCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Revoked</p>
            <p className="text-2xl font-semibold">{stats.revokedCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Latest block</p>
            <p className="font-mono text-lg font-semibold">{stats.latestBlock.toString()}</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
