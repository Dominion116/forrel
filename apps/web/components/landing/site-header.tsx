import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/typography";

const links = [
  { href: "#verify", label: "Verify" },
  { href: "#how", label: "How it works" },
  { href: "#proof", label: "Live proof" },
  { href: "#pipeline", label: "Pipeline" },
  { href: "#faq", label: "FAQ" },
];

/** Sticky top bar from the sample: pixel wordmark, mono links, one outlined CTA. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/90 backdrop-blur-sm">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="text-eyebrow text-foreground">
          Forrel<span className="sr-only"> home</span>
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[0.875rem] text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden lg:inline-flex" />
          <Button asChild variant="outline-brand" size="sm" className="hidden lg:inline-flex">
            <Link href="/app">Open the app</Link>
          </Button>
          {/* Small screens: a no-JS disclosure menu that also holds the app CTA */}
          <details className="group relative lg:hidden">
            <summary
              aria-label="Menu"
              className="text-eyebrow flex h-8 cursor-pointer list-none items-center border border-hairline px-3 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden"
            >
              <span className="group-open:hidden">Menu</span>
              <span className="hidden group-open:inline">Close</span>
            </summary>
            <div className="animate-rise absolute right-0 mt-2 flex w-64 flex-col border border-hairline bg-background p-2">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="px-3 py-2.5 text-body text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-3 border-t border-dashed border-hairline px-3 pt-4 pb-2">
                <Button asChild variant="outline-brand" size="md" className="w-full">
                  <Link href="/app">Open the app</Link>
                </Button>
                <ThemeToggle className="self-start" />
              </div>
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}
