import { Fragment } from "react";

import { cn } from "@/lib/utils";

/**
 * Big text whose letters rise one by one out of a mask when scrolled into view
 * (data-split, driven by MotionObserver), and hop when hovered.
 */
export function SplitText({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  let i = 0;
  return (
    <span data-split="" className={cn("inline-block", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <Fragment key={w}>
            <span className="split-line">
              {[...word].map((ch) => {
                const ci = i++;
                return (
                  <span key={ci} className="split-ch" style={{ ["--ci" as string]: ci }}>
                    {ch}
                  </span>
                );
              })}
            </span>
            {w < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </span>
  );
}
