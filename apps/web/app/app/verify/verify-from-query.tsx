"use client";

import { useSearchParams } from "next/navigation";

import { VerifyWidget } from "@/components/verify/verify-widget";

export function VerifyFromQuery() {
  const hash = useSearchParams().get("hash") ?? undefined;
  return <VerifyWidget initialHash={hash} />;
}
