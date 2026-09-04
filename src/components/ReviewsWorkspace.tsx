"use client"

// Purpose: Keep review filters, map focus and organization replies URL-owned and predictable.

import { ArrowDownUp, ChevronDown, Clock3, Edit3, MessageSquareDashed, Minus, SlidersHorizontal, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react"
import { type FormEvent, type ReactNode, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import PartnerPointsMapPanel from "@/components/PartnerPointsMapPanel"
import PartnerTwoColumnLayout from "@/components/PartnerTwoColumnLayout"
import ReferenceCombobox from "@/components/ReferenceCombobox"
import { useStableIdempotencyKey } from "@/lib/client-idempotency"
import { readResponseError } from "@/lib/http-response-error"
import { rememberWorkspaceGeo } from "@/lib/workspace-geo-preference"
import type { LocationReference, Point, Review, ReviewSummary } from "@/lib/types"

type Filters = {
  tone: "all" | "positive" | "neutral" | "negative"
  view: "all" | "answered" | "unanswered"
  datePreset: "all" | "today" | "7d" | "30d"
  sort: "newest" | "oldest"
  unansweredFirst: boolean
  pointId: number | null
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
})

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : `${dateFormatter.format(date)} UTC`
}

function ReviewReply({ review }: { review: Review }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [value, setValue] = useState(review.reply || "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [snapshotEtag, setSnapshotEtag] = useState<string | null>(null)
  const { keyFor, clearKey } = useStableIdempotencyKey()

  async function prepareSnapshot(action: "edit" | "delete") {
    setPending(true)
    setError("")
    try {
      const response = await fetch(`/api/partner/reviews/${review.id}`, { cache: "no-store" })
      if (!response.ok) throw new Error(await readResponseError(response, "The review could not be loaded."))
      const etag = response.headers.get("etag")
      if (!etag) throw new Error("The review revision is missing. Reload and try again.")
      const current = await response.json() as Review
      setValue(current.reply || "")
      setSnapshotEtag(etag)
      clearKey("review-reply")
      if (action === "edit") setOpen(true)
      else setConfirmDelete(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The Partner API could not be reached. Try again.")
    } finally {
      setPending(false)
    }
  }

  async function save(reply: string | null) {
    if (!snapshotEtag) {
      setError("Reload the review before saving a reply.")
      return
    }
    setPending(true)
    setError("")
    try {
      const payload = { reply }
      const response = await fetch(`/api/partner/reviews/${review.id}/reply`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": snapshotEtag,
          "Idempotency-Key": keyFor("review-reply", { reviewId: review.id, etag: snapshotEtag, payload }),
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        setError(response.status === 409
          ? "This review changed. Reload and try again."
          : await readResponseError(response, "The reply could not be saved."))
        return
      }
      const updated = await response.json() as Review
      setValue(updated.reply || "")
      setSnapshotEtag(response.headers.get("etag"))
      clearKey("review-reply")
      setOpen(false)
      setConfirmDelete(false)
      router.refresh()
    } catch {
      setError("The Partner API could not be reached. Try again.")
    } finally {
      setPending(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void save(value.trim() || null)
  }

  if (confirmDelete) {
    return (
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
        <span>Delete this reply?</span>
        <button type="button" onClick={() => setConfirmDelete(false)} className="h-7 rounded-md px-2 text-slate-500 hover:bg-white">No</button>
        <button type="button" disabled={pending} onClick={() => void save(null)} className="h-7 rounded-md bg-rose-600 px-2.5 text-white disabled:bg-slate-300">Yes</button>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <div className="flex justify-end gap-1.5">
        {review.reply ? (
          <button type="button" disabled={pending} onClick={() => void prepareSnapshot("delete")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] text-rose-700 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" />Delete reply
          </button>
        ) : null}
        <button type="button" disabled={pending} onClick={() => open ? setOpen(false) : void prepareSnapshot("edit")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 text-[11px] text-sky-700 disabled:opacity-50">
          <Edit3 className="h-3.5 w-3.5" />{review.reply ? "Edit reply" : "Reply"}
        </button>
      </div>
      {error && !open ? <p className="mt-1 text-right text-[11px] text-rose-700">{error}</p> : null}
      {open ? (
        <form onSubmit={submit} className="mt-2 rounded-lg bg-slate-50 p-2.5">
          <textarea value={value} onChange={(event) => setValue(event.target.value)} maxLength={5000} rows={2} autoFocus placeholder="Write an organization reply" className="min-h-16 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] leading-5 text-slate-700 outline-none focus:border-teal-600" />
          {error ? <p className="mt-1 text-[11px] text-rose-700">{error}</p> : null}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-8 rounded-lg px-3 text-[11px] text-slate-500 hover:bg-white">Cancel</button>
            <button disabled={pending} className="h-8 rounded-lg bg-teal-700 px-3 text-[11px] font-medium text-white disabled:bg-slate-300">{pending ? "Saving…" : "Save reply"}</button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

function ReviewCard({ review, selected, onSelect }: { review: Review; selected: boolean; onSelect: () => void }) {
  const tone = review.tone === "positive"
    ? { icon: ThumbsUp, label: "Positive", badge: "bg-emerald-50 text-emerald-700" }
    : review.tone === "negative"
      ? { icon: ThumbsDown, label: "Negative", badge: "bg-rose-50 text-rose-700" }
      : { icon: Minus, label: "Neutral", badge: "bg-slate-100 text-slate-600" }
  const ToneIcon = tone.icon
  const geo = [review.country_emoji, review.city_name || review.city_slug].filter(Boolean).join(" ")
  return (
    <article
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border bg-white px-3 py-3 transition-colors ${selected ? "border-teal-600" : "border-slate-200 hover:border-slate-300"}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-700">{review.point_name || "Exchange point"}</h3>
        <span className={`inline-flex h-7 items-center gap-1 rounded-full px-2 text-[10px] ${tone.badge}`}><ToneIcon className="h-3.5 w-3.5" />{tone.label}</span>
        <span className={`rounded-full px-2 py-1 text-[10px] ${review.reply ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>{review.reply ? "Answered" : "Unanswered"}</span>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-5 text-slate-600">{review.comment || "No written comment."}</p>
      {review.reply ? (
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
          <div className="text-[10px] text-slate-400">Organization reply</div>
          <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-5 text-slate-600">{review.reply}</p>
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-slate-400">
        {geo ? <span>{geo}</span> : null}
        {review.point_address ? <><span>·</span><span>{review.point_address}</span></> : null}
        <span className="ml-auto">{formatDate(review.created_at)}</span>
      </div>
      <ReviewReply review={review} />
    </article>
  )
}

function Summary({ value }: { value: ReviewSummary }) {
  const items = [
    ["Total", value.total, "bg-sky-50 text-sky-700"],
    ["Unanswered", value.unanswered, "bg-amber-50 text-amber-700"],
    ["Positive", value.positive, "bg-emerald-50 text-emerald-700"],
    ["Neutral", value.neutral, "bg-slate-100 text-slate-600"],
    ["Negative", value.negative, "bg-rose-50 text-rose-700"],
  ] as const
  return <div className="grid grid-cols-5 gap-1">{items.map(([label, count, className]) => <div key={label} className={`rounded-lg px-1 py-2 text-center ${className}`}><div className="text-[16px] font-semibold leading-none">{count}</div><div className="mt-1 truncate text-[9px]">{label}</div></div>)}</div>
}

export default function ReviewsWorkspace({
  reviews,
  points,
  location,
  summary,
  organizationSummary,
  filters,
  pagination,
}: {
  reviews: Review[]
  points: Point[]
  location: LocationReference | null
  summary: ReviewSummary
  organizationSummary: ReviewSummary
  filters: Filters
  pagination?: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedPointId, setSelectedPointId] = useState<number | null>(filters.pointId)
  const [filtersOpen, setFiltersOpen] = useState(true)

  useEffect(() => {
    if (!location) return
    rememberWorkspaceGeo(location.kind === "city" ? location.slug || null : location.iso3.toLowerCase())
  }, [location])

  function updateQuery(values: Record<string, string | number | boolean | null>) {
    const params = new URLSearchParams(window.location.search)
    Object.entries(values).forEach(([key, value]) => {
      if (value === null || value === "" || value === false) params.delete(key)
      else params.set(key, String(value))
    })
    if (!("page" in values)) params.delete("page")
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  function setLocation(next: LocationReference | null) {
    const params = new URLSearchParams(window.location.search)
    params.delete("page")
    params.delete("point")
    const geo = next ? (next.kind === "city" ? next.slug || "" : next.iso3.toLowerCase()) : ""
    rememberWorkspaceGeo(geo || null)
    const nextPath = geo ? `/reviews/${encodeURIComponent(geo)}` : "/reviews"
    const query = params.toString()
    router.push(query ? `${nextPath}?${query}` : nextPath)
  }

  const filterButton = (active: boolean) => `h-8 rounded-lg px-2.5 text-[11px] transition-colors ${active ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`
  return (
    <PartnerTwoColumnLayout
      variant="map"
      left={<section className="min-w-0 space-y-2">
        <div className="w-full max-w-[460px]"><ReferenceCombobox<LocationReference> kind="locations" placeholder="Start typing a city or country" value={location} onChange={setLocation} /></div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <button type="button" onClick={() => setFiltersOpen((current) => !current)} aria-expanded={filtersOpen} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[12px] font-medium text-slate-600 hover:bg-slate-100">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            Filters
            <ChevronDown className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
          {filtersOpen ? <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {(["all", "positive", "neutral", "negative"] as const).map((tone) => <button key={tone} type="button" onClick={() => updateQuery({ tone: tone === "all" ? null : tone })} className={filterButton(filters.tone === tone)}>{tone[0].toUpperCase() + tone.slice(1)}</button>)}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => updateQuery({ view: null })} className={filterButton(filters.view === "all")}>All · {summary.total}</button>
              <button type="button" onClick={() => updateQuery({ view: "answered" })} className={filterButton(filters.view === "answered")}>Answered · {Math.max(0, summary.total - summary.unanswered)}</button>
              <button type="button" onClick={() => updateQuery({ view: "unanswered" })} className={filterButton(filters.view === "unanswered")}><MessageSquareDashed className="mr-1 inline h-3.5 w-3.5" />Unanswered · {summary.unanswered}</button>
              <button type="button" onClick={() => updateQuery({ sort: filters.sort === "newest" ? "oldest" : null })} className={filterButton(false)}><ArrowDownUp className="mr-1 inline h-3.5 w-3.5" />{filters.sort === "newest" ? "Newest first" : "Oldest first"}</button>
              <button type="button" onClick={() => updateQuery({ unanswered_first: filters.unansweredFirst ? 0 : null })} className={filterButton(filters.unansweredFirst)}><Clock3 className="mr-1 inline h-3.5 w-3.5" />Unanswered first</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "today", "7d", "30d"] as const).map((date) => <button key={date} type="button" onClick={() => updateQuery({ date: date === "all" ? null : date })} className={filterButton(filters.datePreset === date)}>{date === "all" ? "Any date" : date === "today" ? "Today" : date === "7d" ? "Last 7 days" : "Last 30 days"}</button>)}
            </div>
            {filters.pointId ? <button type="button" onClick={() => updateQuery({ point: null })} className="text-[11px] text-sky-700 hover:text-sky-800">Clear exchange-point filter</button> : null}
          </div>
          : null}
        </div>
        {reviews.map((review) => <ReviewCard key={review.id} review={review} selected={selectedPointId === review.point_id} onSelect={() => setSelectedPointId(review.point_id)} />)}
        {!reviews.length ? <p className="py-10 text-center text-[13px] text-slate-500">No reviews match these filters.</p> : null}
        {pagination}
      </section>}
      right={<aside className="min-w-0 space-y-3">
        <PartnerPointsMapPanel points={points} location={location} selectedPointId={selectedPointId} onSelectPoint={(pointId) => setSelectedPointId((current) => current === pointId ? null : pointId)} onReset={() => setLocation(null)} compact />
        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-400">All organization reviews</div>
          <Summary value={organizationSummary} />
        </div>
      </aside>}
    />
  )
}
