import Link from "next/link";

import { Panel } from "@/components/app/primitives";
import { RecentReleasesTable } from "@/components/app/release-table";
import { StatsStrip } from "@/components/app/stats-strip";
import { ArrowRight, Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container, Eyebrow, PixelHeading } from "@/components/ui/typography";
import { VerifyWidget } from "@/components/verify/verify-widget";

export const metadata = { title: "Home" };

/** /app home: big drop zone, registry stats, recent releases, publish CTA. */
export default function AppHomePage() {
  return (
    <Container className="flex flex-col gap-16 py-12 sm:py-16">
      <section className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <Eyebrow>Verify</Eyebrow>
          <PixelHeading as="h1" lead="Drop a file," main="Or paste a SHA3-256 hash." />
          <p className="text-body text-muted-foreground">
            Hashed in your browser, checked against the registry with a read-only call. No wallet
            needed.
          </p>
        </div>
        <VerifyWidget />
      </section>

      <Panel title="Registry">
        <StatsStrip />
      </Panel>

      <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
        <Panel title="Recent releases">
          <RecentReleasesTable />
        </Panel>
        <Card variant="featured" className="h-fit gap-5 p-6 sm:p-8">
          <p className="text-eyebrow">For maintainers</p>
          <h2 className="text-title-lg">Publish your own releases</h2>
          <p className="text-body-sm">
            Register a project, generate ML-DSA-87 keys in your browser, and sign every release.
          </p>
          <Button asChild variant="inverse" className="self-start">
            <Link href="/app/new">
              Register a project <ArrowRight />
            </Link>
          </Button>
        </Card>
      </div>
    </Container>
  );
}
