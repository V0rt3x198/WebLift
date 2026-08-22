import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

export type Issue = {
  code: string
  label: string
  // The three dimensions the modernization ranking is built from.
  category: "responsive" | "device" | "palette"
  severity: "low" | "medium" | "high"
}

export const crawlSites = pgTable("crawl_sites", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  domain: text("domain").notNull(),
  // pending | crawling | crawled | error
  status: text("status").notNull().default("pending"),
  depth: integer("depth").notNull().default(0),
  sourceUrl: text("source_url"),
  httpStatus: integer("http_status"),
  title: text("title"),
  // 0-100, higher means it needs modernization more urgently.
  // overall is a weighted blend of the three dimensions below.
  overallScore: integer("overall_score"),
  responsiveScore: integer("responsive_score"),
  deviceScore: integer("device_score"),
  paletteScore: integer("palette_score"),
  issues: jsonb("issues").$type<Issue[]>().default([]),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
})

export type CrawlSite = typeof crawlSites.$inferSelect

// Append-only log of every URL the user submits, grouped by submission batch.
// Unlike crawl_sites, this keeps duplicates so the full history is preserved.
export const urlSubmissions = pgTable("url_submissions", {
  id: serial("id").primaryKey(),
  // Groups all URLs that were submitted together in one "Queue seeds" action.
  batchId: text("batch_id").notNull(),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type UrlSubmission = typeof urlSubmissions.$inferSelect
