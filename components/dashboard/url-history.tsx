"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ExternalLink, History, Loader2, RefreshCw, Search } from "lucide-react"
import type { SubmissionHistoryRow } from "@/app/actions/crawl"
import { clearSubmissionHistory } from "@/app/actions/crawl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

type ResultStatus = "pending" | "crawling" | "crawled" | "error" | "not-queued"

function resultStatus(entry: SubmissionHistoryRow): ResultStatus {
  if (!entry.status) return "not-queued"
  return entry.status as ResultStatus
}

const STATUS_LABELS: Record<ResultStatus, string> = {
  pending: "Queued",
  crawling: "Scanning",
  crawled: "Scanned",
  error: "Error",
  "not-queued": "Not queued",
}

const STATUS_STYLES: Record<ResultStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  crawling: "bg-primary/15 text-primary",
  crawled: "bg-emerald-500/15 text-emerald-400",
  error: "bg-destructive/15 text-destructive",
  "not-queued": "bg-muted text-muted-foreground",
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  // Higher score = needs modernization more urgently.
  const tone =
    score >= 50
      ? "text-destructive"
      : score >= 25
        ? "text-amber-400"
        : "text-emerald-400"
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn("font-mono text-sm font-semibold", tone)}>{score}</span>
    </div>
  )
}

function ResultCell({ entry }: { entry: SubmissionHistoryRow }) {
  const status = resultStatus(entry)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            STATUS_STYLES[status],
          )}
        >
          {status === "crawling" && (
            <Loader2 className="mr-1 size-3 animate-spin" />
          )}
          {STATUS_LABELS[status]}
        </span>
        {entry.httpStatus != null && (
          <span className="font-mono text-xs text-muted-foreground">
            HTTP {entry.httpStatus}
          </span>
        )}
        {typeof entry.issues?.length === "number" && entry.issues.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {entry.issues.length} issue{entry.issues.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {status === "crawled" && entry.overallScore != null && (
        <div className="flex items-center gap-3">
          <ScoreBadge label="Overall" score={entry.overallScore} />
          {entry.seoScore != null && (
            <ScoreBadge label="SEO" score={entry.seoScore} />
          )}
          {entry.designScore != null && (
            <ScoreBadge label="Design" score={entry.designScore} />
          )}
        </div>
      )}

      {status === "error" && entry.error && (
        <p className="truncate text-xs text-destructive/80">{entry.error}</p>
      )}

      {entry.title && status === "crawled" && (
        <p className="truncate text-xs text-muted-foreground">{entry.title}</p>
      )}
    </div>
  )
}

export function UrlHistory({ history }: { history: SubmissionHistoryRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [clearing, startClear] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return history
    return history.filter(
      (h) => h.url.toLowerCase().includes(q) || h.domain.toLowerCase().includes(q),
    )
  }, [history, query])

  function handleClear() {
    startClear(async () => {
      await clearSubmissionHistory()
      toast.success("URL history cleared.")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="size-4 text-primary" />
          <span>
            {history.length} URL{history.length === 1 ? "" : "s"} submitted
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.refresh()}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Refresh scan results"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by URL or domain"
              className="pl-8"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={clearing || history.length === 0}
            className="text-muted-foreground hover:text-destructive"
          >
            {clearing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Clear
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60">
        <div className="hidden grid-cols-[1fr_1fr_auto_auto] gap-4 border-b border-border/60 bg-muted/30 px-4 py-2.5 text-xs uppercase tracking-wide text-muted-foreground md:grid">
          <span>URL</span>
          <span>Scan result</span>
          <span className="w-40">Submitted</span>
          <span className="w-8 text-right">Open</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <History className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {history.length === 0
                ? "No URLs submitted yet. Queue some seed URLs to build your history."
                : "No URLs match your filter."}
            </p>
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-1 items-center gap-3 border-b border-border/40 px-4 py-3 last:border-0 md:grid-cols-[1fr_1fr_auto_auto] md:gap-4"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{entry.domain}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {entry.url}
                </div>
              </div>
              <ResultCell entry={entry} />
              <div className="text-sm text-muted-foreground md:w-40">
                {formatWhen(new Date(entry.submittedAt))}
              </div>
              <div className="flex md:w-8 md:justify-end">
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  aria-label={`Open ${entry.url} in a new tab`}
                >
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
