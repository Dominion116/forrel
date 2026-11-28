"use client";

import { useNow, useRegistryStats } from "@/lib/chain/hooks";
import { formatInt, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Live registry readout in the sample's lime-outlined hero notice, read after the static
 * hero has painted.
 * - sm+: one line, "N releases · M projects · last published X ago".
 * - Phones: a label row over three stat cells with big pixel numbers.
 */
export function LiveStrip({ className }: { className?: string }) {
  const { data, isError } = useRegistryStats();
  const now = useNow();
  const last = data?.lastPublishedAt && now ? timeAgo(data.lastPublishedAt, now) : null;

  const label = (
    <span className="text-eyebrow flex shrink-0 items-center gap-2 text-brand-ink">
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inset-0 animate-ping bg-brand-ink opacity-60 motion-reduce:hidden" />
        <span className="relative size-2 bg-brand-ink" />
      </span>
      Live on Diana.
    </span>
  );

  return (
    <div role="status" aria-live="polite" className={cn("border border-brand-ink", className)}>
      {/* sm and up: single line */}
      <div className="hidden items-center justify-center gap-4 px-5 py-3 sm:flex">
        {label}
        <span className="text-body-sm text-foreground">
          {isError ? (
            "The registry is not answering right now. Verifying still works when it's back."
          ) : data ? (
            <>
              {formatInt(data.releaseCount)} releases · {formatInt(data.projectCount)} projects
              {last ? ` · last published ${last}` : ""}
            </>
          ) : (
            <span className="text-muted-foreground">Reading the registry…</span>
          )}
        </span>
      </div>

      {/* Phones: label + three stat cells */}
      <div className="sm:hidden">
        <div className="flex justify-center border-b border-brand-ink/40 px-4 py-2.5">{label}</div>
        {isError ? (
          <p className="px-4 py-3 text-body-sm text-muted-foreground">The registry is not answering right now.</p>
        ) : (
          <dl className="grid grid-cols-3 divide-x divide-brand-ink/40">
            {[
              ["Releases", data ? formatInt(data.releaseCount) : "··"],
              ["Projects", data ? formatInt(data.projectCount) : "··"],
              ["Last signed", last ? last.replace(" ago", "") : "··"],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col-reverse items-center gap-1.5 px-2 py-3">
                <dt className="text-[0.5625rem] tracking-[0.18em] text-muted-foreground uppercase">{k}</dt>
                <dd className="font-pixel text-xl leading-none text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
