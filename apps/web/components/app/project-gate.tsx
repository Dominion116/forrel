"use client";

import type { Project } from "@forrel/core";
import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowRight, Button } from "@/components/ui/button";
import { Container } from "@/components/ui/typography";
import { useProject } from "@/lib/chain/hooks";

import { EmptyState, Skeleton } from "./primitives";

/** Loads a project by slug and renders children with it, or loading / error / not-found states. */
export function ProjectGate({ slug, children }: { slug: string; children: (project: Project) => ReactNode }) {
  const q = useProject(slug);
  if (q.isLoading) {
    return (
      <Container className="flex flex-col gap-4 py-10">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }
  if (q.isError) {
    return (
      <Container className="py-10">
        <EmptyState
          title="Could not load this project"
          action={
            <Button variant="outline" onClick={() => q.refetch()}>
              Retry
            </Button>
          }
        />
      </Container>
    );
  }
  if (!q.data) {
    return (
      <Container className="py-10">
        <EmptyState
          title={`No project called “${slug}”`}
          action={
            <Button asChild variant="outline">
              <Link href="/app/new">
                Register it <ArrowRight />
              </Link>
            </Button>
          }
        />
      </Container>
    );
  }
  return <>{children(q.data)}</>;
}
