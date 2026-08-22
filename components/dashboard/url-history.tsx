"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ExternalLink, History, Loader2, RefreshCw, Search } from "lucide-react"
import type { UrlSubmission } from "@/lib/db/schema"
import { clearSubmissionHistory } from "@/app/actions/crawl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function UrlHistory({ history }: { history: UrlSubmission[] }) {
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
        <div className="hidden grid-cols-[1fr_auto_auto] gap-4 border-b border-border/60 bg-muted/30 px-4 py-2.5 text-xs uppercase tracking-wide text-muted-foreground md:grid">
          <span>URL</span>
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
              className="grid grid-cols-1 items-center gap-2 border-b border-border/40 px-4 py-3 last:border-0 md:grid-cols-[1fr_auto_auto] md:gap-4"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{entry.domain}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {entry.url}
                </div>
              </div>
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
