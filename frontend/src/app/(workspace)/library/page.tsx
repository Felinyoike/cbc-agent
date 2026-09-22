"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardCheck,
  Download,
  FileText,
  Library as LibraryIcon,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmedBadge, DraftBadge } from "@/components/Provenance";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  describeApiError,
  getLibrary,
  lessonDownloadUrl,
  schemeDownloadUrl,
  type LibraryEntry,
  type ReflectionStatus,
} from "@/lib/api";

const typeIcons = {
  "Scheme of Work": FileText,
  "Lesson Plan": ClipboardCheck,
} as const;

const filters = ["All", "Scheme of Work", "Lesson Plan"] as const;

export default function LibraryPage() {
  const { termPlanConfirmed, lessonPlanConfirmed, termPlanRows, lessonPlan, reflections } = useWorkspace();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [items, setItems] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* The library is whatever Postgres holds as confirmed -- never local session state. */
  useEffect(() => {
    const controller = new AbortController();
    getLibrary(controller.signal)
      .then(({ items }) => setItems(items))
      .catch((err) => {
        if (!controller.signal.aborted) setError(describeApiError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((item) => item.type === filter)),
    [items, filter]
  );

  const lessonHasContent =
    lessonPlan.development.some((step) => step.trim()) ||
    Object.entries(lessonPlan).some(([key, value]) => key !== "development" && typeof value === "string" && value.trim());

  /* Drafts live in their own area — the library only holds confirmed work. */
  const openDrafts = [
    !termPlanConfirmed && termPlanRows.some((row) => row.status === "draft")
      ? { href: "/term-plans", label: "Term plan", detail: "Unconfirmed teacher draft" }
      : null,
    !lessonPlanConfirmed && lessonHasContent
      ? { href: "/daily-lessons/plan", label: lessonPlan.title.trim() || "Daily lesson plan", detail: "Unconfirmed lesson draft" }
      : null,
    ...reflections
      .filter((record) => record.status === "draft")
      .map((record) => ({
        href: `/reflections/${record.id}`,
        label: record.lessonTitle,
        detail: "Reflection draft — not confirmed",
      })),
  ].filter(Boolean) as { href: string; label: string; detail: string }[];

  return (
    <main className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">My Library</h1>
        <p className="text-sm text-muted-foreground">
          Teacher-confirmed work products only. Unconfirmed drafts stay in the drafts area below.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              filter === option
                ? "border-brand-border bg-brand-soft font-medium text-brand-ink"
                : "border-border bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {option === "All" ? "All artifacts" : `${option}s`}
          </button>
        ))}
        {!loading && !error && (
          <span className="ml-auto text-sm text-muted-foreground">
            {filtered.length} confirmed {filtered.length === 1 ? "artifact" : "artifacts"}
          </span>
        )}
      </div>

      {loading ? (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading your confirmed work…
        </div>
      ) : error ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">Could not load your library. {error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-white py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
            <LibraryIcon className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">
            {items.length === 0 ? "Nothing confirmed yet" : "Nothing confirmed in this category yet"}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Schemes and lesson plans you confirm will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((item) => (
            <LibraryCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-neutral-950">Drafts</h2>
          <span className="text-sm text-muted-foreground">Not part of your library until confirmed</span>
        </div>
        {openDrafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open drafts.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {openDrafts.map((draft) => (
              <Card key={draft.href + draft.label} className="gap-3 border-draft-border bg-draft-surface/60 p-4">
                <CardContent className="flex flex-wrap items-center gap-3 p-0">
                  <DraftBadge />
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium text-neutral-950">{draft.label}</span>
                    <span className="text-xs text-draft-text">{draft.detail}</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={draft.href}>Open draft</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// A confirmed reflection is included in the lesson plan's download.
const reflectionStatusLabels: Record<ReflectionStatus, string> = {
  not_started: "Not yet added",
  draft: "In progress",
  confirmed: "Included",
};

function LibraryCard({ item }: { item: LibraryEntry }) {
  const Icon = typeIcons[item.type];
  const context = [item.grade, item.subject].filter(Boolean).join(" · ");
  const term = item.term ? `Term ${item.term}${item.year ? ` ${item.year}` : ""}` : "";
  const href = item.type === "Scheme of Work" ? schemeDownloadUrl(item.id) : lessonDownloadUrl(item.id);

  return (
    <Card className="gap-3 p-5">
      <CardContent className="gap-3 p-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-softer">
              <Icon className="size-4 text-brand-strong" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">{item.type}</span>
              <span className="text-sm font-medium leading-snug text-neutral-950">{item.title}</span>
            </div>
          </div>
          <ConfirmedBadge />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <Meta label="Context" value={context || "Not linked to a saved scheme"} />
          <Meta label="Term" value={term || "—"} />
          <Meta label="Last updated" value={formatDate(item.updatedAt)} />
          {item.reflectionStatus && (
            <Meta label="Reflection" value={reflectionStatusLabels[item.reflectionStatus]} />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          {item.evidenceCount !== null ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              {item.evidenceCount} evidence {item.evidenceCount === 1 ? "item" : "items"} cited
            </span>
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <a href={href}>
              <Download className="size-3.5" />
              Download
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
