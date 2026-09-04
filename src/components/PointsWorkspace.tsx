"use client"

// Purpose: One map-based form for creating/editing points and their exchange rates.

import { CheckCircle2, MapPin, Pause, Pencil, Play, Plus, Trash2, X } from "lucide-react"
import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import PartnerLocationPickerPanel from "@/components/PartnerLocationPickerPanel"
import PartnerPointsMapPanel from "@/components/PartnerPointsMapPanel"
import PartnerTwoColumnLayout from "@/components/PartnerTwoColumnLayout"
import { useStableIdempotencyKey } from "@/lib/client-idempotency"
import { readResponseError } from "@/lib/http-response-error"
import ReferenceCombobox from "@/components/ReferenceCombobox"
import CurrencyIdentity from "@/components/CurrencyIdentity"
import { rememberWorkspaceGeo } from "@/lib/workspace-geo-preference"
import type {
  DirectionAssignmentPage,
  LocationReference,
  Point,
  PointLocation,
  Rate,
} from "@/lib/types"

type EditorMode = { kind: "create" } | { kind: "edit"; point: Point }
const LAST_POINT_CITY_KEY = "swapgo.partner-console.last-point-city"
const ASSIGNMENT_PAGE_SIZE = 100
type PointView = { pointId?: number; mode?: "create" | "edit" }

function isStoredCity(value: unknown): value is LocationReference {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<LocationReference>
  return item.kind === "city" && typeof item.slug === "string" && Boolean(item.slug)
}

function pointViewFromParams(params: URLSearchParams): PointView {
  const pointId = Number(params.get("point"))
  const mode = params.get("mode")
  return {
    ...(Number.isSafeInteger(pointId) && pointId > 0 ? { pointId } : {}),
    ...(mode === "create" || mode === "edit" ? { mode } : {}),
  }
}

function pushViewUrl(url: string) {
  // Next.js integrates the browser History API with useSearchParams. Keeping
  // that integration intact prevents an editor held in local state while the
  // address bar silently falls back to /points after a refresh.
  window.history.pushState(null, "", url)
}

function locationFromReference(item: LocationReference): PointLocation {
  return {
    city_slug: item.slug || "",
    city_wikidata_id: item.wikidata_id,
    country_iso3: item.iso3,
    country_wikidata_id: item.country_wikidata_id,
    latitude: null,
    longitude: null,
  }
}

function referenceFromPoint(point: Point): LocationReference {
  return {
    kind: "city",
    name: point.city_name,
    wikidata_id: point.location.city_wikidata_id,
    slug: point.location.city_slug,
    iso3: point.location.country_iso3,
    country_wikidata_id: point.location.country_wikidata_id,
    country_name: point.country_name,
    country_emoji: point.country_emoji,
    latitude: point.location.latitude,
    longitude: point.location.longitude,
  }
}

async function loadPointDirectionAssignments(pointId: number, signal: AbortSignal) {
  const items: DirectionAssignmentPage["items"] = []
  let totalDirectionCount: number | null = null

  while (totalDirectionCount === null || items.length < totalDirectionCount) {
    const query = new URLSearchParams({
      point_id: String(pointId),
      limit: String(ASSIGNMENT_PAGE_SIZE),
      offset: String(items.length),
      locale: "en",
    })
    const response = await fetch(`/api/partner/point-direction-assignments?${query}`, {
      cache: "no-store",
      signal,
    })
    if (!response.ok) throw new Error(await readResponseError(response, "Could not load point rates."))
    const body = await response.json() as DirectionAssignmentPage
    totalDirectionCount ??= body.total_direction_count
    items.push(...body.items)
    if (!body.items.length) break
  }

  return items
}

function DirectionChecklist({ directions, selected, onChange, readOnly = false }: {
  directions: Rate[]
  selected: Set<number>
  onChange: (next: Set<number>) => void
  readOnly?: boolean
}) {
  const visibleDirections = directions.filter((direction) => direction.status !== "deleted")

  function toggle(directionId: number) {
    if (readOnly) return
    const next = new Set(selected)
    if (next.has(directionId)) next.delete(directionId)
    else next.add(directionId)
    onChange(next)
  }

  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
      {visibleDirections.map((direction) => {
        const disabled = readOnly || direction.status !== "active"
        return (
        <label key={direction.id} className={`flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 last:border-b-0 ${disabled ? "cursor-not-allowed bg-slate-50/60" : "cursor-pointer hover:bg-slate-50"}`}>
          <input type="checkbox" checked={selected.has(direction.id)} disabled={disabled} onChange={() => toggle(direction.id)} className="h-4 w-4 accent-teal-700 disabled:opacity-50" />
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px] text-slate-600">
            <CurrencyIdentity currency={direction.currency_from} className="max-w-[calc(50%-12px)]" />
            <span className="shrink-0 text-slate-400">→</span>
            <CurrencyIdentity currency={direction.currency_to} className="max-w-[calc(50%-12px)]" />
          </span>
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] ${direction.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{direction.status}</span>
        </label>
        )
      })}
      {!visibleDirections.length ? <p className="px-3 py-6 text-center text-[12px] text-slate-500">Create an exchange rate first.</p> : null}
    </div>
  )
}

function PointEditorDialog({ children, onClose }: {
  children: ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-700/35 p-3 backdrop-blur-[1px] lg:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Exchange point editor" className="h-[calc(100vh-16px)] w-full max-w-[1400px] overflow-hidden bg-white lg:h-[94vh]">
        {children}
      </div>
    </div>
  )
}

function PointForm({ mode, directions, initialLocation, onDone, onDelete, onCancel }: {
  mode: EditorMode
  directions: Rate[]
  initialLocation?: LocationReference | null
  onDone: () => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const router = useRouter()
  const point = mode.kind === "edit" ? mode.point : null
  const initialDisplay = useMemo(
    () => point ? referenceFromPoint(point) : initialLocation?.kind === "city" ? initialLocation : null,
    [initialLocation, point],
  )
  const [name, setName] = useState(point?.name ?? "")
  const [address, setAddress] = useState(point?.address ?? "")
  const [note, setNote] = useState(point?.note ?? "")
  const [display, setDisplay] = useState<LocationReference | null>(initialDisplay)
  const [location, setLocation] = useState<PointLocation | null>(
    point ? { ...point.location } : initialDisplay ? locationFromReference(initialDisplay) : null,
  )
  const [selectedDirections, setSelectedDirections] = useState<Set<number>>(
    () => new Set(
      point
        ? []
        : directions
          .filter((direction) => direction.status === "active")
          .map((direction) => direction.id),
    ),
  )
  const [assignmentsReady, setAssignmentsReady] = useState(!point)
  const [mapFocusVersion, setMapFocusVersion] = useState(0)
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [snapshotEtag, setSnapshotEtag] = useState<string | null>(null)
  const [snapshotReady, setSnapshotReady] = useState(!point)
  const { keyFor, clearKey } = useStableIdempotencyKey()
  const preservePausedAssignments = Boolean(point && directions.some((direction) => direction.status === "paused"))

  useEffect(() => {
    if (!saved) return
    const timeout = window.setTimeout(() => setSaved(false), 2500)
    return () => window.clearTimeout(timeout)
  }, [saved])

  useEffect(() => {
    if (!point) return
    const controller = new AbortController()

    async function loadSnapshot() {
      setAssignmentsReady(false)
      setSnapshotReady(false)
      setError("")
      try {
        const pointResponse = await fetch(`/api/partner/points/${point!.id}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!pointResponse.ok) throw new Error(await readResponseError(pointResponse, "Could not load the exchange point."))
        const etag = pointResponse.headers.get("etag")
        if (!etag) throw new Error("The point revision is missing. Refresh and try again.")
        const currentPoint = await pointResponse.json() as Point
        const currentDisplay = referenceFromPoint(currentPoint)
        setName(currentPoint.name)
        setAddress(currentPoint.address ?? "")
        setNote(currentPoint.note ?? "")
        setDisplay(currentDisplay)
        setLocation({ ...currentPoint.location })

        const items = await loadPointDirectionAssignments(point!.id, controller.signal)
        setSelectedDirections(new Set(
          items
            .filter((item) => item.enabled_points_count > 0)
            .map((item) => item.direction_id),
        ))
        setSnapshotEtag(etag)
        clearKey("point-save")
        clearKey("point-delete")
        setAssignmentsReady(true)
        setSnapshotReady(true)
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Request failed.")
        }
      }
    }

    void loadSnapshot()
    return () => controller.abort()
  }, [clearKey, point])

  const mapInitial = useMemo(
    () => display ? { display, location: location || undefined } : null,
    [display, location],
  )

  function chooseReference(item: LocationReference | null) {
    setSaved(false)
    setDisplay(item)
    setLocation(item ? locationFromReference(item) : null)
    setMapFocusVersion((value) => value + 1)
    setError("")
  }

  const chooseMapPoint = useCallback((latitude: number, longitude: number) => {
    setSaved(false)
    setLocation((current) => current ? { ...current, latitude, longitude } : current)
    setError("")
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!display || display.kind !== "city" || !location?.city_slug) {
      setError("Select a city and set the point on the map.")
      return
    }
    if (location.latitude == null || location.longitude == null) {
      setError("Set the exact point on the map before saving it.")
      return
    }
    if (!assignmentsReady || !snapshotReady || (point && !snapshotEtag)) return

    setPending(true)
    setError("")
    setSaved(false)
    try {
      const payload: {
        name: string
        address: string | null
        note: string | null
        location: PointLocation
        direction_ids?: number[]
      } = {
        name: name.trim(),
        address: address.trim() || null,
        note: note.trim() || null,
        location,
      }
      if (!preservePausedAssignments) payload.direction_ids = [...selectedDirections]
      const endpoint = point ? `/api/partner/points/${point.id}` : "/api/partner/points"
      const operation = point ? "point-save" : "point-create"
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Idempotency-Key": keyFor(operation, { pointId: point?.id ?? null, etag: snapshotEtag, payload }),
      }
      if (point && snapshotEtag) headers["If-Match"] = snapshotEtag
      const response = await fetch(endpoint, {
        method: point ? "PATCH" : "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(await readResponseError(response, point ? "Could not update the exchange point." : "Could not create the exchange point."))
      clearKey(operation)
      if (point) {
        const nextEtag = response.headers.get("etag")
        if (nextEtag) setSnapshotEtag(nextEtag)
        setSaved(true)
        router.replace(`${window.location.pathname}${window.location.search}`, { scroll: false })
      } else {
        onDone()
        router.refresh()
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.")
    } finally {
      setPending(false)
    }
  }

  async function deletePoint() {
    if (!point || !onDelete || !snapshotReady || !snapshotEtag) return
    setPending(true)
    setError("")
    setSaved(false)
    try {
      const payload = { status: "deleted" }
      const response = await fetch(`/api/partner/points/${point.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": snapshotEtag,
          "Idempotency-Key": keyFor("point-delete", { pointId: point.id, etag: snapshotEtag, payload }),
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(await readResponseError(response, "Could not delete the exchange point."))
      clearKey("point-delete")
      onDelete()
      router.replace(`${window.location.pathname}${window.location.search}`, { scroll: false })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex h-full min-h-0 flex-col overflow-y-auto border border-emerald-200 bg-emerald-50/30 p-3 md:overflow-hidden lg:p-4">
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-emerald-700" />
        <h2 className="text-[15px] font-semibold text-slate-700">{point ? "Edit exchange point" : "New exchange point"}</h2>
        {point ? <span className="text-[15px] font-medium text-slate-500">ID {point.id}</span> : null}
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100"
          aria-label="Close form"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(280px,0.72fr)_minmax(420px,1.28fr)]">
        <div className="min-w-0 space-y-3 overflow-y-auto border border-slate-200 bg-white p-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Name</span>
            <input required maxLength={255} value={name} onChange={(event) => { setSaved(false); setName(event.target.value) }} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-emerald-700" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Address</span>
            <input maxLength={500} value={address} onChange={(event) => { setSaved(false); setAddress(event.target.value) }} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-emerald-700" />
          </label>
          <ReferenceCombobox<LocationReference> kind="locations" label="City" placeholder="Start typing a city" value={display} onChange={chooseReference} cityOnly />
          <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${location?.latitude != null && location.longitude != null ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${location?.latitude != null && location.longitude != null ? "bg-emerald-600" : "bg-slate-400"}`} />
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-slate-600">
                {location?.latitude != null && location.longitude != null ? "Location selected" : "Select a point on the map"}
              </div>
              {location?.latitude != null && location.longitude != null ? (
                <div className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </div>
              ) : null}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Note</span>
            <textarea
              rows={2}
              maxLength={5000}
              value={note}
              onChange={(event) => { setSaved(false); setNote(event.target.value) }}
              className="min-h-14 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-emerald-700"
            />
          </label>
          <div>
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-medium text-slate-500">
              <span>Available exchange rates</span><span>{assignmentsReady ? `${selectedDirections.size} selected` : "Loading…"}</span>
            </div>
            <DirectionChecklist directions={directions} selected={selectedDirections} readOnly={preservePausedAssignments} onChange={(next) => { setSaved(false); setSelectedDirections(next) }} />
            {preservePausedAssignments ? (
              <p className="mt-1.5 text-[11px] leading-5 text-amber-700">Rate assignments stay unchanged while an organization direction is paused. Resume paused rates before editing this list.</p>
            ) : null}
          </div>
          {error ? <p className="text-[12px] text-rose-700">{error}</p> : null}
          <div className="flex items-center justify-end gap-2 pt-1">
            {point && !confirmDelete ? (
              <button type="button" disabled={pending} onClick={() => setConfirmDelete(true)} className="mr-auto inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-[12px] text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" />Delete
              </button>
            ) : null}
            {point && confirmDelete ? (
              <div className="mr-auto flex min-h-10 items-center gap-2.5 rounded-lg bg-rose-50 px-2.5 text-[12px] text-slate-600">
                <span className="shrink-0">Delete?</span>
                <button type="button" disabled={pending} onClick={() => void deletePoint()} className="inline-flex h-8 min-w-12 items-center justify-center rounded-md border border-rose-300 bg-white px-3 font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">Yes</button>
                <button type="button" disabled={pending} onClick={() => setConfirmDelete(false)} className="inline-flex h-8 min-w-12 items-center justify-center rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">No</button>
              </div>
            ) : null}
            {saved ? (
              <span role="status" className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />Changes saved
              </span>
            ) : null}
            <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-slate-200 px-4 text-[12px] text-slate-500">Cancel</button>
          <button disabled={pending || !assignmentsReady || !snapshotReady || !name.trim()} className="h-9 rounded-lg bg-emerald-700 px-5 text-[12px] font-medium text-white hover:bg-emerald-800 disabled:bg-slate-300">{pending ? "Saving…" : point ? "Save changes" : "Create point"}</button>
          </div>
        </div>
        <PartnerLocationPickerPanel initial={mapInitial} focusVersion={mapFocusVersion} onSelect={chooseMapPoint} />
      </div>
    </form>
  )
}

function PointCard({ point, selected, onSelect, onEdit }: {
  point: Point
  selected: boolean
  onSelect: () => void
  onEdit: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const { keyFor, clearKey } = useStableIdempotencyKey()
  const statusAttemptRef = useRef<{
    etag: string
    payload: { status: "active" | "disabled" }
  } | null>(null)

  async function toggleStatus() {
    setPending(true)
    setError("")
    try {
      let attempt = statusAttemptRef.current
      if (!attempt) {
        const current = await fetch(`/api/partner/points/${point.id}`, { cache: "no-store" })
        if (!current.ok) throw new Error(await readResponseError(current, "Could not load the point."))
        const etag = current.headers.get("etag")
        if (!etag) throw new Error("The point revision is missing. Refresh and try again.")
        const snapshot = await current.json() as Point
        attempt = {
          etag,
          payload: { status: snapshot.status === "active" ? "disabled" : "active" },
        }
        statusAttemptRef.current = attempt
      }
      const response = await fetch(`/api/partner/points/${point.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": attempt.etag,
          "Idempotency-Key": keyFor("point-status", { pointId: point.id, etag: attempt.etag, payload: attempt.payload }),
        },
        body: JSON.stringify(attempt.payload),
      })
      if (!response.ok) {
        if (response.status === 409 || response.status === 412) {
          statusAttemptRef.current = null
          clearKey("point-status")
        }
        throw new Error(await readResponseError(response, "Could not update the point."))
      }
      statusAttemptRef.current = null
      clearKey("point-status")
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.")
    } finally {
      setPending(false)
    }
  }

  return (
    <article id={`partner-point-${point.id}`} className={`rounded-xl border bg-white px-3 py-3 transition-colors sm:px-4 ${selected ? "border-teal-600" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSelect} className="flex min-w-[220px] flex-1 items-center gap-3 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[14px] font-semibold text-slate-700">{point.name}</h2>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${point.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{point.status}</span>
            </div>
            <div className="mt-1 truncate text-[12px] text-slate-500">{point.address ? `${point.address} · ` : ""}{point.city_name} · {point.location.country_iso3.toUpperCase()} · {point.country_name}</div>
            <div className="mt-1 text-[11px] text-slate-400">ID {point.id} · Rates: {point.active_direction_count ?? 0}</div>
          </div>
        </button>
        <button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[12px] text-slate-600 hover:border-teal-600">
          <Pencil className="h-3.5 w-3.5" />Edit
        </button>
        <button type="button" disabled={pending} onClick={() => void toggleStatus()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[12px] text-slate-600 hover:border-teal-600 disabled:opacity-50">
          {point.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {pending ? "…" : point.status === "active" ? "Pause" : "Resume"}
        </button>
      </div>
      {error ? <p className="mt-2 text-[11px] text-rose-700">{error}</p> : null}
    </article>
  )
}

export default function PointsWorkspace({
  points,
  mapPoints,
  directions,
  locationFilter,
  pageSize,
  pagination,
}: {
  points: Point[]
  mapPoints: Point[]
  directions: Rate[]
  locationFilter: LocationReference | null
  pageSize: number
  pagination?: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [view, setViewState] = useState<PointView>(() => pointViewFromParams(new URLSearchParams(searchParams.toString())))
  const selectedPoint = view.pointId
    ? mapPoints.find((point) => point.id === view.pointId) ?? null
    : null
  const creating = view.mode === "create"
  const editing = view.mode === "edit" && selectedPoint !== null
  const [lastCity, setLastCity] = useState<LocationReference | null>(
    locationFilter?.kind === "city" ? locationFilter : null,
  )

  useEffect(() => {
    const geo = locationFilter
      ? locationFilter.kind === "city"
        ? locationFilter.slug || ""
        : locationFilter.iso3.toLowerCase()
      : null
    rememberWorkspaceGeo(geo)
  }, [locationFilter])

  useEffect(() => {
    if (locationFilter?.kind === "city") {
      window.localStorage.setItem(LAST_POINT_CITY_KEY, JSON.stringify(locationFilter))
      return
    }
    let frame: number | null = null
    try {
      const stored = JSON.parse(window.localStorage.getItem(LAST_POINT_CITY_KEY) || "null") as unknown
      if (isStoredCity(stored)) {
        frame = window.requestAnimationFrame(() => setLastCity(stored))
      }
    } catch {
      window.localStorage.removeItem(LAST_POINT_CITY_KEY)
    }
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [locationFilter])

  useEffect(() => {
    function syncBrowserView() {
      setViewState(pointViewFromParams(new URLSearchParams(window.location.search)))
    }
    window.addEventListener("popstate", syncBrowserView)
    return () => window.removeEventListener("popstate", syncBrowserView)
  }, [])

  useEffect(() => {
    if (!view.pointId || !points.some((point) => point.id === view.pointId)) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`partner-point-${view.pointId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [points, view.pointId])

  function setView(next: PointView) {
    const params = new URLSearchParams(window.location.search)
    params.delete("point")
    params.delete("mode")
    if (next.pointId) params.set("point", String(next.pointId))
    if (next.mode) params.set("mode", next.mode)
    const query = params.toString()
    setViewState(next)
    pushViewUrl(query ? `${pathname}?${query}` : pathname)
  }

  function setLocationFilter(location: LocationReference | null) {
    const params = new URLSearchParams(window.location.search)
    params.delete("point")
    params.delete("mode")
    params.delete("page")
    params.delete("geo")
    let nextPathname = "/points"
    if (location) {
      const geo = location.kind === "city" ? location.slug || "" : location.iso3.toLowerCase()
      nextPathname = geo ? `/points/${encodeURIComponent(geo)}` : "/points"
      rememberWorkspaceGeo(geo)
      if (location.kind === "city") {
        setLastCity(location)
        window.localStorage.setItem(LAST_POINT_CITY_KEY, JSON.stringify(location))
      }
    } else {
      rememberWorkspaceGeo(null)
    }
    const query = params.toString()
    setViewState({})
    router.push(query ? `${nextPathname}?${query}` : nextPathname)
  }

  function selectPointFromMap(pointId: number) {
    const pointIndex = mapPoints.findIndex((point) => point.id === pointId)
    const targetPage = pointIndex >= 0 ? Math.floor(pointIndex / pageSize) + 1 : 1
    const currentPage = Math.max(1, Number(new URLSearchParams(window.location.search).get("page")) || 1)
    if (targetPage !== currentPage) {
      const params = new URLSearchParams(window.location.search)
      params.set("point", String(pointId))
      params.delete("mode")
      if (targetPage > 1) params.set("page", String(targetPage))
      else params.delete("page")
      setViewState({ pointId })
      router.push(`${pathname}?${params.toString()}`)
      return
    }
    setView({ pointId })
  }

  return (
    <>
      <PartnerTwoColumnLayout
        variant="map"
        left={<section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end justify-start gap-2">
            <div className="min-w-[240px] flex-1">
              <ReferenceCombobox<LocationReference>
                kind="locations"
                placeholder="Start typing a city or country"
                value={locationFilter}
                onChange={setLocationFilter}
              />
            </div>
            <button type="button" onClick={() => setView({ mode: "create" })} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3.5 text-[12px] font-medium text-white hover:bg-emerald-800">
              <Plus className="h-4 w-4" />New exchange point
            </button>
          </div>
          <div className="space-y-2">
            {points.map((point) => (
              <PointCard
                key={point.id}
                point={point}
                selected={selectedPoint?.id === point.id}
                onSelect={() => setView({ pointId: point.id })}
                onEdit={() => setView({ pointId: point.id, mode: "edit" })}
              />
            ))}
            {!points.length ? <p className="py-8 text-center text-[13px] text-slate-500">No exchange points match this location.</p> : null}
          </div>
          {pagination}
        </section>}
        right={
          <PartnerPointsMapPanel
            points={mapPoints}
            location={locationFilter}
            selectedPointId={selectedPoint?.id ?? null}
            onSelectPoint={selectPointFromMap}
            onReset={() => setLocationFilter(null)}
            compact
          />
        }
      />
      {creating ? (
        <PointEditorDialog onClose={() => setView({})}>
          <PointForm key={`create:${lastCity?.slug || "empty"}`} mode={{ kind: "create" }} directions={directions} initialLocation={lastCity} onDone={() => setView({})} onCancel={() => setView({})} />
        </PointEditorDialog>
      ) : editing && selectedPoint ? (
        <PointEditorDialog onClose={() => setView({ pointId: selectedPoint.id })}>
          <PointForm key={selectedPoint.id} mode={{ kind: "edit", point: selectedPoint }} directions={directions} onDone={() => setView({ pointId: selectedPoint.id })} onDelete={() => setView({})} onCancel={() => setView({ pointId: selectedPoint.id })} />
        </PointEditorDialog>
      ) : null}
    </>
  )
}
