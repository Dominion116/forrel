import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { HashDisplay } from "@/components/ui/hash-display";
import { Container, TextLink } from "@/components/ui/typography";
import { CHAIN_MODE, DEPLOYED_REGISTRY, GITHUB_URL, REGISTRY_ADDRESS, addressUrl } from "@/lib/config";

import { ConnectButton, NetworkBadge } from "./connect-button";
import { AppNavLinks } from "./app-nav";

const nav = [
  { href: "/app/verify", label: "Verify" },
  { href: "/app/projects", label: "Projects" },
  { href: "/app/new", label: "New project" },
  { href: "/app/how-it-works", label: "How it works" },
];

/** App top bar: wordmark, Verify / Projects / New project, network badge, QoreX connect. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/90 backdrop-blur-sm">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/app" className="text-eyebrow text-foreground">
            Forrel<span className="sr-only"> app home</span>
          </Link>
          <nav aria-label="App" className="hidden items-center gap-6 lg:flex">
            <AppNavLinks items={nav} />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NetworkBadge className="hidden md:flex" />
          <ConnectButton />
          <details className="group relative lg:hidden">
            <summary
              aria-label="Menu"
              className="text-eyebrow flex h-8 cursor-pointer list-none items-center border border-hairline px-3 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden"
            >
              <span className="group-open:hidden">Menu</span>
              <span className="hidden group-open:inline">Close</span>
            </summary>
            <div className="absolute right-0 z-50 mt-2 flex w-60 flex-col border border-hairline bg-background p-2">
              <AppNavLinks items={nav} variant="menu" />
              <div className="mt-2 flex flex-col gap-3 border-t border-dashed border-hairline px-3 pt-3 pb-1">
                <NetworkBadge className="md:hidden" />
                <ThemeToggle />
              </div>
            </div>
          </details>
          <ThemeToggle className="hidden lg:inline-flex" />
        </div>
      </Container>
    </header>
  );
}

/** App footer: registry address, explorer, GitHub, docs. */
export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-hairline bg-surface">
      <Container className="grid gap-8 py-10 md:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-eyebrow text-muted-foreground">Registry</p>
          {DEPLOYED_REGISTRY || CHAIN_MODE === "mock" ? (
            <div className="flex flex-col gap-2">
              <HashDisplay value={REGISTRY_ADDRESS} label="registry address" full />
              {CHAIN_MODE === "mock" ? (
                <p className="text-body-sm text-muted-foreground">
                  Demo registry. The contract is not deployed yet, so everything here is mock data.
                </p>
              ) : (
                <TextLink href={addressUrl(REGISTRY_ADDRESS)} external>
                  View on the explorer
                </TextLink>
              )}
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">Not deployed yet.</p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-eyebrow text-muted-foreground">Links</p>
          <ul className="flex flex-col gap-2 text-body-sm">
            <li>
              <TextLink href="/app/how-it-works">How it works</TextLink>
            </li>
            <li>
              <TextLink href={GITHUB_URL} external>
                Source on GitHub
              </TextLink>
            </li>
            <li>
              <TextLink href="/">Forrel home</TextLink>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-dashed border-hairline">
        <Container className="flex flex-col gap-2 py-5 text-body-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>Built for Build Before Q-Day</p>
          <p>Diana testnet · chain 9800 · MIT License</p>
        </Container>
      </div>
    </footer>
  );
}
