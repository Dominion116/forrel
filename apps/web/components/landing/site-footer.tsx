import { DIANA_EXPLORER_URL } from "@forrel/core";
import Link from "next/link";

import { HashDisplay } from "@/components/ui/hash-display";
import { Container, TextLink } from "@/components/ui/typography";

const REGISTRY = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS?.trim() || null;
const GITHUB = "https://github.com/Dominion116/forrel";

/** Illustration captions, numbered like the sample's artwork credits. */
export const FIGURE_NOTES = [
  "A release passes from the hand that built it to the device that runs it. The signature has to survive the trip.",
  "Classical signatures stand today. On Q-Day they crumble, and every update signed with them is up for grabs.",
  "Same bytes, same hash, same verdict, in ten years as today.",
];

/** Footer: resources, the registry address, and a thin bottom bar. */
export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-surface">
      <Container className="grid gap-12 py-16 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          <p className="text-eyebrow text-muted-foreground">Resources</p>
          <ul className="flex flex-col gap-3 text-body">
            <li>
              <TextLink href="/app">Open the app</TextLink>
            </li>
            <li>
              <TextLink href="/docs">Documentation</TextLink>
            </li>
            <li>
              <TextLink href="/app/how-it-works">How it works</TextLink>
            </li>
            <li>
              <TextLink href={GITHUB} external>
                Source on GitHub
              </TextLink>
            </li>
            <li>
              <TextLink href={DIANA_EXPLORER_URL} external>
                Diana explorer
              </TextLink>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-5">
          <p className="text-eyebrow text-muted-foreground">Registry</p>
          {REGISTRY ? (
            <div className="flex flex-col gap-3">
              <HashDisplay value={REGISTRY} label="registry address" />
              <TextLink href={`${DIANA_EXPLORER_URL}/address/${REGISTRY}`} external>
                View the contract
              </TextLink>
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              ForrelRegistry is not deployed yet. Its address will appear here once it is live on
              Diana. Until then the numbers on this page come from demo data.
            </p>
          )}
          <p className="text-body-sm text-muted-foreground">Diana testnet · chain 9800</p>
        </div>
      </Container>

      <div className="border-t border-dashed border-hairline">
        <Container className="flex flex-col gap-3 py-6 text-body-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Built for Build Before Q-Day</p>
          <p className="flex flex-wrap gap-x-6 gap-y-2">
            <span>MIT License</span>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/design" className="hover:text-foreground">
              Design system
            </Link>
            <a href="#top" className="hover:text-foreground">
              Back to top
            </a>
          </p>
        </Container>
      </div>
    </footer>
  );
}
