import type { Metadata } from "next";
import Link from "next/link";

import { DitherFigure } from "@/components/illustration/dither-figure";
import { HashTicker } from "@/components/landing/hash-ticker";
import { LiveProofSection } from "@/components/landing/live-proof-section";
import { LiveStrip } from "@/components/landing/live-strip";
import { SiteFooter, FIGURE_NOTES } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { StepFigure } from "@/components/landing/step-figure";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Button } from "@/components/ui/button";
import { Marquee } from "@/components/motion/marquee";
import { ScrollTrack } from "@/components/motion/scroll-track";
import { SplitText } from "@/components/motion/split-text";
import { TiltCard } from "@/components/motion/tilt-card";
import { CardGrid } from "@/components/ui/card";
import { CodeSnippet } from "@/components/ui/code-snippet";
import { ArrowList, Row, RowList, Step, StepList } from "@/components/ui/list";
import { BrandBand, Callout } from "@/components/ui/notice";
import { PixelNumeral } from "@/components/ui/stat";
import { Container, Eyebrow, Footnote, Highlight, PixelHeading, Section } from "@/components/ui/typography";
import { VerifyWidget } from "@/components/verify/verify-widget";

export const metadata: Metadata = {
  title: "Forrel — Releases that still verify after Q-Day",
  description:
    "Forrel records every release's fingerprint with a post-quantum signature (ML-DSA-87), checked on-chain by QoreChain. Drop any file to see if it's genuine. No wallet needed.",
};

/* ---------- Content ---------- */

const HERO_WORDS = "Releases that still verify after Q-Day.".split(" ");

const BAND_WORDS = ["Verify without a wallet", "No upload", "Hashed on your device", "Checked on-chain"];
const BAND_FACTS = [
  "SHA3-256 fingerprints",
  "ML-DSA-87 signatures",
  "pqcVerify at 0x…0a01",
  "Diana testnet · chain 9800",
  "Revocations stay visible",
  "Open source · MIT",
];

const problems = [
  {
    title: "Devices trust updates for a decade",
    body: "A router, insulin pump or car module sold in 2026 will still accept “signed” updates in 2036.",
  },
  {
    title: "Today's release signatures fall to quantum computers",
    body: "ECDSA, RSA and Ed25519 can be forged by a large enough quantum computer. A forged update looks genuine.",
  },
  {
    title: "Checksum pages can be swapped",
    body: "Whoever controls the download page controls the hash next to it. You need a source the page can't edit.",
  },
];

const steps = [
  {
    kind: "fingerprint" as const,
    title: "Fingerprint.",
    body: "SHA3-256 of the exact bytes. One flipped bit gives a completely different hash.",
  },
  {
    kind: "sign" as const,
    title: "Sign.",
    body: "ML-DSA-87 signs the hash with the project, version and a sequence number. Offline if you like.",
  },
  {
    kind: "verify" as const,
    title: "Checked on-chain.",
    body: "QoreChain's pqcVerify precompile accepts or rejects. Nothing unsigned gets in.",
  },
];

const messageFields: [string, string, string][] = [
  ["01", "FORREL/v1/PUBLISH", "Domain tag. A publish signature can't be replayed as a rotate or revoke."],
  ["02", "chainId · registry", "Ties the signature to this chain and this contract."],
  ["03", "projectId", "Which project the release belongs to."],
  ["04", "seq", "Goes up by one each time. Old signatures can't be replayed."],
  ["05", "keccak256(version)", "The version string, e.g. 2.4.1."],
  ["06", "artifactHash", "SHA3-256 of the file itself."],
  ["07", "metaHash", "Hash of the release notes, if any."],
];

const audiences = [
  {
    n: "01",
    tag: "10-year devices",
    title: "Firmware maintainers",
    body: "Routers, medical pumps, car ECUs. Hardware that outlives today's crypto.",
    items: ["Sign each image once", "Revoke a bad build in one call", "Rotate keys without re-flashing trust"],
  },
  {
    n: "02",
    tag: "Web + CLI",
    title: "Open-source projects",
    body: "Give every download a verdict your users can check themselves.",
    items: ["Badge for your README", "Works with any artifact type", "No server to run"],
  },
  {
    n: "03",
    tag: "Air-gapped",
    title: "Release engineers",
    body: "Sign on an offline machine, publish from CI. The build server never sees the key.",
    items: ["forrel sign, then forrel publish", "Deterministic bundle file", "Exit codes for scripts"],
  },
  {
    n: "04",
    tag: "No wallet",
    title: "Anyone with a file",
    body: "IT admins, auditors, people who just downloaded something.",
    items: ["Drop the file in", "Read the verdict", "That's it"],
    featured: true,
  },
];

const faqs: [string, string][] = [
  ["Do I need a wallet to verify?", "No. Verifying is a read-only call to the registry. No wallet, no account, no sign-up."],
  ["Where are files stored?", "Nowhere. Your browser hashes the file locally and only the 32-byte hash is looked up. Forrel stores hashes, never files."],
  ["What if I lose my signing key?", "Every project has a second, offline recovery key. It can rotate the signing key, and that rotation is itself an ML-DSA-87 signature checked on-chain."],
  ["What if a release turns out to be bad?", "The maintainer revokes it with a signed message. Anyone who checks that file afterwards sees “Revoked”, the reason, and the newer version to use."],
  ["Why QoreChain?", "It verifies ML-DSA-87 signatures natively on-chain through its pqcVerify precompile, so the registry itself refuses anything that isn't validly signed."],
  ["Is this production-ready?", "Not yet. Forrel runs on the Diana testnet because pqcVerify is testnet-only today. Treat it as a working preview."],
];

/* ---------- Page ---------- */

export default function LandingPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-brand focus:px-3 focus:py-2 focus:text-on-brand"
      >
        Skip to content
      </a>
      <SiteHeader />

      <main id="main" tabIndex={-1} className="overflow-x-clip outline-none">
        {/* ---------- 1. Hero ---------- */}
        <section id="top" className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
          {/* [1] Two hands reaching toward the headline, as in the sample */}
          <DitherFigure
            src="/illustrations/hero-hand-left.png"
            aspect={4 / 3}
            align="left"
            cell={4}
            gamma={1.6}
            parallax={10}
            radius={110}
            className="hero-hand-l pointer-events-none absolute top-[16%] -left-[5%] hidden w-[30vw] max-w-[560px] lg:block"
          />
          <DitherFigure
            src="/illustrations/hero-hand-right.png"
            aspect={4 / 3}
            align="right"
            cell={4}
            gamma={1.6}
            parallax={-10}
            radius={110}
            className="hero-hand-r pointer-events-none absolute top-[16%] -right-[5%] hidden w-[30vw] max-w-[560px] lg:block"
          />

          {/* One-time scanner sweep down the hero after the headline lands */}
          <span
            aria-hidden="true"
            className="hero-scan pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-brand-ink shadow-[0_0_28px_6px_var(--brand-ink)]"
          />

          <Container className="relative flex flex-col items-center gap-8 text-center">
            <p className="text-eyebrow hero-wipe tracking-[0.5em] text-foreground/80" style={{ animationDelay: "0.05s" }}>
              Post-quantum release log
            </p>

            <div className="relative [perspective:900px]">
              <span
                aria-hidden="true"
                className="hero-ghost pointer-events-none absolute -top-10 right-0 font-pixel-grid sm:-top-6 text-[clamp(2.5rem,1rem+6vw,6rem)] leading-none text-dim select-none sm:-right-10"
              >
                Q-Day
              </span>
              <h1 className="text-hero relative max-w-[14ch]">
                {HERO_WORDS.map((w, i) => (
                  <span key={i}>
                    <span className="hero-word" style={{ ["--wi" as string]: i }}>
                      {w}
                    </span>
                    {i < HERO_WORDS.length - 1 ? " " : ""}
                  </span>
                ))}
              </h1>
            </div>

            <p className="hero-rise flex items-center gap-2 text-body-sm text-muted-foreground" style={{ animationDelay: "0.7s" }}>
              on <span className="font-pixel tracking-[0.2em] text-foreground uppercase">QoreChain</span>
            </p>

            <p className="hero-rise max-w-xl text-body text-muted-foreground" style={{ animationDelay: "0.8s" }}>
              Forrel records every release&apos;s fingerprint with a post-quantum signature, checked
              on-chain. Drop any file to see if it&apos;s genuine.
            </p>

            {/* Lime fact bar (the sample's date / prize strip), wiped in */}
            <div className="hero-wipe text-eyebrow flex w-full max-w-3xl flex-col items-center gap-2 bg-brand px-6 py-3 text-on-brand sm:flex-row sm:justify-between" style={{ animationDelay: "0.95s" }}>
              <span>SHA3-256</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span>ML-DSA-87</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span>Checked by pqcVerify</span>
            </div>

            <div className="hero-rise w-full max-w-3xl" style={{ animationDelay: "1.15s" }}>
              <LiveStrip />
            </div>

            <div className="hero-rise flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "1.3s" }}>
              <Button asChild size="lg">
                <a href="#verify">
                  Verify a file <ArrowRight />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/app/new">Publish your releases</Link>
              </Button>
            </div>
          </Container>
        </section>

        {/* Live ticker of the latest signed releases */}
        <HashTicker />

        {/* ---------- 2. Verify widget ---------- */}
        <Section id="verify" className="scroll-mt-16">
          <Container className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
            <div className="flex flex-col gap-6">
              <Eyebrow>Verify a file</Eyebrow>
              <PixelHeading lead="Drop it here," main="Know in seconds." />
              <p className="text-body text-muted-foreground">
                Forrel hashes the file in your browser and asks the registry one question: did the
                maintainer sign these exact bytes?
              </p>
              <ArrowList
                items={[
                  "No wallet, no account",
                  "The file never leaves your device",
                  "Read straight from contract storage",
                ]}
              />
              <Footnote n="i" className="mt-auto hidden lg:block">
                Five possible answers: verified, revoked, published more than once, unknown, or an
                error you can retry.
              </Footnote>
            </div>
            <div data-reveal="right" style={{ ["--delay" as string]: "150ms" }}>
              <VerifyWidget />
            </div>
          </Container>
        </Section>

        {/* ---------- 3. The problem ---------- */}
        <Section id="problem">
          <Container className="flex flex-col gap-14">
            <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="flex flex-col gap-6">
                <Eyebrow>The problem</Eyebrow>
                <PixelHeading lead="Signed today," main="Forged tomorrow." />
                <p data-reveal="blur" className="max-w-2xl text-body-lg">
                  Every software and firmware update is trusted because of a signature. Most of
                  those signatures won&apos;t survive a quantum computer.
                </p>
                <p data-reveal="blur" style={{ ["--delay" as string]: "150ms" }} className="max-w-2xl text-body text-muted-foreground">
                  The day a large enough quantum computer exists is called Q-Day. Updates signed
                  with classical keys can be forged after it, and the devices checking them will
                  still be in the field.
                </p>
              </div>
              <figure data-reveal="right" className="flex flex-col gap-4 lg:w-[340px]">
                {/* [2] The statue crumbles as you scroll past it */}
                <DitherFigure
                  src="/illustrations/problem-statue.png"
                  alt="A marble statue of a guardian holding a key, breaking apart into pixels"
                  aspect={3 / 4}
                  effect="crumble"
                  cell={4}
                  gamma={1.6}
                  className="mx-auto w-[260px] sm:w-[300px] lg:w-full"
                />
                <figcaption>
                  <Footnote n={2}>{FIGURE_NOTES[1]}</Footnote>
                </figcaption>
              </figure>
            </div>

            <CardGrid cols={3} data-stagger="">
              {problems.map((p, i) => (
                <TiltCard key={p.title} className="gap-4 p-6 sm:p-8">
                  <PixelNumeral tone="brand" className="text-3xl">
                    {String(i + 1).padStart(2, "0")}
                  </PixelNumeral>
                  <h3 className="text-title">{p.title}</h3>
                  <p className="text-body-sm text-muted-foreground">{p.body}</p>
                </TiltCard>
              ))}
            </CardGrid>
          </Container>
        </Section>

        {/* ---------- 4. The timeline (the sample's schedule) ---------- */}
        <Section id="timeline">
          <Container className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
            <div className="flex flex-col gap-6">
              <Eyebrow>The deadline</Eyebrow>
              <PixelHeading lead="Ten years of trust," main="One deadline." />
              <p className="text-body text-muted-foreground">
                The NSA&apos;s CNSA 2.0 timeline puts software and firmware signing first in line.
                The device you ship this year is already on the clock: <Highlight>2036</Highlight>.
              </p>
              <Footnote n="ii" className="mt-auto">
                CNSA 2.0: prefer quantum-resistant signing for software and firmware from 2025, use
                it exclusively by 2030. ML-DSA-87 is one of its approved signature algorithms.
              </Footnote>
            </div>
            {/* A lime rail fills as you scroll and lights each year it reaches */}
            <ScrollTrack>
              <RowList>
                <Row
                  trackItem
                  index="2025"
                  title="Prefer post-quantum signing"
                  detail="CNSA 2.0: support and prefer quantum-resistant software and firmware signatures."
                />
                <Row
                  trackItem
                  index="2026"
                  title="You ship a router"
                  detail="It will check update signatures for the next ten years."
                  trailing={<Badge variant="brand">Today</Badge>}
                />
                <Row
                  trackItem
                  index="2030"
                  title="Post-quantum signing only"
                  detail="Software and firmware signing must use quantum-resistant algorithms exclusively."
                />
                <Row
                  trackItem
                  index="2035"
                  title="Everything else follows"
                  detail="The target for national security systems to finish the move."
                />
                <Row
                  trackItem
                  index="2036"
                  title="Your router is still in the field"
                  detail="Is the next update it accepts really from you?"
                  trailing={<Badge variant="outline">Due</Badge>}
                />
              </RowList>
            </ScrollTrack>
          </Container>
        </Section>

        {/* ---------- 5. How it works ---------- */}
        <Section id="how" className="scroll-mt-16">
          <Container className="flex flex-col gap-14">
            <div className="flex flex-col gap-6">
              <Eyebrow>How it works</Eyebrow>
              <PixelHeading lead="Three steps," main="Nothing unsigned gets in." />
            </div>
            <CardGrid cols={3} data-stagger="">
              {steps.map((s, i) => (
                <TiltCard key={s.kind} max={5}>
                  <StepFigure kind={s.kind} />
                  <div className="flex flex-col gap-3 p-6 sm:p-8">
                    <p className="text-body-sm text-brand-ink">{String(i + 1).padStart(2, "0")}</p>
                    <h3 className="text-title">{s.title}</h3>
                    <p className="text-body-sm text-muted-foreground">{s.body}</p>
                  </div>
                </TiltCard>
              ))}
            </CardGrid>
            <Callout data-reveal="left">
              Rotating a key and revoking a release work the same way: each is an ML-DSA-87 signed
              message, checked by pqcVerify before the contract changes anything.
            </Callout>
          </Container>
        </Section>

        {/* ---------- Lime band ---------- */}
        <BrandBand className="overflow-hidden">
          {/* Two counter-scrolling pixel tickers frame the band */}
          <Marquee seconds={28} className="border-b border-on-brand/20 py-3">
            {BAND_WORDS.map((w) => (
              <span key={w} className="flex items-center gap-6 px-6 font-pixel text-2xl whitespace-nowrap uppercase sm:text-3xl">
                {w}
                <span aria-hidden="true">✦</span>
              </span>
            ))}
          </Marquee>
          <Container className="flex flex-col gap-8 py-14 md:flex-row md:items-center md:justify-between">
            <div data-reveal="left" className="flex flex-col gap-3">
              <p className="text-display-sm">Verify without a wallet</p>
              <p className="max-w-xl text-body">
                Anyone can check a file. Only maintainers need a QoreX wallet, and only to publish.
              </p>
            </div>
            <div data-reveal="right" className="self-start md:self-auto">
              <Button asChild variant="inverse" size="lg">
                <a href="#verify">
                  Verify a file <ArrowRight />
                </a>
              </Button>
            </div>
          </Container>
          <Marquee seconds={34} reverse className="border-t border-on-brand/20 py-2">
            {BAND_FACTS.map((w) => (
              <span key={w} className="text-eyebrow flex items-center gap-6 px-6 whitespace-nowrap">
                {w}
                <span aria-hidden="true">·</span>
              </span>
            ))}
          </Marquee>
        </BrandBand>

        {/* ---------- 6. Live proof (inverted, like the sample's pale prize block) ---------- */}
        <LiveProofSection />

        {/* ---------- 7. What's post-quantum (the sample's judging block) ---------- */}
        <Section id="pq">
          <Container className="flex flex-col gap-12">
            <div className="flex flex-col gap-6">
              <Eyebrow>Honest about it</Eyebrow>
              <PixelHeading lead="What's post-quantum," main="And what isn't." />
              <p className="max-w-2xl text-body text-muted-foreground">
                We say post-quantum signatures, never &ldquo;quantum-proof&rdquo;. Here is exactly
                which parts hold up against a quantum attacker.
              </p>
            </div>

            <div data-reveal="zoom" className="flex flex-col gap-6 bg-brand p-6 text-on-brand sm:p-8">
              <p className="text-eyebrow">Post-quantum</p>
              <ol data-stagger="" className="grid gap-6 md:grid-cols-3">
                {[
                  ["ML-DSA-87 release signatures", "FIPS 204, the highest security level."],
                  ["SHA3-256 fingerprints", "Hashes stay safe; Grover's algorithm only halves the margin."],
                  ["Your QoreChain account", "Hybrid: ML-DSA-87 plus a classical key."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="font-pixel text-2xl leading-none">{i + 1}</span>
                    <span className="flex flex-col gap-1">
                      <span className="text-title">{t}</span>
                      <span className="text-body-sm opacity-80">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <CardGrid cols={2} data-stagger="">
              <TiltCard className="gap-4 p-6 sm:p-8">
                <Badge variant="outline" className="self-start">
                  Classical
                </Badge>
                <h3 className="text-title">The EVM transport signature</h3>
                <p className="text-body-sm text-muted-foreground">
                  It only pays gas. It can&apos;t forge a release, because the contract checks the
                  ML-DSA-87 signature before accepting anything.
                </p>
              </TiltCard>
              <TiltCard className="gap-4 p-6 sm:p-8">
                <Badge variant="warning" className="self-start">
                  Testnet only
                </Badge>
                <h3 className="text-title">pqcVerify isn&apos;t on mainnet yet</h3>
                <p className="text-body-sm text-muted-foreground">
                  Forrel runs on QoreChain&apos;s Diana testnet until the precompile ships to
                  mainnet.
                </p>
              </TiltCard>
            </CardGrid>
          </Container>
        </Section>

        {/* ---------- 8. For your pipeline (the sample's two-column "before you start") ---------- */}
        <Section id="pipeline" className="scroll-mt-16">
          <Container className="grid gap-16 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-8">
              <div className="flex flex-col gap-6">
                <Eyebrow>For your pipeline</Eyebrow>
                <PixelHeading lead="Three commands," main="From CI to chain." />
              </div>
              <StepList data-stagger="">
                <Step n={1} title="Sign, offline if you like">
                  <CodeSnippet
                    typing
                    label="sign command"
                    code="npx forrel sign ./dist/app.bin --project acme-router --version 2.4.1"
                  />
                </Step>
                <Step n={2} title="Publish from CI">
                  <CodeSnippet typing label="publish command" code="npx forrel publish ./app.bin.forrel.json" />
                </Step>
                <Step n={3} title="Verify anywhere">
                  <CodeSnippet typing label="verify command" code="npx forrel verify ./app.bin" />
                  <p className="text-body-sm text-muted-foreground">
                    Exit code 0 verified, 1 unknown, 2 revoked, 3 error.
                  </p>
                </Step>
              </StepList>
            </div>

            <div className="flex min-w-0 flex-col gap-8">
              <div className="flex flex-col gap-6">
                <Eyebrow>What gets signed</Eyebrow>
                <PixelHeading lead="One message," main="Every field bound." />
              </div>
              <RowList data-stagger="">
                {messageFields.map(([n, field, detail]) => (
                  <Row
                    key={n}
                    index={n}
                    title={<code className="font-mono text-[0.9375rem]">{field}</code>}
                    detail={detail}
                    className="py-4"
                  />
                ))}
              </RowList>
              <Callout data-reveal="left">
                The submitter key only pays gas. Publish, rotate and revoke all need a valid ML-DSA-87
                signature.
              </Callout>
            </div>
          </Container>
        </Section>

        {/* ---------- 9. Who it's for (the sample's idea cards) ---------- */}
        <Section id="who">
          <Container className="flex flex-col gap-14">
            <div className="flex flex-col gap-6">
              <Eyebrow>Who it&apos;s for</Eyebrow>
              <PixelHeading lead="Built for" main="Whoever ships bytes." />
            </div>
            <CardGrid cols={4} data-stagger="">
              {audiences.map((a) => (
                <TiltCard key={a.n} variant={a.featured ? "featured" : "default"} max={9} className="gap-5 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <PixelNumeral tone={a.featured ? "ink" : "dim"} className="text-5xl in-data-[variant=featured]:text-on-brand">
                      {a.n}
                    </PixelNumeral>
                    <Badge variant={a.featured ? "on-brand" : "outline"}>{a.tag}</Badge>
                  </div>
                  <h3 className="text-title">{a.title}</h3>
                  <p className="text-body-sm opacity-80">{a.body}</p>
                  <ArrowList items={a.items} className="mt-auto [&_li]:text-body-sm" />
                </TiltCard>
              ))}
            </CardGrid>
          </Container>
        </Section>

        {/* ---------- 10. FAQ (the sample's rules block) ---------- */}
        <Section id="faq" className="scroll-mt-16">
          <Container className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
            <div className="flex flex-col gap-6">
              <Eyebrow>Questions</Eyebrow>
              <PixelHeading lead="Plain answers," main="No surprises." />
              <p className="text-body text-muted-foreground">What Forrel promises:</p>
              <ArrowList
                items={[
                  "Files are hashed locally and never uploaded",
                  "Verifying needs no wallet and no account",
                  "Every verdict comes from contract storage",
                  "The CLI checks independently of this site",
                ]}
              />
            </div>
            <Accordion data-stagger="">
              {faqs.map(([q, a]) => (
                <AccordionItem key={q} question={q}>
                  {a}
                </AccordionItem>
              ))}
            </Accordion>
          </Container>
        </Section>

        {/* ---------- Closer on the dot grid ---------- */}
        <section className="bg-dot-grid border-t border-dashed border-hairline py-24 sm:py-32">
          <Container className="grid items-end gap-12 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-8">
              <h2 className="text-display-xl">
                <SplitText text="Verify it." />
              </h2>
              <p data-reveal="blur" style={{ ["--delay" as string]: "450ms" }} className="max-w-md text-body text-muted-foreground">
                Hash locally. Sign with ML-DSA-87. Check on-chain. The same answer in ten years as
                today.
              </p>
              <div data-reveal="up" style={{ ["--delay" as string]: "600ms" }} className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <a href="#verify">
                    Verify a file <ArrowRight />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/app">Open the app</Link>
                </Button>
              </div>
            </div>
            <figure data-reveal="zoom" className="flex flex-col gap-4 lg:w-[320px]">
              {/* [3] Interactive: the figure scatters around the pointer */}
              <DitherFigure
                src="/illustrations/closer-figure.png"
                alt="A marble hand holding up a balance scale, drawn in pixels"
                aspect={4 / 5}
                cell={4}
                gamma={1.2}
                radius={80}
                className="mx-auto w-[240px] lg:w-full"
              />
              <figcaption>
                <Footnote n={3}>{FIGURE_NOTES[2]}</Footnote>
              </figcaption>
            </figure>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
