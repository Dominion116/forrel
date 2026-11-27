"use client";

import { useNow, useRegistryStats } from "@/lib/chain/hooks";
import { formatInt, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * "N releases · M projects · last published X ago", read from the registry after the
 * static hero has painted. Styled as the sample's lime-outlined hero notice.
 */
export function LiveStrip({ className }: { className?: string }) {
  const { data, isError } = useRegistryStats();
  const now = useNow();

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center gap-2 border border-brand-ink px-5 py-3 sm:flex-row sm:gap-4",
        className,
      )}
    >
      <span className="text-eyebrow flex shrink-0 items-center gap-2 text-brand-ink">
        <span aria-hidden="true" className="relative flex size-2">
          <span className="absolute inset-0 animate-ping bg-brand-ink opacity-60 motion-reduce:hidden" />
          <span className="relative size-2 bg-brand-ink" />
        </span>
        Live on Diana.
      </span>
      <span className="text-body-sm text-foreground">
        {isError ? (
          "The registry is not answering right now. Verifying still works when it's back."
        ) : data ? (
          <>
            {formatInt(data.releaseCount)} releases · {formatInt(data.projectCount)} projects
            {data.lastPublishedAt && now
              ? ` · last published ${timeAgo(data.lastPublishedAt, now)}`
              : ""}
          </>
        ) : (
          <span className="text-muted-foreground">Reading the registry…</span>
        )}
      </span>
    </div>
  );
}
