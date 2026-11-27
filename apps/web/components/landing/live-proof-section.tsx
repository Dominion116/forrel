import { Container, Eyebrow, Footnote, PixelHeading } from "@/components/ui/typography";

import { LiveStats, RecentReleases } from "./live-proof";

/**
 * The sample's pale "Prizes" block, inverted against the page theme:
 * light inside the dark page, dark inside the light page.
 */
export function LiveProofSection() {
  return (
    <section id="proof" className="theme-invert scroll-mt-16 py-20 sm:py-28">
      <Container className="flex flex-col gap-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex flex-col gap-6">
            <Eyebrow>Live proof</Eyebrow>
            <PixelHeading lead="On-chain right now," main="Read straight from Diana." />
            <p className="max-w-2xl text-body text-muted-foreground">
              These numbers and releases come from the registry contract&apos;s storage, not from a
              server of ours. Re-check any signature against pqcVerify yourself.
            </p>
          </div>
          <Footnote n="iii">
            Everything verification needs lives in contract state, so it keeps working even if old
            event logs are pruned.
          </Footnote>
        </div>
        <LiveStats />
        <RecentReleases />
      </Container>
    </section>
  );
}
