import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardGrid, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeSnippet } from "@/components/ui/code-snippet";
import { Field, Input } from "@/components/ui/input";
import { ArrowList, Row, RowList, Step, StepList } from "@/components/ui/list";
import { BrandBand, Callout, Notice } from "@/components/ui/notice";
import { BrandChip, Figure, PixelNumeral } from "@/components/ui/stat";
import {
  Container,
  Eyebrow,
  Footnote,
  Highlight,
  PixelHeading,
  Section,
  TextLink,
} from "@/components/ui/typography";

export const metadata: Metadata = {
  title: "Design system — Forrel",
  description: "Forrel's tokens and components: pixel display, mono body, square cells, one lime accent.",
};

/* ---------- Token data (mirrors app/globals.css) ---------- */

const colors: { token: string; role: string; dark: string; light: string }[] = [
  { token: "background", role: "Page canvas", dark: "#000000", light: "#F2F2F2" },
  { token: "surface", role: "Code wells, footer band", dark: "#0B0B0B", light: "#E9E9E9" },
  { token: "foreground", role: "Headings and body text", dark: "#F2F2F2", light: "#0A0A0A" },
  { token: "muted-foreground", role: "Secondary text, first heading line", dark: "#A8A8A8", light: "#5C5C5C" },
  { token: "hairline", role: "Card borders, dashed rules", dark: "#37383A", light: "#C4C4C4" },
  { token: "control", role: "Field and outline-button borders", dark: "#6E6E6E", light: "#8A8A8A" },
  { token: "brand", role: "Lime fill: bands, featured cells, chips", dark: "#DAFF52", light: "#DAFF52" },
  { token: "brand-ink", role: "Lime as text or line", dark: "#DAFF52", light: "#4A6100" },
  { token: "on-brand", role: "Text on lime", dark: "#0A0A0A", light: "#0A0A0A" },
  { token: "danger", role: "Revoked, errors", dark: "#FF6B5B", light: "#B42318" },
  { token: "warning", role: "Multiple matches, caution", dark: "#FFB547", light: "#8A4B00" },
  { token: "dim", role: "Ghost numerals only, never text", dark: "#37383A", light: "#C4C4C4" },
];

const typeScale: { name: string; spec: string; sample: ReactNode; className: string }[] = [
  {
    name: "display-xl",
    spec: "Geist Pixel Grid · 56–112px · 0.95",
    sample: "Sign it.",
    className: "text-display-xl",
  },
  {
    name: "display",
    spec: "Geist Pixel Square · 36–56px · 1.0",
    sample: "Releases that verify.",
    className: "text-display",
  },
  {
    name: "display-sm",
    spec: "Geist Pixel Square · 28–36px · 1.05",
    sample: "Revoked.",
    className: "text-display-sm",
  },
  {
    name: "eyebrow",
    spec: "Geist Pixel Square · 11px · +0.32em · uppercase",
    sample: "How Forrel works",
    className: "text-eyebrow",
  },
  {
    name: "title-lg",
    spec: "Geist 450 · 28px · −0.035em",
    sample: "Every record passes pqcVerify.",
    className: "text-title-lg",
  },
  {
    name: "title",
    spec: "Geist 450 · 20px · −0.03em",
    sample: "Publish from the browser or from CI.",
    className: "text-title",
  },
  {
    name: "numeric",
    spec: "Geist 400 · 36–48px · −0.04em · tabular",
    sample: "4,627",
    className: "text-numeric",
  },
  {
    name: "body-lg",
    spec: "IBM Plex Mono 400 · 17px · 1.75",
    sample: "Drop a file in. It is hashed locally with SHA3-256.",
    className: "text-body-lg",
  },
  {
    name: "body",
    spec: "IBM Plex Mono 400 · 15px · 1.7",
    sample: "The registry is queried with a read-only eth_call.",
    className: "text-body",
  },
  {
    name: "body-sm",
    spec: "IBM Plex Mono 400 · 13px · 1.65",
    sample: "Signed 26 Nov 2026, 14:02 UTC · block 1,482,907",
    className: "text-body-sm text-muted-foreground",
  },
];

const nav = [
  { href: "#color", label: "Color" },
  { href: "#type", label: "Type" },
  { href: "#controls", label: "Controls" },
  { href: "#cards", label: "Cards" },
  { href: "#patterns", label: "Patterns" },
];

/* ---------- Page ---------- */

export default function DesignSystemPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-brand focus:px-3 focus:py-2 focus:text-on-brand"
      >
        Skip to content
      </a>

      {/* Top bar: logo + pixel wordmark, mono links, one outlined CTA */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-background/90 backdrop-blur-sm">
        <Container className="flex h-16 items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <span aria-hidden="true" className="grid size-7 place-items-center bg-brand font-pixel text-base text-on-brand">
              F
            </span>
            <span className="text-eyebrow hidden text-foreground sm:inline">Forrel · Design system</span>
            <span className="sr-only sm:hidden">Forrel design system</span>
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-8 lg:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[0.875rem] text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="outline-brand" size="sm" className="hidden sm:inline-flex">
              <Link href="/app">Open the app</Link>
            </Button>
          </div>
        </Container>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        {/* ---------- Intro ---------- */}
        <Section divider={false} className="pt-16 sm:pt-24">
          <Container className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex flex-col gap-6">
              <Eyebrow>Design system · v0.1</Eyebrow>
              <PixelHeading as="h1" lead="Tokens first," main="then every screen." />
              <p className="max-w-2xl text-body-lg">
                Pixel display, mono body, square cells and one lime accent. Every screen in Forrel is
                built from the parts on this page.
              </p>
              <p className="max-w-2xl text-body text-muted-foreground">
                Values come from the reference sample. Contrast, focus, states and motion follow
                design.md. Switch the theme in the top bar to check both modes.
              </p>
            </div>
            <Footnote n={1} className="lg:mb-2">
              Dark is the primary theme. Light mirrors the sample&apos;s pale prize section.
            </Footnote>
          </Container>
          <Container className="mt-12">
            <Notice label="Phase 0.">
              Tokens are live in globals.css. The landing page and app screens adopt them next.
            </Notice>
          </Container>
        </Section>

        {/* ---------- Color ---------- */}
        <Section id="color">
          <Container className="flex flex-col gap-12">
            <div className="flex flex-col gap-6">
              <Eyebrow>01 · Color</Eyebrow>
              <PixelHeading lead="Neutrals do the work," main="lime earns the eye." />
              <p className="max-w-2xl text-body text-muted-foreground">
                One accent. Lime fills bands, featured cells and chips. As text it is{" "}
                <Highlight>brand-ink</Highlight>, which darkens to olive on light backgrounds so it
                stays readable.
              </p>
            </div>
            <CardGrid cols={4}>
              {colors.map((c) => (
                <Card key={c.token}>
                  <div
                    className="h-24 border-b border-hairline"
                    style={{ background: `var(--${c.token})` }}
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-1 p-5">
                    <p className="text-[0.9375rem] text-foreground">{c.token}</p>
                    <p className="text-body-sm text-muted-foreground">{c.role}</p>
                    <p className="mt-2 text-body-sm tabular-nums text-muted-foreground">
                      <span className="text-foreground">{c.dark}</span> dark ·{" "}
                      <span className="text-foreground">{c.light}</span> light
                    </p>
                  </div>
                </Card>
              ))}
            </CardGrid>
          </Container>
        </Section>

        {/* ---------- Type ---------- */}
        <Section id="type">
          <Container className="flex flex-col gap-12">
            <div className="flex flex-col gap-6">
              <Eyebrow>02 · Typography</Eyebrow>
              <PixelHeading lead="Three voices," main="each with one job." />
              <p className="max-w-2xl text-body text-muted-foreground">
                Pixel for display and labels. Geist for titles. IBM Plex Mono for everything you read
                at length, plus every hash, address and command.
              </p>
            </div>
            <RowList>
              {typeScale.map((t) => (
                <li
                  key={t.name}
                  className="grid gap-3 py-8 md:grid-cols-[14rem_1fr] md:items-baseline md:gap-10"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.9375rem] text-foreground">{t.name}</span>
                    <span className="text-body-sm text-muted-foreground">{t.spec}</span>
                  </div>
                  <p className={`${t.className} min-w-0 overflow-hidden`}>{t.sample}</p>
                </li>
              ))}
            </RowList>
          </Container>
        </Section>

        {/* ---------- Controls: buttons, tags, links, fields ---------- */}
        <Section id="controls">
          <Container className="flex flex-col gap-16">
            <div className="flex flex-col gap-6">
              <Eyebrow>03 · Controls</Eyebrow>
              <PixelHeading lead="Square corners," main="mono labels." />
              <p className="max-w-2xl text-body text-muted-foreground">
                Zero radius everywhere. One filled button per view; the rest are outlines or links.
                Every control has hover, focus-visible, pressed and disabled states. Press Tab to see
                the lime focus ring.
              </p>
            </div>

            <div className="grid gap-12 lg:grid-cols-2 [&>*]:min-w-0">
              <div className="flex flex-col gap-6">
                <h3 className="text-eyebrow text-muted-foreground">Buttons</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="lg">
                    Verify a release <ArrowRight />
                  </Button>
                  <Button variant="outline-brand">Connect QoreX</Button>
                  <Button variant="outline">Download keyfile</Button>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="brand">Publish release</Button>
                  <Button variant="destructive">Revoke v2.4.1</Button>
                  <Button variant="ghost">Log in</Button>
                  <Button disabled aria-describedby="disabled-reason">
                    Publish release
                  </Button>
                </div>
                <p id="disabled-reason" className="text-body-sm text-muted-foreground">
                  Disabled buttons say why: “Open an EVM window to publish.”
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="outline" size="sm">Small · 32px</Button>
                  <Button variant="outline" size="md">Medium · 40px</Button>
                  <Button variant="outline" size="lg">Large · 48px</Button>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <h3 className="text-eyebrow text-muted-foreground">Links</h3>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                  <TextLink href="/app">Verify a file</TextLink>
                  <TextLink href="https://docs.qore.host" external>
                    QoreChain docs
                  </TextLink>
                  <TextLink href="/app/how-it-works">How it works</TextLink>
                </div>

                <h3 className="mt-6 text-eyebrow text-muted-foreground">Tags</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>Due</Badge>
                  <Badge>Web + CLI</Badge>
                  <Badge variant="solid">Latest</Badge>
                  <Badge variant="outline">Epoch 2</Badge>
                  <Badge variant="verified">✓ Verified</Badge>
                  <Badge variant="destructive">× Revoked</Badge>
                  <Badge variant="warning">! Multiple</Badge>
                </div>

                <h3 className="mt-6 text-eyebrow text-muted-foreground">Command</h3>
                <CodeSnippet code="npx forrel verify ./router-fw-2.4.1.bin" label="verify command" />
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <Field id="project-slug" label="Project slug" hint="Lowercase, numbers and dashes.">
                <Input id="project-slug" placeholder="acme-router" aria-describedby="project-slug-hint" autoComplete="off" />
              </Field>
              <Field id="artifact-hash" label="SHA3-256 hash">
                <Input
                  id="artifact-hash"
                  defaultValue="0x7f3a…c91e"
                  spellCheck={false}
                  autoComplete="off"
                  className="tabular-nums"
                />
              </Field>
              <Field id="version" label="Version" error="Version 2.4.1 is already published for acme-router.">
                <Input id="version" defaultValue="2.4.1" aria-invalid="true" aria-describedby="version-error" autoComplete="off" />
              </Field>
            </div>
          </Container>
        </Section>

        {/* ---------- Cards ---------- */}
        <Section id="cards">
          <Container className="flex flex-col gap-16">
            <div className="flex flex-col gap-6">
              <Eyebrow>04 · Cards</Eyebrow>
              <PixelHeading lead="Cells, not bubbles," main="sharing one border." />
              <p className="max-w-2xl text-body text-muted-foreground">
                Cards sit edge to edge in a joined grid with 1px hairlines. No shadows, no radius. One
                cell per grid may go lime.
              </p>
            </div>

            {/* Sequence cells: lime pixel numerals (real sequence, so numbering is allowed) */}
            <CardGrid cols={3}>
              {[
                ["01", "Hash it locally.", "Your file never leaves the browser. SHA3-256 runs in a Web Worker."],
                ["02", "Check the chain.", "One read-only eth_call against the registry on Diana. No wallet needed."],
                ["03", "Read the verdict.", "Verified, revoked or unknown, with a link to the on-chain record."],
              ].map(([n, title, body]) => (
                <Card key={n}>
                  <CardHeader className="gap-5">
                    <PixelNumeral tone="brand" className="text-4xl">
                      {n}
                    </PixelNumeral>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{body}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </CardGrid>

            {/* Feature cells: ghost numeral, tag, title, list; one featured lime cell */}
            <CardGrid cols={4}>
              {[
                {
                  n: "01",
                  tag: "Publish",
                  title: "Sign once, prove forever",
                  body: "Each release is an ML-DSA-87 signature over its hash.",
                  items: ["From the browser", "From CI with the CLI", "Offline signing, online submit"],
                },
                {
                  n: "02",
                  tag: "Rotate",
                  title: "Keys that can move",
                  body: "The old key signs the handover to the new one.",
                  items: ["Epoch bumps on rotate", "History stays verifiable"],
                },
                {
                  n: "03",
                  tag: "Recover",
                  title: "Lose a key, keep the project",
                  body: "An offline recovery key takes back control.",
                  items: ["Stored apart from the release key", "Checked on-chain like the rest"],
                },
                {
                  n: "04",
                  tag: "Revoke",
                  title: "Yank a bad release",
                  body: "The verdict flips to Revoked for everyone, right away.",
                  items: ["Signed with a reason code", "Old downloads stop verifying"],
                  featured: true,
                },
              ].map((c) => (
                <Card key={c.n} variant={c.featured ? "featured" : "default"}>
                  <CardHeader className="gap-6">
                    <div className="flex items-start justify-between gap-4">
                      <PixelNumeral tone="dim" className={c.featured ? "text-5xl text-on-brand" : "text-5xl"}>
                        {c.n}
                      </PixelNumeral>
                      <Badge variant={c.featured ? "on-brand" : "brand"}>{c.tag}</Badge>
                    </div>
                    <CardTitle className="text-title-lg">{c.title}</CardTitle>
                    <CardDescription>{c.body}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6 border-t border-dashed border-hairline in-data-[variant=featured]:border-on-brand/40" />
                    <ArrowList items={c.items} />
                  </CardContent>
                </Card>
              ))}
            </CardGrid>

            {/* Figures */}
            <div className="grid gap-px border-t border-dashed border-hairline md:grid-cols-3">
              {[
                { ord: "Sign", value: "4,627", unit: "bytes per ML-DSA-87 signature", chip: "L5", chipText: "NIST security level" },
                { ord: "Hash", value: "32", unit: "bytes per SHA3-256 hash", chip: "Local", chipText: "never uploaded" },
                { ord: "Check", value: "0", unit: "wallets needed to verify", chip: "9800", chipText: "Diana testnet" },
              ].map((f, i) => (
                <div
                  key={f.ord}
                  className={`flex flex-col gap-6 pt-10 pb-4 md:px-8 ${i === 0 ? "md:pl-0" : "md:border-l md:border-dashed md:border-hairline"}`}
                >
                  <PixelNumeral className="text-6xl">{f.ord}</PixelNumeral>
                  <Figure value={f.value} unit={f.unit} />
                  <BrandChip value={f.chip} className="self-start">
                    {f.chipText}
                  </BrandChip>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* ---------- Patterns: steps, rows, notices, verdicts, FAQ ---------- */}
        <Section id="patterns">
          <Container className="flex flex-col gap-20">
            <div className="flex flex-col gap-6">
              <Eyebrow>05 · Patterns</Eyebrow>
              <PixelHeading lead="Dashed rules," main="quiet structure." />
            </div>

            <div className="grid gap-16 lg:grid-cols-2 [&>*]:min-w-0">
              <div className="flex flex-col gap-6">
                <h3 className="text-eyebrow text-muted-foreground">Steps</h3>
                <StepList>
                  <Step n={1} title="Generate a release key">
                    <p className="text-body-sm text-muted-foreground">
                      Saved as an encrypted keyfile. The seed never leaves your machine.
                    </p>
                    <CodeSnippet code="npx forrel keygen --out release.key" label="keygen command" />
                  </Step>
                  <Step n={2} title="Sign and publish the build">
                    <p className="text-body-sm text-muted-foreground">
                      Signing works offline. Publishing needs an open EVM window.
                    </p>
                    <TextLink href="/app/new">Set up a project</TextLink>
                  </Step>
                </StepList>
              </div>

              <div className="flex flex-col gap-6">
                <h3 className="text-eyebrow text-muted-foreground">Rows · release history</h3>
                <RowList>
                  <Row
                    tone="past"
                    index={<>26 Nov<br />09:14 UTC</>}
                    title="v2.4.0"
                    detail="Key epoch 1 · 0x91be…04d2"
                  />
                  <Row
                    index={<>27 Nov<br />14:02 UTC</>}
                    title="v2.4.1"
                    detail="Key epoch 2 · 0x7f3a…c91e"
                    trailing={<Badge variant="solid">Latest</Badge>}
                  />
                  <Row
                    index={<>27 Nov<br />15:40 UTC</>}
                    title="v2.4.1-hotfix"
                    detail="Revoked: bad build. Use v2.4.1."
                    trailing={<Badge variant="destructive">× Revoked</Badge>}
                  />
                </RowList>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <h3 className="text-eyebrow text-muted-foreground">Verdicts · icon + word, never color alone</h3>
              <CardGrid cols={4}>
                {[
                  { v: "verified", tag: "✓ Verified", title: "Genuine release", body: "acme-router v2.4.1, signed 27 Nov 2026 under key epoch 2." },
                  { v: "destructive", tag: "× Revoked", title: "Do not install", body: "Revoked 27 Nov 2026. Reason: bad build. Use v2.4.1." },
                  { v: "outline", tag: "? Unknown", title: "Not in the registry", body: "No project has published this hash. Check the download source." },
                  { v: "warning", tag: "! Multiple", title: "Found in 2 projects", body: "The same hash appears under acme-router and acme-ap. Each has its own status." },
                ].map((x) => (
                  <Card key={x.v}>
                    <CardHeader className="gap-4">
                      <Badge variant={x.v as "verified" | "destructive" | "outline" | "warning"} className="self-start">
                        {x.tag}
                      </Badge>
                      <CardTitle>{x.title}</CardTitle>
                      <CardDescription>{x.body}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </CardGrid>
            </div>

            <div className="grid gap-16 lg:grid-cols-2 [&>*]:min-w-0">
              <div className="flex flex-col gap-6">
                <h3 className="text-eyebrow text-muted-foreground">Notices</h3>
                <Notice label="Testnet.">Forrel runs on QoreChain&apos;s Diana testnet. pqcVerify is testnet-only today.</Notice>
                <Notice label="Wrong network." tone="warning">
                  QoreX is on mainnet. Switch to Diana (9800) to publish.
                </Notice>
                <Notice label="Tx failed." tone="danger">
                  pqcVerify rejected the signature. Re-sign with the epoch 2 key, then try again.
                </Notice>
                <Callout>
                  Forrel uses post-quantum signatures (ML-DSA-87). We never call it “quantum-proof”.
                </Callout>
                <Footnote n={2}>Side notes use a bracketed index, set in mono.</Footnote>
              </div>

              <div className="flex flex-col gap-6">
                <h3 className="text-eyebrow text-muted-foreground">FAQ</h3>
                <Accordion>
                  <AccordionItem question="Do I need a wallet to verify?" defaultOpen>
                    No. Verification is a read-only call to the registry. You only need QoreX to
                    publish, rotate or revoke.
                  </AccordionItem>
                  <AccordionItem question="What if I lose my key?">
                    Your offline recovery key can rotate the project to a new release key.
                  </AccordionItem>
                  <AccordionItem question="Is this production-ready?">
                    Not yet. Forrel runs on the Diana testnet while pqcVerify is testnet-only.
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </Container>
        </Section>

        {/* ---------- Lime band ---------- */}
        <BrandBand>
          <Container className="flex flex-col gap-8 py-16 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4">
              <p className="text-display-sm">Verify in under 3 minutes</p>
              <p className="max-w-xl text-body">
                Drop a file, get a verdict. Brand bands are the one place lime covers the full width.
              </p>
            </div>
            <Button asChild variant="inverse" size="lg">
              <Link href="/app">
                Verify a file <ArrowRight />
              </Link>
            </Button>
          </Container>
        </BrandBand>

        {/* ---------- Closer on the dot grid ---------- */}
        <section className="bg-dot-grid py-24 sm:py-32">
          <Container className="flex flex-col gap-8">
            <p className="text-display-xl" aria-hidden="true">
              Sign it.
            </p>
            <h2 className="sr-only">Sign it.</h2>
            <p className="max-w-md text-body text-muted-foreground">
              Hash locally. Sign with ML-DSA-87. Verify on-chain.
            </p>
            <Button asChild size="lg" className="self-start">
              <Link href="/app">
                Open the app <ArrowRight />
              </Link>
            </Button>
          </Container>
        </section>
      </main>

      <footer className="border-t border-hairline bg-surface">
        <Container className="flex flex-col gap-4 py-10 text-body-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Forrel · Built for Build Before Q-Day</p>
          <nav aria-label="Footer" className="flex gap-6">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/app" className="hover:text-foreground">App</Link>
            <a href="#main" className="hover:text-foreground">Back to top</a>
          </nav>
        </Container>
      </footer>
    </>
  );
}
