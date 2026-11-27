import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Teach tailwind-merge about the custom type utilities in globals.css.
 * Without this, `text-title` and `text-muted-foreground` look like two colors
 * and one of them is silently dropped.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-xl",
            "display",
            "display-sm",
            "eyebrow",
            "title-lg",
            "title",
            "numeric",
            "body-lg",
            "body",
            "body-sm",
          ],
        },
      ],
    },
  },
});

/** Merge Tailwind utility classes safely. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
