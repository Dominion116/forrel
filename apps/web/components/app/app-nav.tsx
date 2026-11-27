"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** Nav links with the current page marked (aria-current + lime underline). */
export function AppNavLinks({
  items,
  variant = "bar",
}: {
  items: { href: string; label: string }[];
  variant?: "bar" | "menu";
}) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "transition-colors duration-150",
              variant === "bar" &&
                cn(
                  "border-b pb-0.5 text-[0.875rem]",
                  active
                    ? "border-brand-ink text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ),
              variant === "menu" &&
                cn(
                  "px-3 py-2.5 text-body hover:bg-surface-2",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                ),
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
